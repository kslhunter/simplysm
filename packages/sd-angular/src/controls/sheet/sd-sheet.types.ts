import { SdSheetColumnDirective } from "./directives/sd-sheet-column.directive";


export interface ISdSheetConfig {
  columnRecord: Record<string, ISdSheetConfigColumn | undefined> | undefined;
}

export interface ISdSheetConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}

export interface ISdSheetItemKeydownEventParam<T> {
  item: T;
  key?: string;
  event: KeyboardEvent;
}

export interface ISdSheetColumnDef<T> {
  control: SdSheetColumnDirective<T>;
  fixed: boolean;
  width: string | undefined;
  headerStyle: string | undefined;
}

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