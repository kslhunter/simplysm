import type {
  DbContext,
  ISOLATION_LEVEL,
  TDbConnConf,
  TDbContextOption,
} from "@simplysm/sd-orm-common";
import type { Type } from "@simplysm/sd-core-common";
import { NodeDbContextExecutor } from "./NodeDbContextExecutor";

export class SdOrm<T extends DbContext> {
  constructor(
    readonly dbContextType: Type<T>,
    readonly config: TDbConnConf,
    readonly dbContextOpt?: Partial<TDbContextOption>,
  ) {}

  async connectAsync<R>(
    callback: (conn: T) => Promise<R>,
    isolationLevel?: ISOLATION_LEVEL,
  ): Promise<R> {
    const optRec = this.dbContextOpt as Record<string, any> | undefined;
    const confRec = this.config as Record<string, any>;
    const db = new this.dbContextType(new NodeDbContextExecutor(this.config), {
      dialect: this.dbContextOpt?.dialect ?? this.config.dialect,
      database: optRec?.["database"] ?? confRec["database"],
      schema: optRec?.["schema"] ?? confRec["schema"],
    });
    return await db.connectAsync(async () => await callback(db), isolationLevel);
  }

  async connectWithoutTransactionAsync<R>(callback: (conn: T) => Promise<R>): Promise<R> {
    const optRec = this.dbContextOpt as Record<string, any> | undefined;
    const confRec = this.config as Record<string, any>;
    const db = new this.dbContextType(new NodeDbContextExecutor(this.config), {
      dialect: this.dbContextOpt?.dialect ?? this.config.dialect,
      database: optRec?.["database"] ?? confRec["database"],
      schema: optRec?.["schema"] ?? confRec["schema"],
    });
    return await db.connectWithoutTransactionAsync(async () => await callback(db));
  }
}
