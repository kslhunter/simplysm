import {DbContext} from "./DbContext";
import {Type} from "@simplysm/sd-core";
import {DefaultDbContextExecutor} from "./DefaultDbContextExecutor";
import {IDbConnectionConfig} from "./commons";

export class SdOrm {
  public constructor(private readonly _configObj: { [key: string]: IDbConnectionConfig }) {
  }

  public async connectAsync<T extends DbContext, R>(dbType: Type<T>, callback: (conn: T) => Promise<R>, trans: boolean = true): Promise<R> {
    const executor = new DefaultDbContextExecutor(this._configObj);
    const db = new dbType(executor);
    return await db.connectAsync(callback, trans);
  }
}