import { SdError } from "@simplysm/core-common";
import type {
  DbContextExecutor,
  IsolationLevel,
  QueryDef,
  ResultMeta,
  Dialect,
  ColumnMeta,
  DataRecord,
} from "@simplysm/orm-common";
import { createQueryBuilder, parseQueryResult } from "@simplysm/orm-common";
import type { DbConn, DbConnConfig } from "./types/db-conn";
import { DB_CONN_ERRORS, getDialectFromConfig } from "./types/db-conn";
import { createDbConn } from "./create-db-conn";

/**
 * DbContextExecutor for Node.js environment
 *
 * Executor used by DbContext that handles actual DB connections.
 */
export class NodeDbContextExecutor implements DbContextExecutor {
  private _conn?: DbConn;
  private readonly _dialect: Dialect;

  constructor(private readonly _config: DbConnConfig) {
    this._dialect = getDialectFromConfig(_config);
  }

  /**
   * Establish DB connection
   *
   * Acquires connection from connection pool and activates the connection state.
   */
  async connect(): Promise<void> {
    this._conn = await createDbConn(this._config);
    await this._conn.connect();
  }

  /**
   * Close DB connection
   *
   * Returns connection to the connection pool.
   *
   * @throws {Error} When not connected
   */
  async close(): Promise<void> {
    const conn = this._requireConn();
    await conn.close();
    this._conn = undefined;
  }

  /**
   * Begin transaction
   *
   * @param isolationLevel - Transaction isolation level
   * @throws {Error} When not connected
   */
  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void> {
    const conn = this._requireConn();
    await conn.beginTransaction(isolationLevel);
  }

  /**
   * Commit transaction
   *
   * @throws {Error} When not connected
   */
  async commitTransaction(): Promise<void> {
    const conn = this._requireConn();
    await conn.commitTransaction();
  }

  /**
   * Rollback transaction
   *
   * @throws {Error} When not connected
   */
  async rollbackTransaction(): Promise<void> {
    const conn = this._requireConn();
    await conn.rollbackTransaction();
  }

  /**
   * Execute parameterized query
   *
   * @param query - SQL query string
   * @param params - Query parameter array
   * @returns Query result array
   * @throws {Error} When not connected
   */
  async executeParametrized(
    query: string,
    params?: unknown[],
  ): Promise<Record<string, unknown>[][]> {
    const conn = this._requireConn();
    return conn.executeParametrized(query, params);
  }

  /**
   * Bulk insert data (using native bulk API)
   *
   * @param tableName - Target table name
   * @param columnMetas - Column metadata
   * @param records - Record array to insert
   * @throws {Error} When not connected
   */
  async bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: DataRecord[],
  ): Promise<void> {
    const conn = this._requireConn();
    await conn.bulkInsert(tableName, columnMetas, records);
  }

  /**
   * Execute QueryDef array
   *
   * Converts QueryDef to SQL and executes, parses results using ResultMeta.
   *
   * @param defs - QueryDef array to execute
   * @param resultMetas - Result parsing metadata array (used for type conversion)
   * @returns Array of execution results for each QueryDef
   * @throws {Error} When not connected
   */
  async executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]> {
    const conn = this._requireConn();

    const builder = createQueryBuilder(this._dialect);

    // When configured not to fetch data, send one request with a single query
    // Since results are not needed, return empty arrays matching defs.length to maintain interface contract
    if (resultMetas != null && resultMetas.every((item) => item == null)) {
      const combinedSql = defs.map((def) => builder.build(def).sql).join("\n");
      await conn.execute([combinedSql]);
      return defs.map(() => []) as T[][];
    }

    // Execute each def individually
    const results: T[][] = [];
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const meta = resultMetas?.[i];
      const buildResult = builder.build(def);

      const rawResults = await conn.execute([buildResult.sql]);

      // Use result set at specified index if resultSetIndex is specified
      const targetResultSet =
        buildResult.resultSetIndex != null ? rawResults[buildResult.resultSetIndex] : rawResults[0];

      if (meta != null) {
        const parsed = await parseQueryResult<T>(targetResultSet, meta);
        results.push(parsed ?? []);
      } else {
        results.push(targetResultSet as T[]);
      }
    }

    return results;
  }

  private _requireConn(): DbConn {
    if (this._conn == null) {
      throw new SdError(DB_CONN_ERRORS.NOT_CONNECTED);
    }
    return this._conn;
  }
}
