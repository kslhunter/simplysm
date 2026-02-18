import type {
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  TDbContextOption,
  TQueryDef,
} from "@simplysm/sd-orm-common";

export interface ISdOrmService {
  getInfo(opt: TDbConnOptions & { configName: string }): Promise<{
    dialect: TDbContextOption["dialect"];
    database?: string;
    schema?: string;
  }>;

  connect(opt: Record<string, any>): Promise<number>;

  close(connId: number): Promise<void>;

  beginTransaction(connId: number, isolationLevel?: ISOLATION_LEVEL): Promise<void>;

  commitTransaction(connId: number): Promise<void>;

  rollbackTransaction(connId: number): Promise<void>;

  // execute(connId: number, queries: string[]): Promise<any[][]>;

  executeParametrized(connId: number, query: string, params?: any[]): Promise<any[][]>;

  executeDefs(
    connId: number,
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]>;

  bulkInsert(
    connId: number,
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;

  bulkUpsert(
    connId: number,
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
}

export type TDbConnOptions = { configName?: string; config?: Record<string, any> } & Record<
  string,
  any
>;
