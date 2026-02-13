import type { ColumnPrimitive, ColumnPrimitiveStr } from "./column";
import type { QueryDef } from "./query-def";
import type { DbContextBase, DbContextDdlMethods } from "./db-context-def";

// ============================================
// Database Types
// ============================================

/**
 * 지원하는 데이터베이스 방언
 *
 * - `mysql`: MySQL 8.0.14+
 * - `mssql`: Microsoft SQL Server 2012+
 * - `postgresql`: PostgreSQL 9.0+
 */
export type Dialect = "mysql" | "mssql" | "postgresql";

/**
 * 지원하는 모든 데이터베이스 방언 목록
 *
 * 테스트에서 dialect별 검증 시 사용
 *
 * @example
 * ```typescript
 * it.each(dialects)("[%s] SQL 검증", (dialect) => {
 *   const builder = createQueryBuilder(dialect);
 *   expect(builder.build(def)).toMatchSql(expected[dialect]);
 * });
 * ```
 */
export const dialects: Dialect[] = ["mysql", "mssql", "postgresql"];

/**
 * QueryBuilder.build() 반환 타입
 *
 * 빌드된 SQL 문자열과 다중 결과셋 처리를 위한 메타데이터
 *
 * @property sql - 빌드된 SQL 문자열
 * @property resultSetIndex - 결과를 가져올 결과셋 인덱스 (기본: 0)
 *   - MySQL INSERT with OUTPUT: 1 (INSERT + SELECT 중 SELECT)
 * @property resultSetStride - 다중 결과에서 N번째마다 결과셋 추출
 *   - 예: index=1, stride=2 → 1, 3, 5, 7... 의 결과셋 반환
 *   - MySQL 다중 INSERT: INSERT;SELECT; × N → 1, 3, 5...
 */
export interface QueryBuildResult {
  sql: string;
  resultSetIndex?: number;
  resultSetStride?: number;
}

/**
 * 트랜잭션 격리 수준
 *
 * - `READ_UNCOMMITTED`: 커밋되지 않은 데이터 읽기 가능 (Dirty Read)
 * - `READ_COMMITTED`: 커밋된 데이터만 읽기 (기본값)
 * - `REPEATABLE_READ`: 트랜잭션 내 동일 쿼리 동일 결과 보장
 * - `SERIALIZABLE`: 완전 직렬화 (가장 엄격)
 */
export type IsolationLevel = "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE";

// ============================================
// DataRecord - 결과 데이터 타입 (재귀적, 중첩 허용)
// ============================================

/**
 * 쿼리 결과 데이터 레코드 타입
 *
 * 재귀적 구조로 중첩 관계(include) 결과 표현
 *
 * @example
 * ```typescript
 * // 단순 레코드
 * type User = { id: number; name: string; }
 *
 * // 중첩 관계 포함
 * type UserWithPosts = {
 *   id: number;
 *   name: string;
 *   posts: { id: number; title: string; }[]  // 1:N 관계
 *   company: { id: number; name: string; }   // N:1 관계
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
 * DbContext 실행기 인터페이스
 *
 * 실제 DB 연결과 쿼리 실행을 담당
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
 * @see {@link DbContext} DbContext에서 사용
 */
export interface DbContextExecutor {
  /**
   * DB 연결 수립
   */
  connect(): Promise<void>;

  /**
   * DB 연결 종료
   */
  close(): Promise<void>;

  /**
   * 트랜잭션 시작
   *
   * @param isolationLevel - 격리 수준 (선택)
   */
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;

  /**
   * 트랜잭션 커밋
   */
  commitTransaction(): Promise<void>;

  /**
   * 트랜잭션 롤백
   */
  rollbackTransaction(): Promise<void>;

  /**
   * QueryDef 배열 실행
   *
   * @template T - 결과 레코드 타입
   * @param defs - 실행할 QueryDef 배열
   * @param resultMetas - 결과 변환을 위한 메타데이터 (선택)
   * @returns 각 QueryDef별 결과 배열의 배열
   */
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
}

/**
 * 쿼리 결과 변환을 위한 메타데이터
 *
 * SELECT 결과를 TypeScript 객체로 변환 시 사용
 *
 * @property columns - 컬럼명 → ColumnPrimitiveStr 매핑
 * @property joins - JOIN 별칭 → 단일/배열 여부
 */
export interface ResultMeta {
  columns: Record<string, ColumnPrimitiveStr>;
  joins: Record<string, { isSingle: boolean }>;
}

// ============================================
// Migration
// ============================================

/**
 * 데이터베이스 마이그레이션 정의
 *
 * 스키마 변경을 버전 관리
 *
 * @property name - 마이그레이션 고유 이름 (타임스탬프 권장)
 * @property up - 마이그레이션 실행 함수
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
 * @see {@link DbContext.initialize} 마이그레이션 실행
 */
export interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
