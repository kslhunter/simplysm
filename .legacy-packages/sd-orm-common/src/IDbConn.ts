import type { EventEmitter } from "events";
import type { IQueryColumnDef } from "./query/query-builder/types";

export interface IDbConn extends EventEmitter {
  config: TDbConnConf;
  isConnected: boolean;
  isOnTransaction: boolean;

  on(event: "close", listener: () => void): this;

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

export type TDbConnConf = IDefaultDbConnConf | ISqliteDbConnConf;

export interface IDefaultDbConnConf {
  dialect: "mysql" | "mssql" | "mssql-azure";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: ISOLATION_LEVEL;
}

export interface ISqliteDbConnConf {
  dialect: "sqlite";
  filePath: string;
}

export type ISOLATION_LEVEL =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";
