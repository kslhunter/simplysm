import {
  IDbContextExecutor,
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  TDbConnConf,
  TQueryDef,
} from "@simplysm/sd-orm-common";
import { ISdOrmService, TDbConnOptions } from "@simplysm/sd-service-common";
import { SdServiceClient } from "../../SdServiceClient";
import { SdServiceClientBase } from "../../SdServiceClientBase";

export class SdOrmServiceClientDbContextExecutor
  extends SdServiceClientBase<ISdOrmService>
  implements IDbContextExecutor
{
  #connId?: number;

  constructor(
    client: SdServiceClient,
    private readonly _opt: TDbConnOptions,
  ) {
    super(client, "SdOrmService");
  }

  async getInfoAsync(): Promise<{
    dialect: TDbConnConf["dialect"];
    database?: string;
    schema?: string;
  }> {
    return await this.call("getInfo", [this._opt]);
  }

  async connectAsync(): Promise<void> {
    this.#connId = await this.call("connect", [this._opt]);
  }

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.call("beginTransaction", [this.#connId, isolationLevel]);
  }

  async commitTransactionAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.call("commitTransaction", [this.#connId]);
  }

  async rollbackTransactionAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.call("rollbackTransaction", [this.#connId]);
  }

  async closeAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.call("close", [this.#connId]);
  }

  async executeDefsAsync(
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this.call("executeDefs", [this.#connId, defs, options]);
  }

  async executeAsync(queries: string[]): Promise<any[][]> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this.call("execute", [this.#connId, queries]);
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this.call("bulkInsert", [this.#connId, tableName, columnDefs, records]);
  }

  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this.call("bulkUpsert", [this.#connId, tableName, columnDefs, records]);
  }
}
