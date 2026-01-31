import type {
  Dialect,
  IsolationLevel,
  QueryDef,
  ColumnMeta,
  ResultMeta,
} from "@simplysm/orm-common";

/**
 * ORM 서비스 인터페이스
 *
 * 데이터베이스 연결, 트랜잭션 관리, 쿼리 실행 기능을 제공한다.
 * MySQL, MSSQL, PostgreSQL을 지원한다.
 */
export interface OrmService {
  getInfo(opt: DbConnOptions & { configName: string }): Promise<{
    dialect: Dialect;
    database?: string;
    schema?: string;
  }>;

  connect(opt: Record<string, unknown>): Promise<number>;

  close(connId: number): Promise<void>;

  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;

  commitTransaction(connId: number): Promise<void>;

  rollbackTransaction(connId: number): Promise<void>;

  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;

  executeDefs(
    connId: number,
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<unknown[][]>;

  bulkInsert(
    connId: number,
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}

/** 데이터베이스 연결 옵션 */
export type DbConnOptions = { configName?: string; config?: Record<string, unknown> };
