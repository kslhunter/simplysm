import type { Type } from "@simplysm/core-common";
import type { TDbConnOptions } from "@simplysm/service-common";

export interface IOrmConnectConfig<T> {
  dbContextType: Type<T>;
  connOpt: TDbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
