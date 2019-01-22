import {Injectable} from "@angular/core";
import {SdServiceProvider} from "./SdServiceProvider";
import {DbContext} from "../libs/orm/DbContext";
import {Type} from "@simplysm/common";

@Injectable()
export class SdOrmProvider {
  public constructor(private readonly _service: SdServiceProvider) {
  }

  public async connectAsync<T extends DbContext, R>(dbType: Type<T>, callback: (conn: T) => Promise<R>, withoutTransaction?: boolean): Promise<R> {
    const db = new dbType(this._service.socket);
    return await db.connectAsync(callback, withoutTransaction);
  }
}
