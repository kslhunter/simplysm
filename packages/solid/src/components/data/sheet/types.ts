import type { JSX } from "solid-js";

export interface SheetProps<T> {
  // 데이터
  items?: T[];
  trackByFn?: (item: T, index: number) => unknown;

  // 설정
  key: string;
  hideConfigBar?: boolean;
  inset?: boolean;
  contentStyle?: JSX.CSSProperties | string;

  // 정렬
  sorts?: SortingDef[];
  onSortsChange?: (sorts: SortingDef[]) => void;
  useAutoSort?: boolean;

  // 페이지네이션
  currentPage?: number;
  onCurrentPageChange?: (page: number) => void;
  totalPageCount?: number;
  itemsPerPage?: number;
  displayPageCount?: number;

  // 선택
  selectMode?: "single" | "multi";
  selectedItems?: T[];
  onSelectedItemsChange?: (items: T[]) => void;
  autoSelect?: "click" | "focus";
  getItemSelectableFn?: (item: T) => boolean | string;

  // 트리 확장
  expandedItems?: T[];
  onExpandedItemsChange?: (items: T[]) => void;
  getChildrenFn?: (item: T, index: number) => T[] | undefined;

  // 셀 스타일
  getItemCellClassFn?: (item: T, colKey: string) => string | undefined;
  getItemCellStyleFn?: (item: T, colKey: string) => string | undefined;

  // 기타
  class?: string;
  children: JSX.Element;
}

export interface SheetColumnProps<T> {
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
  disableSorting?: boolean;
  disableResizing?: boolean;
  children: (ctx: SheetCellContext<T>) => JSX.Element;
}

export interface SheetCellContext<T> {
  item: T;
  index: number;
  depth: number;
}

export interface SortingDef {
  key: string;
  desc: boolean;
}

export interface SheetConfig {
  columnRecord?: Partial<Record<string, SheetConfigColumn>>;
}

export interface SheetConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}

export interface SheetColumnDef<T> {
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
  disableSorting: boolean;
  disableResizing: boolean;
  cell: (ctx: SheetCellContext<T>) => JSX.Element;
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

export interface FlatItem<T> {
  item: T;
  index: number;
  depth: number;
  hasChildren: boolean;
  parent?: T;
}
