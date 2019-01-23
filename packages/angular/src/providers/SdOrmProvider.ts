import {Injectable} from "@angular/core";
import {SdWebSocketProvider} from "./SdWebSocketProvider";
import {Type} from "@simplysm/common";
import {DbContext} from "@simplysm/orm-common";
import {SdWebSocketDbContextExecutor} from "@simplysm/ws-common";

@Injectable()
export class SdOrmProvider {
  public constructor(private readonly _service: SdWebSocketProvider) {
  }

  public async connectAsync<T extends DbContext, R>(dbType: Type<T>, callback: (conn: T) => Promise<R>, withoutTransaction?: boolean): Promise<R> {
    const db = new dbType(new SdWebSocketDbContextExecutor(this._service.socket));
    return await db.connectAsync(callback, withoutTransaction);
  }
}
