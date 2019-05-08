import {DateOnly, DateTime, Time, Type} from "@simplysm/sd-core";
import {DbContext} from "./DbContext";

export const tableDefMetadataKey = "table-def";

export type QueryType =
  boolean
  /*| QueriedBoolean*/
  | number
  | string
  | Number
  | String
  | Boolean
  | undefined
  | DateOnly
  | DateTime
  | Time
  | Buffer;

export class QueriedBoolean extends Boolean {
}

export interface IDbConnectionConfig {
  host?: string;
  port?: number;
  username: string;
  password: string;
  database: string;
}

export interface IDbContextExecutor {
  getMainDbNameAsync(configName: string): Promise<string>;

  connectAsync(configName: string): Promise<void>;

  beginTransactionAsync(): Promise<void>;

  commitTransactionAsync(): Promise<void>;

  rollbackTransactionAsync(): Promise<void>;

  executeAsync<C extends { name: string; dataType: string | undefined }[] | undefined>(queries: (string | IQueryDef)[], colDefs?: C, joinDefs?: { as: string; isSingle: boolean }[]): Promise<undefined extends C ? any[][] : any[]>;

  closeAsync(): Promise<void>;
}

export interface IDbMigration {
  up(db: DbContext): Promise<void>;
}

export interface IJoinDef {
  as: string;
  isSingle: boolean;
  targetTableType: Type<any>;
  join: IJoinDef[];
}

export interface IQueryDef {
  type: "select" | "insert" | "update" | "upsert" | "delete";
  select?: { [key: string]: any };
  from?: string;
  as?: string;
  where?: string[];
  distinct?: boolean;
  top?: number;
  groupBy?: string[];
  having?: string[];
  join?: string[];
  limit?: number[];
  orderBy?: string[];
  update?: { [key: string]: string };
  insert?: { [key: string]: string };
  output?: string[];
}
