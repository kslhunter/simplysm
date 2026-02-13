import { createDbContext, type DbContextDef, type DbContextInstance, type IsolationLevel } from "@simplysm/orm-common";
import type { DbConnConfig } from "./types/db-conn";
import { NodeDbContextExecutor } from "./node-db-context-executor";

/**
 * SdOrm 옵션
 *
 * DbConnConfig보다 우선 적용되는 DbContext 옵션
 */
export interface SdOrmOptions {
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
 * Node.js ORM 클래스
 *
 * DbContext와 DB 연결을 관리하는 최상위 클래스입니다.
 * DbContext 정의와 연결 설정을 받아 트랜잭션을 관리합니다.
 *
 * @example
 * ```typescript
 * const MyDb = defineDbContext({
 *   user: (db) => queryable(db, User),
 * });
 *
 * const orm = new SdOrm(MyDb, {
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
export class SdOrm<TDef extends DbContextDef<any, any, any>> {
  constructor(
    readonly dbContextDef: TDef,
    readonly config: DbConnConfig,
    readonly options?: SdOrmOptions,
  ) {}

  /**
   * 트랜잭션 내에서 콜백 실행
   *
   * @param callback - DB 연결 후 실행할 콜백
   * @param isolationLevel - 트랜잭션 격리 수준
   * @returns 콜백 결과
   */
  async connect<R>(
    callback: (conn: DbContextInstance<TDef>) => Promise<R>,
    isolationLevel?: IsolationLevel,
  ): Promise<R> {
    const db = this._createDbContext();
    return db.connect(async () => callback(db), isolationLevel);
  }

  /**
   * 트랜잭션 없이 콜백 실행
   *
   * @param callback - DB 연결 후 실행할 콜백
   * @returns 콜백 결과
   */
  async connectWithoutTransaction<R>(callback: (conn: DbContextInstance<TDef>) => Promise<R>): Promise<R> {
    const db = this._createDbContext();
    return db.connectWithoutTransaction(async () => callback(db));
  }

  /**
   * DbContext 인스턴스 생성
   */
  private _createDbContext(): DbContextInstance<TDef> {
    // database는 options에서 우선, 없으면 config에서
    const database = this.options?.database ?? ("database" in this.config ? this.config.database : undefined);
    if (!database) {
      throw new Error("database is required");
    }

    // schema는 options에서 우선, 없으면 config에서
    const schema = this.options?.schema ?? ("schema" in this.config ? this.config.schema : undefined);

    return createDbContext(this.dbContextDef, new NodeDbContextExecutor(this.config), {
      database,
      schema,
    });
  }
}
