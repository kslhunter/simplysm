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

export class SdOrmServiceClientDbContextExecutor implements IDbContextExecutor {
  #connId?: number;
  #ormService: ISdOrmService;

  constructor(
    private readonly _client: SdServiceClient,
    private readonly _opt: TDbConnOptions & { configName: string },
  ) {
    this.#ormService = _client.getService<ISdOrmService>("SdOrmService");
  }

  async getInfoAsync(): Promise<{
    dialect: TDbConnConf["dialect"];
    database?: string;
    schema?: string;
  }> {
    return await this.#ormService.getInfo(this._opt);
  }

  async connectAsync(): Promise<void> {
    this.#connId = await this.#ormService.connect(this._opt);
  }

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.#ormService.beginTransaction(this.#connId, isolationLevel);
  }

  async commitTransactionAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.#ormService.commitTransaction(this.#connId);
  }

  async rollbackTransactionAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.#ormService.rollbackTransaction(this.#connId);
  }

  async closeAsync(): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.#ormService.close(this.#connId);
  }

  async executeDefsAsync(
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this.#ormService.executeDefs(this.#connId, defs, options);
  }

  async executeAsync(queries: string[]): Promise<any[][]> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this.#ormService.execute(this.#connId, queries);
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this.#ormService.bulkInsert(this.#connId, tableName, columnDefs, records);
  }

  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this.#ormService.bulkUpsert(this.#connId, tableName, columnDefs, records);
  }
}
