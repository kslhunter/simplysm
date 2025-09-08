import { SdSheetColumnDirective } from "../directives/SdSheetColumnDirective";

export interface ISdSheetHeaderDef {
  control: SdSheetColumnDirective<any>;

  fixed: boolean;
  width: string | undefined;
  style: string | undefined;

  text: string;

  colspan: number;
  rowspan: number;
  isLastRow: boolean;
}
