import type { DbContextBase, DbContextStatus } from "./types/db-context-def";
import type { DataRecord, DbContextExecutor, IsolationLevel, Migration, ResultMeta } from "./types/db";
import type { QueryDef, QueryDefObjectName } from "./types/query-def";
import { DDL_TYPES } from "./types/query-def";

const DDL_TYPE_SET: ReadonlySet<string> = new Set(DDL_TYPES);
import { DbErrorCode, DbTransactionError } from "./errors/db-transaction-error";
import { TableBuilder } from "./schema/table-builder";
import { ViewBuilder } from "./schema/view-builder";
import type { ProcedureBuilder } from "./schema/procedure-builder";
import { queryable as createQueryable } from "./exec/queryable";
import type { Queryable } from "./exec/queryable";
import { executable as createExecutable } from "./exec/executable";
import type { Executable } from "./exec/executable";

// DDL import
import * as tableDdl from "./ddl/table-ddl";
import { getQueryDefObjectName as getQueryDefObjectNameImpl } from "./ddl/table-ddl";
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
import { _Migration } from "./models/system-migration";

export const SD_BUILDER = Symbol("sdBuilder");

/**
 * DbContext base class
 *
 * 테이블/뷰/프로시저를 class 프로퍼티로 등록하고,
 * 연결/트랜잭션/DDL/초기화를 제공한다.
 *
 * defineDbContext/createDbContext의 class 기반 대체.
 * 각 프로퍼티가 독립 직렬화되어 40+ 테이블에서도 TS7056이 발생하지 않는다.
 */
export abstract class DbContext implements DbContextBase {
  // ── 상태 ──
  status: DbContextStatus = "ready";
  private _aliasCounter = 0;
  private _relationsValidated = false;

  // ── 시스템 테이블 ──
  _migration = this.queryable(_Migration);

  constructor(
    private readonly _executor: DbContextExecutor,
    private readonly _opt: { database: string; schema?: string },
  ) {}

  // ── DbContextBase 구현 ──

  get database(): string | undefined {
    return this._opt.database;
  }

  get schema(): string | undefined {
    return this._opt.schema;
  }

  getNextAlias(): string {
    return `T${++this._aliasCounter}`;
  }

