import type { DataRecord, DbContextExecutor, IsolationLevel, Migration, ResultMeta } from "./types/db";
import { DbErrorCode, DbTransactionError } from "./errors/db-transaction-error";
import {
  DDL_TYPES,
  type AddColumnQueryDef,
  type AddPkQueryDef,
  type ClearSchemaQueryDef,
  type DropColumnQueryDef,
  type DropFkQueryDef,
  type DropIdxQueryDef,
  type DropPkQueryDef,
  type DropProcQueryDef,
  type DropTableQueryDef,
  type DropViewQueryDef,
  type ModifyColumnQueryDef,
  type QueryDef,
  type QueryDefObjectName,
  type RenameColumnQueryDef,
  type RenameTableQueryDef,
  type SchemaExistsQueryDef,
  type SwitchFkQueryDef,
  type TruncateQueryDef,
} from "./types/query-def";
import { TableBuilder } from "./schema/table-builder";
import { ViewBuilder } from "./schema/view-builder";
import { ProcedureBuilder } from "./schema/procedure-builder";
import { queryable, Queryable } from "./exec/queryable";
import { ColumnBuilder } from "./schema/factory/column-builder";
import type { ForeignKeyBuilder } from "./schema/factory/relation-builder";
import type { IndexBuilder } from "./schema/factory/index-builder";
import { SystemMigration } from "./models/system-migration";
import type { DbContextDef, DbContextStatus } from "./types/db-context-def";
import * as tableDdl from "./ddl/table-ddl";
import * as columnDdl from "./ddl/column-ddl";
import * as relationDdl from "./ddl/relation-ddl";
import * as schemaDdl from "./ddl/schema-ddl";
import { initialize as initializeImpl, validateRelations as validateRelationsImpl } from "./ddl/initialize";

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
 * await db.connect(async () => {
 *   const users = await db.user().result();
 *   await db.user().insert([{ name: "홍길동" }]);
 * });
 * ```
 *
 * @see {@link queryable} 테이블 Queryable 생성
 * @see {@link DbContextExecutor} 쿼리 실행기 인터페이스
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
  status: DbContextStatus = "ready";

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
   *         await db.addColumn(
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
    private readonly _executor: DbContextExecutor,
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
   * connect() 또는 connectWithoutTransaction() 시작 시 자동 호출
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
   * await db.connectWithoutTransaction(async () => {
   *   await db.createTable(User);
   *   await db.addColumn(
   *     { database: "mydb", name: "User" },
   *     "status",
   *     c.varchar(20),
   *   );
   * });
   * ```
   */
  async connectWithoutTransaction<R>(callback: () => Promise<R>): Promise<R> {
    validateRelationsImpl(this._getDbContextDef());
    this.resetAliasCounter();

    await this._executor.connect();
    this.status = "connect";

    let result: R;
    try {
      result = await callback();
    } catch (err) {
      await this._executor.close();
      this.status = "ready";
      throw err;
    }

    await this._executor.close();
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
   * const result = await db.connect(async () => {
   *   const users = await db.user().result();
   *   await db.user().insert([{ name: "홍길동" }]);
   *   return users;
   * });
   *
   * // 격리 수준 지정
   * await db.connect(async () => {
   *   await db.user().update({ name: "김철수" }, (u) => [
   *     expr.eq(u.id, 1),
   *   ]);
   * }, "SERIALIZABLE");
   * ```
   *
   * @see {@link trans} 이미 연결된 상태에서 트랜잭션 시작
   */
  async connect<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R> {
    validateRelationsImpl(this._getDbContextDef());
    this.resetAliasCounter();

    await this._executor.connect();
    this.status = "connect";

    await this._executor.beginTransaction(isolationLevel);
    this.status = "transact";

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransaction();
      this.status = "connect";
    } catch (err) {
      try {
        await this._executor.rollbackTransaction();
        this.status = "connect";
      } catch (err1) {
        // DbTransactionError 코드 기반 판단
        if (err1 instanceof DbTransactionError) {
          if (err1.code !== DbErrorCode.NO_ACTIVE_TRANSACTION) {
            await this._executor.close();
            this.status = "ready";
            throw err1;
          }
        } else {
          // DbTransactionError가 아닌 에러는 항상 re-throw
          await this._executor.close();
          this.status = "ready";
          throw err1;
        }
      }

      await this._executor.close();
      this.status = "ready";
      throw err;
    }

    await this._executor.close();
    this.status = "ready";
    return result;
  }

  /**
   * 이미 연결된 상태에서 트랜잭션 시작 (자동 커밋/롤백)
   *
   * connectWithoutTransaction 내에서 부분적으로 트랜잭션이 필요할 때 사용
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
   * await db.connectWithoutTransaction(async () => {
   *   // DDL 작업 (트랜잭션 외부)
   *   await db.createTable(User);
   *
   *   // DML 작업 (트랜잭션 내부)
   *   await db.trans(async () => {
   *     await db.user().insert([{ name: "홍길동" }]);
   *   });
   * });
   * ```
   *
   * @see {@link connect} 연결부터 트랜잭션까지 한번에 처리
   */
  async trans<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R> {
    if (this.status === "transact") {
      throw new Error("이미 TRANSACTION 상태입니다.");
    }

    await this._executor.beginTransaction(isolationLevel);
    this.status = "transact";

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransaction();
      this.status = "connect";
    } catch (err) {
      try {
        await this._executor.rollbackTransaction();
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
   * const results = await db.executeDefs([selectDef]);
   * ```
   */
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]> {
    if (this.status === "transact" && defs.some((d) => (DDL_TYPES as readonly string[]).includes(d.type))) {
      throw new Error("TRANSACTION 상태에서는 DDL을 실행할 수 없습니다.");
    }

    return this._executor.executeDefs(defs, resultMetas);
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
   * await db.connectWithoutTransaction(async () => {
   *   await db.initialize();
   * });
   *
   * // 강제 초기화 (기존 데이터 삭제)
   * await db.connectWithoutTransaction(async () => {
   *   await db.initialize({ force: true });
   * });
   * ```
   */
  async initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void> {
    return initializeImpl(this, this._getDbContextDef(), options);
  }

  /**
   * DbContextDef 객체 생성
   */
  private _getDbContextDef(): DbContextDef<any, any, any> {
    const tables: Record<string, TableBuilder<any, any>> = {};
    const views: Record<string, ViewBuilder<any, any, any>> = {};
    const procedures: Record<string, ProcedureBuilder<any, any>> = {};

    for (const key of Object.keys(this)) {
      const value = this[key as keyof this];

      // Queryable → Builder 추출
      if (value instanceof Queryable) {
        const from = value.meta.from;
        if (from instanceof TableBuilder) {
          tables[key] = from;
        } else if (from instanceof ViewBuilder) {
          views[key] = from;
        } else if (from instanceof ProcedureBuilder) {
          procedures[key] = from;
        }
      }
    }

    return {
      meta: {
        tables,
        views,
        procedures,
        migrations: this.migrations,
      },
    };
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
   * await db.createTable(User);
   * ```
   */
  async createTable(table: TableBuilder<any, any>): Promise<void> {
    await this.executeDefs([this.getCreateTableQueryDef(table)]);
  }

  /**
   * 테이블 삭제
   *
   * @param table - 삭제할 테이블 정보 (database, schema, name)
   *
   * @example
   * ```typescript
   * await db.dropTable({ database: "mydb", name: "User" });
   * ```
   */
  async dropTable(table: QueryDefObjectName): Promise<void> {
    await this.executeDefs([this.getDropTableQueryDef(table)]);
  }

  /**
   * 테이블 이름 변경
   *
   * @param table - 변경할 테이블 정보
   * @param newName - 새 테이블 이름
   *
   * @example
   * ```typescript
   * await db.renameTable({ database: "mydb", name: "User" }, "Member");
   * ```
   */
  async renameTable(table: QueryDefObjectName, newName: string): Promise<void> {
    await this.executeDefs([this.getRenameTableQueryDef(table, newName)]);
  }

  /**
   * 뷰 생성
   *
   * @param view - 생성할 뷰 빌더
   *
   * @example
   * ```typescript
   * await db.createView(UserSummary);
   * ```
   */
  async createView(view: ViewBuilder<any, any, any>): Promise<void> {
    await this.executeDefs([this.getCreateViewQueryDef(view)]);
  }

  /**
   * 뷰 삭제
   *
   * @param view - 삭제할 뷰 정보
   *
   * @example
   * ```typescript
   * await db.dropView({ database: "mydb", name: "UserSummary" });
   * ```
   */
  async dropView(view: QueryDefObjectName): Promise<void> {
    await this.executeDefs([this.getDropViewQueryDef(view)]);
  }

  /**
   * 저장 프로시저 생성
   *
   * @param procedure - 생성할 프로시저 빌더
   *
   * @example
   * ```typescript
   * await db.createProc(GetUserById);
   * ```
   */
  async createProc(procedure: ProcedureBuilder<any, any>): Promise<void> {
    await this.executeDefs([this.getCreateProcQueryDef(procedure)]);
  }

  /**
   * 저장 프로시저 삭제
   *
   * @param procedure - 삭제할 프로시저 정보
   *
   * @example
   * ```typescript
   * await db.dropProc({ database: "mydb", name: "GetUserById" });
   * ```
   */
  async dropProc(procedure: QueryDefObjectName): Promise<void> {
    await this.executeDefs([this.getDropProcQueryDef(procedure)]);
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
    return tableDdl.getCreateObjectQueryDef(this, builder);
  }

  /**
   * CREATE TABLE QueryDef 생성
   *
   * @param table - 테이블 빌더
   * @returns CREATE TABLE QueryDef
   * @throws {Error} 테이블에 컬럼이 없을 때
   */
  getCreateTableQueryDef(table: TableBuilder<any, any>): QueryDef {
    return tableDdl.getCreateTableQueryDef(this, table);
  }

  /**
   * CREATE VIEW QueryDef 생성
   *
   * @param view - 뷰 빌더
   * @returns CREATE VIEW QueryDef
   * @throws {Error} 뷰에 viewFn이 없을 때
   */
  getCreateViewQueryDef(view: ViewBuilder<any, any, any>): QueryDef {
    return tableDdl.getCreateViewQueryDef(this, view);
  }

  /**
   * CREATE PROCEDURE QueryDef 생성
   *
   * @param procedure - 프로시저 빌더
   * @returns CREATE PROCEDURE QueryDef
   * @throws {Error} 프로시저에 본문이 없을 때
   */
  getCreateProcQueryDef(procedure: ProcedureBuilder<any, any>): QueryDef {
    return tableDdl.getCreateProcQueryDef(this, procedure);
  }

  /** DROP TABLE QueryDef 생성 */
  getDropTableQueryDef(table: QueryDefObjectName): DropTableQueryDef {
    return tableDdl.getDropTableQueryDef(table);
  }

  /** RENAME TABLE QueryDef 생성 */
  getRenameTableQueryDef(table: QueryDefObjectName, newName: string): RenameTableQueryDef {
    return tableDdl.getRenameTableQueryDef(table, newName);
  }

  /** DROP VIEW QueryDef 생성 */
  getDropViewQueryDef(view: QueryDefObjectName): DropViewQueryDef {
    return tableDdl.getDropViewQueryDef(view);
  }

  /** DROP PROCEDURE QueryDef 생성 */
  getDropProcQueryDef(procedure: QueryDefObjectName): DropProcQueryDef {
    return tableDdl.getDropProcQueryDef(procedure);
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
   * await db.addColumn(
   *   { database: "mydb", name: "User" },
   *   "status",
   *   c.varchar(20).nullable(),
   * );
   * ```
   */
  async addColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): Promise<void> {
    await this.executeDefs([this.getAddColumnQueryDef(table, columnName, column)]);
  }

  /**
   * 컬럼 삭제
   *
   * @param table - 테이블 정보
   * @param column - 삭제할 컬럼 이름
   *
   * @example
   * ```typescript
   * await db.dropColumn(
   *   { database: "mydb", name: "User" },
   *   "status",
   * );
   * ```
   */
  async dropColumn(table: QueryDefObjectName, column: string): Promise<void> {
    await this.executeDefs([this.getDropColumnQueryDef(table, column)]);
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
   * await db.modifyColumn(
   *   { database: "mydb", name: "User" },
   *   "status",
   *   c.varchar(50).nullable(),  // 길이 변경
   * );
   * ```
   */
  async modifyColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): Promise<void> {
    await this.executeDefs([this.getModifyColumnQueryDef(table, columnName, column)]);
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
   * await db.renameColumn(
   *   { database: "mydb", name: "User" },
   *   "status",
   *   "userStatus",
   * );
   * ```
   */
  async renameColumn(table: QueryDefObjectName, column: string, newName: string): Promise<void> {
    await this.executeDefs([this.getRenameColumnQueryDef(table, column, newName)]);
  }

  /** ADD COLUMN QueryDef 생성 */
  getAddColumnQueryDef(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): AddColumnQueryDef {
    return columnDdl.getAddColumnQueryDef(table, columnName, column);
  }

  /** DROP COLUMN QueryDef 생성 */
  getDropColumnQueryDef(table: QueryDefObjectName, column: string): DropColumnQueryDef {
    return columnDdl.getDropColumnQueryDef(table, column);
  }

  /** MODIFY COLUMN QueryDef 생성 */
  getModifyColumnQueryDef(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): ModifyColumnQueryDef {
    return columnDdl.getModifyColumnQueryDef(table, columnName, column);
  }

  /** RENAME COLUMN QueryDef 생성 */
  getRenameColumnQueryDef(table: QueryDefObjectName, column: string, newName: string): RenameColumnQueryDef {
    return columnDdl.getRenameColumnQueryDef(table, column, newName);
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
   * await db.addPk(
   *   { database: "mydb", name: "User" },
   *   ["id"],
   * );
   * ```
   */
  async addPk(table: QueryDefObjectName, columns: string[]): Promise<void> {
    await this.executeDefs([this.getAddPkQueryDef(table, columns)]);
  }

  /**
   * Primary Key 삭제
   *
   * @param table - 테이블 정보
   *
   * @example
   * ```typescript
   * await db.dropPk({ database: "mydb", name: "User" });
   * ```
   */
  async dropPk(table: QueryDefObjectName): Promise<void> {
    await this.executeDefs([this.getDropPkQueryDef(table)]);
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
   * await db.addFk(
   *   { database: "mydb", name: "Post" },
   *   "author",
   *   ForeignKey(User, ["authorId"]),
   * );
   * ```
   */
  async addFk(
    table: QueryDefObjectName,
    relationName: string,
    relationDef: ForeignKeyBuilder<any, any>,
  ): Promise<void> {
    await this.executeDefs([this.getAddFkQueryDef(table, relationName, relationDef)]);
  }

  /**
   * 인덱스 추가
   *
   * @param table - 테이블 정보
   * @param indexBuilder - 인덱스 빌더
   *
   * @example
   * ```typescript
   * await db.addIdx(
   *   { database: "mydb", name: "User" },
   *   Index(["email"]).unique(),
   * );
   * ```
   */
  async addIdx(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): Promise<void> {
    await this.executeDefs([this.getAddIdxQueryDef(table, indexBuilder)]);
  }

  /**
   * Foreign Key 삭제
   *
   * @param table - 테이블 정보
   * @param relationName - 관계 이름
   *
   * @example
   * ```typescript
   * await db.dropFk({ database: "mydb", name: "Post" }, "author");
   * ```
   */
  async dropFk(table: QueryDefObjectName, relationName: string): Promise<void> {
    await this.executeDefs([this.getDropFkQueryDef(table, relationName)]);
  }

  /**
   * 인덱스 삭제
   *
   * @param table - 테이블 정보
   * @param columns - 인덱스 구성 컬럼 배열 (인덱스 이름 추론용)
   *
   * @example
   * ```typescript
   * await db.dropIdx({ database: "mydb", name: "User" }, ["email"]);
   * ```
   */
  async dropIdx(table: QueryDefObjectName, columns: string[]): Promise<void> {
    await this.executeDefs([this.getDropIdxQueryDef(table, columns)]);
  }

  /** DROP PRIMARY KEY QueryDef 생성 */
  getDropPkQueryDef(table: QueryDefObjectName): DropPkQueryDef {
    return relationDdl.getDropPkQueryDef(table);
  }

  /** ADD PRIMARY KEY QueryDef 생성 */
  getAddPkQueryDef(table: QueryDefObjectName, columns: string[]): AddPkQueryDef {
    return relationDdl.getAddPkQueryDef(table, columns);
  }

  /** ADD FOREIGN KEY QueryDef 생성 */
  getAddFkQueryDef(
    table: QueryDefObjectName,
    relationName: string,
    relationDef: ForeignKeyBuilder<any, any>,
  ): QueryDef {
    return relationDdl.getAddFkQueryDef(this, table, relationName, relationDef);
  }

  /** ADD INDEX QueryDef 생성 */
  getAddIdxQueryDef(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): QueryDef {
    return relationDdl.getAddIdxQueryDef(table, indexBuilder);
  }

  /** DROP FOREIGN KEY QueryDef 생성 */
  getDropFkQueryDef(table: QueryDefObjectName, relationName: string): DropFkQueryDef {
    return relationDdl.getDropFkQueryDef(table, relationName);
  }

  /** DROP INDEX QueryDef 생성 */
  getDropIdxQueryDef(table: QueryDefObjectName, columns: string[]): DropIdxQueryDef {
    return relationDdl.getDropIdxQueryDef(table, columns);
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
   * await db.clearSchema({ database: "mydb", schema: "public" });
   * ```
   */
  async clearSchema(params: { database: string; schema?: string }): Promise<void> {
    const queryDef = this.getClearSchemaQueryDef(params);
    await this.executeDefs([queryDef]);
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
   * const exists = await db.schemaExists("mydb");
   * if (!exists) {
   *   throw new Error("Database not found");
   * }
   * ```
   */
  async schemaExists(database: string, schema?: string): Promise<boolean> {
    const queryDef = this.getSchemaExistsQueryDef(database, schema);
    const result = await this.executeDefs([queryDef]);
    return result[0].length > 0;
  }

  /** CLEAR SCHEMA QueryDef 생성 */
  getClearSchemaQueryDef(params: { database: string; schema?: string }): ClearSchemaQueryDef {
    return schemaDdl.getClearSchemaQueryDef(params);
  }

  /** SCHEMA EXISTS QueryDef 생성 */
  getSchemaExistsQueryDef(database: string, schema?: string): SchemaExistsQueryDef {
    return schemaDdl.getSchemaExistsQueryDef(database, schema);
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
   * await db.truncate({ database: "mydb", name: "User" });
   * ```
   */
  async truncate(table: QueryDefObjectName): Promise<void> {
    await this.executeDefs([this.getTruncateQueryDef(table)]);
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
   * await db.connect(async () => {
   *   await db.switchFk({ database: "mydb", name: "Post" }, "off");
   *   await db.post().deleteAsync(() => []);
   *   await db.switchFk({ database: "mydb", name: "Post" }, "on");
   * });
   * ```
   */
  async switchFk(table: QueryDefObjectName, switch_: "on" | "off"): Promise<void> {
    await this.executeDefs([this.getSwitchFkQueryDef(table, switch_)]);
  }

  /** TRUNCATE TABLE QueryDef 생성 */
  getTruncateQueryDef(table: QueryDefObjectName): TruncateQueryDef {
    return schemaDdl.getTruncateQueryDef(table);
  }

  /** SWITCH FK QueryDef 생성 */
  getSwitchFkQueryDef(table: QueryDefObjectName, switch_: "on" | "off"): SwitchFkQueryDef {
    return schemaDdl.getSwitchFkQueryDef(table, switch_);
  }

  //#endregion

  //#region ========== Helpers ==========

  /**
   * TableBuilder/ViewBuilder를 QueryDefObjectName으로 변환
   *
   * @param tableOrView - 테이블 또는 뷰 빌더
   * @returns QueryDef에서 사용할 객체 이름 정보
   */
  getQueryDefObjectName(tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>): QueryDefObjectName {
    return tableDdl.getQueryDefObjectName(this, tableOrView);
  }

  //#endregion
}
