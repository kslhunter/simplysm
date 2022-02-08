import { IQueryColumnDef, IQueryResultParseOption, ISOLATION_LEVEL, TQueryDef } from "./commons";

export interface IDbContextExecutor {
  getInfoAsync(): Promise<{
    dialect: "mssql" | "mysql" | "mssql-azure";
    database?: string;
    schema?: string;
  }>;

  connectAsync(): Promise<void>;

  beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;

  commitTransactionAsync(): Promise<void>;

  rollbackTransactionAsync(): Promise<void>;

  executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]>;

  executeAsync(queries: string[]): Promise<any[][]>;

  bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>;

  closeAsync(): Promise<void>;
}

