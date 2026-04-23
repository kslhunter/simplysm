export interface SdSheetColumnDef {
  key: string;
  header: string | string[];
  headerStyle: string | undefined;
  tooltip: string | undefined;
  width: string | undefined;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  disableSorting: boolean;
  disableResizing: boolean;
  ordering: number;
}

export interface SdSheetHeaderDef {
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  colDef: SdSheetColumnDef | undefined;
  colIndex: number;
}

export interface SdSheetConfig {
  columnRecord: Record<
    string,
    {
      width?: string;
      hidden?: boolean;
      fixed?: boolean;
      ordering?: number;
    }
  >;
}

export interface SdSheetItemKeydownEventParam<T> {
  item: T;
  event: KeyboardEvent;
}

export interface SdSheetCellKeydownEventParam<T> {
  item: T;
  key: string;
  event: KeyboardEvent;
}
