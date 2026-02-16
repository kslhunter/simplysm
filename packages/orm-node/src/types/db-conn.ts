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
 * DB 연결 에러 메시지
 */
export const DB_CONN_ERRORS = {
  NOT_CONNECTED: "'Connection'이 연결되어있지 않습니다.",
  ALREADY_CONNECTED: "이미 'Connection'이 연결되어있습니다.",
} as const;

// ============================================
// IDbConn Interface
// ============================================

/**
 * 저수준 DB 연결 인터페이스
 *
 * 각 DBMS별 구현체가 이 인터페이스를 구현합니다.
 * - {@link MysqlDbConn} - MySQL 연결
 * - {@link MssqlDbConn} - MSSQL 연결
 * - {@link PostgresqlDbConn} - PostgreSQL 연결
 *
 * @remarks
 * SdEventEmitter를 상속하여 'close' 이벤트를 발생시킵니다.
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
  isOnTransaction: boolean;

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
   * SQL 쿼리 배열 실행
   *
   * @param queries - 실행할 SQL 문자열 배열
   * @returns 각 쿼리별 결과 배열의 배열
   */
  execute(queries: string[]): Promise<unknown[][]>;

  /**
   * 파라미터화된 쿼리 실행
   *
   * @param query - SQL 쿼리 문자열
   * @param params - 바인딩 파라미터 (선택)
   * @returns 결과 배열의 배열
   */
  executeParametrized(query: string, params?: unknown[]): Promise<unknown[][]>;

  /**
   * 대량 INSERT (네이티브 벌크 API 사용)
   *
   * - MSSQL: tedious BulkLoad
   * - MySQL: LOAD DATA LOCAL INFILE (임시 파일)
   * - PostgreSQL: COPY FROM STDIN
   *
   * @param tableName - 테이블명 (database.table 또는 database.schema.table)
   * @param columnMetas - 컬럼명 → ColumnMeta 매핑
   * @param records - 삽입할 레코드 배열
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
 * 커넥션 풀 설정
 *
 * @remarks
 * 각 값의 기본값:
 * - min: 1 (최소 연결 수)
 * - max: 10 (최대 연결 수)
 * - acquireTimeoutMillis: 30000 (연결 획득 타임아웃)
 * - idleTimeoutMillis: 30000 (유휴 연결 타임아웃)
 */
export interface DbPoolConfig {
  /** 최소 연결 수 (기본: 1) */
  min?: number;
  /** 최대 연결 수 (기본: 10) */
  max?: number;
  /** 연결 획득 타임아웃 (밀리초, 기본: 30000) */
  acquireTimeoutMillis?: number;
  /** 유휴 연결 타임아웃 (밀리초, 기본: 30000) */
  idleTimeoutMillis?: number;
}

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
  pool?: DbPoolConfig;
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
  pool?: DbPoolConfig;
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
  pool?: DbPoolConfig;
}

/**
 * DbConnConfig에서 Dialect 추출
 */
export function getDialectFromConfig(config: DbConnConfig): Dialect {
  if (config.dialect === "mssql-azure") {
    return "mssql";
  }
  return config.dialect;
}
