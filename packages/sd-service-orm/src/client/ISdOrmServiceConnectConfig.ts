import { Type } from "@angular/core";

export interface ISdOrmServiceConnectConfig<T> {
  dbContextType: Type<T>;
  connOpt: Record<string, any>;
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
