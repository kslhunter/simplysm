import {
  createDbContext,
  type DbContextDef,
  type DbContextInstance,
  type IsolationLevel,
} from "@simplysm/orm-common";
import type { DbConnConfig } from "./types/db-conn";
import { NodeDbContextExecutor } from "./node-db-context-executor";

/**
 * ORM options
 *
 * DbContext options that take precedence over DbConnConfig
 */
export interface OrmOptions {
  /**
   * Database name (used instead of DbConnConfig's database)
   */
  database?: string;

  /**
   * Schema name (MSSQL: dbo, PostgreSQL: public)
   */
  schema?: string;
}

/**
 * ORM instance type
 *
 * Type of the object returned from createOrm
 */
export interface Orm<TDef extends DbContextDef<any, any, any>> {
  readonly dbContextDef: TDef;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;

  /**
   * Execute callback within a transaction
   *
   * @param callback - Callback to execute after DB connection
   * @param isolationLevel - Transaction isolation level
   * @returns Callback result
   */
  connect<R>(
    callback: (conn: DbContextInstance<TDef>) => Promise<R>,
    isolationLevel?: IsolationLevel,
  ): Promise<R>;

  /**
   * Execute callback without a transaction
   *
   * @param callback - Callback to execute after DB connection
   * @returns Callback result
   */
  connectWithoutTransaction<R>(callback: (conn: DbContextInstance<TDef>) => Promise<R>): Promise<R>;
}

/**
 * Node.js ORM factory function
 *
 * Creates an instance that manages DbContext and DB connections.
 * Receives DbContext definition and connection configuration to manage transactions.
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
 * // Execute within a transaction
 * await orm.connect(async (db) => {
 *   const users = await db.user().result();
 *   return users;
 * });
 *
 * // Execute without a transaction
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
    // database from options first, then from config
    const database = options?.database ?? ("database" in config ? config.database : undefined);
    if (database == null || database === "") {
      throw new Error("database is required");
    }

    // schema from options first, then from config
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
