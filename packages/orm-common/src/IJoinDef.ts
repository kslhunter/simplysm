import {Type} from "@simplysm/common";

export interface IJoinDef {
  as: string;
  isSingle: boolean;
  targetTableType: Type<any>;
  join: IJoinDef[];
}
