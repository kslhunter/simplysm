import type { JSX } from "solid-js";
import type { ArrayOneWayDiffResult } from "@simplysm/core-common";
import type { DataSheetColumnProps, SortingDef } from "../../data/sheet/DataSheet.types";

// ── Search ──

export interface SearchResult<TItem> {
  items: TItem[];
  pageCount?: number;
}

// ── Feature Configs ──

export interface InlineEditConfig<TItem> {
  submit: (diffs: ArrayOneWayDiffResult<TItem>[]) => Promise<void>;
  newItem: () => TItem;
  deleteProp?: keyof TItem & string;
  diffsExcludes?: string[];
}

export interface DialogEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean | undefined>;
  deleteItems?: (items: TItem[]) => Promise<boolean>;
  restoreItems?: (items: TItem[]) => Promise<boolean>;
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
  selection(): TItem[];
  page(): number;
  sorts(): SortingDef[];
  busy(): boolean;
  hasChanges(): boolean;

  save(): Promise<void>;
  refresh(): Promise<void>;
  addItem(): void;
  clearSelection(): void;
  setPage(page: number): void;
  setSorts(sorts: SortingDef[]): void;
}

// ── Props ──

export type CrudSheetProps<TItem, TFilter extends Record<string, unknown>> = CrudSheetBaseProps<
  TItem,
  TFilter
> &
  (
    | { inlineEdit: InlineEditConfig<TItem>; dialogEdit?: never }
    | { dialogEdit: DialogEditConfig<TItem>; inlineEdit?: never }
    | { inlineEdit?: never; dialogEdit?: never }
  );

interface CrudSheetBaseProps<TItem, TFilter extends Record<string, unknown>> {
  search: (
    filter: TFilter,
    page: number | undefined,
    sorts: SortingDef[],
  ) => Promise<SearchResult<TItem>>;
  getItemKey: (item: TItem) => string | number | undefined;
  storageKey?: string;
  editable?: boolean;
  isItemEditable?: (item: TItem) => boolean;
  isItemDeletable?: (item: TItem) => boolean;
  isItemDeleted?: (item: TItem) => boolean;
  isItemSelectable?: (item: TItem) => true | string;
  lastModifiedAtProp?: string;
  lastModifiedByProp?: string;
  filterInitial?: TFilter;
  items?: TItem[];
  onItemsChange?: (items: TItem[]) => void;
  excel?: ExcelConfig<TItem>;
  selectionMode?: "single" | "multiple";
  onSelect?: (result: SelectResult<TItem>) => void;
  onSubmitComplete?: () => void;
  hideAutoTools?: boolean;
  close?: () => void;
  class?: string;
  children: JSX.Element;
}

// ── Sub-component Defs ──

export interface CrudSheetColumnProps<TItem> extends Omit<DataSheetColumnProps<TItem>, "children"> {
  editTrigger?: boolean;
  children: (ctx: CrudSheetCellContext<TItem>) => JSX.Element;
}
