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
    this._ormService = _client.getService<OrmService>("Orm");
  }

  async getInfo(): Promise<{
    dialect: Dialect;
    database?: string;
    schema?: string;
  }> {
    return this._ormService.getInfo(this._opt);
  }

  async connect(): Promise<void> {
    this._connId = await this._ormService.connect(this._opt);
  }

  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("Not connected to the database.");
    }

    await this._ormService.beginTransaction(this._connId, isolationLevel);
  }

  async commitTransaction(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("Not connected to the database.");
    }

    await this._ormService.commitTransaction(this._connId);
  }

  async rollbackTransaction(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("Not connected to the database.");
    }

    await this._ormService.rollbackTransaction(this._connId);
  }

  async close(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("Not connected to the database.");
    }

    await this._ormService.close(this._connId);
  }

  async executeDefs<T = Record<string, unknown>>(
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<T[][]> {
    if (this._connId === undefined) {
      throw new Error("Not connected to the database.");
    }

    return (await this._ormService.executeDefs(this._connId, defs, options)) as T[][];
  }

  async executeParametrized(query: string, params?: unknown[]): Promise<unknown[][]> {
    if (this._connId === undefined) {
      throw new Error("Not connected to the database.");
    }

    return this._ormService.executeParametrized(this._connId, query, params);
  }

  async bulkInsert(
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("Not connected to the database.");
    }

    return this._ormService.bulkInsert(this._connId, tableName, columnDefs, records);
  }
}
