import type {
  Dialect,
  IsolationLevel,
  QueryDef,
  ColumnMeta,
  ResultMeta,
} from "@simplysm/orm-common";

/**
 * ORM service interface
 *
 * Provides database connection, transaction management, and query execution.
 * Supports MySQL, MSSQL, and PostgreSQL.
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

/** Database connection options */
export type DbConnOptions = { configName?: string; config?: Record<string, unknown> };
