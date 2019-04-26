import { Type } from "@simplysm/sd-common";

export interface IJoinDef {
  as: string;
  isSingle: boolean;
  targetTableType: Type<any>;
  join: IJoinDef[];
}
