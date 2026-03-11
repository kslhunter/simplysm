# Features

High-level, domain-specific components built on top of the core primitives.

## CrudSheet

```typescript
interface CrudSheetBaseProps<TItem, TFilter> {
  search(filter: TFilter, page: number | undefined, sorts: SortingDef[]): Promise<SearchResult<TItem>>;
  getItemKey(item: TItem): string | number | undefined;
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
  onSelect?: (result: SelectResult<TItem>) => void;
  onSubmitComplete?: () => void;
  hideAutoTools?: boolean;
  close?: () => void;
  class?: string;
  children: JSX.Element;
}
```

Full CRUD data grid built on `DataSheet`. Supports two editing modes:

**Inline editing** — edit cells directly in the grid:
```typescript
interface InlineEditConfig<TItem> {
  submit(diffs: ArrayOneWayDiffResult<TItem>[]): Promise<void>;
  newItem(): TItem;
  deleteProp?: keyof TItem & string;
  diffsExcludes?: string[];
}
```

**Dialog editing** — edit records in a dialog:
```typescript
interface DialogEditConfig<TItem> {
  editItem(item?: TItem): Promise<boolean | undefined>;
  deleteItems?(items: TItem[]): Promise<boolean>;
  restoreItems?(items: TItem[]): Promise<boolean>;
}
```

**Sub-components:**
- `CrudSheet.Column` — extends `DataSheet.Column` with `editTrigger` prop
- `CrudSheet.Filter` — filter form area
- `CrudSheet.Tools` — custom toolbar buttons
- `CrudSheet.Header` — custom header content

**Context:** `CrudSheetContext<TItem>` — access internal state via context:
```typescript
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

---

## CrudDetail

```typescript
interface CrudDetailProps<TData extends object> {
  load(): Promise<{ data: TData; info: CrudDetailInfo }>;
  children(ctx: CrudDetailContext<TData>): JSX.Element;
  submit?(data: TData): Promise<boolean | undefined>;
  toggleDelete?(del: boolean): Promise<boolean | undefined>;
  editable?: boolean;
  deletable?: boolean;
  data?: TData;
  onDataChange?: (data: TData) => void;
  close?(result?: boolean): void;
  class?: string;
}

interface CrudDetailContext<TData> {
  data: TData;
  setData: SetStoreFunction<TData>;
  info(): CrudDetailInfo;
  busy(): boolean;
  hasChanges(): boolean;
  save(): Promise<void>;
  refresh(): Promise<void>;
}

interface CrudDetailInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}
```

Single-record CRUD detail form. `load` fetches data, `submit` saves changes, `toggleDelete` handles soft-delete. The `children` render prop receives a context with reactive data and mutation helpers.

**Sub-components:**
- `CrudDetail.Tools` — custom toolbar
- `CrudDetail.Before` — content before the form
- `CrudDetail.After` — content after the form

---

## SharedDataSelect

```typescript
interface SharedDataSelectCommonProps<TItem, TKey, TDialogProps> {
  data: SharedDataAccessor<TItem>;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  filterFn?: (item: TItem, index: number) => boolean;
  dialog?: Component<TDialogProps>;
  dialogOptions?: DialogShowOptions;
  children: JSX.Element;
}

// Single: { multiple?: false; value?: TKey; onValueChange?: (value: TKey | undefined) => void }
// Multiple: { multiple: true; value?: TKey[]; onValueChange?: (value: TKey[]) => void }
```

Select component bound to `SharedDataProvider` data. Automatically uses the shared data's search text and hidden item logic. Optionally opens a dialog for advanced selection.

**Sub-components:** `SharedDataSelect.ItemTemplate`, `SharedDataSelect.Action`

---

## SharedDataSelectButton

```typescript
interface SharedDataSelectButtonCommonProps<TItem, TDialogProps> {
  data: SharedDataAccessor<TItem>;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  dialog: Component<TDialogProps>;
  dialogOptions?: DialogShowOptions;
  children(item: TItem): JSX.Element;
}
```

Button that opens a dialog for selecting shared data items. Displays the selected item(s) using the `children` render prop.

---

## SharedDataSelectList

```typescript
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

List view for selecting from shared data. Supports pagination, filtering, and custom item templates.

**Sub-components:** `SharedDataSelectList.ItemTemplate`, `SharedDataSelectList.Filter`

---

## DataSelectButton

```typescript
interface DataSelectButtonCommonProps<TItem, TKey, TDialogProps> {
  load(keys: TKey[]): TItem[] | Promise<TItem[]>;
  renderItem(item: TItem): JSX.Element;
  dialog: Component<TDialogProps>;
  dialogOptions?: DialogShowOptions;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  validate?: (value: unknown) => string | undefined;
  lazyValidation?: boolean;
}

// Single: { multiple?: false; value?: TKey; onValueChange?: (value: TKey | undefined) => void }
// Multiple: { multiple: true; value?: TKey[]; onValueChange?: (value: TKey[]) => void }
```

Button that opens a dialog for selecting data items. Unlike `SharedDataSelect`, this is not tied to `SharedDataProvider` — it uses a custom `load` function to resolve selected keys to items, and a custom `dialog` for the selection UI.

---

## AddressSearch

```typescript
interface AddressSearchResult {
  postNumber?: string;
  address?: string;
  buildingName?: string;
}
```

Korean address search dialog content component. Use with `dialog.show(AddressSearchContent, {})` to open. Returns `AddressSearchResult` on selection.

---

## PermissionTable

```typescript
interface PermissionTableProps<TModule> {
  items?: AppPerm<TModule>[];
  value?: Record<string, boolean>;
  onValueChange?: (value: Record<string, boolean>) => void;
  modules?: TModule[];
  disabled?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}
```

Renders a permission matrix from `AppPerm` tree structure. `value` is a `Record<permCode, boolean>` map.

**Utility functions:**
- `collectAllPerms(items)` — extracts all permission codes from the tree
- `filterByModules(items, modules)` — filters permissions by active modules
- `changePermCheck(value, item, perm, checked)` — returns new value with cascading check/uncheck logic

---

## Usage Examples

```typescript
import { CrudSheet, CrudDetail, SharedDataSelect } from "@simplysm/solid";

// CrudSheet with inline editing
<CrudSheet
  search={(filter, page, sorts) => api.searchUsers(filter, page, sorts)}
  getItemKey={(item) => item.id}
  inlineEdit={{
    submit: (diffs) => api.saveUsers(diffs),
    newItem: () => ({ id: undefined, name: "", age: 0 }),
  }}
  storageKey="users"
>
  <CrudSheet.Filter>
    <TextInput value={filter.name} onValueChange={(v) => setFilter("name", v)} />
  </CrudSheet.Filter>
  <CrudSheet.Column key="name" header="Name" sortable editTrigger>
    {(ctx) => <TextInput value={ctx.item.name} onValueChange={(v) => ctx.setItem("name", v)} inset />}
  </CrudSheet.Column>
</CrudSheet>

// SharedDataSelect
<SharedDataSelect data={sharedData.departments} value={deptId()} onValueChange={setDeptId}>
  <SharedDataSelect.ItemTemplate>
    {(item) => item.name}
  </SharedDataSelect.ItemTemplate>
</SharedDataSelect>
```
