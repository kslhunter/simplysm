import type {
  DataRecord,
  IDbContextExecutor,
  IsolationLevel,
  Migration,
  ResultMeta,
} from "./types/db";
import { DbErrorCode, DbTransactionError } from "./errors/DbTransactionError";
import type {
  AddColumnQueryDef,
  AddPkQueryDef,
  ClearSchemaQueryDef,
  DropColumnQueryDef,
  DropFkQueryDef,
  DropIdxQueryDef,
  DropPkQueryDef,
  DropProcQueryDef,
  DropTableQueryDef,
  DropViewQueryDef,
  ModifyColumnQueryDef,
  QueryDef,
  QueryDefObjectName,
  RenameColumnQueryDef,
  RenameTableQueryDef,
  SchemaExistsQueryDef,
  SwitchFkQueryDef,
  TruncateQueryDef,
} from "./types/query-def";
import { TableBuilder } from "./schema/table-builder";
import { ViewBuilder } from "./schema/view-builder";
import { ProcedureBuilder } from "./schema/procedure-builder";
import { getMatchedPrimaryKeys, queryable, Queryable } from "./exec/queryable";
import { ColumnBuilder, type ColumnBuilderRecord } from "./schema/factory/column-builder";
import {
  ForeignKeyBuilder,
  ForeignKeyTargetBuilder,
  RelationKeyBuilder,
  RelationKeyTargetBuilder,
} from "./schema/factory/relation-builder";
import { ObjectUtils } from "@simplysm/sd-core-common";
import type { IndexBuilder } from "./schema/factory/index-builder";
import { SystemMigration } from "./models/SystemMigration";

/**
 * DbContext 연결 상태
 *
 * @property ready - 연결 대기 상태 (초기 상태)
 * @property connect - 연결됨 (트랜잭션 없음)
 * @property transact - 트랜잭션 진행 중
 */
export type TDbContextStatus = "ready" | "connect" | "transact";

/**
 * 데이터베이스 컨텍스트 추상 클래스
 *
 * ORM의 핵심 진입점으로, 테이블/뷰/프로시저 정의와 데이터베이스 연결,
 * 트랜잭션 관리, DDL/DML 실행을 담당
 *
 * @example
 * ```typescript
 * // 1. DbContext 상속하여 테이블 정의
 * class MyDb extends DbContext {
 *   readonly user = queryable(this, User);
 *   readonly post = queryable(this, Post);
 * }
 *
 * // 2. Executor와 함께 인스턴스 생성
 * const db = new MyDb(executor, { database: "mydb" });
 *
 * // 3. 트랜잭션 내에서 쿼리 실행
 * await db.connectAsync(async () => {
 *   const users = await db.user().resultAsync();
 *   await db.user().insertAsync([{ name: "홍길동" }]);
 * });
 * ```
 *
 * @see {@link queryable} 테이블 Queryable 생성
 * @see {@link IDbContextExecutor} 쿼리 실행기 인터페이스
 */
export abstract class DbContext {
  //#region ========== 기본 ==========

  /**
   * 현재 연결 상태
   *
   * - `ready`: 연결 대기 (초기 상태)
   * - `connect`: DB 연결됨 (트랜잭션 없음)
   * - `transact`: 트랜잭션 진행 중
   */
  status: TDbContextStatus = "ready";

  /**
   * 마이그레이션 목록
   *
   * 서브클래스에서 override하여 마이그레이션 정의
   *
   * @example
   * ```typescript
   * class MyDb extends DbContext {
   *   readonly migrations: Migration[] = [
   *     {
   *       name: "20240101_add_status",
   *       up: async (db) => {
   *         await db.addColumnAsync(
   *           { database: "mydb", name: "User" },
   *           "status",
   *           c.varchar(20).nullable(),
   *         );
   *       },
   *     },
   *   ];
   * }
   * ```
   */
  readonly migrations: Migration[] = [];

  /** alias 카운터 (queryable/executable 호출 시 증가) */
  private _aliasCounter = 0;

  /**
   * DbContext 생성자
   *
   * @param _executor - 쿼리 실행기 (NodeDbContextExecutor, ServiceDbContextExecutor 등)
   * @param _opt - 데이터베이스 옵션
   * @param _opt.database - 데이터베이스 이름
   * @param _opt.schema - 스키마 이름 (MSSQL: dbo, PostgreSQL: public)
   */
  constructor(
    private readonly _executor: IDbContextExecutor,
    private readonly _opt: {
      database: string;
      schema?: string;
    },
  ) {}

  /** 데이터베이스 이름 */
  get database(): string | undefined {
    return this._opt.database;
  }

  /** 스키마 이름 (MSSQL: dbo, PostgreSQL: public) */
  get schema(): string | undefined {
    return this._opt.schema;
  }

  /**
   * 다음 테이블 alias 반환
   *
   * 서브쿼리/JOIN/재귀 CTE에서 alias 충돌 방지를 위해 T1, T2, T3... 형식으로 생성
   * queryable() 함수 호출 시 내부적으로 사용
   *
   * @returns 순차 증가하는 alias (T1, T2, T3...)
   */
  getNextAlias(): string {
    return `T${++this._aliasCounter}`;
  }

