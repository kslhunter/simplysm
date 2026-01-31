import type {
  DbContextExecutor,
  ColumnMeta,
  ResultMeta,
  IsolationLevel,
  Dialect,
  QueryDef,
} from "@simplysm/orm-common";
import type { OrmService, DbConnOptions } from "@simplysm/service-common";
import type { ServiceClient } from "../../service-client";

export class OrmClientDbContextExecutor implements DbContextExecutor {
  private _connId?: number;
  private readonly _ormService: OrmService;

  constructor(
    private readonly _client: ServiceClient,
    private readonly _opt: DbConnOptions & { configName: string },
  ) {
    // "SdOrmService" → "OrmService" 변경
    this._ormService = _client.getService<OrmService>("OrmService");
  }

  async getInfoAsync(): Promise<{
    dialect: Dialect;
    database?: string;
    schema?: string;
  }> {
    return this._ormService.getInfo(this._opt);
  }

  async connectAsync(): Promise<void> {
    this._connId = await this._ormService.connect(this._opt);
  }

  async beginTransactionAsync(isolationLevel?: IsolationLevel): Promise<void> {
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

  async executeDefsAsync<T = Record<string, unknown>>(
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<T[][]> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return (await this._ormService.executeDefs(this._connId, defs, options)) as T[][];
  }

  async executeParametrizedAsync(query: string, params?: unknown[]): Promise<unknown[][]> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return this._ormService.executeParametrized(this._connId, query, params);
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return this._ormService.bulkInsert(this._connId, tableName, columnDefs, records);
  }
}
