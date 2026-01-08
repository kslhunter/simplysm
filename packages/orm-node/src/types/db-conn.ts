import type { EventEmitter } from "events";
import type { ColumnMeta, Dialect, IsolationLevel } from "@simplysm/orm-common";

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
 * EventEmitter를 상속하여 'close' 이벤트를 발생시킵니다.
 */
export interface IDbConn extends EventEmitter {
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
   * 'close' 이벤트 리스너 등록
   */
  on(event: "close", listener: () => void): this;

  /**
   * DB 연결 수립
   */
  connectAsync(): Promise<void>;

  /**
   * DB 연결 종료
   */
  closeAsync(): Promise<void>;

  /**
   * 트랜잭션 시작
   *
   * @param isolationLevel - 격리 수준 (선택)
   */
  beginTransactionAsync(isolationLevel?: IsolationLevel): Promise<void>;

  /**
   * 트랜잭션 커밋
   */
  commitTransactionAsync(): Promise<void>;

  /**
   * 트랜잭션 롤백
   */
  rollbackTransactionAsync(): Promise<void>;

  /**
   * SQL 쿼리 배열 실행
   *
   * @param queries - 실행할 SQL 문자열 배열
   * @returns 각 쿼리별 결과 배열의 배열
   */
  executeAsync(queries: string[]): Promise<unknown[][]>;

  /**
   * 파라미터화된 쿼리 실행
   *
   * @param query - SQL 쿼리 문자열
   * @param params - 바인딩 파라미터 (선택)
   * @returns 결과 배열의 배열
   */
  executeParametrizedAsync(query: string, params?: unknown[]): Promise<unknown[][]>;

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
  bulkInsertAsync(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}

// ============================================
// DbConnConfig Types
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
 * DbConnConfig에서 Dialect 추출
 */
export function getDialectFromConfig(config: DbConnConfig): Dialect {
  if (config.dialect === "mssql-azure") {
    return "mssql";
  }
  return config.dialect;
}
