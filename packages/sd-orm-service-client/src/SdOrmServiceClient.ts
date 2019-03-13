import {DbContext} from "./DbContext";
import {Type, Wait} from "@simplysm/sd-common";
import {SdWebSocketDbContextExecutor} from "./SdWebSocketDbContextExecutor";
import {SdWebSocketClient} from "@simplysm/sd-service-client";

export class SdOrmServiceClient {
  public constructor(private readonly _ws: SdWebSocketClient) {
  }

  public async connectAsync<T extends DbContext, R>(dbType: Type<T>, callback: (conn: T) => Promise<R>, trans: boolean = true): Promise<R> {
    await Wait.true(() => this._ws.connected, undefined, 2000);
    const db = new dbType(new SdWebSocketDbContextExecutor(this._ws));
    return await db.connectAsync(callback, trans);
  }
}