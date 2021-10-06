import { EventEmitter } from "events";
import { IQueryColumnDef, ISOLATION_LEVEL } from "@simplysm/sd-orm-common";

export interface IDbConnection extends EventEmitter {
  dialect: "mysql" | "mssql" | "mssql-azure";
  isConnected: boolean;
  isOnTransaction: boolean;

  connectAsync(): Promise<void>;

  closeAsync(): Promise<void>;

  beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;

  commitTransactionAsync(): Promise<void>;

  rollbackTransactionAsync(): Promise<void>;

  executeAsync(queries: string[]): Promise<any[][]>;

  bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>;
}
