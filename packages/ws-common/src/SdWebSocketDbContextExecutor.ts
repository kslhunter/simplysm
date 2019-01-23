import {SdWebSocketClient} from "./SdWebSocketClient";
import {IDbContextExecutor, IQueryDef} from "@simplysm/orm-common";

export class SdWebSocketDbContextExecutor implements IDbContextExecutor {
  private _connId?: number;

  public constructor(private readonly _socket: SdWebSocketClient) {
  }

  public async getMainDbNameAsync(configName: string): Promise<string> {
    return await this._socket.sendAsync("OrmService.getMainDbNameAsync", [configName]);
  }

  public async connectAsync(configName: string): Promise<void> {
    this._connId = await this._socket.sendAsync("OrmService.connectAsync", [configName]);
  }

  public async beginTransactionAsync(): Promise<void> {
    await this._socket.sendAsync("OrmService.beginTransactionAsync", [this._connId]);
  }

  public async commitTransactionAsync(): Promise<void> {
    await this._socket.sendAsync("OrmService.commitTransactionAsync", [this._connId]);
  }

  public async rollbackTransactionAsync(): Promise<void> {
    await this._socket.sendAsync("OrmService.rollbackTransactionAsync", [this._connId]);
  }

  public async closeAsync(): Promise<void> {
    await this._socket.sendAsync("OrmService.closeAsync", [this._connId]);
  }

  public async executeAsync<C extends { name: string; dataType: string | undefined }[] | undefined>(queries: (string | IQueryDef)[], colDefs?: C, joinDefs?: { as: string; isSingle: boolean }[]): Promise<undefined extends C ? any[][] : any[]> {
    return await this._socket.sendAsync("OrmService.executeAsync", [this._connId, queries, colDefs, joinDefs]);
  }
}
