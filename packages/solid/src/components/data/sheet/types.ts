import type { JSX } from "solid-js";

export interface DataSheetProps<TItem> {
  // Data
  items?: TItem[];
  // Config
  persistKey?: string;
  hideConfigBar?: boolean;
  inset?: boolean;
  contentStyle?: JSX.CSSProperties | string;

  // Sorting
  sorts?: SortingDef[];
  onSortsChange?: (sorts: SortingDef[]) => void;
  autoSort?: boolean;

  // Pagination
  page?: number;
  onPageChange?: (page: number) => void;
  totalPageCount?: number;
  itemsPerPage?: number;
  displayPageCount?: number;

  // Selection
  selectMode?: "single" | "multiple";
  selectedItems?: TItem[];
  onSelectedItemsChange?: (items: TItem[]) => void;
  autoSelect?: "click";
  isItemSelectable?: (item: TItem) => boolean | string;

  // Tree expansion
  expandedItems?: TItem[];
  onExpandedItemsChange?: (items: TItem[]) => void;
  getChildren?: (item: TItem, index: number) => TItem[] | undefined;

  // Cell styling
  cellClass?: (item: TItem, colKey: string) => string | undefined;
  cellStyle?: (item: TItem, colKey: string) => string | undefined;

  // Reordering
  onItemsReorder?: (event: DataSheetReorderEvent<TItem>) => void;

  // Other
  class?: string;
  children: JSX.Element;
}

export interface DataSheetColumnProps<TItem> {
  key: string;
  header?: string | string[];
  headerContent?: () => JSX.Element;
  headerStyle?: string;
  summary?: () => JSX.Element;
  tooltip?: string;
  fixed?: boolean;
  hidden?: boolean;
  collapse?: boolean;
  width?: string;
  class?: string;
  sortable?: boolean;
  resizable?: boolean;
  children: (ctx: DataSheetCellContext<TItem>) => JSX.Element;
}

export interface DataSheetCellContext<TItem> {
  item: TItem;
  /** Position within belonging array (root: items[], children: parent.children[]) */
  index: number;
  /** Flat display row position (sequence number within current page) */
  row: number;
  depth: number;
}

export interface SortingDef {
  key: string;
  desc: boolean;
}

export interface DataSheetConfig {
  columnRecord?: Partial<Record<string, DataSheetConfigColumn>>;
}

export interface DataSheetConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}

export interface DataSheetColumnDef<TItem> {
  __type: "sheet-column";
  key: string;
  header: string[];
  headerContent?: () => JSX.Element;
  headerStyle?: string;
  summary?: () => JSX.Element;
  tooltip?: string;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  width?: string;
  class?: string;
  sortable: boolean;
  resizable: boolean;
  cell: (ctx: DataSheetCellContext<TItem>) => JSX.Element;
}

export interface HeaderDef {
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  colIndex?: number;
  fixed?: boolean;
  width?: string;
  style?: string;
  headerContent?: () => JSX.Element;
}

export interface FlatItem<TItem> {
  item: TItem;
  /** Position within belonging array (root: items[], children: parent.children[]) */
  index: number;
  /** Flat display row position (sequence number within current page) */
  row: number;
  depth: number;
  hasChildren: boolean;
  parent?: TItem;
}

// Drag and drop position
export type DataSheetDragPosition = "before" | "after" | "inside";

// Reorder event
export interface DataSheetReorderEvent<TItem> {
  item: TItem;
  targetItem: TItem;
  position: DataSheetDragPosition;
}

// Column information passed to config modal
export interface DataSheetConfigColumnInfo {
  key: string;
  header: string[];
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  width?: string;
}
