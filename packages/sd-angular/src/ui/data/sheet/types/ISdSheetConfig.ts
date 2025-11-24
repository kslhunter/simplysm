export interface ISdSheetConfig {
  columnRecord: Record<string, ISdSheetConfigColumn | undefined> | undefined;
}

export interface ISdSheetConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}
