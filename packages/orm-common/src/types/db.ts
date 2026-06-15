import type { ColumnPrimitive, ColumnPrimitiveStr } from "./column";
import type { QueryDef } from "./query-def";
import type { DbContextBase, DbContextDdlMethods } from "./db-context-def";

// ============================================
// Database 타입
// ============================================

/**
 * 지원하는 Database dialect
 *
 * - `mysql`: MySQL 8.0.14+
 * - `mssql`: Microsoft SQL Server 2012+
 * - `postgresql`: PostgreSQL 9.0+
 */
export type Dialect = "mysql" | "mssql" | "postgresql";

/**
 * 지원하는 모든 Database dialect 목록
 *
 * 테스트에서 dialect별 검증에 사용
 */
export const dialects: Dialect[] = ["mysql", "mssql", "postgresql"];

/**
 * QueryBuilder.build() 반환 타입
 *
 * 빌드된 SQL 문자열과 다중 결과 셋 처리를 위한 메타데이터
 *
 * @property sql - 빌드된 SQL 문자열
 * @property resultSetIndex - 결과를 가져올 결과 셋 index (기본값: 0)
 *   - MySQL INSERT with OUTPUT: 1 (INSERT + SELECT에서 SELECT)
 * @property resultSetStride - 다중 결과에서 N번째마다 결과 셋 추출
 *   - 예: index=1, stride=2 -> 결과 셋 1, 3, 5, 7... 반환
 *   - MySQL 다중 INSERT: INSERT;SELECT; x N -> 1, 3, 5...
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
 * - `REPEATABLE_READ`: 트랜잭션 내 동일 query가 동일 결과 반환 보장
 * - `SERIALIZABLE`: 완전 직렬화 (가장 엄격)
 */
export type IsolationLevel =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";

// ============================================
// DataRecord - 결과 데이터 타입 (재귀적, 중첩 허용)
// ============================================

/**
 * Query 결과 데이터 레코드 타입
 *
 * 재귀적 구조로 중첩 관계(include) 결과를 표현
 */
export type DataRecord = {
  [key: string]: ColumnPrimitive | DataRecord | DataRecord[];
};

// ============================================
// Executor 인터페이스
// ============================================

/**
 * DbContext executor 인터페이스
 *
 * 실제 DB 연결과 query 실행을 담당
 * NodeDbContextExecutor(서버) 또는 SdOrmServiceClientDbContextExecutor(클라이언트)로 구현
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
   * @param resultMetas - 결과 변환용 메타데이터 (선택)
   * @returns QueryDef별 결과 배열의 배열
   */
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}

/**
 * Query 결과 변환용 메타데이터
 *
 * SELECT 결과를 TypeScript 객체로 변환할 때 사용
 *
 * @property columns - Column 이름 -> ColumnPrimitiveStr 매핑
 * @property joins - JOIN alias -> 단일/배열 구분자
 */
export interface ResultMeta {
  columns: Record<string, ColumnPrimitiveStr>;
  joins: Record<string, { isSingle: boolean }>;
}

// ============================================
// Migration
// ============================================

/**
 * Database migration 정의
 *
 * Schema 변경을 버전 관리
 *
 * @property name - 고유 Migration 이름 (타임스탬프 권장)
 * @property up - Migration 실행 함수
 *
 * @see {@link DbContext.initialize} migration 실행
 */
export interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
