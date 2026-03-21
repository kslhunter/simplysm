# Feature Components

Source: `src/components/features/**`

## `AddressSearchContent`

Korean address search dialog content using Daum Postcode API.

```typescript
export interface AddressSearchResult {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}
```

Props: `{ close?: (result?: AddressSearchResult) => void }`

Designed to be used with `useDialog().show()`.

---

## `SharedDataSelect`

Select component integrated with `SharedDataAccessor` for reactive shared data selection. Supports single and multiple modes with search, tree structure, and dialog selection.

| Prop | Type | Description |
|------|------|-------------|
| `data` | `SharedDataAccessor<TItem>` | Shared data accessor |
| `value` | `TKey \| TKey[]` | Selected key(s) |
| `onValueChange` | `(value) => void` | Value change callback |
| `multiple` | `boolean` | Multiple selection mode |
| `required` | `boolean` | Required input |
| `disabled` | `boolean` | Disabled state |
| `size` | `ComponentSize` | Trigger size |
| `inset` | `boolean` | Borderless style |
| `filterFn` | `(item, index) => boolean` | Item filter function |
| `dialog` | `Component<TDialogProps>` | Selection dialog component |
| `dialogOptions` | `DialogShowOptions` | Dialog display options |

---

## `SharedDataSelectButton`

Button-based select component for shared data. Opens a dialog for selection. Supports single and multiple modes.

| Prop | Type | Description |
|------|------|-------------|
| `data` | `SharedDataAccessor<TItem>` | Shared data accessor |
| `value` | `string \| number \| (string \| number)[]` | Selected key(s) |
| `onValueChange` | `(value) => void` | Value change callback |
| `multiple` | `boolean` | Multiple selection mode |
| `required` | `boolean` | Required input |
| `disabled` | `boolean` | Disabled state |
| `size` | `ComponentSize` | Trigger size |
| `inset` | `boolean` | Borderless style |
| `dialog` | `Component<TDialogProps>` | Selection dialog component (required) |
| `dialogOptions` | `DialogShowOptions` | Dialog display options |
| `children` | `(item: TItem) => JSX.Element` | Item rendering function |

---

## `SharedDataSelectList`

List-based selection component for shared data with pagination and search.

```typescript
export interface SharedDataSelectListProps<TItem> {
  data: SharedDataAccessor<TItem>;
  value?: TItem;
  onValueChange?: (value: TItem | undefined) => void;
  required?: boolean;
  disabled?: boolean;
  filterFn?: (item: TItem, index: number) => boolean;
}
```

### Sub-components

- **`SharedDataSelectList.ItemTemplate`** -- Template for item rendering
- **`SharedDataSelectList.Filter`** -- Custom filter UI slot

### `SharedDataSelectListContextValue`

```typescript
export interface SharedDataSelectListContextValue {
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}
```

---

## `DataSelectButton`

Generic button-based select component that opens a dialog for selection. Works with any data source (not tied to SharedData).

### `SelectDialogBaseProps`

```typescript
export interface SelectDialogBaseProps<TKey = string | number> {
  close?: (result?: DataSelectDialogResult<TKey>) => void;
  selectionMode: "single" | "multiple";
  selectedKeys: TKey[];
}
```

### `DataSelectDialogResult`

```typescript
export interface DataSelectDialogResult<TKey> {
  selectedKeys: TKey[];
}
```

### `DialogPropsField`

Conditional type that makes `dialogProps` required only when the dialog component has required custom props.

```typescript
export type DialogPropsField<P, TKey = string | number> =
  {} extends UserDialogProps<P, TKey>
    ? { dialogProps?: UserDialogProps<P, TKey> }
    : { dialogProps: UserDialogProps<P, TKey> };
```

---

## `CrudSheet`

Full-featured CRUD data grid with inline/dialog editing, sorting, pagination, selection, excel import/export, and toolbar management.

```typescript
export type CrudSheetProps<TItem, TFilter extends Record<string, unknown>> =
  CrudSheetBaseProps<TItem, TFilter> & (
    | { inlineEdit: InlineEditConfig<TItem>; dialogEdit?: never }
    | { dialogEdit: DialogEditConfig<TItem>; inlineEdit?: never }
    | { inlineEdit?: never; dialogEdit?: never }
  );
```

| Prop | Type | Description |
|------|------|-------------|
| `search` | `(filter, page, sorts) => Promise<SearchResult<TItem>>` | Data fetch function |
| `getItemKey` | `(item) => string \| number \| undefined` | Item key extractor |
| `storageKey` | `string` | Config persistence key |
| `editable` | `boolean` | Enable editing |
| `inlineEdit` | `InlineEditConfig<TItem>` | Inline editing configuration |
| `dialogEdit` | `DialogEditConfig<TItem>` | Dialog editing configuration |
| `excel` | `ExcelConfig<TItem>` | Excel download/upload |
| `selectionMode` | `"single" \| "multiple"` | Selection mode |
| `filterInitial` | `TFilter` | Initial filter state |

### `SearchResult`

```typescript
export interface SearchResult<TItem> {
  items: TItem[];
  pageCount?: number;
}
```

### `InlineEditConfig`

```typescript
export interface InlineEditConfig<TItem> {
  submit: (diffs: ArrayOneWayDiffResult<TItem>[]) => Promise<void>;
  newItem: () => TItem;
  deleteProp?: keyof TItem & string;
  diffsExcludes?: string[];
}
```

### `DialogEditConfig`

```typescript
export interface DialogEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean | undefined>;
  deleteItems?: (items: TItem[]) => Promise<boolean>;
  restoreItems?: (items: TItem[]) => Promise<boolean>;
}
```

### `ExcelConfig`

```typescript
export interface ExcelConfig<TItem> {
  download: (items: TItem[]) => Promise<void>;
  upload?: (file: File) => Promise<void>;
}
```

### `CrudSheetCellContext`

```typescript
export interface CrudSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => void;
}
```

### `CrudSheetContext`

```typescript
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
```

### `SelectResult`

```typescript
export interface SelectResult<TItem> {
  items: TItem[];
  keys: (string | number)[];
}
```

### `CrudSheetColumnProps`

```typescript
export interface CrudSheetColumnProps<TItem> extends Omit<DataSheetColumnProps<TItem>, "children"> {
  editTrigger?: boolean;
  children: (ctx: CrudSheetCellContext<TItem>) => JSX.Element;
}
```

---

## `CrudDetail`

CRUD detail view with controlled store, save/refresh lifecycle, and delete toggle.

```typescript
export interface CrudDetailProps<TData extends object> {
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

### `CrudDetailInfo`

```typescript
export interface CrudDetailInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}
```

### `CrudDetailContext`

```typescript
export interface CrudDetailContext<TData> {
  data: TData;
  setData: SetStoreFunction<TData>;
  info: () => CrudDetailInfo;
  busy: () => boolean;
  hasChanges: () => boolean;
  save: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

---

## `PermissionTable`

Permission management table displaying a tree of `AppPerm` items with checkbox columns for each permission type.

```typescript
export interface PermissionTableProps<TModule = string> {
  items?: AppPerm<TModule>[];
  value?: Record<string, boolean>;
  onValueChange?: (value: Record<string, boolean>) => void;
  modules?: TModule[];
  disabled?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

### Utility Functions

```typescript
export function collectAllPerms<TModule>(items: AppPerm<TModule>[]): string[];
export function filterByModules<TModule>(items: AppPerm<TModule>[], modules: TModule[]): AppPerm<TModule>[];
```
