import {DbContext} from "./DbContext";
import {Type} from "@simplism/core";
import {ServiceInterface} from "@simplism/service-interface";

export class OrmConnector {
  public constructor(private readonly _serviceInterface: ServiceInterface) {
  }

  public async connectAsync<T extends DbContext, R>(dbContextType: Type<T>, fn: (db: T) => Promise<R>): Promise<R> {
    const db = new dbContextType();
    return await db.connectAsync(this._serviceInterface, fn);
  }

  public async connectWithoutTransactionAsync<T extends DbContext, R>(dbContextType: Type<T>, fn: (db: T) => Promise<R>): Promise<R> {
    const db = new dbContextType();
    return await db.connectAsync(this._serviceInterface, fn, false);
  }
}