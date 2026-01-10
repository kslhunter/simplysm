import type { Type } from "@simplysm/core-common";
import type { DbConnOptions } from "@simplysm/service-common";

export interface OrmConnectConfig<T> {
  dbContextType: Type<T>;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
