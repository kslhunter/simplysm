import type {
  Dialect,
  IsolationLevel,
  QueryDef,
  ColumnMeta,
  ResultMeta,
} from "@simplysm/orm-common";

export interface IOrmService {
  getInfo(opt: TDbConnOptions & { configName: string }): Promise<{
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
    columnDefs: ColumnMeta[],
    records: Record<string, unknown>[],
  ): Promise<void>;
}

export type TDbConnOptions = { configName?: string; config?: Record<string, unknown> } & Record<
  string,
  unknown
>;
