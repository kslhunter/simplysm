import type { ColumnPrimitive, ColumnPrimitiveStr } from "./column";
import type { QueryDef } from "./query-def";
import type { DbContextBase, DbContextDdlMethods } from "./db-context-def";

// ============================================
// Database Types
// ============================================

/**
 * 지원하는 Database 방언
 *
 * - `mysql`: MySQL 8.0.14+
 * - `mssql`: Microsoft SQL Server 2012+
 * - `postgresql`: PostgreSQL 9.0+
 */
export type Dialect = "mysql" | "mssql" | "postgresql";

/**
 * 지원하는 모든 Database 방언 목록
 *
 * testing에서 dialect별 Validation 시 사용
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
 * 빌드된 SQL 문자열과 다중 결과셋 processing를 위한 Metadata
 *
 * @property sql - 빌드된 SQL 문자열
 * @property resultSetIndex - Result를 가져올 결과셋 Index (Basic: 0)
 *   - MySQL INSERT with OUTPUT: 1 (INSERT + SELECT 중 SELECT)
 * @property resultSetStride - 다중 결과에서 N번째마다 결과셋 추출
 *   - 예: index=1, stride=2 → 1, 3, 5, 7... 의 결과셋 return
 *   - MySQL 다중 INSERT: INSERT;SELECT; × N → 1, 3, 5...
 */
export interface QueryBuildResult {
  sql: string;
  resultSetIndex?: number;
  resultSetStride?: number;
}

/**
 * Transaction isolation level
 *
 * - `READ_UNCOMMITTED`: commit되지 않은 data read 가능 (Dirty Read)
 * - `READ_COMMITTED`: commit된 data만 read (default)
 * - `REPEATABLE_READ`: Transaction 내 동일 query 동일 result 보장
 * - `SERIALIZABLE`: 완전 serialize (가장 엄격)
 */
export type IsolationLevel =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";

// ============================================
// DataRecord - Result data type (재귀적, 중첩 allow)
// ============================================

/**
 * Query result data record type
 *
 * 재귀적 structure로 중첩 관계(include) result 표현
 *
 * @example
 * ```typescript
 * // 단순 레코드
 * type User = { id: number; name: string; }
 *
 * // 중첩 relationship include
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
 * DbContext 실행기 interface
 *
 * 실제 DB 연결과 Execute query을 담당
 * NodeDbContextExecutor (서버) 또는 SdOrmServiceClientDbContextExecutor (클라이언트) 구현
 *
 * @example
 * ```typescript
 * // 서버 측 구현 예시
 * class NodeDbContextExecutor implements IDbContextExecutor {
 *   async connect(): Promise<void> {
 *     await this.connection.connect();
 *   }
 *   // ...
 * }
 * ```
 *
 * @see {@link DbContext} DbContextused in
 */
export interface DbContextExecutor {
  /**
   * DB 연결 수립
   */
  connect(): Promise<void>;

  /**
   * DB 연결 end
   */
  close(): Promise<void>;

  /**
   * Transaction start
   *
   * @param isolationLevel - isolation level (Select)
   */
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;

  /**
   * Transaction commit
   */
  commitTransaction(): Promise<void>;

  /**
   * Transaction rollback
   */
  rollbackTransaction(): Promise<void>;

  /**
   * QueryDef array 실행
   *
   * @template T - Result record type
   * @param defs - Execute할 QueryDef array
   * @param resultMetas - Result Transform을 위한 Metadata (Select)
   * @returns 각 QueryDef별 result 배열의 array
   */
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}

/**
 * Query result Transform을 위한 Metadata
 *
 * SELECT 결과를 TypeScript 객체로 Transform 시 사용
 *
 * @property columns - Column명 → ColumnPrimitiveStr Mapping
 * @property joins - JOIN 별칭 → 단일/array 여부
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
 * schema 변경을 version control
 *
 * @property name - Migration 고유 이름 (타임스탬프 권장)
 * @property up - Migration 실행 function
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
 * @see {@link DbContext.initialize} migration 실행
 */
export interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
