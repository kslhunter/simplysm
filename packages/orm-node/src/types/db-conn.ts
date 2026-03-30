import type { EventEmitter } from "@simplysm/core-common";
import type { ColumnMeta, Dialect, IsolationLevel } from "@simplysm/orm-common";

// ============================================
// 공통 상수
// ============================================

/**
 * DB 연결 수립 타임아웃 (10초)
 */
export const DB_CONN_CONNECT_TIMEOUT = 10 * 1000;

/**
 * DB 쿼리 기본 타임아웃 (10분)
 */
export const DB_CONN_DEFAULT_TIMEOUT = 10 * 60 * 1000;

/**
 * DB 연결 오류 메시지
 */
export const DB_CONN_ERRORS = {
  NOT_CONNECTED: "'Connection'이 연결되어 있지 않습니다.",
  ALREADY_CONNECTED: "'Connection'이 이미 연결되어 있습니다.",
} as const;

// ============================================
// IDbConn 인터페이스
// ============================================

/**
 * 저수준 DB 연결 인터페이스
 *
 * 각 DBMS 구현체가 이 인터페이스를 구현한다.
 * - {@link MysqlDbConn} - MySQL 연결
 * - {@link MssqlDbConn} - MSSQL 연결
 * - {@link PostgresqlDbConn} - PostgreSQL 연결
 *
 * @remarks
 * EventEmitter를 상속하며 'close' 이벤트를 발생시킨다.
 */
export interface DbConn extends EventEmitter<{ close: void }> {
  /**
   * 연결 설정
   */
  config: DbConnConfig;

  /**
   * 연결 여부
   */
  isConnected: boolean;

  /**
   * 트랜잭션 진행 여부
   */
  isInTransaction: boolean;

  /**
   * DB 연결을 수립한다
   */
  connect(): Promise<void>;

  /**
   * DB 연결을 종료한다
   */
  close(): Promise<void>;

  /**
   * 트랜잭션을 시작한다
   *
   * @param isolationLevel - 격리 수준 (선택사항)
   */
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;

  /**
   * 트랜잭션을 커밋한다
   */
  commitTransaction(): Promise<void>;

  /**
   * 트랜잭션을 롤백한다
   */
  rollbackTransaction(): Promise<void>;

  /**
   * SQL 쿼리 배열을 실행한다
   *
   * @param queries - 실행할 SQL 문자열 배열
   * @returns 각 쿼리의 결과 배열
   */
  execute(queries: string[]): Promise<Record<string, unknown>[][]>;

  /**
   * 파라미터화된 쿼리를 실행한다
   *
   * @param query - SQL 쿼리 문자열
   * @param params - 바인딩 파라미터 (선택사항)
   * @returns 결과 배열
   */
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;

  /**
   * Bulk INSERT (네이티브 bulk API 사용)
   *
   * - MSSQL: tedious BulkLoad
   * - MySQL: LOAD DATA LOCAL INFILE (임시 파일)
   * - PostgreSQL: COPY FROM STDIN
   *
   * @param tableName - 테이블 이름 (database.table 또는 database.schema.table)
   * @param columnMetas - 컬럼 이름 → ColumnMeta 매핑
   * @param records - 삽입할 레코드 배열
   */
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}

// ============================================
// DbConnConfig 타입
// ============================================

/**
 * DB 연결 설정 타입 (dialect별 분기)
 */
export type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;

/**
 * MySQL 연결 설정
 */
export interface MysqlDbConnConfig {
  dialect: "mysql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  defaultIsolationLevel?: IsolationLevel;
}

/**
 * MSSQL 연결 설정
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
}

/**
 * PostgreSQL 연결 설정
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
}

/**
 * DbConnConfig에서 Dialect를 추출한다
 */
export function getDialectFromConfig(config: DbConnConfig): Dialect {
  if (config.dialect === "mssql-azure") {
    return "mssql";
  }
  return config.dialect;
}
