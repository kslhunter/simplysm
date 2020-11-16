import { DbContext, IDbConnectionConfig } from "@simplysm/sd-orm-common";
import { Type } from "@simplysm/sd-core-common";
import { NodeDbContextExecutor } from "./NodeDbContextExecutor";

export class SdOrm {
  public constructor(private readonly _connConfig: IDbConnectionConfig) {
  }

  public async connectAsync<T extends DbContext, R>(dbType: Type<T>, callback: (conn: T) => Promise<R>): Promise<R> {
    const db = new dbType(new NodeDbContextExecutor(this._connConfig));
    return await db.connectAsync(async () => await callback(db));
  }

  public async connectWithoutTransactionAsync<T extends DbContext, R>(dbType: Type<T>, callback: (conn: T) => Promise<R>): Promise<R> {
    const db = new dbType(new NodeDbContextExecutor(this._connConfig));
    return await db.connectWithoutTransactionAsync(async () => await callback(db));
  }
}
