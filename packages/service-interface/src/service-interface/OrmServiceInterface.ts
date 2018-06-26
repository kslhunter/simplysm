import {SocketClient} from "@simplism/socket-client";
import {IDbConnectionConfig} from "@simplism/orm-common";

export class OrmServiceInterface {
  public constructor(private readonly _socket: SocketClient) {
  }

  public async connectAsync(config: IDbConnectionConfig): Promise<number> {
    return await this._socket.sendAsync("OrmService.connectAsync", [config]);
  }

  public async closeAsync(connId: number): Promise<void> {
    return await this._socket.sendAsync("OrmService.closeAsync", [connId]);
  }

  public async beginTransactionAsync(connId: number): Promise<void> {
    return await this._socket.sendAsync("OrmService.beginTransactionAsync", [connId]);
  }

  public async commitTransactionAsync(connId: number): Promise<void> {
    return await this._socket.sendAsync("OrmService.commitTransactionAsync", [connId]);
  }

  public async rollbackTransactionAsync(connId: number): Promise<void> {
    return await this._socket.sendAsync("OrmService.rollbackTransactionAsync", [connId]);
  }

  public async executeAsync(connId: number, query: string): Promise<any[][]> {
    return await this._socket.sendAsync("OrmService.executeAsync", [connId, query]);
  }
}