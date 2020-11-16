import { IQueryColumnDef, IQueryResultParseOption, TQueryDef } from "./commons";

export interface IDbContextExecutor {
  dialect: "mysql" | "mssql" | "mssql-azure";

  connectAsync(): Promise<void>;

  beginTransactionAsync(): Promise<void>;

  commitTransactionAsync(): Promise<void>;

  rollbackTransactionAsync(): Promise<void>;

  executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]>;

  executeAsync(queries: string[]): Promise<any[][]>;

  bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], ...records: Record<string, any>[]): Promise<void>;

  closeAsync(): Promise<void>;
}