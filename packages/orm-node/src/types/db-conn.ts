import type { EventEmitter } from "@simplysm/core-common";
import type { ColumnMeta, Dialect, IsolationLevel } from "@simplysm/orm-common";

// ============================================
// Common constants
// ============================================

/**
 * DB connection establishment timeout (10 seconds)
 */
export const DB_CONN_CONNECT_TIMEOUT = 10 * 1000;

/**
 * DB query default timeout (10 minutes)
 */
export const DB_CONN_DEFAULT_TIMEOUT = 10 * 60 * 1000;

/**
 * DB connection error messages
 */
export const DB_CONN_ERRORS = {
  NOT_CONNECTED: "'Connection' is not connected.",
  ALREADY_CONNECTED: "'Connection' is already connected.",
} as const;

// ============================================
// IDbConn Interface
// ============================================

/**
 * Low-level DB connection interface
 *
 * Implementations for each DBMS implement this interface.
 * - {@link MysqlDbConn} - MySQL connection
 * - {@link MssqlDbConn} - MSSQL connection
 * - {@link PostgresqlDbConn} - PostgreSQL connection
 *
 * @remarks
 * Inherits from EventEmitter and emits 'close' events.
 */
export interface DbConn extends EventEmitter<{ close: void }> {
  /**
   * Connection configuration
   */
  config: DbConnConfig;

  /**
   * Whether connected
   */
  isConnected: boolean;

  /**
   * Whether transaction is in progress
   */
  isInTransaction: boolean;

  /**
   * Establish DB connection
   */
  connect(): Promise<void>;

  /**
   * Close DB connection
   */
  close(): Promise<void>;

  /**
   * Begin transaction
   *
   * @param isolationLevel - Isolation level (optional)
   */
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;

  /**
   * Commit transaction
   */
  commitTransaction(): Promise<void>;

  /**
   * Rollback transaction
   */
  rollbackTransaction(): Promise<void>;

  /**
   * Execute SQL query array
   *
   * @param queries - SQL string array to execute
   * @returns Array of result arrays for each query
   */
  execute(queries: string[]): Promise<Record<string, unknown>[][]>;

  /**
   * Execute parameterized query
   *
   * @param query - SQL query string
   * @param params - Binding parameters (optional)
   * @returns Array of result arrays
   */
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;

  /**
   * Bulk INSERT (using native bulk API)
   *
   * - MSSQL: tedious BulkLoad
   * - MySQL: LOAD DATA LOCAL INFILE (temporary file)
   * - PostgreSQL: COPY FROM STDIN
   *
   * @param tableName - Table name (database.table or database.schema.table)
   * @param columnMetas - Column name → ColumnMeta mapping
   * @param records - Record array to insert
   */
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}

// ============================================
// DbConnConfig Types
// ============================================

/**
 * Connection pool configuration
 *
 * @remarks
 * Default values for each setting:
 * - min: 1 (minimum connection count)
 * - max: 10 (maximum connection count)
 * - acquireTimeoutMillis: 30000 (connection acquisition timeout)
 * - idleTimeoutMillis: 30000 (idle connection timeout)
 */
export interface DbPoolConfig {
  /** Minimum connection count (default: 1) */
  min?: number;
  /** Maximum connection count (default: 10) */
  max?: number;
  /** Connection acquisition timeout (milliseconds, default: 30000) */
  acquireTimeoutMillis?: number;
  /** Idle connection timeout (milliseconds, default: 30000) */
  idleTimeoutMillis?: number;
}

/**
 * DB connection configuration type (branching by dialect)
 */
export type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;

/**
 * MySQL connection configuration
 */
export interface MysqlDbConnConfig {
  dialect: "mysql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  defaultIsolationLevel?: IsolationLevel;
  pool?: DbPoolConfig;
}

/**
 * MSSQL connection configuration
 */
export interface MssqlDbConnConfig {
  dialect: "mssql" | "mssql-azure";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
  pool?: DbPoolConfig;
}

/**
 * PostgreSQL connection configuration
 */
export interface PostgresqlDbConnConfig {
  dialect: "postgresql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
  pool?: DbPoolConfig;
}

/**
 * Extract Dialect from DbConnConfig
 */
export function getDialectFromConfig(config: DbConnConfig): Dialect {
  if (config.dialect === "mssql-azure") {
    return "mssql";
  }
  return config.dialect;
}
