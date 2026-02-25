import consola from "consola";
import { SdError, EventEmitter } from "@simplysm/core-common";
import type { Pool } from "generic-pool";
import type { ColumnMeta, IsolationLevel } from "@simplysm/orm-common";
import { DB_CONN_ERRORS, type DbConn, type DbConnConfig } from "./types/db-conn";

const logger = consola.withTag("pooled-db-conn");

/**
 * DB connection wrapper managed by connection pool
 *
 * Supports connection pooling using the generic-pool library.
 * Acquires and returns actual physical connections from/to the pool.
 */
export class PooledDbConn extends EventEmitter<{ close: void }> implements DbConn {
  // Actual physical connection borrowed from pool
  private _rawConn?: DbConn;

  constructor(
    private readonly _pool: Pool<DbConn>,
    private readonly _initialConfig: DbConnConfig,
    private readonly _getLastCreateError?: () => Error | undefined,
  ) {
    super();
  }

  // [Property] config
  get config(): DbConnConfig {
    return this._rawConn?.config ?? this._initialConfig;
  }

  // [Property] isConnected
  get isConnected(): boolean {
    return this._rawConn?.isConnected ?? false;
  }

  // [Property] isInTransaction
  get isInTransaction(): boolean {
    return this._rawConn?.isInTransaction ?? false;
  }

  /**
   * Acquire DB connection from pool
   *
   * @throws {SdError} When already connected
   */
  async connect(): Promise<void> {
    if (this._rawConn != null) {
      throw new SdError(DB_CONN_ERRORS.ALREADY_CONNECTED);
    }

    // 1. Acquire connection from pool
    try {
      this._rawConn = await this._pool.acquire();
    } catch (err) {
      const { dialect, host, port, database } = this._initialConfig;
      const cause = this._getLastCreateError?.() ?? (err instanceof Error ? err : undefined);
      throw new SdError(
        ...(cause != null ? [cause] : []),
        `DB connection failed [${dialect}://${host}:${port ?? ""}/${database ?? ""}]`,
      );
    }

    // 2. Register listener to handle physical connection loss (timeout, etc.)
    //    If connection disconnects while in use, PooledDbConn must emit close event
    this._rawConn.on("close", this._onRawConnClose);
  }

  /**
   * Return DB connection to pool (does not terminate actual connection)
   */
  async close(): Promise<void> {
    if (this._rawConn != null) {
      // 1. If transaction is in progress, rollback to return clean state to pool
      if (this._rawConn.isInTransaction) {
        try {
          await this._rawConn.rollbackTransaction();
        } catch (err) {
          // Log failure and continue (connection may already be disconnected)
          logger.warn("Rollback failed when returning to pool", err instanceof Error ? err.message : String(err));
        }
      }

      // 2. Remove listener (so it won't affect reuse by other wrappers when returned to pool)
      this._rawConn.off("close", this._onRawConnClose);

      // 3. Return connection to pool (does not actually close it)
      await this._pool.release(this._rawConn);
      this._rawConn = undefined;

      // 4. Notify consumer that connection is logically closed
      this.emit("close");
    }
  }

  // Handler for physical connection loss
  private readonly _onRawConnClose = () => {
    // Remove reference since physical connection is lost (will be filtered during pool validation)
    this._rawConn = undefined;
    // Notify consumer
    this.emit("close");
  };

  // --- Below are delegation methods ---

  /**
   * Begin transaction
   *
   * @param isolationLevel - Transaction isolation level
   * @throws {SdError} When connection is not acquired
   */
  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void> {
    const conn = this._requireRawConn();
    await conn.beginTransaction(isolationLevel);
  }

  /**
   * Commit transaction
   *
   * @throws {SdError} When connection is not acquired
   */
  async commitTransaction(): Promise<void> {
    const conn = this._requireRawConn();
    await conn.commitTransaction();
  }

  /**
   * Rollback transaction
   *
   * @throws {SdError} When connection is not acquired
   */
  async rollbackTransaction(): Promise<void> {
    const conn = this._requireRawConn();
    await conn.rollbackTransaction();
  }

  /**
   * Execute SQL query
   *
   * @param queries - SQL query array to execute
   * @returns Result array for each query
   * @throws {SdError} When connection is not acquired
   */
  async execute(queries: string[]): Promise<Record<string, unknown>[][]> {
    const conn = this._requireRawConn();
    return conn.execute(queries);
  }

  /**
   * Execute parameterized SQL query
   *
   * @param query - SQL query string
   * @param params - Query parameter array
   * @returns Query result array
   * @throws {SdError} When connection is not acquired
   */
  async executeParametrized(
    query: string,
    params?: unknown[],
  ): Promise<Record<string, unknown>[][]> {
    const conn = this._requireRawConn();
    return conn.executeParametrized(query, params);
  }

  /**
   * Bulk insert data (using native bulk API)
   *
   * @param tableName - Target table name
   * @param columnMetas - Column metadata
   * @param records - Record array to insert
   * @throws {SdError} When connection is not acquired
   */
  async bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void> {
    const conn = this._requireRawConn();
    await conn.bulkInsert(tableName, columnMetas, records);
  }

  private _requireRawConn(): DbConn {
    if (this._rawConn == null) {
      throw new SdError(`${DB_CONN_ERRORS.NOT_CONNECTED} (Pool Connection is not acquired)`);
    }
    return this._rawConn;
  }
}
