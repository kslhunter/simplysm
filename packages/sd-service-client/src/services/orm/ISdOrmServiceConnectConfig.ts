import { Type } from "@simplysm/sd-core-common";

export interface ISdOrmServiceConnectConfig<T> {
  dbContextType: Type<T>;
  connOpt: Record<string, any>;
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
