import type { JSX } from "solid-js";

export interface DataSheetProps<TItem> {
  // 데이터
  items?: TItem[];
  // 설정
  persistKey?: string;
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
  selectedItems?: TItem[];
  onSelectedItemsChange?: (items: TItem[]) => void;
  autoSelect?: "click";
  isItemSelectable?: (item: TItem) => boolean | string;

  // 트리 확장
  expandedItems?: TItem[];
  onExpandedItemsChange?: (items: TItem[]) => void;
  getChildren?: (item: TItem, index: number) => TItem[] | undefined;

  // 셀 스타일
  cellClass?: (item: TItem, colKey: string) => string | undefined;
  cellStyle?: (item: TItem, colKey: string) => string | undefined;

  // 재정렬
  onItemsReorder?: (event: DataSheetReorderEvent<TItem>) => void;

  // 기타
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
  /** 소속 배열 내 위치 (루트: items[], 자식: parent.children[]) */
  index: number;
  /** 플랫 표시 행 위치 (현재 페이지 내 순번) */
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
  /** 소속 배열 내 위치 (루트: items[], 자식: parent.children[]) */
  index: number;
  /** 플랫 표시 행 위치 (현재 페이지 내 순번) */
  row: number;
  depth: number;
  hasChildren: boolean;
  parent?: TItem;
}

// 드래그 앤 드롭 위치
export type DataSheetDragPosition = "before" | "after" | "inside";

// 재정렬 이벤트
export interface DataSheetReorderEvent<TItem> {
  item: TItem;
  targetItem: TItem;
  position: DataSheetDragPosition;
}

// 설정 모달에 전달할 컬럼 정보
export interface DataSheetConfigColumnInfo {
  key: string;
  header: string[];
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  width?: string;
}
