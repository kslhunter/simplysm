import {DbContext, ISOLATION_LEVEL, TDbConnConf, TDbContextOption} from "@simplysm/sd-orm-common";
import {Type} from "@simplysm/sd-core-common";
import {NodeDbContextExecutor} from "./node.db-context-executor";

export class SdOrm<T extends DbContext> {
  constructor(readonly dbContextType: Type<T>,
                     readonly config: TDbConnConf,
                     readonly dbContextOpt?: Partial<TDbContextOption>) {
  }

  async connectAsync<R>(callback: (conn: T) => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R> {
    const db = new this.dbContextType(new NodeDbContextExecutor(this.config), {
      dialect: this.dbContextOpt?.dialect ?? this.config.dialect,
      database: this.dbContextOpt?.["database"] ?? this.config["database"],
      schema: this.dbContextOpt?.["schema"] ?? this.config["schema"]
    });
    return await db.connectAsync(async () => await callback(db), isolationLevel);
  }

  async connectWithoutTransactionAsync<R>(callback: (conn: T) => Promise<R>): Promise<R> {
    const db = new this.dbContextType(new NodeDbContextExecutor(this.config), {
      dialect: this.dbContextOpt?.dialect ?? this.config.dialect,
      database: this.dbContextOpt?.["database"] ?? this.config["database"],
      schema: this.dbContextOpt?.["schema"] ?? this.config["schema"]
    });
    return await db.connectWithoutTransactionAsync(async () => await callback(db));
  }
}
