import { DbContext, IDbContextExecutor, IQueryResultParseOption, TQueryDef } from "@simplysm/sd-orm-common";
import { Type, Wait } from "@simplysm/sd-core-common";
import { SdNgServiceClient } from "../providers/SdServiceFactoryProvider";
import { SdServiceClient } from "@simplysm/sd-service-browser";

export class SdServiceDbContextExecutor implements IDbContextExecutor {
  private _connId?: number;
  public dialect: "mysql" | "mssql";

  private constructor(private readonly _client: SdServiceClient,
                      private readonly _configName: string,
                      dialect: string) {
    this.dialect = dialect as "mysql" | "mssql";
  }

  public static async createAsync(client: SdServiceClient, configName: string): Promise<SdServiceDbContextExecutor> {
    const dialect = (await client.sendAsync("SdOrmService.getDialectAsync", [configName])) ?? "mssql";
    return new SdServiceDbContextExecutor(client, configName, dialect);
  }

  public async connectAsync(): Promise<void> {
    this._connId = await this._client.sendAsync("SdOrmService.connectAsync", [this._configName]);
  }

  public async beginTransactionAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService.beginTransactionAsync", [this._connId]);
  }

  public async commitTransactionAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService.commitTransactionAsync", [this._connId]);
  }

  public async rollbackTransactionAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService.rollbackTransactionAsync", [this._connId]);
  }

  public async closeAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService.closeAsync", [this._connId]);
  }

  public async executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService.executeDefsAsync", [this._connId, defs, options]);
  }

  public async executeAsync(queries: string[]): Promise<any[][]> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService.executeAsync", [this._connId, queries]);
  }
}

export class SdOrmServiceInterface {
  public constructor(private readonly _service: SdNgServiceClient) {
  }

  public async connectAsync<T extends DbContext, R>(dbType: Type<T>, configName: string, callback: (conn: T) => Promise<R>): Promise<R> {
    try {
      await Wait.true(() => this._service.connected, undefined, 5000);
    }
    catch (err) {
      throw new Error("ORM 서비스에 연결할 수 없습니다.");
    }

    const db = new dbType(await SdServiceDbContextExecutor.createAsync(this._service.client, configName));
    return await db.connectAsync(async () => await callback(db));
  }

  public async connectWithoutTransactionAsync<T extends DbContext, R>(dbType: Type<T>, configName: string, callback: (conn: T) => Promise<R>): Promise<R> {
    try {
      await Wait.true(() => this._service.connected, undefined, 5000);
    }
    catch (err) {
      throw new Error("ORM 서비스에 연결할 수 없습니다.");
    }

    const db = new dbType(await SdServiceDbContextExecutor.createAsync(this._service.client, configName));
    return await db.connectWithoutTransactionAsync(async () => await callback(db));
  }
}