  resetAliasCounter(): void {
    this._aliasCounter = 0;
  }

  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]> {
    if (this.status === "transact" && defs.some((d) => DDL_TYPE_SET.has(d.type))) {
      throw new Error("TRANSACTION 상태에서는 DDL을 실행할 수 없습니다.");
    }
    return this._executor.executeDefs(defs, resultMetas);
  }

  getQueryDefObjectName(
    tableOrView: TableBuilder<any, any, any> | ViewBuilder<any, any, any>,
  ): QueryDefObjectName {
    return getQueryDefObjectNameImpl(this, tableOrView);
  }

  async switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void> {
    await this.executeDefs([schemaDdl.getSwitchFkQueryDef(table, enabled)]);
  }

  // ── 등록 메서드 ──

  protected queryable<T extends TableBuilder<any, any, any> | ViewBuilder<any, any, any>>(
    builder: T,
  ): () => Queryable<T["$inferSelect"], T extends TableBuilder<any, any, any> ? T : never> {
    const fn = createQueryable(this, builder);
    Object.defineProperty(fn, SD_BUILDER, { value: builder });
    return fn;
  }

  protected executable<T extends ProcedureBuilder<any, any>>(
    builder: T,
  ): () => Executable<T["$params"], T["$returns"]> {
    const fn = createExecutable(this, builder);
    Object.defineProperty(fn, SD_BUILDER, { value: builder });
    return fn;
  }

  // ── 연결 관리 ──

  async connect<TResult>(
    fn: () => Promise<TResult>,
    isolationLevel?: IsolationLevel,
  ): Promise<TResult> {
    if (this.status !== "ready") {
      throw new Error(
        `이미 ${this.status === "connect" ? "CONNECT" : "TRANSACTION"} 상태입니다.`,
      );
    }
    if (!this._relationsValidated) {
      validateRelationsImpl(this);
      this._relationsValidated = true;
    }
    this.resetAliasCounter();

    await this._executor.connect();
    this.status = "connect";

    try {
      await this._executor.beginTransaction(isolationLevel);
      this.status = "transact";

      let result: TResult;
      try {
        result = await fn();

        await this._executor.commitTransaction();
        this.status = "connect";
      } catch (err) {
        try {
          await this._executor.rollbackTransaction();
        } catch (err1) {
          if (
            !(err1 instanceof DbTransactionError) ||
            err1.code !== DbErrorCode.NO_ACTIVE_TRANSACTION
          ) {
            (err as Error).cause = err1;
          }
        }
        this.status = "connect";
        throw err;
      }

      return result;
    } finally {
      try {
        await this._executor.close();
      } finally {
        this.status = "ready";
      }
    }
  }

  async connectWithoutTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult> {
    if (this.status !== "ready") {
      throw new Error(
        `이미 ${this.status === "connect" ? "CONNECT" : "TRANSACTION"} 상태입니다.`,
      );
    }
    if (!this._relationsValidated) {
      validateRelationsImpl(this);
      this._relationsValidated = true;
    }
    this.resetAliasCounter();

    await this._executor.connect();
    this.status = "connect";

    try {
      return await callback();
    } finally {
      try {
        await this._executor.close();
      } finally {
        this.status = "ready";
      }
    }
  }

  async transaction<TResult>(
    fn: () => Promise<TResult>,
    isolationLevel?: IsolationLevel,
  ): Promise<TResult> {
    if (this.status === "transact") {
      throw new Error("이미 TRANSACTION 상태입니다.");
    }

    await this._executor.beginTransaction(isolationLevel);
    this.status = "transact";

    let result: TResult;
    try {
      result = await fn();

      await this._executor.commitTransaction();
      this.status = "connect";
    } catch (err) {
      try {
        await this._executor.rollbackTransaction();
      } catch (err1) {
        if (
          !(err1 instanceof DbTransactionError) ||
          err1.code !== DbErrorCode.NO_ACTIVE_TRANSACTION
        ) {
          (err as Error).cause = err1;
        }
      }
      this.status = "connect";
      throw err;
    }

    return result;
  }

  // ── DDL 실행 메서드 ──

  async createTable(table: TableBuilder<any, any, any>): Promise<void> {
    await this.executeDefs([tableDdl.getCreateTableQueryDef(this, table)]);
  }

  async dropTable(table: QueryDefObjectName): Promise<void> {
    await this.executeDefs([tableDdl.getDropTableQueryDef(table)]);
  }

  async renameTable(table: QueryDefObjectName, newName: string): Promise<void> {
    await this.executeDefs([tableDdl.getRenameTableQueryDef(table, newName)]);
  }

  async createView(view: ViewBuilder<any, any, any>): Promise<void> {
    await this.executeDefs([tableDdl.getCreateViewQueryDef(this as any, view)]);
  }

  async dropView(view: QueryDefObjectName): Promise<void> {
    await this.executeDefs([tableDdl.getDropViewQueryDef(view)]);
  }

  async createProc(procedure: ProcedureBuilder<any, any>): Promise<void> {
    await this.executeDefs([tableDdl.getCreateProcQueryDef(this, procedure)]);
  }

  async dropProc(procedure: QueryDefObjectName): Promise<void> {
    await this.executeDefs([tableDdl.getDropProcQueryDef(procedure)]);
  }

  async addColumn(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): Promise<void> {
    await this.executeDefs([columnDdl.getAddColumnQueryDef(table, columnName, column)]);
  }

  async dropColumn(table: QueryDefObjectName, column: string): Promise<void> {
    await this.executeDefs([columnDdl.getDropColumnQueryDef(table, column)]);
  }

  async modifyColumn(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): Promise<void> {
    await this.executeDefs([columnDdl.getModifyColumnQueryDef(table, columnName, column)]);
  }

  async renameColumn(table: QueryDefObjectName, column: string, newName: string): Promise<void> {
    await this.executeDefs([columnDdl.getRenameColumnQueryDef(table, column, newName)]);
  }

  async addPrimaryKey(table: QueryDefObjectName, columns: string[]): Promise<void> {
    await this.executeDefs([relationDdl.getAddPrimaryKeyQueryDef(table, columns)]);
  }

  async dropPrimaryKey(table: QueryDefObjectName): Promise<void> {
    await this.executeDefs([relationDdl.getDropPrimaryKeyQueryDef(table)]);
  }

  async addForeignKey(
    table: QueryDefObjectName,
    relationName: string,
    relationDef: ForeignKeyBuilder<any, any>,
  ): Promise<void> {
    await this.executeDefs([
      relationDdl.getAddForeignKeyQueryDef(this, table, relationName, relationDef),
    ]);
  }

  async addIndex(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): Promise<void> {
    await this.executeDefs([relationDdl.getAddIndexQueryDef(table, indexBuilder)]);
  }

  async dropForeignKey(table: QueryDefObjectName, relationName: string): Promise<void> {
    await this.executeDefs([relationDdl.getDropForeignKeyQueryDef(table, relationName)]);
  }

  async dropIndex(table: QueryDefObjectName, columns: string[]): Promise<void> {
    await this.executeDefs([relationDdl.getDropIndexQueryDef(table, columns)]);
  }

  async clearSchema(params: { database: string; schema?: string }): Promise<void> {
    await this.executeDefs([schemaDdl.getClearSchemaQueryDef(params)]);
  }

  async schemaExists(database: string, schema?: string): Promise<boolean> {
    const result = await this.executeDefs([schemaDdl.getSchemaExistsQueryDef(database, schema)]);
    return result[0].length > 0;
  }

  async truncate(table: QueryDefObjectName): Promise<void> {
    await this.executeDefs([schemaDdl.getTruncateQueryDef(table)]);
  }

  // ── DDL QueryDef 생성기 ──

  getCreateTableQueryDef(table: TableBuilder<any, any, any>): QueryDef {
    return tableDdl.getCreateTableQueryDef(this, table);
  }

  getCreateViewQueryDef(view: ViewBuilder<any, any, any>): QueryDef {
    return tableDdl.getCreateViewQueryDef(this, view);
  }

  getCreateProcQueryDef(procedure: ProcedureBuilder<any, any>): QueryDef {
    return tableDdl.getCreateProcQueryDef(this, procedure);
  }

  getCreateObjectQueryDef(
    builder: TableBuilder<any, any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>,
  ): QueryDef {
    return tableDdl.getCreateObjectQueryDef(this, builder);
  }

  getDropTableQueryDef(table: QueryDefObjectName): QueryDef {
    return tableDdl.getDropTableQueryDef(table);
  }

  getRenameTableQueryDef(table: QueryDefObjectName, newName: string): QueryDef {
    return tableDdl.getRenameTableQueryDef(table, newName);
  }

  getDropViewQueryDef(view: QueryDefObjectName): QueryDef {
    return tableDdl.getDropViewQueryDef(view);
  }

  getDropProcQueryDef(procedure: QueryDefObjectName): QueryDef {
    return tableDdl.getDropProcQueryDef(procedure);
  }

  getAddColumnQueryDef(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): QueryDef {
    return columnDdl.getAddColumnQueryDef(table, columnName, column);
  }

  getDropColumnQueryDef(table: QueryDefObjectName, column: string): QueryDef {
    return columnDdl.getDropColumnQueryDef(table, column);
  }

  getModifyColumnQueryDef(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): QueryDef {
    return columnDdl.getModifyColumnQueryDef(table, columnName, column);
  }

  getRenameColumnQueryDef(table: QueryDefObjectName, column: string, newName: string): QueryDef {
    return columnDdl.getRenameColumnQueryDef(table, column, newName);
  }

  getAddPrimaryKeyQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef {
    return relationDdl.getAddPrimaryKeyQueryDef(table, columns);
  }

  getDropPrimaryKeyQueryDef(table: QueryDefObjectName): QueryDef {
    return relationDdl.getDropPrimaryKeyQueryDef(table);
  }

  getAddForeignKeyQueryDef(
    table: QueryDefObjectName,
    relationName: string,
    relationDef: ForeignKeyBuilder<any, any>,
  ): QueryDef {
    return relationDdl.getAddForeignKeyQueryDef(this, table, relationName, relationDef);
  }

  getAddIndexQueryDef(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): QueryDef {
    return relationDdl.getAddIndexQueryDef(table, indexBuilder);
  }

  getDropForeignKeyQueryDef(table: QueryDefObjectName, relationName: string): QueryDef {
    return relationDdl.getDropForeignKeyQueryDef(table, relationName);
  }

  getDropIndexQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef {
    return relationDdl.getDropIndexQueryDef(table, columns);
  }

  getClearSchemaQueryDef(params: { database: string; schema?: string }): QueryDef {
    return schemaDdl.getClearSchemaQueryDef(params);
  }

  getSchemaExistsQueryDef(database: string, schema?: string): QueryDef {
    return schemaDdl.getSchemaExistsQueryDef(database, schema);
  }

  getTruncateQueryDef(table: QueryDefObjectName): QueryDef {
    return schemaDdl.getTruncateQueryDef(table);
  }

  getSwitchFkQueryDef(table: QueryDefObjectName, enabled: boolean): QueryDef {
    return schemaDdl.getSwitchFkQueryDef(table, enabled);
  }

  // ── 초기화 ──

  async initialize(options?: { dbs?: string[]; force?: boolean }): Promise<boolean> {
    return initializeImpl(this, options);
  }

  /** 마이그레이션 정의 — 서브클래스에서 오버라이드 */
  migrations: Migration[] = [];
}
