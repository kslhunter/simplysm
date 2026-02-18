import type {
  DbContextDef,
  DbContextBase,
  DbContextStatus,
  DbContextInstance,
} from "./types/db-context-def";
import type { DataRecord, DbContextExecutor, IsolationLevel, ResultMeta } from "./types/db";
import type { QueryDef, QueryDefObjectName } from "./types/query-def";
import { DDL_TYPES } from "./types/query-def";
import { DbErrorCode, DbTransactionError } from "./errors/db-transaction-error";
import { TableBuilder } from "./schema/table-builder";
import { ViewBuilder } from "./schema/view-builder";
import type { ProcedureBuilder } from "./schema/procedure-builder";
import { queryable } from "./exec/queryable";
import { executable } from "./exec/executable";
import { objClearUndefined } from "@simplysm/core-common";

// DDL imports
import * as tableDdl from "./ddl/table-ddl";
import * as columnDdl from "./ddl/column-ddl";
import * as relationDdl from "./ddl/relation-ddl";
import * as schemaDdl from "./ddl/schema-ddl";
import {
  initialize as initializeImpl,
  validateRelations as validateRelationsImpl,
} from "./ddl/initialize";

import type { ColumnBuilder } from "./schema/factory/column-builder";
import type { ForeignKeyBuilder } from "./schema/factory/relation-builder";
import type { IndexBuilder } from "./schema/factory/index-builder";

/**
 * DbContext 인스턴스 팩토리
 *
 * DbContextDef(정의)와 DbContextExecutor(실행기)를 받아
 * queryable 접근자, DDL 메서드, 연결/트랜잭션 관리를 포함한
 * 완전한 DbContext 인스턴스를 생성
 *
 * @param def - defineDbContext()로 생성한 정의 객체
 * @param executor - 쿼리 실행기 (NodeDbContextExecutor, ServiceDbContextExecutor 등)
 * @param opt - 데이터베이스 옵션
 * @param opt.database - 데이터베이스 이름
 * @param opt.schema - 스키마 이름 (MSSQL: dbo, PostgreSQL: public)
 * @returns 완전한 DbContext 인스턴스
 *
 * @example
 * ```typescript
 * const MyDb = defineDbContext({
 *   tables: { user: User, post: Post },
 * });
 *
 * const db = createDbContext(MyDb, executor, { database: "mydb" });
 *
 * await db.connect(async () => {
 *   const users = await db.user().result();
 * });
 * ```
 */
