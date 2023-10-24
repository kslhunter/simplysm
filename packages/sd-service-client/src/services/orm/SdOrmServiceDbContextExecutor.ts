import {
  IDbContextExecutor,
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  TDbConnectionConfig,
  TQueryDef
} from "@simplysm/sd-orm-common";
import {TDbConnOptions} from "@simplysm/sd-service-common";
import {SdServiceClient} from "../../SdServiceClient";

export class SdServiceDbContextExecutor implements IDbContextExecutor {
  #connId?: number;

  constructor(private readonly _client: SdServiceClient,
              private readonly _opt: TDbConnOptions) {
  }

  async getInfoAsync(): Promise<{
    dialect: TDbConnectionConfig["dialect"];
    database?: string;
    schema?: string;
  }> {
    return await this._client.sendAsync("SdOrmService", "getInfo", [this._opt]);
  }

  public async connectAsync(): Promise<void> {
    this.#connId = await this._client.sendAsync("SdOrmService", "connect", [this._opt]);
  }

  public async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "beginTransaction", [this.#connId, isolationLevel]);
  }

  public async commitTransactionAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "commitTransaction", [this.#connId]);
  }

  public async rollbackTransactionAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "rollbackTransaction", [this.#connId]);
  }

  public async closeAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService", "close", [this.#connId]);
  }

  public async executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService", "executeDefs", [this.#connId, defs, options]);
  }

  public async executeAsync(queries: string[]): Promise<any[][]> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService", "execute", [this.#connId, queries]);
  }

  public async bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService", "bulkInsert", [this.#connId, tableName, columnDefs, records]);
  }
}
