import { DbContext, IDbConnectionConfig, ISOLATION_LEVEL } from "@simplysm/sd-orm-common";
import { Type } from "@simplysm/sd-core-common";
import { NodeDbContextExecutor } from "./NodeDbContextExecutor";

export class SdOrm {
  public constructor(private readonly _connConfig: IDbConnectionConfig) {
  }

  public async connectAsync<T extends DbContext, R>(dbType: Type<T>, schema: { database: string; schema: string }, callback: (conn: T) => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R> {
    const db = new dbType(new NodeDbContextExecutor(this._connConfig, schema.database, schema.schema));
    return await db.connectAsync(async () => await callback(db), isolationLevel);
  }

  public async connectWithoutTransactionAsync<T extends DbContext, R>(dbType: Type<T>, schema: { database: string; schema: string }, callback: (conn: T) => Promise<R>): Promise<R> {
    const db = new dbType(new NodeDbContextExecutor(this._connConfig, schema.database, schema.schema));
    return await db.connectWithoutTransactionAsync(async () => await callback(db));
  }
}