export function createDbContext<TDef extends DbContextDef<any, any, any>>(
  def: TDef,
  executor: DbContextExecutor,
  opt: { database: string; schema?: string },
): DbContextInstance<TDef> {
  // ── Internal state (closure) ──
  let aliasCounter = 0;
  let status: DbContextStatus = "ready";

  // ── DbContextBase implementation ──
  const base: DbContextBase = {
    get status() {
      return status;
    },
    set status(v: DbContextStatus) {
      status = v;
    },
    get database() {
      return opt.database;
    },
    get schema() {
      return opt.schema;
    },
    getNextAlias() {
      return `T${++aliasCounter}`;
    },
    resetAliasCounter() {
      aliasCounter = 0;
    },
    executeDefs<T = DataRecord>(
      defs: QueryDef[],
      resultMetas?: (ResultMeta | undefined)[],
    ): Promise<T[][]> {
      if (
        status === "transact" &&
        defs.some((d) => (DDL_TYPES as readonly string[]).includes(d.type))
      ) {
        throw new Error("TRANSACTION 상태에서는 DDL을 실행할 수 없습니다.");
      }
      return executor.executeDefs(defs, resultMetas);
    },
    getQueryDefObjectName(
      tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>,
    ): QueryDefObjectName {
      return objClearUndefined({
        database: tableOrView.meta.database ?? opt.database,
        schema: tableOrView.meta.schema ?? opt.schema,
        name: tableOrView.meta.name,
      });
    },
    async switchFk(table: QueryDefObjectName, switch_: "on" | "off"): Promise<void> {
      await base.executeDefs([schemaDdl.getSwitchFkQueryDef(table, switch_)]);
    },
  };

  // ── Compose all into single object ──
  const db = {
    // Spread base properties (getters/setters need special handling)
    get status() {
      return base.status;
    },
    set status(v: DbContextStatus) {
      base.status = v;
    },
    get database() {
      return base.database;
    },
    get schema() {
      return base.schema;
    },
    getNextAlias: base.getNextAlias,
    resetAliasCounter: base.resetAliasCounter,
    executeDefs: base.executeDefs,
    getQueryDefObjectName: base.getQueryDefObjectName,

    //#region ========== Connection management ==========

    /**
     * 트랜잭션 내에서 콜백 실행 (자동 커밋/롤백)
     *
     * 연결 -> 트랜잭션 시작 -> 콜백 실행 -> 커밋 -> 연결 종료
     * 에러 발생 시 자동 롤백 후 연결 종료
     */
    async connect<TResult>(
      fn: () => Promise<TResult>,
      isolationLevel?: IsolationLevel,
    ): Promise<TResult> {
      validateRelationsImpl(def);
      base.resetAliasCounter();

      await executor.connect();
      status = "connect";

      await executor.beginTransaction(isolationLevel);
      status = "transact";

      let result: TResult;
      try {
        result = await fn();

        await executor.commitTransaction();
        status = "connect";
      } catch (err) {
        try {
          await executor.rollbackTransaction();
          status = "connect";
        } catch (err1) {
          if (err1 instanceof DbTransactionError) {
            if (err1.code !== DbErrorCode.NO_ACTIVE_TRANSACTION) {
              await executor.close();
              status = "ready";
              throw err1;
            }
          } else {
            await executor.close();
            status = "ready";
            throw err1;
          }
        }

        await executor.close();
        status = "ready";
        throw err;
      }

      await executor.close();
      status = "ready";
      return result;
    },

    /**
     * 트랜잭션 없이 연결하여 콜백 실행 후 자동 종료
     *
     * DDL 작업이나 트랜잭션이 필요 없는 조회 작업에 사용
     */
    async connectWithoutTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult> {
      validateRelationsImpl(def);
      base.resetAliasCounter();

      await executor.connect();
      status = "connect";

      let result: TResult;
      try {
        result = await callback();
      } catch (err) {
        await executor.close();
        status = "ready";
        throw err;
      }

      await executor.close();
      status = "ready";
      return result;
    },

    /**
     * 이미 연결된 상태에서 트랜잭션 시작 (자동 커밋/롤백)
     *
     * connectWithoutTransaction 내에서 부분적으로 트랜잭션이 필요할 때 사용
     */
    async trans<TResult>(
      fn: () => Promise<TResult>,
      isolationLevel?: IsolationLevel,
    ): Promise<TResult> {
      if (status === "transact") {
        throw new Error("이미 TRANSACTION 상태입니다.");
      }

      await executor.beginTransaction(isolationLevel);
      status = "transact";

      let result: TResult;
      try {
        result = await fn();

        await executor.commitTransaction();
        status = "connect";
      } catch (err) {
        try {
          await executor.rollbackTransaction();
          status = "connect";
        } catch (err1) {
          if (err1 instanceof DbTransactionError) {
            if (err1.code !== DbErrorCode.NO_ACTIVE_TRANSACTION) {
              throw err1;
            }
          } else {
            throw err1;
          }
          // NO_ACTIVE_TRANSACTION 에러면 무시하고 원래 에러 throw
          status = "connect";
        }
        throw err;
      }

      return result;
    },

    //#endregion

    //#region ========== DDL execution methods ==========

    async createTable(table: TableBuilder<any, any>): Promise<void> {
      await base.executeDefs([tableDdl.getCreateTableQueryDef(base, table)]);
    },
    async dropTable(table: QueryDefObjectName): Promise<void> {
      await base.executeDefs([tableDdl.getDropTableQueryDef(table)]);
    },
    async renameTable(table: QueryDefObjectName, newName: string): Promise<void> {
      await base.executeDefs([tableDdl.getRenameTableQueryDef(table, newName)]);
    },
    async createView(view: ViewBuilder<any, any, any>): Promise<void> {
      await base.executeDefs([tableDdl.getCreateViewQueryDef(db as any, view)]);
    },
    async dropView(view: QueryDefObjectName): Promise<void> {
      await base.executeDefs([tableDdl.getDropViewQueryDef(view)]);
    },
    async createProc(procedure: ProcedureBuilder<any, any>): Promise<void> {
      await base.executeDefs([tableDdl.getCreateProcQueryDef(base, procedure)]);
    },
    async dropProc(procedure: QueryDefObjectName): Promise<void> {
      await base.executeDefs([tableDdl.getDropProcQueryDef(procedure)]);
    },
    async addColumn(
      table: QueryDefObjectName,
      columnName: string,
      column: ColumnBuilder<any, any>,
    ): Promise<void> {
      await base.executeDefs([columnDdl.getAddColumnQueryDef(table, columnName, column)]);
    },
    async dropColumn(table: QueryDefObjectName, column: string): Promise<void> {
      await base.executeDefs([columnDdl.getDropColumnQueryDef(table, column)]);
    },
    async modifyColumn(
      table: QueryDefObjectName,
      columnName: string,
      column: ColumnBuilder<any, any>,
    ): Promise<void> {
      await base.executeDefs([columnDdl.getModifyColumnQueryDef(table, columnName, column)]);
    },
    async renameColumn(table: QueryDefObjectName, column: string, newName: string): Promise<void> {
      await base.executeDefs([columnDdl.getRenameColumnQueryDef(table, column, newName)]);
    },
    async addPk(table: QueryDefObjectName, columns: string[]): Promise<void> {
      await base.executeDefs([relationDdl.getAddPkQueryDef(table, columns)]);
    },
    async dropPk(table: QueryDefObjectName): Promise<void> {
      await base.executeDefs([relationDdl.getDropPkQueryDef(table)]);
    },
    async addFk(
      table: QueryDefObjectName,
      relationName: string,
      relationDef: ForeignKeyBuilder<any, any>,
    ): Promise<void> {
      await base.executeDefs([
        relationDdl.getAddFkQueryDef(base, table, relationName, relationDef),
      ]);
    },
    async addIdx(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): Promise<void> {
      await base.executeDefs([relationDdl.getAddIdxQueryDef(table, indexBuilder)]);
    },
    async dropFk(table: QueryDefObjectName, relationName: string): Promise<void> {
      await base.executeDefs([relationDdl.getDropFkQueryDef(table, relationName)]);
    },
    async dropIdx(table: QueryDefObjectName, columns: string[]): Promise<void> {
      await base.executeDefs([relationDdl.getDropIdxQueryDef(table, columns)]);
    },
    async clearSchema(params: { database: string; schema?: string }): Promise<void> {
      await base.executeDefs([schemaDdl.getClearSchemaQueryDef(params)]);
    },
    async schemaExists(database: string, schema?: string): Promise<boolean> {
      const result = await base.executeDefs([schemaDdl.getSchemaExistsQueryDef(database, schema)]);
      return result[0].length > 0;
    },
    async truncate(table: QueryDefObjectName): Promise<void> {
      await base.executeDefs([schemaDdl.getTruncateQueryDef(table)]);
    },
    async switchFk(table: QueryDefObjectName, switch_: "on" | "off"): Promise<void> {
      await base.executeDefs([schemaDdl.getSwitchFkQueryDef(table, switch_)]);
    },

    //#endregion

    //#region ========== DDL QueryDef generators ==========

    getCreateTableQueryDef: (table: TableBuilder<any, any>) =>
      tableDdl.getCreateTableQueryDef(base, table),
    getCreateViewQueryDef: (view: ViewBuilder<any, any, any>) =>
      tableDdl.getCreateViewQueryDef(db as any, view),
    getCreateProcQueryDef: (procedure: ProcedureBuilder<any, any>) =>
      tableDdl.getCreateProcQueryDef(base, procedure),
    getCreateObjectQueryDef: (
      builder: TableBuilder<any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>,
    ) => tableDdl.getCreateObjectQueryDef(db as any, builder),
    getDropTableQueryDef: tableDdl.getDropTableQueryDef,
    getRenameTableQueryDef: tableDdl.getRenameTableQueryDef,
    getDropViewQueryDef: tableDdl.getDropViewQueryDef,
    getDropProcQueryDef: tableDdl.getDropProcQueryDef,
    getAddColumnQueryDef: columnDdl.getAddColumnQueryDef,
    getDropColumnQueryDef: columnDdl.getDropColumnQueryDef,
    getModifyColumnQueryDef: columnDdl.getModifyColumnQueryDef,
    getRenameColumnQueryDef: columnDdl.getRenameColumnQueryDef,
    getAddPkQueryDef: relationDdl.getAddPkQueryDef,
    getDropPkQueryDef: relationDdl.getDropPkQueryDef,
    getAddFkQueryDef: (
      table: QueryDefObjectName,
      relationName: string,
      relationDef: ForeignKeyBuilder<any, any>,
    ) => relationDdl.getAddFkQueryDef(base, table, relationName, relationDef),
    getAddIdxQueryDef: relationDdl.getAddIdxQueryDef,
    getDropFkQueryDef: relationDdl.getDropFkQueryDef,
    getDropIdxQueryDef: relationDdl.getDropIdxQueryDef,
    getClearSchemaQueryDef: schemaDdl.getClearSchemaQueryDef,
    getSchemaExistsQueryDef: schemaDdl.getSchemaExistsQueryDef,
    getTruncateQueryDef: schemaDdl.getTruncateQueryDef,
    getSwitchFkQueryDef: schemaDdl.getSwitchFkQueryDef,

    //#endregion

    //#region ========== Initialize ==========

    async initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void> {
      await initializeImpl(db as any, def, options);
    },

    //#endregion
  };

  // ── Add Queryable accessors ──
  for (const [key, tableOrView] of Object.entries(def.meta.tables)) {
    (db as any)[key] = queryable(db as any, tableOrView as TableBuilder<any, any>);
  }
  for (const [key, view] of Object.entries(def.meta.views)) {
    (db as any)[key] = queryable(db as any, view as ViewBuilder<any, any, any>);
  }

  // ── Add Executable accessors ──
  for (const [key, proc] of Object.entries(def.meta.procedures)) {
    (db as any)[key] = executable(base, proc as ProcedureBuilder<any, any>);
  }

  return db as DbContextInstance<TDef>;
}
