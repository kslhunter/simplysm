import { Type } from "@simplysm/sd-core-common";
import { TDbConnOptions } from "@simplysm/sd-service-common";

export interface ISdOrmServiceConnectConfig<T> {
  dbContextType: Type<T>;
  connOpt: TDbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
