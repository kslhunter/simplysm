import type { Type } from "@simplysm/sd-core-common";
import type { TDbConnOptions } from "@simplysm/sd-service-common";

export interface ISdOrmServiceConnectConfig<T> {
  dbContextType: Type<T>;
  connOpt: TDbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