  /**
   * alias 카운터 초기화
   *
   * connectAsync() 또는 connectWithoutTransactionAsync() 시작 시 자동 호출
   */
  resetAliasCounter(): void {
    this._aliasCounter = 0;
  }

  //#endregion

  //#region ========== 기본 테이블 (MIGRATION) ==========

  /**
   * 시스템 마이그레이션 테이블 Queryable
   *
   * 적용된 마이그레이션 이력을 관리하는 내부 테이블
   */
  get systemMigration() {
    return queryable(this, SystemMigration);
  }

  //#endregion

  //#region ========== 연결 관리 ==========

  /**
   * 트랜잭션 없이 연결하여 콜백 실행 후 자동 종료
   *
   * DDL 작업이나 트랜잭션이 필요 없는 조회 작업에 사용
   *
   * @template R - 콜백 반환 타입
   * @param callback - 연결 내에서 실행할 콜백
   * @returns 콜백 반환값
   * @throws 콜백 실행 중 발생한 에러 (연결은 자동 종료됨)
   *
   * @example
   * ```typescript
   * // DDL 작업 (트랜잭션 내 실행 불가)
   * await db.connectWithoutTransactionAsync(async () => {
   *   await db.createTableAsync(User);
   *   await db.addColumnAsync(
   *     { database: "mydb", name: "User" },
   *     "status",
   *     c.varchar(20),
   *   );
   * });
   * ```
   */
  async connectWithoutTransactionAsync<R>(callback: () => Promise<R>): Promise<R> {
    this._validateRelations();
    this.resetAliasCounter();

    await this._executor.connectAsync();
    this.status = "connect";

    let result: R;
    try {
      result = await callback();
    } catch (err) {
      await this._executor.closeAsync();
      this.status = "ready";
      throw err;
    }

    await this._executor.closeAsync();
    this.status = "ready";
    return result;
  }

  /**
   * 트랜잭션 내에서 콜백 실행 (자동 커밋/롤백)
   *
   * 연결 → 트랜잭션 시작 → 콜백 실행 → 커밋 → 연결 종료
   * 에러 발생 시 자동 롤백 후 연결 종료
   *
   * @template R - 콜백 반환 타입
   * @param fn - 트랜잭션 내에서 실행할 콜백
   * @param isolationLevel - 트랜잭션 격리 수준 (선택)
   * @returns 콜백 반환값
   * @throws 콜백 실행 중 발생한 에러 (롤백 및 연결 종료됨)
   *
   * @example
   * ```typescript
   * // 기본 사용
   * const result = await db.connectAsync(async () => {
   *   const users = await db.user().resultAsync();
   *   await db.user().insertAsync([{ name: "홍길동" }]);
   *   return users;
   * });
   *
   * // 격리 수준 지정
   * await db.connectAsync(async () => {
   *   await db.user().updateAsync({ name: "김철수" }, (u) => [
   *     expr.eq(u.id, 1),
   *   ]);
   * }, "SERIALIZABLE");
   * ```
   *
   * @see {@link transAsync} 이미 연결된 상태에서 트랜잭션 시작
   */
  async connectAsync<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R> {
    this._validateRelations();
    this.resetAliasCounter();

    await this._executor.connectAsync();
    this.status = "connect";

    await this._executor.beginTransactionAsync(isolationLevel);
    this.status = "transact";

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransactionAsync();
      this.status = "connect";
    } catch (err) {
      try {
        await this._executor.rollbackTransactionAsync();
        this.status = "connect";
      } catch (err1) {
        // DbTransactionError 코드 기반 판단
        if (err1 instanceof DbTransactionError) {
          if (err1.code !== DbErrorCode.NO_ACTIVE_TRANSACTION) {
            await this._executor.closeAsync();
            this.status = "ready";
            throw err1;
          }
        } else {
          // DbTransactionError가 아닌 에러는 항상 re-throw
          await this._executor.closeAsync();
          this.status = "ready";
          throw err1;
        }
      }

      await this._executor.closeAsync();
      this.status = "ready";
      throw err;
    }

