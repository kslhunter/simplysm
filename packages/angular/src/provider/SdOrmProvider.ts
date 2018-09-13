import {Injectable, Type} from "@angular/core";
import {DbContext, IDbContextExecutor, Queryable} from "@simplism/orm-client";
import {SdSocketProvider} from "./SdSocketProvider";
import {ITableDef, tableDefMetadataKey} from "@simplism/orm-query";

export class DbContextSocketExecutor implements IDbContextExecutor {
  private _connId?: number;

  public constructor(private readonly _socket: SdSocketProvider) {
  }

  public async connectAsync<D extends DbContext, R>(db: D, fn: (db: D) => Promise<R>, withoutTransaction?: boolean): Promise<R> {
    const connId = await await this._socket.sendAsync("OrmService.connectAsync", [db.config]);
    this._connId = connId;

    if (!withoutTransaction) {
      await this._socket.sendAsync("OrmService.beginTransactionAsync", [connId]);
    }

    let result: R;
    try {
      result = await fn(db);

      if (!withoutTransaction) {
        await this._socket.sendAsync("OrmService.commitTransactionAsync", [connId]);
      }
    }
    catch (err) {
      try {
        if (!withoutTransaction) {
          await this._socket.sendAsync("OrmService.rollbackTransactionAsync", [connId]);
        }
      }
      catch (err2) {
        await this._socket.sendAsync("OrmService.closeAsync", [connId]);
        throw err2;
      }

      await this._socket.sendAsync("OrmService.closeAsync", [connId]);
      throw err;
    }

    await this._socket.sendAsync("OrmService.closeAsync", [connId]);

    return result;
  }

  public async executeAsync<C extends { name: string; dataType: string | undefined }[] | undefined>(query: string, colDefs?: C, joinDefs?: { as: string; isSingle: boolean }[]): Promise<undefined extends C ? any[][] : any[]> {
    if (!this._socket.connected) {
      throw new Error("ORM 서비스에 연결되어있지 않습니다.");
    }

    return await this._socket.sendAsync("OrmService.executeAsync", joinDefs ? [this._connId, query.trim(), colDefs, joinDefs] : [this._connId, query.trim()]);
  }

  public async forceCloseAsync(): Promise<void> {
    if (!this._socket.connected) {
      throw new Error("ORM 서비스에 연결되어있지 않습니다.");
    }

    if (!this._connId) {
      throw new Error("ORM 서비스가 DB에 연결되어있지 않습니다.");
    }

    await this._socket.sendAsync("OrmService.closeAsync", [this._connId]);
  }
}

@Injectable()
export class SdOrmProvider {
  private _dbContexts: DbContext[] = [];

  public constructor(private readonly _socket: SdSocketProvider) {
  }

  public async connectAsync<T extends DbContext, R>(dbType: Type<T>, callback: (conn: T) => Promise<R>, withoutTransaction?: boolean): Promise<R> {
    const db = new dbType(new DbContextSocketExecutor(this._socket));
    this._dbContexts.push(db);
    try {
      const result = await db.connectAsync(callback, withoutTransaction);
      this._dbContexts.remove(db);
      return result;
    }
    catch (err) {
      this._dbContexts.remove(db);
      throw err;
    }
  }

  public async forceCloseAllAsync(): Promise<void> {
    for (const db of this._dbContexts) {
      await db.forceCloseAsync();
    }
    this._dbContexts = [];
  }

  public getTableDefinitions<T extends DbContext>(dbType: Type<T>): ITableDef[] {
    return Object.values(new dbType())
      .ofType(Queryable)
      .map(qr => core.Reflect.getMetadata(tableDefMetadataKey, qr.tableType!) as ITableDef)
      .filterExists();
  }
}