import type { EventEmitter } from "events";
import type { IQueryColumnDef } from "@simplysm/orm-common";
import type { ISOLATION_LEVEL, TDbConnConf } from "./types";

export interface IDbConn extends EventEmitter {
  config: TDbConnConf;
  isConnected: boolean;
  isOnTransaction: boolean;

  on(event: "close", listener: () => void): this;
  off(event: "close", listener: () => void): this;

  connectAsync(): Promise<void>;
  closeAsync(): Promise<void>;

  beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;
  commitTransactionAsync(): Promise<void>;
  rollbackTransactionAsync(): Promise<void>;

  executeAsync(queries: string[]): Promise<any[][]>;
  executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>;

  bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;

  bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
}