    await this._executor.closeAsync();
    this.status = "ready";
    return result;
  }

  /**
   * 이미 연결된 상태에서 트랜잭션 시작 (자동 커밋/롤백)
   *
   * connectWithoutTransactionAsync 내에서 부분적으로 트랜잭션이 필요할 때 사용
   * 연결 관리는 외부에서 담당하므로 연결 종료하지 않음
   *
   * @template R - 콜백 반환 타입
   * @param fn - 트랜잭션 내에서 실행할 콜백
   * @param isolationLevel - 트랜잭션 격리 수준 (선택)
   * @returns 콜백 반환값
   * @throws {Error} 이미 트랜잭션 상태일 때
   * @throws 콜백 실행 중 발생한 에러 (롤백됨)
   *
   * @example
   * ```typescript
   * await db.connectWithoutTransactionAsync(async () => {
   *   // DDL 작업 (트랜잭션 외부)
   *   await db.createTableAsync(User);
   *
   *   // DML 작업 (트랜잭션 내부)
   *   await db.transAsync(async () => {
   *     await db.user().insertAsync([{ name: "홍길동" }]);
   *   });
   * });
   * ```
   *
   * @see {@link connectAsync} 연결부터 트랜잭션까지 한번에 처리
   */
  async transAsync<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R> {
    if (this.status === "transact") {
      throw new Error("이미 TRANSACTION 상태입니다.");
    }

    await this._executor.beginTransactionAsync(isolationLevel);
    this.status = "transact";

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransactionAsync();
      this.status = "connect";
    } catch (err) {
      try {
        await this._executor.rollbackTransactionAsync();
        this.status = "connect";
      } catch (err1) {
        // 롤백 실패 시 - DbTransactionError 코드 기반 판단
        // 연결은 외부에서 관리하므로 close하지 않음
        if (err1 instanceof DbTransactionError) {
          if (err1.code !== DbErrorCode.NO_ACTIVE_TRANSACTION) {
            throw err1;
          }
        } else {
          // DbTransactionError가 아닌 에러는 항상 re-throw
          throw err1;
        }
        // NO_ACTIVE_TRANSACTION 에러면 무시하고 원래 에러 throw
        this.status = "connect";
      }
      throw err;
    }

    return result;
  }

  //#endregion

  //#region ========== 쿼리 실행 ==========

  /**
   * QueryDef 배열 실행
   *
   * Queryable/Executable이 생성한 QueryDef를 직접 실행
   * 트랜잭션 상태에서 DDL 실행 시 에러 발생
   *
   * @template T - 결과 레코드 타입
   * @param defs - 실행할 QueryDef 배열
   * @param resultMetas - 결과 메타데이터 (타입 변환용)
   * @returns 각 QueryDef 실행 결과 배열
   * @throws {Error} 트랜잭션 상태에서 DDL 실행 시
   *
   * @example
   * ```typescript
   * // 일반적으로는 Queryable 메서드 사용을 권장
   * // 직접 실행이 필요한 경우만 사용
   * const selectDef = db.user().getSelectQueryDef();
   * const results = await db.executeDefsAsync([selectDef]);
   * ```
   */
  executeDefsAsync<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]> {
    const ddlTypes = [
      "clearSchema",
      "createTable",
      "dropTable",
      "renameTable",
      "truncate",
      "addColumn",
      "dropColumn",
      "modifyColumn",
      "renameColumn",
      "dropPk",
      "addPk",
      "addFk",
      "dropFk",
      "addIdx",
      "dropIdx",
      "createView",
      "dropView",
      "createProc",
      "dropProc",
      // switchFk는 DDL이 아님 (트랜잭션 내 사용 가능)
    ];
    if (this.status === "transact" && defs.some((d) => ddlTypes.includes(d.type))) {
      throw new Error("TRANSACTION 상태에서는 DDL을 실행할 수 없습니다.");
    }

    return this._executor.executeDefsAsync(defs, resultMetas);
  }

  //#endregion

  //#region ========== 초기화 ==========

  /**
   * Code First 데이터베이스 초기화
   *
   * DbContext에 정의된 테이블/뷰/프로시저를 데이터베이스에 생성하고,
   * 마이그레이션을 적용
   *
   * @param options - 초기화 옵션
   * @param options.dbs - 초기화 대상 데이터베이스 목록 (미지정 시 현재 database)
   * @param options.force - true 시 기존 스키마 삭제 후 전체 재생성
   * @throws {Error} 초기화할 데이터베이스가 없을 때
   * @throws {Error} 지정한 데이터베이스가 존재하지 않을 때
   *
   * 동작 방식:
   * - **force=true**: clearSchema → 전체 생성 → 모든 migration "적용됨" 등록
   * - **force=false** (기본):
   *   - SystemMigration 테이블 없음: 전체 생성 + 모든 migration 등록
   *   - SystemMigration 테이블 있음: 미적용 migration만 실행
   *
   * @example
   * ```typescript
   * // 기본 초기화 (마이그레이션 기반)
   * await db.connectWithoutTransactionAsync(async () => {
   *   await db.initializeAsync();
   * });
   *
   * // 강제 초기화 (기존 데이터 삭제)
   * await db.connectWithoutTransactionAsync(async () => {
   *   await db.initializeAsync({ force: true });
   * });
   * ```
   */
  async initializeAsync(options?: { dbs?: string[]; force?: boolean }): Promise<void> {
    const dbNames = options?.dbs ?? (this.database !== undefined ? [this.database] : []);
    if (dbNames.length < 1) {
      throw new Error("초기화할 데이터베이스가 없습니다.");
    }

    const force = options?.force ?? false;

    // 1. DB 존재 확인
    for (const dbName of dbNames) {
      const schemaExists = await this.schemaExistsAsync(dbName);
      if (!schemaExists) {
        throw new Error(`데이터베이스 '${dbName}'가 존재하지 않습니다.`);
      }
    }

    if (force) {
      // 2. force: dbs 전체 초기화
      for (const dbName of dbNames) {
        await this.clearSchemaAsync({ database: dbName, schema: this.schema });
      }
      await this._createAllObjectsAsync();

      // 모든 migration을 "적용됨"으로 등록
      if (this.migrations.length > 0) {
        await this.systemMigration().insertAsync(this.migrations.map((m) => ({ code: m.name })));
      }
    } else {
      // 3. Migration 기반 초기화
      let appliedMigrations: { code: string }[] | undefined;
      try {
        appliedMigrations = await this.systemMigration().resultAsync();
      } catch {
        // 테이블 없음 = 신규 환경
      }

      if (appliedMigrations == null) {
        // 신규 환경: 전체 생성
        await this._createAllObjectsAsync();

        // 모든 migration을 "적용됨"으로 등록
        if (this.migrations.length > 0) {
          await this.systemMigration().insertAsync(this.migrations.map((m) => ({ code: m.name })));
        }
      } else {
        // 기존 환경: 미적용 migration만 실행
        const appliedCodes = new Set(appliedMigrations.map((m) => m.code));
        const pendingMigrations = this.migrations.filter((m) => !appliedCodes.has(m.name));

        for (const migration of pendingMigrations) {
          await migration.up(this);
          await this.systemMigration().insertAsync([{ code: migration.name }]);
        }
      }
    }
  }

  /**
   * 전체 객체 생성 (테이블/뷰/프로시저/FK/Index)
   */
  private async _createAllObjectsAsync(): Promise<void> {
    // 1. 테이블/뷰/프로시저 생성
    const builders = this._getBuilders();
    const createDefs: QueryDef[] = [];
    for (const builder of builders) {
      createDefs.push(this.getCreateObjectQueryDef(builder));
    }
    if (createDefs.length > 0) {
      await this.executeDefsAsync(createDefs);
    }

    // 2. FK 생성 (TableBuilder만)
    const tables = builders.filter((b) => b instanceof TableBuilder);
    const addFkDefs: QueryDef[] = [];
    for (const table of tables) {
      const relations = table.meta.relations;
      if (relations == null) continue;

      const tableDef = this.getQueryDefObjectName(table);
      for (const [relationName, relationDef] of Object.entries(relations)) {
        if (!(relationDef instanceof ForeignKeyBuilder)) continue;

        addFkDefs.push(this.getAddFkQueryDef(tableDef, relationName, relationDef));
      }
    }
    if (addFkDefs.length > 0) {
      await this.executeDefsAsync(addFkDefs);
    }

    // 3. Index 생성 (TableBuilder만)
    const createIndexDefs: QueryDef[] = [];
    for (const table of tables) {
      const indexes = table.meta.indexes;
      if (indexes == null || indexes.length === 0) continue;

      const indexTableDef = this.getQueryDefObjectName(table);
      for (const indexBuilder of indexes) {
        createIndexDefs.push(this.getAddIdxQueryDef(indexTableDef, indexBuilder));
      }
    }
    if (createIndexDefs.length > 0) {
      await this.executeDefsAsync(createIndexDefs);
    }
  }

  /**
   * ForeignKeyTarget/RelationKeyTarget 관계의 유효성 검증
   * - targetTableFn()이 반환하는 테이블에 relationName에 해당하는 FK/RelationKey가 있는지 확인
   */
  private _validateRelations(): void {
    const builders = this._getBuilders();
    const tables = builders.filter((b) => b instanceof TableBuilder);

    for (const table of tables) {
      const relations = table.meta.relations;
      if (relations == null) continue;

      for (const [relName, relDef] of Object.entries(relations)) {
        if (
          !(relDef instanceof ForeignKeyTargetBuilder) &&
          !(relDef instanceof RelationKeyTargetBuilder)
        ) {
          continue;
        }

        const targetTable = relDef.meta.targetTableFn();
        const fkRelName = relDef.meta.relationName;
        const fkRel = targetTable.meta.relations?.[fkRelName];

        if (!(fkRel instanceof ForeignKeyBuilder) && !(fkRel instanceof RelationKeyBuilder)) {
          throw new Error(
            `Invalid relation target: ${table.meta.name}.${relName}이 참조하는 ` +
              `'${fkRelName}'이(가) ${targetTable.meta.name}의 유효한 ForeignKey/RelationKey가 아닙니다.`,
          );
        }
      }
    }
  }

  /**
   * DbContext의 모든 Builder 수집 (Table/View/Procedure)
   */
  private _getBuilders(): (
    | TableBuilder<any, any>
    | ViewBuilder<any, any, any>
    | ProcedureBuilder<any, any>
  )[] {
    const builders: (
      | TableBuilder<any, any>
      | ViewBuilder<any, any, any>
      | ProcedureBuilder<any, any>
    )[] = [];

    for (const key of Object.keys(this)) {
      const value = this[key as keyof this];

      // Queryable → Builder 추출
      if (value instanceof Queryable) {
        const from = value.meta.from;
        if (
          from instanceof TableBuilder ||
          from instanceof ViewBuilder ||
          from instanceof ProcedureBuilder
        ) {
          builders.push(from);
        }
      }
    }

    return builders;
  }

  //#endregion

  //#region ========== DDL - Table/View/Procedure 생성 ==========

  /**
   * 테이블 생성
   *
   * @param table - 생성할 테이블 빌더
   *
   * @example
   * ```typescript
   * await db.createTableAsync(User);
   * ```
   */
  async createTableAsync(table: TableBuilder<any, any>): Promise<void> {
    await this.executeDefsAsync([this.getCreateTableQueryDef(table)]);
  }

  /**
   * 테이블 삭제
   *
   * @param table - 삭제할 테이블 정보 (database, schema, name)
   *
   * @example
   * ```typescript
   * await db.dropTableAsync({ database: "mydb", name: "User" });
   * ```
   */
  async dropTableAsync(table: QueryDefObjectName): Promise<void> {
    await this.executeDefsAsync([this.getDropTableQueryDef(table)]);
  }

  /**
   * 테이블 이름 변경
   *
   * @param table - 변경할 테이블 정보
   * @param newName - 새 테이블 이름
   *
   * @example
   * ```typescript
   * await db.renameTableAsync({ database: "mydb", name: "User" }, "Member");
   * ```
   */
  async renameTableAsync(table: QueryDefObjectName, newName: string): Promise<void> {
    await this.executeDefsAsync([this.getRenameTableQueryDef(table, newName)]);
  }

  /**
   * 뷰 생성
   *
   * @param view - 생성할 뷰 빌더
   *
   * @example
   * ```typescript
   * await db.createViewAsync(UserSummary);
   * ```
   */
  async createViewAsync(view: ViewBuilder<any, any, any>): Promise<void> {
    await this.executeDefsAsync([this.getCreateViewQueryDef(view)]);
  }

  /**
   * 뷰 삭제
   *
   * @param view - 삭제할 뷰 정보
   *
   * @example
   * ```typescript
   * await db.dropViewAsync({ database: "mydb", name: "UserSummary" });
   * ```
   */
  async dropViewAsync(view: QueryDefObjectName): Promise<void> {
    await this.executeDefsAsync([this.getDropViewQueryDef(view)]);
  }

  /**
   * 저장 프로시저 생성
   *
   * @param procedure - 생성할 프로시저 빌더
   *
   * @example
   * ```typescript
   * await db.createProcAsync(GetUserById);
   * ```
   */
  async createProcAsync(procedure: ProcedureBuilder<any, any>): Promise<void> {
    await this.executeDefsAsync([this.getCreateProcQueryDef(procedure)]);
  }

  /**
   * 저장 프로시저 삭제
   *
   * @param procedure - 삭제할 프로시저 정보
   *
   * @example
   * ```typescript
   * await db.dropProcAsync({ database: "mydb", name: "GetUserById" });
   * ```
   */
  async dropProcAsync(procedure: QueryDefObjectName): Promise<void> {
    await this.executeDefsAsync([this.getDropProcQueryDef(procedure)]);
  }

  /**
   * Builder를 CREATE QueryDef로 변환
   *
   * @param builder - Table/View/Procedure 빌더
   * @returns CREATE TABLE/VIEW/PROCEDURE QueryDef
   * @throws {Error} 알 수 없는 빌더 타입일 때
   */
  getCreateObjectQueryDef(
    builder: TableBuilder<any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>,
  ): QueryDef {
    if (builder instanceof TableBuilder) {
      return this.getCreateTableQueryDef(builder);
    } else if (builder instanceof ViewBuilder) {
      return this.getCreateViewQueryDef(builder);
    } else if (builder instanceof ProcedureBuilder) {
      return this.getCreateProcQueryDef(builder);
    }

    throw new Error(
      `알 수 없는 빌더 타입: ${(builder as any)?.constructor?.name ?? typeof builder}`,
    );
  }

  /**
   * CREATE TABLE QueryDef 생성
   *
   * @param table - 테이블 빌더
   * @returns CREATE TABLE QueryDef
   * @throws {Error} 테이블에 컬럼이 없을 때
   */
  getCreateTableQueryDef(table: TableBuilder<any, any>): QueryDef {
    const columns = table.meta.columns as ColumnBuilderRecord | undefined;
    if (columns == null) {
      throw new Error(`테이블 '${table.meta.name}'에 컬럼이 없습니다.`);
    }

    return {
      type: "createTable",
      table: this.getQueryDefObjectName(table),
      columns: Object.entries(columns).map(([key, col]) => ({
        name: key,
        dataType: col.meta.dataType,
        autoIncrement: col.meta.autoIncrement,
        nullable: col.meta.nullable,
        default: col.meta.default,
      })),
      primaryKey: table.meta.primaryKey,
    };
  }

  /**
   * CREATE VIEW QueryDef 생성
   *
   * @param view - 뷰 빌더
   * @returns CREATE VIEW QueryDef
   * @throws {Error} 뷰에 viewFn이 없을 때
   */
  getCreateViewQueryDef(view: ViewBuilder<any, any, any>): QueryDef {
    if (view.meta.viewFn == null) {
      throw new Error(`뷰 '${view.meta.name}'에 viewFn이 없습니다.`);
    }

    const qr = view.meta.viewFn(this);
    const selectDef = qr.getSelectQueryDef();

    return {
      type: "createView",
      view: {
        database: view.meta.database ?? this.database,
        schema: view.meta.schema ?? this.schema,
        name: view.meta.name,
      },
      queryDef: selectDef,
    };
  }

  /**
   * CREATE PROCEDURE QueryDef 생성
   *
   * @param procedure - 프로시저 빌더
   * @returns CREATE PROCEDURE QueryDef
   * @throws {Error} 프로시저에 본문이 없을 때
   */
  getCreateProcQueryDef(procedure: ProcedureBuilder<any, any>): QueryDef {
    if (procedure.meta.query == null) {
      throw new Error(`프로시저 '${procedure.meta.name}'에 본문이 없습니다.`);
    }

    const params = procedure.meta.params as ColumnBuilderRecord | undefined;
    const returns = procedure.meta.returns as ColumnBuilderRecord | undefined;

    return {
      type: "createProc",
      procedure: {
        database: procedure.meta.database ?? this.database,
        schema: procedure.meta.schema ?? this.schema,
        name: procedure.meta.name,
      },
      params: params ? Object.entries(params).map(([key, col]) => ({
        name: key,
        dataType: col.meta.dataType,
        nullable: col.meta.nullable,
        default: col.meta.default,
      })) : undefined,
      returns: returns ? Object.entries(returns).map(([key, col]) => ({
        name: key,
        dataType: col.meta.dataType,
        nullable: col.meta.nullable,
      })) : undefined,
      query: procedure.meta.query,
    };
  }

  /** DROP TABLE QueryDef 생성 */
  getDropTableQueryDef(table: QueryDefObjectName): DropTableQueryDef {
    return { type: "dropTable", table };
  }

  /** RENAME TABLE QueryDef 생성 */
  getRenameTableQueryDef(table: QueryDefObjectName, newName: string): RenameTableQueryDef {
    return { type: "renameTable", table, newName };
  }

  /** DROP VIEW QueryDef 생성 */
  getDropViewQueryDef(view: QueryDefObjectName): DropViewQueryDef {
    return { type: "dropView", view };
  }

  /** DROP PROCEDURE QueryDef 생성 */
  getDropProcQueryDef(procedure: QueryDefObjectName): DropProcQueryDef {
    return { type: "dropProc", procedure };
  }

  //#endregion

  //#region ========== DDL - Column ==========

  /**
   * 컬럼 추가
   *
   * @param table - 테이블 정보
   * @param columnName - 추가할 컬럼 이름
   * @param column - 컬럼 빌더 (타입, nullable, default 등)
   *
   * @example
   * ```typescript
   * await db.addColumnAsync(
   *   { database: "mydb", name: "User" },
   *   "status",
   *   c.varchar(20).nullable(),
   * );
   * ```
   */
  async addColumnAsync(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): Promise<void> {
    await this.executeDefsAsync([this.getAddColumnQueryDef(table, columnName, column)]);
  }

  /**
   * 컬럼 삭제
   *
   * @param table - 테이블 정보
   * @param column - 삭제할 컬럼 이름
   *
   * @example
   * ```typescript
   * await db.dropColumnAsync(
   *   { database: "mydb", name: "User" },
   *   "status",
   * );
   * ```
   */
  async dropColumnAsync(table: QueryDefObjectName, column: string): Promise<void> {
    await this.executeDefsAsync([this.getDropColumnQueryDef(table, column)]);
  }

  /**
   * 컬럼 수정
   *
   * @param table - 테이블 정보
   * @param columnName - 수정할 컬럼 이름
   * @param column - 새 컬럼 정의
   *
   * @example
   * ```typescript
   * await db.modifyColumnAsync(
   *   { database: "mydb", name: "User" },
   *   "status",
   *   c.varchar(50).nullable(),  // 길이 변경
   * );
   * ```
   */
  async modifyColumnAsync(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): Promise<void> {
    await this.executeDefsAsync([this.getModifyColumnQueryDef(table, columnName, column)]);
  }

  /**
   * 컬럼 이름 변경
   *
   * @param table - 테이블 정보
   * @param column - 현재 컬럼 이름
   * @param newName - 새 컬럼 이름
   *
   * @example
   * ```typescript
   * await db.renameColumnAsync(
   *   { database: "mydb", name: "User" },
   *   "status",
   *   "userStatus",
   * );
   * ```
   */
  async renameColumnAsync(
    table: QueryDefObjectName,
    column: string,
    newName: string,
  ): Promise<void> {
    await this.executeDefsAsync([this.getRenameColumnQueryDef(table, column, newName)]);
  }

  /** ADD COLUMN QueryDef 생성 */
  getAddColumnQueryDef(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): AddColumnQueryDef {
    return {
      type: "addColumn",
      table,
      column: {
        name: columnName,
        dataType: column.meta.dataType,
        autoIncrement: column.meta.autoIncrement,
        nullable: column.meta.nullable,
        default: column.meta.default,
      },
    };
  }

  /** DROP COLUMN QueryDef 생성 */
  getDropColumnQueryDef(table: QueryDefObjectName, column: string): DropColumnQueryDef {
    return { type: "dropColumn", table, column };
  }

  /** MODIFY COLUMN QueryDef 생성 */
  getModifyColumnQueryDef(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): ModifyColumnQueryDef {
    return {
      type: "modifyColumn",
      table,
      column: {
        name: columnName,
        dataType: column.meta.dataType,
        autoIncrement: column.meta.autoIncrement,
        nullable: column.meta.nullable,
        default: column.meta.default,
      },
    };
  }

  /** RENAME COLUMN QueryDef 생성 */
  getRenameColumnQueryDef(
    table: QueryDefObjectName,
    column: string,
    newName: string,
  ): RenameColumnQueryDef {
    return { type: "renameColumn", table, column, newName };
  }

  //#endregion

  //#region ========== DDL - PK/FK/Index ==========

  /**
   * Primary Key 추가
   *
   * @param table - 테이블 정보
   * @param columns - PK 구성 컬럼 배열
   *
   * @example
   * ```typescript
   * await db.addPkAsync(
   *   { database: "mydb", name: "User" },
   *   ["id"],
   * );
   * ```
   */
  async addPkAsync(table: QueryDefObjectName, columns: string[]): Promise<void> {
    await this.executeDefsAsync([this.getAddPkQueryDef(table, columns)]);
  }

  /**
   * Primary Key 삭제
   *
   * @param table - 테이블 정보
   *
   * @example
   * ```typescript
   * await db.dropPkAsync({ database: "mydb", name: "User" });
   * ```
   */
  async dropPkAsync(table: QueryDefObjectName): Promise<void> {
    await this.executeDefsAsync([this.getDropPkQueryDef(table)]);
  }

  /**
   * Foreign Key 추가
   *
   * @param table - 테이블 정보
   * @param relationName - 관계 이름 (FK_테이블명_관계이름 형식으로 FK 이름 생성)
   * @param relationDef - ForeignKey 빌더
   *
   * @example
   * ```typescript
   * await db.addFkAsync(
   *   { database: "mydb", name: "Post" },
   *   "author",
   *   ForeignKey(User, ["authorId"]),
   * );
   * ```
   */
  async addFkAsync(
    table: QueryDefObjectName,
    relationName: string,
    relationDef: ForeignKeyBuilder<any, any>,
  ): Promise<void> {
    await this.executeDefsAsync([this.getAddFkQueryDef(table, relationName, relationDef)]);
  }

  /**
   * 인덱스 추가
   *
   * @param table - 테이블 정보
   * @param indexBuilder - 인덱스 빌더
   *
   * @example
   * ```typescript
   * await db.addIdxAsync(
   *   { database: "mydb", name: "User" },
   *   Index(["email"]).unique(),
   * );
   * ```
   */
  async addIdxAsync(
    table: QueryDefObjectName,
    indexBuilder: IndexBuilder<string[]>,
  ): Promise<void> {
    await this.executeDefsAsync([this.getAddIdxQueryDef(table, indexBuilder)]);
  }

  /**
   * Foreign Key 삭제
   *
   * @param table - 테이블 정보
   * @param relationName - 관계 이름
   *
   * @example
   * ```typescript
   * await db.dropFkAsync({ database: "mydb", name: "Post" }, "author");
   * ```
   */
  async dropFkAsync(table: QueryDefObjectName, relationName: string): Promise<void> {
    await this.executeDefsAsync([this.getDropFkQueryDef(table, relationName)]);
  }

  /**
   * 인덱스 삭제
   *
   * @param table - 테이블 정보
   * @param columns - 인덱스 구성 컬럼 배열 (인덱스 이름 추론용)
   *
   * @example
   * ```typescript
   * await db.dropIdxAsync({ database: "mydb", name: "User" }, ["email"]);
   * ```
   */
  async dropIdxAsync(table: QueryDefObjectName, columns: string[]): Promise<void> {
    await this.executeDefsAsync([this.getDropIdxQueryDef(table, columns)]);
  }

  /** DROP PRIMARY KEY QueryDef 생성 */
  getDropPkQueryDef(table: QueryDefObjectName): DropPkQueryDef {
    return { type: "dropPk", table };
  }

  /** ADD PRIMARY KEY QueryDef 생성 */
  getAddPkQueryDef(table: QueryDefObjectName, columns: string[]): AddPkQueryDef {
    return { type: "addPk", table, columns };
  }

  /** ADD FOREIGN KEY QueryDef 생성 */
  getAddFkQueryDef(
    table: QueryDefObjectName,
    relationName: string,
    relationDef: ForeignKeyBuilder<any, any>,
  ): QueryDef {
    const targetTable = relationDef.meta.targetFn();
    const fkColumns = relationDef.meta.columns;
    const pk = getMatchedPrimaryKeys(fkColumns, targetTable);

    return {
      type: "addFk",
      table,
      foreignKey: {
        name: `FK_${table.name}_${relationName}`,
        fkColumns,
        targetTable: this.getQueryDefObjectName(targetTable),
        targetPkColumns: pk,
      },
    };
  }

  /** ADD INDEX QueryDef 생성 */
  getAddIdxQueryDef(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): QueryDef {
    const indexMeta = indexBuilder.meta;

    return {
      type: "addIdx",
      table,
      index: {
        name: indexBuilder.meta.name ?? `IDX_${table.name}_${indexMeta.columns.join("_")}`,
        columns: indexMeta.columns.map((col, i) => ({
          name: col,
          orderBy: indexMeta.orderBy?.[i] ?? "ASC",
        })),
        unique: indexMeta.unique,
      },
    };
  }

  /** DROP FOREIGN KEY QueryDef 생성 */
  getDropFkQueryDef(table: QueryDefObjectName, relationName: string): DropFkQueryDef {
    return { type: "dropFk", table, foreignKey: `FK_${table.name}_${relationName}` };
  }

  /** DROP INDEX QueryDef 생성 */
  getDropIdxQueryDef(table: QueryDefObjectName, columns: string[]): DropIdxQueryDef {
    return { type: "dropIdx", table, index: `IDX_${table.name}_${columns.join("_")}` };
  }

  //#endregion

  //#region ========== DDL - Database ==========

  /**
   * 스키마 내 모든 객체 삭제
   *
   * 지정한 database/schema 내의 모든 테이블, 뷰, 프로시저 등을 삭제
   *
   * @param params - 대상 database/schema
   * @param params.database - 데이터베이스 이름
   * @param params.schema - 스키마 이름 (MSSQL/PostgreSQL)
   *
   * @example
   * ```typescript
   * await db.clearSchemaAsync({ database: "mydb", schema: "public" });
   * ```
   */
  async clearSchemaAsync(params: { database: string; schema?: string }): Promise<void> {
    const queryDef = this.getClearSchemaQueryDef(params);
    await this.executeDefsAsync([queryDef]);
  }

  /**
   * 스키마 존재 여부 확인
   *
   * @param database - 데이터베이스 이름
   * @param schema - 스키마 이름 (MSSQL/PostgreSQL)
   * @returns 스키마 존재 여부
   *
   * @example
   * ```typescript
   * const exists = await db.schemaExistsAsync("mydb");
   * if (!exists) {
   *   throw new Error("Database not found");
   * }
   * ```
   */
  async schemaExistsAsync(database: string, schema?: string): Promise<boolean> {
    const queryDef = this.getSchemaExistsQueryDef(database, schema);
    const result = await this.executeDefsAsync([queryDef]);
    return result[0].length > 0;
  }

  /** CLEAR SCHEMA QueryDef 생성 */
  getClearSchemaQueryDef(params: { database: string; schema?: string }): ClearSchemaQueryDef {
    return { type: "clearSchema", database: params.database, schema: params.schema };
  }

  /** SCHEMA EXISTS QueryDef 생성 */
  getSchemaExistsQueryDef(database: string, schema?: string): SchemaExistsQueryDef {
    return { type: "schemaExists", database, schema };
  }

  //#endregion

  //#region ========== DDL - Utils ==========

  /**
   * 테이블 데이터 전체 삭제 (TRUNCATE)
   *
   * DELETE와 달리 로그 없이 빠르게 삭제하며, AUTO_INCREMENT 초기화
   *
   * @param table - 테이블 정보
   *
   * @example
   * ```typescript
   * await db.truncateAsync({ database: "mydb", name: "User" });
   * ```
   */
  async truncateAsync(table: QueryDefObjectName): Promise<void> {
    await this.executeDefsAsync([this.getTruncateQueryDef(table)]);
  }

  /**
   * Foreign Key 제약 조건 ON/OFF
   *
   * 대량 데이터 작업 시 FK 제약 임시 해제에 사용
   * 트랜잭션 내에서 사용 가능 (DDL이 아님)
   *
   * @param table - 테이블 정보
   * @param switch_ - "on" 또는 "off"
   *
   * @example
   * ```typescript
   * await db.connectAsync(async () => {
   *   await db.switchFkAsync({ database: "mydb", name: "Post" }, "off");
   *   await db.post().deleteAsync(() => []);
   *   await db.switchFkAsync({ database: "mydb", name: "Post" }, "on");
   * });
   * ```
   */
  async switchFkAsync(table: QueryDefObjectName, switch_: "on" | "off"): Promise<void> {
    await this.executeDefsAsync([this.getSwitchFkQueryDef(table, switch_)]);
  }

  /** TRUNCATE TABLE QueryDef 생성 */
  getTruncateQueryDef(table: QueryDefObjectName): TruncateQueryDef {
    return { type: "truncate", table };
  }

  /** SWITCH FK QueryDef 생성 */
  getSwitchFkQueryDef(table: QueryDefObjectName, switch_: "on" | "off"): SwitchFkQueryDef {
    return { type: "switchFk", table, switch: switch_ };
  }

  //#endregion

  //#region ========== Helpers ==========

  /**
   * TableBuilder/ViewBuilder를 QueryDefObjectName으로 변환
   *
   * @param tableOrView - 테이블 또는 뷰 빌더
   * @returns QueryDef에서 사용할 객체 이름 정보
   */
  getQueryDefObjectName(
    tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>,
  ): QueryDefObjectName {
    return ObjectUtils.clearUndefined({
      database: tableOrView.meta.database ?? this.database,
      schema: tableOrView.meta.schema ?? this.schema,
      name: tableOrView.meta.name,
    });
  }

  //#endregion
}
