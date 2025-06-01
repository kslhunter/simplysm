import {
  IDbContextExecutor,
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  TDbConnConf,
  TQueryDef,
} from "@simplysm/sd-orm-common";
import { TDbConnOptions } from "@simplysm/sd-service-common";
import { SdServiceClient } from "../../sd-service-client";

export class SdOrmServiceClientDbContextExecutor implements IDbContextExecutor {
  #connId?: number;

  constructor(
    private readonly _client: SdServiceClient,
    private readonly _opt: TDbConnOptions,
  ) {
  }

  async getInfoAsync(): Promise<{
    dialect: TDbConnConf["dialect"];
    database?: string;
    schema?: string;
  }> {
    return await this._client.sendAsync("SdOrmService", "getInfo", [this._opt]);
  }

  async connectAsync(): Promise<void> {
    this.#connId = await this._client.sendAsync("SdOrmService", "connect", [this._opt]);
  }

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync(
      "SdOrmService",
      "beginTransaction",
      [this.#connId, isolationLevel],
    );
  }

  async commitTransactionAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "commitTransaction", [this.#connId]);
  }

  async rollbackTransactionAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "rollbackTransaction", [this.#connId]);
  }

  async closeAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "close", [this.#connId]);
  }

  async executeDefsAsync(
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync(
      "SdOrmService",
      "executeDefs",
      [this.#connId, defs, options],
    );
  }

  async executeAsync(queries: string[]): Promise<any[][]> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService", "execute", [this.#connId, queries]);
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync(
      "SdOrmService",
      "bulkInsert",
      [this.#connId, tableName, columnDefs, records],
    );
  }


  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync(
      "SdOrmService",
      "bulkUpsert",
      [this.#connId, tableName, columnDefs, records],
    );
  }
}
