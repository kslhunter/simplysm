import {SdWebSocketClient} from "@simplysm/sd-service-client";
import {IDbContextExecutor} from "./IDbContextExecutor";
import {IQueryDef} from "./IQueryDef";

export class SdWebSocketDbContextExecutor implements IDbContextExecutor {
  private _connId?: number;

  public constructor(private readonly _socket: SdWebSocketClient) {
  }

  public async getMainDbNameAsync(configName: string): Promise<string> {
    return await this._socket.sendAsync("SdOrmService.getMainDbNameAsync", [configName]);
  }

  public async connectAsync(configName: string): Promise<void> {
    this._connId = await this._socket.sendAsync("SdOrmService.connectAsync", [configName]);
  }

  public async beginTransactionAsync(): Promise<void> {
    await this._socket.sendAsync("SdOrmService.beginTransactionAsync", [this._connId]);
  }

  public async commitTransactionAsync(): Promise<void> {
    await this._socket.sendAsync("SdOrmService.commitTransactionAsync", [this._connId]);
  }

  public async rollbackTransactionAsync(): Promise<void> {
    await this._socket.sendAsync("SdOrmService.rollbackTransactionAsync", [this._connId]);
  }

  public async closeAsync(): Promise<void> {
    await this._socket.sendAsync("SdOrmService.closeAsync", [this._connId]);
  }

  public async executeAsync<C extends { name: string; dataType: string | undefined }[] | undefined>(queries: (string | IQueryDef)[], colDefs?: C, joinDefs?: { as: string; isSingle: boolean }[]): Promise<undefined extends C ? any[][] : any[]> {
    return await this._socket.sendAsync("SdOrmService.executeAsync", [this._connId, queries, colDefs, joinDefs]);
  }
}
