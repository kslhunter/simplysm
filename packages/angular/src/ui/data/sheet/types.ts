export interface ISdSheetColumnDef {
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

export interface ISdSheetHeaderDef {
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  colDef: ISdSheetColumnDef | undefined;
}

export interface ISdSheetConfig {
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

export interface ISdSheetItemKeydownEventParam<T> {
  item: T;
  event: KeyboardEvent;
}

export interface ISdSheetCellKeydownEventParam<T> {
  item: T;
  key: string;
  event: KeyboardEvent;
}
