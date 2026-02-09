import type { JSX } from "solid-js";

export interface SheetProps<T> {
  // 데이터
  items?: T[];
  // 설정
  key?: string;
  hideConfigBar?: boolean;
  inset?: boolean;
  contentStyle?: JSX.CSSProperties | string;

  // 정렬
  sorts?: SortingDef[];
  onSortsChange?: (sorts: SortingDef[]) => void;
  autoSort?: boolean;

  // 페이지네이션
  page?: number;
  onPageChange?: (page: number) => void;
  totalPageCount?: number;
  itemsPerPage?: number;
  displayPageCount?: number;

  // 선택
  selectMode?: "single" | "multiple";
  selectedItems?: T[];
  onSelectedItemsChange?: (items: T[]) => void;
  autoSelect?: "click";
  isItemSelectable?: (item: T) => boolean | string;

  // 트리 확장
  expandedItems?: T[];
  onExpandedItemsChange?: (items: T[]) => void;
  getChildren?: (item: T, index: number) => T[] | undefined;

  // 셀 스타일
  cellClass?: (item: T, colKey: string) => string | undefined;
  cellStyle?: (item: T, colKey: string) => string | undefined;

  // 재정렬
  onItemsReorder?: (event: SheetReorderEvent<T>) => void;

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
  sortable?: boolean;
  resizable?: boolean;
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
  sortable: boolean;
  resizable: boolean;
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

// 드래그 앤 드롭 위치
export type SheetDragPosition = "before" | "after" | "inside";

// 재정렬 이벤트
export interface SheetReorderEvent<T> {
  item: T;
  targetItem: T;
  position: SheetDragPosition;
}

// 설정 모달에 전달할 컬럼 정보
export interface SheetConfigColumnInfo {
  key: string;
  header: string[];
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  width?: string;
}
