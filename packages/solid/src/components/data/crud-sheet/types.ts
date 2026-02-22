import type { JSX } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type { ArrayDiffs2Result } from "@simplysm/core-common";
import type { DataSheetColumnProps, SortingDef } from "../sheet/types";

// ── Search ──

export interface SearchResult<TItem> {
  items: TItem[];
  pageCount?: number;
}

// ── Feature Configs ──

export interface InlineEditConfig<TItem> {
  submit: (diffs: ArrayDiffs2Result<TItem>[]) => Promise<void>;
  newItem: () => TItem;
  deleteProp?: keyof TItem & string;
}

export interface ModalEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean>;
  deleteItems?: (items: TItem[]) => Promise<boolean>;
}

export interface ExcelConfig<TItem> {
  download: (items: TItem[]) => Promise<void>;
  upload?: (file: File) => Promise<void>;
}

export interface SelectResult<TItem> {
  items: TItem[];
  keys: (string | number)[];
}

// ── Cell Context ──

export interface CrudSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => void;
}

// ── CrudSheet Context (for Tools render prop) ──

export interface CrudSheetContext<TItem> {
  items(): TItem[];
  selectedItems(): TItem[];
  page(): number;
  sorts(): SortingDef[];
  busy(): boolean;
  hasChanges(): boolean;

  save(): Promise<void>;
  refresh(): Promise<void>;
  addItem(): void;
  setPage(page: number): void;
  setSorts(sorts: SortingDef[]): void;
}

// ── Props ──

export type CrudSheetProps<TItem, TFilter extends Record<string, any>> = CrudSheetBaseProps<
  TItem,
  TFilter
> &
  (
    | { inlineEdit: InlineEditConfig<TItem>; modalEdit?: never }
    | { modalEdit: ModalEditConfig<TItem>; inlineEdit?: never }
    | { inlineEdit?: never; modalEdit?: never }
  );

interface CrudSheetBaseProps<TItem, TFilter extends Record<string, any>> {
  search: (filter: TFilter, page: number, sorts: SortingDef[]) => Promise<SearchResult<TItem>>;
  getItemKey: (item: TItem) => string | number | undefined;
  persistKey?: string;
  itemsPerPage?: number;
  editable?: boolean;
  itemEditable?: (item: TItem) => boolean;
  itemDeletable?: (item: TItem) => boolean;
  itemDeleted?: (item: TItem) => boolean;
  filterInitial?: TFilter;
  items?: TItem[];
  onItemsChange?: (items: TItem[]) => void;
  excel?: ExcelConfig<TItem>;
  selectMode?: "single" | "multiple";
  onSelect?: (result: SelectResult<TItem>) => void;
  hideAutoTools?: boolean;
  class?: string;
  children: JSX.Element;
}

// ── Sub-component Defs ──

export interface CrudSheetColumnDef<TItem> {
  __type: "crud-sheet-column";
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
  editTrigger: boolean;
  cell: (ctx: CrudSheetCellContext<TItem>) => JSX.Element;
}

export interface CrudSheetColumnProps<TItem> extends Omit<DataSheetColumnProps<TItem>, "children"> {
  editTrigger?: boolean;
  children: (ctx: CrudSheetCellContext<TItem>) => JSX.Element;
}

export interface CrudSheetFilterDef<TFilter> {
  __type: "crud-sheet-filter";
  children: (filter: TFilter, setFilter: SetStoreFunction<TFilter>) => JSX.Element;
}

export interface CrudSheetToolsDef<TItem> {
  __type: "crud-sheet-tools";
  children: (ctx: CrudSheetContext<TItem>) => JSX.Element;
}

export interface CrudSheetHeaderDef {
  __type: "crud-sheet-header";
  children: JSX.Element;
}
