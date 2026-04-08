export interface SdSheetColumnDef {
  key: string;
  header: string | string[];
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
