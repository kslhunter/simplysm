import {Injectable} from "@angular/core";
import {SdWebSocketProvider} from "./SdWebSocketProvider";
import {Type, Wait} from "@simplysm/common";
import {DbContext} from "@simplysm/orm-common";
import {SdWebSocketDbContextExecutor} from "@simplysm/ws-common";

@Injectable()
export class SdOrmProvider {
  public constructor(private readonly _ws: SdWebSocketProvider) {
  }

  public async connectAsync<T extends DbContext, R>(dbType: Type<T>, callback: (conn: T) => Promise<R>, trans: boolean = true): Promise<R> {
    await Wait.true(() => this._ws.connected, undefined, 2000);
    const db = new dbType(new SdWebSocketDbContextExecutor(this._ws.socket));
    return await db.connectAsync(callback, trans);
  }
}
