import {
  createDbContext,
  type DbContextDef,
  type DbContextInstance,
  type IsolationLevel,
} from "@simplysm/orm-common";
import type { DbConnConfig } from "./types/db-conn";
import { NodeDbContextExecutor } from "./node-db-context-executor";

/**
 * Orm 옵션
 *
 * DbConnConfig보다 우선 적용되는 DbContext 옵션
 */
export interface OrmOptions {
  /**
   * 데이터베이스 이름 (DbConnConfig의 database 대신 사용)
   */
  database?: string;

  /**
   * 스키마 이름 (MSSQL: dbo, PostgreSQL: public)
   */
  schema?: string;
}

/**
 * Orm 인스턴스 타입
 *
 * createOrm에서 반환되는 객체의 타입
 */
export interface Orm<TDef extends DbContextDef<any, any, any>> {
  readonly dbContextDef: TDef;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;

  /**
   * 트랜잭션 내에서 콜백 실행
   *
   * @param callback - DB 연결 후 실행할 콜백
   * @param isolationLevel - 트랜잭션 격리 수준
   * @returns 콜백 결과
   */
  connect<R>(
    callback: (conn: DbContextInstance<TDef>) => Promise<R>,
    isolationLevel?: IsolationLevel,
  ): Promise<R>;

  /**
   * 트랜잭션 없이 콜백 실행
   *
   * @param callback - DB 연결 후 실행할 콜백
   * @returns 콜백 결과
   */
  connectWithoutTransaction<R>(callback: (conn: DbContextInstance<TDef>) => Promise<R>): Promise<R>;
}

/**
 * Node.js ORM 팩토리 함수
 *
 * DbContext와 DB 연결을 관리하는 인스턴스를 생성합니다.
 * DbContext 정의와 연결 설정을 받아 트랜잭션을 관리합니다.
 *
 * @example
 * ```typescript
 * const MyDb = defineDbContext({
 *   user: (db) => queryable(db, User),
 * });
 *
 * const orm = createOrm(MyDb, {
 *   dialect: "mysql",
 *   host: "localhost",
 *   port: 3306,
 *   username: "root",
 *   password: "password",
 *   database: "mydb",
 * });
 *
 * // 트랜잭션 내에서 실행
 * await orm.connect(async (db) => {
 *   const users = await db.user().result();
 *   return users;
 * });
 *
 * // 트랜잭션 없이 실행
 * await orm.connectWithoutTransaction(async (db) => {
 *   const users = await db.user().result();
 *   return users;
 * });
 * ```
 */
export function createOrm<TDef extends DbContextDef<any, any, any>>(
  dbContextDef: TDef,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<TDef> {
  function _createDbContext(): DbContextInstance<TDef> {
    // database는 options에서 우선, 없으면 config에서
    const database = options?.database ?? ("database" in config ? config.database : undefined);
    if (database == null || database === "") {
      throw new Error("database is required");
    }

    // schema는 options에서 우선, 없으면 config에서
    const schema = options?.schema ?? ("schema" in config ? config.schema : undefined);

    return createDbContext(dbContextDef, new NodeDbContextExecutor(config), {
      database,
      schema,
    });
  }

  return {
    dbContextDef,
    config,
    options,
    async connect(callback, isolationLevel?) {
      const db = _createDbContext();
      return db.connect(async () => callback(db), isolationLevel);
    },
    async connectWithoutTransaction(callback) {
      const db = _createDbContext();
      return db.connectWithoutTransaction(async () => callback(db));
    },
  };
}
