import type {
  IDbContextExecutor,
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  TDbConnConf,
  TQueryDef,
} from "@simplysm/sd-orm-common";
import type { ISdOrmService, TDbConnOptions } from "@simplysm/sd-service-common";
import type { SdServiceClient } from "../../SdServiceClient";

export class SdOrmServiceClientDbContextExecutor implements IDbContextExecutor {
  private _connId?: number;
  private readonly _ormService: ISdOrmService;

  constructor(
    private readonly _client: SdServiceClient,
    private readonly _opt: TDbConnOptions & { configName: string },
  ) {
    this._ormService = _client.getService<ISdOrmService>("SdOrmService");
  }

  async getInfoAsync(): Promise<{
    dialect: TDbConnConf["dialect"];
    database?: string;
    schema?: string;
  }> {
    return await this._ormService.getInfo(this._opt);
  }

  async connectAsync(): Promise<void> {
    this._connId = await this._ormService.connect(this._opt);
  }

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._ormService.beginTransaction(this._connId, isolationLevel);
  }

  async commitTransactionAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._ormService.commitTransaction(this._connId);
  }

  async rollbackTransactionAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._ormService.rollbackTransaction(this._connId);
  }

  async closeAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._ormService.close(this._connId);
  }

  async executeDefsAsync(
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._ormService.executeDefs(this._connId, defs, options);
  }

  /*async executeAsync(queries: string[]): Promise<any[][]> {
    if (this.#connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this.#ormService.execute(this.#connId, queries);
  }*/

  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._ormService.executeParametrized(this._connId, query, params);
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._ormService.bulkInsert(this._connId, tableName, columnDefs, records);
  }

  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._ormService.bulkUpsert(this._connId, tableName, columnDefs, records);
  }
}
