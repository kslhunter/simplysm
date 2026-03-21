# Feature Components

Source: `src/components/features/**/*.tsx`

## AddressSearchContent

Korean address search component using Daum Postcode API.

```ts
interface AddressSearchResult {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}

const AddressSearchContent: Component<{
  close?: (result?: AddressSearchResult) => void;
}>;
```

Designed for use with `useDialog().show()`. Loads the Daum Postcode script on mount.

## SharedDataSelect

Select component bound to a shared data definition. Supports single and multiple modes with the same prop variants as `Select`.

```ts
type SharedDataSelectProps<TItem, TDataKey extends string> = {
  dataKey: TDataKey;
  // ...inherits Select props (value, onValueChange, multiple, etc.)
  // plus shared data specific:
  getItemSearchText?: (item: TItem) => string;
  isItemHidden?: (item: TItem) => boolean;
};
```

### Sub-components

- **`SharedDataSelect.ItemTemplate`** -- Render template for items.

## SharedDataSelectButton

Button that opens a shared data selection dialog.

```ts
type SharedDataSelectButtonProps<TItem, TDataKey extends string> = {
  dataKey: TDataKey;
  value?: TItem | TItem[];
  onValueChange?: (value: TItem | TItem[] | undefined) => void;
  renderValue?: (value: TItem) => JSX.Element;
  // ...plus button/validation props
};
```

## SharedDataSelectList

List component bound to shared data, rendering items from a shared data definition.

```ts
interface SharedDataSelectListProps<TItem> {
  dataKey: string;
  value?: unknown[];
  onValueChange?: (value: unknown[]) => void;
  // ...list configuration props
}
```

### Sub-components

- **`SharedDataSelectList.ItemTemplate`** -- Render template for list items.

## DataSelectButton

Button that opens a custom data selection dialog. Generic over key type and dialog props.

```ts
interface DataSelectButtonProps<TKey, TDialogProps> {
  value?: TKey | TKey[];
  onValueChange?: (value: TKey | TKey[] | undefined) => void;
  renderValue?: (value: TKey) => JSX.Element;
  dialog: Component<TDialogProps>;
  dialogProps?: Omit<TDialogProps, "close">;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}

interface DataSelectDialogResult<TKey> {
  selectedKeys: TKey[];
}

interface SelectDialogBaseProps<TKey> {
  close?: (result?: DataSelectDialogResult<TKey>) => void;
  initialSelectedKeys?: TKey[];
  selectionMode?: "single" | "multiple";
}
```

## CrudSheet

Full-featured CRUD data grid combining DataSheet with search, pagination, sorting, inline/dialog editing, selection, and Excel import/export.

```ts
type CrudSheetProps<TItem, TFilter extends Record<string, unknown>> = {
  search: (filter: TFilter, page: number | undefined, sorts: SortingDef[]) => Promise<SearchResult<TItem>>;
  getItemKey: (item: TItem) => string | number | undefined;
  storageKey?: string;
  editable?: boolean;
  isItemEditable?: (item: TItem) => boolean;
  isItemDeletable?: (item: TItem) => boolean;
  isItemDeleted?: (item: TItem) => boolean;
  isItemSelectable?: (item: TItem) => boolean | string;
  lastModifiedAtProp?: string;
  lastModifiedByProp?: string;
  filterInitial?: TFilter;
  items?: TItem[];
  onItemsChange?: (items: TItem[]) => void;
  excel?: ExcelConfig<TItem>;
  selectionMode?: "single" | "multiple";
  selectedKeys?: (string | number)[];
  onSelectedKeysChange?: (keys: (string | number)[]) => void;
  onSelect?: (result: SelectResult<TItem>) => void;
  onSubmitComplete?: () => void;
  hideAutoTools?: boolean;
  close?: () => void;
  class?: string;
  children: JSX.Element;
} & (
  | { inlineEdit: InlineEditConfig<TItem>; dialogEdit?: never }
  | { dialogEdit: DialogEditConfig<TItem>; inlineEdit?: never }
  | { inlineEdit?: never; dialogEdit?: never }
);

interface SearchResult<TItem> {
  items: TItem[];
  pageCount?: number;
}

interface InlineEditConfig<TItem> {
  submit: (diffs: ArrayOneWayDiffResult<TItem>[]) => Promise<void>;
  newItem: () => TItem;
  deleteProp?: keyof TItem & string;
  diffsExcludes?: string[];
}

interface DialogEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean | undefined>;
  deleteItems?: (items: TItem[]) => Promise<boolean>;
  restoreItems?: (items: TItem[]) => Promise<boolean>;
}

interface ExcelConfig<TItem> {
  download: (items: TItem[]) => Promise<void>;
  upload?: (file: File) => Promise<void>;
}
```

### Sub-components

- **`CrudSheet.Column<TItem>`** -- Column definition with cell context.

```ts
interface CrudSheetColumnProps<TItem> extends Omit<DataSheetColumnProps<TItem>, "children"> {
  editTrigger?: boolean;
  children: (ctx: CrudSheetCellContext<TItem>) => JSX.Element;
}

interface CrudSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => void;
}
```

- **`CrudSheet.Filter<TFilter>`** -- Filter panel slot.

```ts
interface CrudSheetFilterSlotProps<TFilter> {
  filter: TFilter;
  setFilter: SetStoreFunction<TFilter>;
}
```

- **`CrudSheet.Tools<TItem>`** -- Toolbar slot with context.

```ts
interface CrudSheetToolsSlotProps<TItem> {
  ctx: CrudSheetContext<TItem>;
}

interface CrudSheetContext<TItem> {
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
```

## CrudDetail

CRUD detail form with load, save, delete, and change tracking.

```ts
interface CrudDetailProps<TData extends object> {
  load: () => Promise<{ data: TData; info: CrudDetailInfo }>;
  children: (ctx: CrudDetailContext<TData>) => JSX.Element;
  submit?: (data: TData) => Promise<boolean | undefined>;
  toggleDelete?: (del: boolean) => Promise<boolean | undefined>;
  editable?: boolean;
  deletable?: boolean;
  data?: TData;
  onDataChange?: (data: TData) => void;
  close?: (result?: boolean) => void;
  class?: string;
}

interface CrudDetailInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}

interface CrudDetailContext<TData> {
  data: TData;
  setData: SetStoreFunction<TData>;
  info: () => CrudDetailInfo;
  busy: () => boolean;
  hasChanges: () => boolean;
  save: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

### Sub-components

- **`CrudDetail.Header`** -- Header content slot.

## PermissionTable

Permission matrix table displaying app permissions with checkboxes.

```ts
interface PermissionTableProps<TModule = string> {
  perms: AppPerm<TModule>[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  disabled?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

### Helper Functions

```ts
function collectAllPerms<TModule>(items: AppPerm<TModule>[]): string[];
function filterByModules<TModule>(items: AppPerm<TModule>[], enabledModules: TModule[]): AppPerm<TModule>[];
function changePermCheck<TModule>(
  items: AppPerm<TModule>[],
  currentPerms: string[],
  changedPerm: string,
  checked: boolean,
): string[];
```
