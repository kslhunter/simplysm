import {Injectable, Type} from "@angular/core";
import {SdWebSocketProvider} from "./SdWebSocketProvider";
import {Database} from "@simplism/orm-client";

@Injectable()
export class SdOrmProvider {
  public constructor(private readonly _ws: SdWebSocketProvider) {
  }

  public async connectAsync<T extends Database, R>(dbType: Type<T>, callback: (conn: T) => Promise<R>): Promise<R> {
    const conn = new dbType(this._ws.ws);
    return await conn.connectAsync(async () => await callback(conn));
  }
}