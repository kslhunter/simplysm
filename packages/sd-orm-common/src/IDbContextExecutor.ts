import {type IQueryColumnDef, type IQueryResultParseOption, type ISOLATION_LEVEL, type TQueryDef} from "./commons";
import {type TDbContextOption} from "./DbContext";

export interface IDbContextExecutor {
  getInfoAsync(): Promise<{
    dialect: TDbContextOption["dialect"];
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

  bulkUpsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>;

  closeAsync(): Promise<void>;
}

