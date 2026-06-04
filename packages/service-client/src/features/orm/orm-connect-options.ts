import type { DbContext, DbContextExecutor } from "@simplysm/orm-common";
import type { DbConnOptions } from "@simplysm/service-common";

export interface OrmConnectOptions<T extends DbContext> {
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema?: string;
  };
}
