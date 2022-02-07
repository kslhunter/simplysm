import {
  IDbContextExecutor,
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  TQueryDef
} from "@simplysm/sd-orm/common";
import { SdServiceClient } from "@simplysm/sd-service/client";
import { TDbConnOptions } from "../common";

export class SdServiceDbContextExecutor implements IDbContextExecutor {
  private _connId?: number;

  public constructor(private readonly _client: SdServiceClient,
                     private readonly _opt: TDbConnOptions) {
  }

  public async getInfoAsync(): Promise<{
    dialect: "mssql" | "mysql" | "mssql-azure";
    database?: string;
    schema?: string;
  }> {
    return await this._client.sendAsync("SdOrmService", "getInfoAsync", [this._opt]);
  }

  public async connectAsync(): Promise<void> {
    this._connId = await this._client.sendAsync("SdOrmService", "connectAsync", [this._opt]);
  }

  public async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "beginTransactionAsync", [this._connId, isolationLevel]);
  }

  public async commitTransactionAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "commitTransactionAsync", [this._connId]);
  }

  public async rollbackTransactionAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "rollbackTransactionAsync", [this._connId]);
  }

  public async closeAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "closeAsync", [this._connId]);
  }

  public async executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService", "executeDefsAsync", [this._connId, defs, options]);
  }

  public async executeAsync(queries: string[]): Promise<any[][]> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService", "executeAsync", [this._connId, queries]);
  }

  public async bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService", "bulkInsertAsync", [this._connId, tableName, columnDefs, records]);
  }
}
