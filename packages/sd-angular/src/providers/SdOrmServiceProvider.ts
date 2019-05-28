import {SdServiceProvider} from "./SdServiceProvider";
import {Injectable} from "@angular/core";
import {DbContext, IDbContextExecutor, IQueryDef} from "@simplysm/sd-orm";
import {Type, Wait} from "@simplysm/sd-core";
import {SdServiceClient} from "@simplysm/sd-service";

export class SdServiceDbContextExecutor implements IDbContextExecutor {
  private _connId?: number;

  public constructor(private readonly _client: SdServiceClient) {
  }

  public async getMainDbNameAsync(configName: string): Promise<string> {
    return await this._client.sendAsync("SdOrmService.getMainDbNameAsync", [configName]);
  }

  public async connectAsync(configName: string): Promise<void> {
    this._connId = await this._client.sendAsync("SdOrmService.connectAsync", [configName]);
  }

  public async beginTransactionAsync(): Promise<void> {
    await this._client.sendAsync("SdOrmService.beginTransactionAsync", [this._connId]);
  }

  public async commitTransactionAsync(): Promise<void> {
    await this._client.sendAsync("SdOrmService.commitTransactionAsync", [this._connId]);
  }

  public async rollbackTransactionAsync(): Promise<void> {
    await this._client.sendAsync("SdOrmService.rollbackTransactionAsync", [this._connId]);
  }

  public async closeAsync(): Promise<void> {
    await this._client.sendAsync("SdOrmService.closeAsync", [this._connId]);
  }

  public async executeAsync<C extends { name: string; dataType: string | undefined }[] | undefined>(queries: (string | IQueryDef)[], colDefs?: C, joinDefs?: { as: string; isSingle: boolean }[]): Promise<undefined extends C ? any[][] : any[]> {
    return await this._client.sendAsync("SdOrmService.executeAsync", [this._connId, queries, colDefs, joinDefs]);
  }
}

@Injectable()
export class SdOrmServiceProvider {
  public constructor(private readonly _service: SdServiceProvider) {
  }

  public async connectAsync<T extends DbContext, R>(dbType: Type<T>, callback: (conn: T) => Promise<R>, trans: boolean = true): Promise<R> {
    try {
      await Wait.true(() => this._service.connected, undefined, 5000);
    }
    catch (err) {
      throw new Error("ORM 서비스에 연결할 수 없습니다.");
    }

    const db = new dbType(new SdServiceDbContextExecutor(this._service.client));
    return await db.connectAsync(callback, trans);
  }
}
