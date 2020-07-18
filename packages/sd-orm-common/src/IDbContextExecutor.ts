import { IQueryResultParseOption, TQueryDef } from "./commons";

export interface IDbContextExecutor {
  dialect: "mysql" | "mssql";

  connectAsync(): Promise<void>;

  beginTransactionAsync(): Promise<void>;

  commitTransactionAsync(): Promise<void>;

  rollbackTransactionAsync(): Promise<void>;

  executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]>;

  executeAsync(queries: string[]): Promise<any[][]>;

  closeAsync(): Promise<void>;
}