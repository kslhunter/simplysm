import type { ColumnPrimitive, ColumnPrimitiveStr } from "./column";
import type { QueryDef } from "./query-def";
import type { DbContextBase, DbContextDdlMethods } from "./db-context-def";

// ============================================
// Database Types
// ============================================

/**
 * Supported Database dialects
 *
 * - `mysql`: MySQL 8.0.14+
 * - `mssql`: Microsoft SQL Server 2012+
 * - `postgresql`: PostgreSQL 9.0+
 */
export type Dialect = "mysql" | "mssql" | "postgresql";

/**
 * List of all supported Database dialects
 *
 * Used for per-dialect validation in testing
 *
 * @example
 * ```typescript
 * it.each(dialects)("[%s] SQL Validation", (dialect) => {
 *   const builder = createQueryBuilder(dialect);
 *   expect(builder.build(def)).toMatchSql(expected[dialect]);
 * });
 * ```
 */
export const dialects: Dialect[] = ["mysql", "mssql", "postgresql"];

/**
 * QueryBuilder.build() return type
 *
 * Built SQL string and metadata for multiple result set processing
 *
 * @property sql - Built SQL string
 * @property resultSetIndex - Result set index to fetch results from (default: 0)
 *   - MySQL INSERT with OUTPUT: 1 (SELECT from INSERT + SELECT)
 * @property resultSetStride - Extract every Nth result set from multiple results
 *   - Example: index=1, stride=2 -> returns result sets 1, 3, 5, 7...
 *   - MySQL multiple INSERT: INSERT;SELECT; x N -> 1, 3, 5...
 */
export interface QueryBuildResult {
  sql: string;
  resultSetIndex?: number;
  resultSetStride?: number;
}

/**
 * Transaction isolation level
 *
 * - `READ_UNCOMMITTED`: Can read uncommitted data (Dirty Read)
 * - `READ_COMMITTED`: Read only committed data (default)
 * - `REPEATABLE_READ`: Guarantees same query returns same result within transaction
 * - `SERIALIZABLE`: Full serialization (most strict)
 */
export type IsolationLevel =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";

// ============================================
// DataRecord - Result data type (recursive, nesting allowed)
// ============================================

/**
 * Query result data record type
 *
 * Represents nested relation (include) results with recursive structure
 *
 * @example
 * ```typescript
 * // Simple record
 * type User = { id: number; name: string; }
 *
 * // Nested relation include
 * type UserWithPosts = {
 *   id: number;
 *   name: string;
 *   posts: { id: number; title: string; }[]  // 1:N relationship
 *   company: { id: number; name: string; }   // N:1 relationship
 * }
 * ```
 */
export type DataRecord = {
  [key: string]: ColumnPrimitive | DataRecord | DataRecord[];
};

// ============================================
// Executor Interface
// ============================================

/**
 * DbContext executor interface
 *
 * Responsible for actual DB connection and query execution
 * Implemented by NodeDbContextExecutor (server) or SdOrmServiceClientDbContextExecutor (client)
 *
 * @example
 * ```typescript
 * // Server-side implementation example
 * class NodeDbContextExecutor implements IDbContextExecutor {
 *   async connect(): Promise<void> {
 *     await this.connection.connect();
 *   }
 *   // ...
 * }
 * ```
 *
 * @see {@link DbContext} Used in DbContext
 */
export interface DbContextExecutor {
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
   * Execute QueryDef array
   *
   * @template T - Result record type
   * @param defs - QueryDef array to execute
   * @param resultMetas - Metadata for result transformation (optional)
   * @returns Array of result arrays per QueryDef
   */
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}

/**
 * Metadata for query result transformation
 *
 * Used when transforming SELECT results into TypeScript objects
 *
 * @property columns - Column name -> ColumnPrimitiveStr mapping
 * @property joins - JOIN alias -> single/array indicator
 */
export interface ResultMeta {
  columns: Record<string, ColumnPrimitiveStr>;
  joins: Record<string, { isSingle: boolean }>;
}

// ============================================
// Migration
// ============================================

/**
 * Database migration definition
 *
 * Version-control schema changes
 *
 * @property name - Unique Migration name (timestamp recommended)
 * @property up - Migration execution function
 *
 * @example
 * ```typescript
 * const migrations: Migration[] = [
 *   {
 *     name: "20260105_001_create_user_table",
 *     up: async (db) => {
 *       await db.createTable(User);
 *     },
 *   },
 *   {
 *     name: "20260105_002_add_email_column",
 *     up: async (db) => {
 *       await db.addColumn(User, "email", {
 *         type: "varchar",
 *         length: 200,
 *       });
 *     },
 *   },
 * ];
 * ```
 *
 * @see {@link DbContext.initialize} migration execution
 */
export interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
