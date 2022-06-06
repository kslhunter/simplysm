import { EventEmitter } from "events";
import { TDbConnectionConfig, IQueryColumnDef, ISOLATION_LEVEL } from "@simplysm/sd-orm-common";

export interface IDbConnection extends EventEmitter {
  config: TDbConnectionConfig;
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
