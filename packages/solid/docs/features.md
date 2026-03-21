# Feature Components

Source: `src/components/features/**`

## `AddressSearchContent`

Korean address search dialog content (Daum Postcode API).

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

| Field | Type | Description |
|-------|------|-------------|
| `postNumber` | `string` | Postal code |
| `address` | `string` | Full address |
| `buildingName` | `string` | Building name |

Use with `useDialog().show(AddressSearchContent, {})` to open as dialog.

## `SharedDataSelect`

Select component bound to SharedData. Compound with ItemTemplate and Action sub-components.

```ts
type SharedDataSelectProps<TItem, TKey extends string | number = string | number, TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps> =
  | (SharedDataSelectSingleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps>)
  | (SharedDataSelectMultipleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps>);
```

Common props:

| Field | Type | Description |
|-------|------|-------------|
| `data` | `SharedDataAccessor<TItem>` | Shared data accessor |
| `required` | `boolean` | Required validation |
| `disabled` | `boolean` | Disable interaction |
| `size` | `ComponentSize` | Trigger size |
| `inset` | `boolean` | Borderless style |
| `filterFn` | `(item, index) => boolean` | Item filter function |
| `dialog` | `Component<TDialogProps>` | Selection dialog component |
| `dialogOptions` | `DialogShowOptions` | Dialog display options |

Discriminated by `multiple`:
- `multiple?: false` -- `value?: TKey`, `onValueChange?: (value: TKey | undefined) => void`
- `multiple: true` -- `value?: TKey[]`, `onValueChange?: (value: TKey[]) => void`

### Sub-components

- **`SharedDataSelect.ItemTemplate`** -- Custom render template for items.
- **`SharedDataSelect.Action`** -- Action button appended to trigger.

## `SharedDataSelectButton`

Button-trigger select bound to SharedData with dialog-based picker.

```ts
type SharedDataSelectButtonProps<TItem, TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps> =
  | (SharedDataSelectButtonSingleProps<TItem, TDialogProps> & DialogPropsField<TDialogProps>)
  | (SharedDataSelectButtonMultipleProps<TItem, TDialogProps> & DialogPropsField<TDialogProps>);
```

Common props:

| Field | Type | Description |
|-------|------|-------------|
| `data` | `SharedDataAccessor<TItem>` | Shared data accessor |
| `dialog` | `Component<TDialogProps>` | Selection dialog component |
| `dialogOptions` | `DialogShowOptions` | Dialog display options |
| `children` | `(item: TItem) => JSX.Element` | Item rendering function |

Discriminated by `multiple`:
- `multiple?: false` -- `value?: string | number`, `onValueChange?: (value: string | number | undefined) => void`
- `multiple: true` -- `value?: (string | number)[]`, `onValueChange?: (value: (string | number)[]) => void`

## `SharedDataSelectList`

List component bound to SharedData with search, pagination, and keyboard navigation. Compound with ItemTemplate and Filter.

```ts
interface SharedDataSelectListContextValue {
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}

interface SharedDataSelectListProps<TItem> {
  data: SharedDataAccessor<TItem>;
  value?: TItem;
  onValueChange?: (value: TItem | undefined) => void;
  required?: boolean;
  disabled?: boolean;
  filterFn?: (item: TItem, index: number) => boolean;
  canChange?: (item: TItem | undefined) => boolean | Promise<boolean>;
  pageSize?: number;
  header?: JSX.Element;
  children?: JSX.Element;
  class?: string;
  style?: JSX.CSSProperties;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | `SharedDataAccessor<TItem>` | Shared data accessor |
| `value` | `TItem` | Currently selected item |
| `onValueChange` | `(value: TItem \| undefined) => void` | Selection change callback |
| `filterFn` | `(item, index) => boolean` | Item filter function |
| `canChange` | `(item) => boolean \| Promise<boolean>` | Guard before selection change |
| `pageSize` | `number` | Enable pagination with given page size |
| `header` | `JSX.Element` | Header content |

### Sub-components

- **`SharedDataSelectList.ItemTemplate`** -- Custom render template for items.
- **`SharedDataSelectList.Filter`** -- Custom filter content.

## `DataSelectButton`

Button-trigger select with dialog-based picker. Opens a dialog for item selection and displays selected items.

```ts
interface DataSelectDialogResult<TKey> {
  selectedKeys: TKey[];
}

interface SelectDialogBaseProps<TKey = string | number> {
  close?: (result?: DataSelectDialogResult<TKey>) => void;
  selectionMode: "single" | "multiple";
  selectedKeys: TKey[];
}

type DialogPropsField<P, TKey = string | number> =
  {} extends UserDialogProps<P, TKey>
    ? { dialogProps?: UserDialogProps<P, TKey> }
    : { dialogProps: UserDialogProps<P, TKey> };

type DataSelectButtonProps<TItem, TKey, TDialogProps extends SelectDialogBaseProps<TKey>> =
  | (DataSelectButtonSingleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps, TKey>)
  | (DataSelectButtonMultipleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps, TKey>);
