import type { DbContextDef } from "@simplysm/orm-common";
import type { DbConnOptions } from "@simplysm/service-common";

export interface OrmConnectConfig<TDef extends DbContextDef<any, any, any>> {
  dbContextDef: TDef;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
