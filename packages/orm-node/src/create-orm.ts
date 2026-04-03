import {
  DbContext,
  type DbContextExecutor,
  type IsolationLevel,
} from "@simplysm/orm-common";
import type { DbConnConfig } from "./types/db-conn";
import { NodeDbContextExecutor } from "./node-db-context-executor";

/**
 * ORM 옵션
 *
 * DbConnConfig보다 우선하는 DbContext 옵션
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
 * ORM 인스턴스 타입
 *
 * createOrm에서 반환하는 객체의 타입
 */
export interface Orm<T extends DbContext> {
  readonly DbClass: new (
    executor: DbContextExecutor,
    opt: { database: string; schema?: string },
  ) => T;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;

  /**
   * 트랜잭션 내에서 콜백을 실행한다
   *
   * @param callback - DB 연결 후 실행할 콜백
   * @param isolationLevel - 트랜잭션 격리 수준
   * @returns 콜백 결과
   */
  connect<R>(
    callback: (conn: T) => Promise<R>,
    isolationLevel?: IsolationLevel,
  ): Promise<R>;

  /**
   * 트랜잭션 없이 콜백을 실행한다
   *
   * @param callback - DB 연결 후 실행할 콜백
   * @returns 콜백 결과
   */
  connectWithoutTransaction<R>(callback: (conn: T) => Promise<R>): Promise<R>;
}

/**
 * Node.js ORM 팩토리 함수
 *
 * DbContext와 DB 연결을 관리하는 인스턴스를 생성한다.
 * DbContext 서브클래스와 연결 설정을 받아 트랜잭션을 관리한다.
 *
 * @example
 * ```typescript
 * class MyDb extends DbContext {
 *   user = this.queryable(User);
 * }
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
 *   const users = await db.user().execute();
 *   return users;
 * });
 *
 * // 트랜잭션 없이 실행
 * await orm.connectWithoutTransaction(async (db) => {
 *   const users = await db.user().execute();
 *   return users;
 * });
 * ```
 */
export function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T> {
  function _createInstance(): T {
    // options의 database를 우선 사용, 없으면 config에서
    const database = options?.database ?? ("database" in config ? config.database : undefined);
    if (database == null || database === "") {
      throw new Error("database는 필수입니다");
    }

    // options의 schema를 우선 사용, 없으면 config에서
    const schema = options?.schema ?? ("schema" in config ? config.schema : undefined);

    return new DbClass(new NodeDbContextExecutor(config), {
      database,
      schema,
    });
  }

  return {
    DbClass,
    config,
    options,
    async connect(callback, isolationLevel?) {
      const db = _createInstance();
      return db.connect(async () => callback(db), isolationLevel);
    },
    async connectWithoutTransaction(callback) {
      const db = _createInstance();
      return db.connectWithoutTransaction(async () => callback(db));
    },
  };
}
