import {SdSocketClient} from "../service/SdSocketClient";
import {ITableDef} from "./definitions";
import {Queryable} from "./Queryable";

export abstract class DbContext {
  // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
  public constructor(private readonly _socket: SdSocketClient) {
  }

  public abstract get configName(): string;

  public getTableDefinitions(): ITableDef[] {
    return Object.values(this).ofType(Queryable).map(qr => qr.tableDef).filterExists();
  }

  public async connectAsync<R>(fn: (db: this) => Promise<R>, trans: boolean = true): Promise<R> {
    const connId = await this._connectAsync();

    if (trans) {
      await this._beginTransactionAsync(connId);
    }

    let result: R;
    try {
      result = await fn(this);

      if (trans) {
        await this._commitTransactionAsync(connId);
      }
    }
    catch (err) {
      if (trans) {
        try {
          await this._rollbackTransactionAsync(connId);
        }
        catch (err1) {
          if (!err1.message.includes("ROLLBACK") || !err1.message.includes("BEGIN")) {
            await this._closeAsync(connId);
            throw err1;
          }
        }
      }

      await this._closeAsync(connId);
      throw err;
    }

    await this._closeAsync(connId);
    return result;
  }

  private async _connectAsync(): Promise<number> {
    return await this._socket.sendAsync("OrmService.connectAsync", [this.configName]);
  }

  private async _beginTransactionAsync(connId: number): Promise<void> {
    await this._socket.sendAsync("OrmService.beginTransactionAsync", [connId]);
  }

  private async _commitTransactionAsync(connId: number): Promise<void> {
    await this._socket.sendAsync("OrmService.commitTransactionAsync", [connId]);
  }

  private async _rollbackTransactionAsync(connId: number): Promise<void> {
    await this._socket.sendAsync("OrmService.rollbackTransactionAsync", [connId]);
  }

  private async _closeAsync(connId: number): Promise<void> {
    await this._socket.sendAsync("OrmService.closeAsync", [connId]);
  }
}