```

Common props:

| Field | Type | Description |
|-------|------|-------------|
| `load` | `(keys: TKey[]) => TItem[] \| Promise<TItem[]>` | Load items by keys |
| `renderItem` | `(item: TItem) => JSX.Element` | Item rendering function |
| `dialog` | `Component<TDialogProps>` | Selection dialog component |
| `dialogOptions` | `DialogShowOptions` | Dialog display options |
| `dialogProps` | `UserDialogProps<TDialogProps>` | Extra props passed to dialog (required if dialog has required props) |
| `required` | `boolean` | Required validation |
| `disabled` | `boolean` | Disable interaction |
| `size` | `ComponentSize` | Trigger size |
| `inset` | `boolean` | Borderless style |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `lazyValidation` | `boolean` | Show error only after blur |

Discriminated by `multiple`:
- `multiple?: false` -- `value?: TKey`, `onValueChange?: (value: TKey | undefined) => void`
- `multiple: true` -- `value?: TKey[]`, `onValueChange?: (value: TKey[]) => void`

## `CrudSheet`

Full CRUD data grid with inline or dialog editing, search, pagination, sorting, and Excel export/import. Compound with Column, Filter, Tools, Header.

```ts
type CrudSheetProps<TItem, TFilter extends Record<string, unknown>> =
  CrudSheetBaseProps<TItem, TFilter> & (
    | { inlineEdit: InlineEditConfig<TItem>; dialogEdit?: never }
    | { dialogEdit: DialogEditConfig<TItem>; inlineEdit?: never }
    | { inlineEdit?: never; dialogEdit?: never }
  );
```

Discriminated by edit mode: `inlineEdit` for in-place editing, `dialogEdit` for dialog-based editing, or neither for read-only.

### Base Props

| Field | Type | Description |
|-------|------|-------------|
| `search` | `(filter, page, sorts) => Promise<SearchResult<TItem>>` | Data search function |
| `getItemKey` | `(item: TItem) => string \| number \| undefined` | Item key extractor |
| `storageKey` | `string` | Key for persisting column config |
| `editable` | `boolean` | Enable editing |
| `isItemEditable` | `(item: TItem) => boolean` | Per-item edit check |
| `isItemDeletable` | `(item: TItem) => boolean` | Per-item delete check |
| `isItemDeleted` | `(item: TItem) => boolean` | Check if item is soft-deleted |
| `isItemSelectable` | `(item: TItem) => boolean \| string` | Per-item selection check |
| `lastModifiedAtProp` | `string` | Property name for last modified timestamp |
| `lastModifiedByProp` | `string` | Property name for last modified user |
| `filterInitial` | `TFilter` | Initial filter state |
| `excel` | `ExcelConfig<TItem>` | Excel export/import config |
| `selectionMode` | `"single" \| "multiple"` | Selection mode |
| `selectedKeys` | `(string \| number)[]` | Selected item keys |
| `onSelectedKeysChange` | `(keys) => void` | Selection change callback |
| `onSelect` | `(result: SelectResult<TItem>) => void` | Selection event callback |
| `onSubmitComplete` | `() => void` | Called after save completes |
| `hideAutoTools` | `boolean` | Hide automatic toolbar buttons |
| `close` | `() => void` | Close callback (for dialog mode) |

### Edit Config Types

```ts
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

interface SelectResult<TItem> {
  items: TItem[];
  keys: (string | number)[];
}
```

### `CrudSheetCellContext`

```ts
interface CrudSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `item` | `TItem` | Row data |
| `index` | `number` | Item index |
| `row` | `number` | Visual row number |
| `depth` | `number` | Tree depth |
| `setItem` | `(key, value) => void` | Modify item field (inline edit) |

### `CrudSheetContext`

```ts
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

### Sub-components

- **`CrudSheet.Column<TItem>`** -- Column definition (same as DataSheet.Column but with CrudSheetCellContext).
- **`CrudSheet.Filter`** -- Filter panel slot.
- **`CrudSheet.Tools`** -- Toolbar slot.
- **`CrudSheet.Header`** -- Header slot.

## `CrudDetail`

Detail form with load/save/delete lifecycle. Compound with Tools, Before, After.

```ts
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
```

| Field | Type | Description |
|-------|------|-------------|
| `load` | `() => Promise<{data, info}>` | Load data and metadata |
| `children` | `(ctx) => JSX.Element` | Render function with CRUD context |
| `submit` | `(data) => Promise<boolean \| undefined>` | Save handler; return true for success |
| `toggleDelete` | `(del) => Promise<boolean \| undefined>` | Soft delete/restore handler |
| `editable` | `boolean` | Enable editing |
| `deletable` | `boolean` | Enable delete button |
| `close` | `(result?) => void` | Close callback (injected by DialogProvider in dialog mode) |

### Sub-components

- **`CrudDetail.Tools`** -- Toolbar slot.
- **`CrudDetail.Before`** -- Content before the form.
- **`CrudDetail.After`** -- Content after the form.

## `PermissionTable`

Permission matrix table with cascading checkbox changes.

```ts
interface PermissionTableProps<TModule = string> {
  items?: AppPerm<TModule>[];
  value?: Record<string, boolean>;
  onValueChange?: (value: Record<string, boolean>) => void;
  modules?: TModule[];
  disabled?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `AppPerm<TModule>[]` | Permission tree (from createAppStructure) |
| `value` | `Record<string, boolean>` | Permission state map (code -> enabled) |
| `onValueChange` | `(value) => void` | State change callback |
| `modules` | `TModule[]` | Active modules (filters permissions) |
| `disabled` | `boolean` | Disable all checkboxes |

### Helper Functions

```ts
function collectAllPerms<TModule>(items: AppPerm<TModule>[]): string[];
function filterByModules<TModule>(items: AppPerm<TModule>[], modules: TModule[] | undefined): AppPerm<TModule>[];
function changePermCheck<TModule>(value: Record<string, boolean>, item: AppPerm<TModule>, perm: string, checked: boolean): Record<string, boolean>;
```

| Function | Description |
|----------|-------------|
| `collectAllPerms` | Collect all unique permission type strings from tree |
| `filterByModules` | Filter permission tree by active modules |
| `changePermCheck` | Handle cascading checkbox state changes (parent/child propagation) |
