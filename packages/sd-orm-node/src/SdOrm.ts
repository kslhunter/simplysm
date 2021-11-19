import { DbContext, IDbConnectionConfig, IDbContextOption, ISOLATION_LEVEL } from "@simplysm/sd-orm-common";
import { Type } from "@simplysm/sd-core-common";
import { NodeDbContextExecutor } from "./NodeDbContextExecutor";

export class SdOrm<T extends DbContext> {
  public constructor(private readonly _dbContextType: Type<T>,
                     private readonly _config: IDbConnectionConfig,
                     private readonly _dbContextOpt?: Partial<IDbContextOption>) {
  }

  public async connectAsync<R>(callback: (conn: T) => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R> {
    const db = new this._dbContextType(new NodeDbContextExecutor(this._config), {
      dialect: this._dbContextOpt?.dialect ?? this._config.dialect,
      database: this._dbContextOpt?.database ?? this._config.database,
      schema: this._dbContextOpt?.schema ?? this._config.schema
    });
    return await db.connectAsync(async () => await callback(db), isolationLevel);
  }

  public async connectWithoutTransactionAsync<R>(callback: (conn: T) => Promise<R>): Promise<R> {
    const db = new this._dbContextType(new NodeDbContextExecutor(this._config), {
      dialect: this._dbContextOpt?.dialect ?? this._config.dialect,
      database: this._dbContextOpt?.database ?? this._config.database,
      schema: this._dbContextOpt?.schema ?? this._config.schema
    });
    return await db.connectWithoutTransactionAsync(async () => await callback(db));
  }
}
