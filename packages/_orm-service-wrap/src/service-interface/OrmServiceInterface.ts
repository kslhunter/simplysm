import {SocketClient} from "@simplism/socket-client";
import {DbContext} from "../orm/DbContext";
import {Type} from "@simplism/core";

export class OrmServiceInterface {
  public constructor(private readonly _socket: SocketClient) {
  }

  public async connectAsync<T extends DbContext, R>(dbContextType: Type<T>, fn: (db: T) => Promise<R>): Promise<R> {
    const db = new dbContextType();

    const connId = await this._socket.sendAsync("OrmService.connect", [db.config]);

    await this._socket.sendAsync("OrmService.beginTransaction", [connId]);

    let result: R;
    try {
      result = await fn(db);

      await this._socket.sendAsync("OrmService.commitTransaction", [connId]);
    }
    catch (err) {
      await this._socket.sendAsync("OrmService.rollbackTransaction", [connId]);
      await this._socket.sendAsync("OrmService.close", [connId]);
      throw err;
    }

    await this._socket.sendAsync("OrmService.close", [connId]);

    return result;
  }
}