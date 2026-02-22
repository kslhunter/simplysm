# Data Components

## Table

Basic HTML table wrapper. Provides consistent styling for borders, header backgrounds, etc.

```tsx
import { Table } from "@simplysm/solid";

<Table>
  <thead>
    <tr><th>Name</th><th>Age</th></tr>
  </thead>
  <tbody>
    <tr><td>John Doe</td><td>30</td></tr>
    <tr><td>Jane Smith</td><td>25</td></tr>
  </tbody>
</Table>

// Inset style (removes outer border, fits parent container)
<Table inset>...</Table>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inset` | `boolean` | - | Inset style |

---

## DataSheet

Advanced data table component. Supports sorting, pagination, row selection, tree expansion, column resize, column configuration, drag-and-drop reordering, and persistent column settings.

```tsx
import { DataSheet } from "@simplysm/solid";

// Basic usage
<DataSheet items={users()} persistKey="user-table">
  <DataSheet.Column key="name" header="Name" sortable class="px-2 py-1">
    {({ item }) => <>{item.name}</>}
  </DataSheet.Column>
  <DataSheet.Column key="age" header="Age" sortable width="80px" class="px-2 py-1">
    {({ item }) => <>{item.age}</>}
  </DataSheet.Column>
  <DataSheet.Column key="email" header="Email" class="px-2 py-1">
    {({ item }) => <>{item.email}</>}
  </DataSheet.Column>
</DataSheet>

// With pagination + sorting + selection
<DataSheet
  items={data()}
  persistKey="data-table"
  page={page()}
  onPageChange={setPage}
  itemsPerPage={20}
  totalPageCount={totalPages()}
  sorts={sorts()}
  onSortsChange={setSorts}
  selectMode="multiple"
  selectedItems={selectedItems()}
  onSelectedItemsChange={setSelectedItems}
>
  {/* columns */}
</DataSheet>

// Tree structure with expansion
<DataSheet
  items={treeData()}
  persistKey="tree-table"
  getChildren={(item) => item.children}
  expandedItems={expanded()}
  onExpandedItemsChange={setExpanded}
>
  {/* columns */}
</DataSheet>

// Auto-select on row click + drag reorder
<DataSheet
  items={items()}
  persistKey="reorder-table"
  autoSelect="click"
  selectMode="single"
  selectedItems={selected()}
  onSelectedItemsChange={setSelected}
  onItemsReorder={(e) => {
    // e: { item: T, targetItem: T, position: "before" | "after" | "inside" }
    reorderItems(e);
  }}
>
  {/* columns */}
</DataSheet>
```

**DataSheet Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` | - | Data array |
| `persistKey` | `string` | - | Column configuration localStorage key |
| `class` | `string` | - | CSS class |
| `contentStyle` | `JSX.CSSProperties \| string` | - | Scroll area style |
| `inset` | `boolean` | - | Inset style |
| `hideConfigBar` | `boolean` | - | Hide config bar and pagination |
| `sorts` | `SortingDef[]` | - | Sort state (`{ key: string; desc: boolean }[]`) |
| `onSortsChange` | `(sorts: SortingDef[]) => void` | - | Sort change callback |
| `autoSort` | `boolean` | - | Client-side auto-sorting |
| `page` | `number` | - | Current page (1-based) |
| `onPageChange` | `(page: number) => void` | - | Page change callback |
| `totalPageCount` | `number` | - | Total page count |
| `itemsPerPage` | `number` | - | Items per page |
| `displayPageCount` | `number` | - | Number of page buttons to display |
| `selectMode` | `"single" \| "multiple"` | - | Selection mode |
| `selectedItems` | `T[]` | - | Selected items |
| `onSelectedItemsChange` | `(items: T[]) => void` | - | Selection change callback |
| `autoSelect` | `"click"` | - | Auto-select row on click |
| `isItemSelectable` | `(item: T) => boolean \| string` | - | Item selectability (string returns tooltip) |
| `getChildren` | `(item: T, index: number) => T[] \| undefined` | - | Tree structure children getter |
| `expandedItems` | `T[]` | - | Expanded tree items |
| `onExpandedItemsChange` | `(items: T[]) => void` | - | Expansion state change callback |
| `cellClass` | `(item: T, colKey: string) => string \| undefined` | - | Dynamic cell class function |
| `cellStyle` | `(item: T, colKey: string) => string \| undefined` | - | Dynamic cell style function |
| `onItemsReorder` | `(event: DataSheetReorderEvent<T>) => void` | - | Drag reorder handler (shows drag handle when set) |

`DataSheetReorderEvent<T>`: `{ item: T; targetItem: T; position: "before" | "after" | "inside" }`

**DataSheet.Column Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `key` | `string` | **(required)** | Column identifier key |
| `header` | `string \| string[]` | - | Header text (array for multi-level headers) |
| `headerContent` | `() => JSX.Element` | - | Custom header rendering |
| `headerStyle` | `string` | - | Header style |
| `summary` | `() => JSX.Element` | - | Summary row rendering |
| `tooltip` | `string` | - | Header tooltip |
| `width` | `string` | - | Column width (e.g., `"100px"`, `"10rem"`) |
| `class` | `string` | - | Cell CSS class |
| `fixed` | `boolean` | `false` | Fixed column |
| `hidden` | `boolean` | `false` | Hidden column |
| `collapse` | `boolean` | `false` | Hidden in config modal |
| `sortable` | `boolean` | `true` | Sortable |
| `resizable` | `boolean` | `true` | Resizable |
| `children` | `(ctx: { item: T, index: number, depth: number }) => JSX.Element` | **(required)** | Cell rendering function |

---

## List

Tree-view style list component. Supports keyboard navigation.

```tsx
import { List } from "@simplysm/solid";

<List>
  <List.Item>Item 1</List.Item>
  <List.Item>Item 2</List.Item>
  <List.Item>
    Parent item
    <List.Item.Children>
      <List.Item>Child item 1</List.Item>
      <List.Item>Child item 2</List.Item>
    </List.Item.Children>
  </List.Item>
</List>

// Inset style
<List inset>
  <List.Item>Inset item</List.Item>
</List>
```

**Keyboard navigation:**
- `ArrowUp` / `ArrowDown` -- Move focus to previous/next item
- `Space` / `Enter` -- Click current item
- `ArrowRight` -- Expand if collapsed, focus first child if expanded
- `ArrowLeft` -- Collapse if expanded, focus parent if collapsed
- `Home` / `End` -- Focus first/last item

**List Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inset` | `boolean` | - | Transparent background style |

**List.Item Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Nested list open state (controlled mode) |
| `onOpenChange` | `(open: boolean) => void` | - | Open state change callback |
| `selected` | `boolean` | - | Selected state |
| `readonly` | `boolean` | - | Read-only (click disabled, normal color) |
| `disabled` | `boolean` | - | Disabled state (click disabled, dimmed) |
| `selectedIcon` | `Component<IconProps>` | - | Selected state icon (shown when no nested list) |
| `size` | `"xs" \| "sm" \| "lg" \| "xl"` | - | Size |
| `onClick` | `(e: MouseEvent) => void` | - | Click handler (called when no nested list) |

**Sub-components:**
- `List.Item` -- Individual list item
- `List.Item.Children` -- Nested child items container

**ListContext:**

`ListContext` and `useListContext` are exported for building custom List item sub-components. Provides the current nesting `level` (starts at 1 for the root List).

```typescript
import { useListContext } from "@simplysm/solid";

const { level } = useListContext();
```

---

## Pagination

Page navigation component.

```tsx
import { Pagination } from "@simplysm/solid";

<Pagination
  page={currentPage()}
  onPageChange={setCurrentPage}
  totalPageCount={20}
  displayPageCount={10}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `page` | `number` | **(required)** | Current page (1-based) |
| `onPageChange` | `(page: number) => void` | - | Page change callback |
| `totalPageCount` | `number` | **(required)** | Total page count |
| `displayPageCount` | `number` | `10` | Number of pages to display at once |
| `size` | `"sm" \| "lg"` | - | Size |

---

## Calendar

Calendar-style data display component.

```tsx
import { Calendar } from "@simplysm/solid";

<Calendar
  items={events()}
  getItemDate={(event) => event.date}
  renderItem={(event) => <div>{event.title}</div>}
  yearMonth={yearMonth()}
  onYearMonthChange={setYearMonth}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` | **(required)** | Data array |
| `getItemDate` | `(item: T, index: number) => DateOnly` | **(required)** | Item date extraction function |
| `renderItem` | `(item: T, index: number) => JSX.Element` | **(required)** | Item rendering function |
| `yearMonth` | `DateOnly` | - | Year-month to display |
| `onYearMonthChange` | `(value: DateOnly) => void` | - | Year-month change callback |
| `weekStartDay` | `number` | `0` (Sunday) | Week start day |

---

## PermissionTable

Hierarchical permission management table. Displays a tree of permission items with per-item checkboxes for each permission type. Supports cascading checks (parent toggles children) and permission dependencies (disabling the first permission disables the rest).

```tsx
import { createSignal } from "solid-js";
import { type PermissionItem, PermissionTable } from "@simplysm/solid";

const items: PermissionItem[] = [
  {
    title: "User Management",
    href: "/user",
    perms: ["use", "edit"],
    children: [
      { title: "Permission Settings", href: "/user/permission", perms: ["use", "edit", "approve"] },
      { title: "User List", href: "/user/list", perms: ["use", "edit"] },
    ],
  },
  {
    title: "Board",
    href: "/board",
    perms: ["use", "edit"],
    modules: ["community"],  // only shown when "community" module is active
    children: [
      { title: "Notice", href: "/board/notice", perms: ["use", "edit"] },
      { title: "Free Board", href: "/board/free", perms: ["use"] },
    ],
  },
];

const [value, setValue] = createSignal<Record<string, boolean>>({});

// Basic usage
<PermissionTable items={items} value={value()} onValueChange={setValue} />

// Filtered by module
<PermissionTable items={items} value={value()} onValueChange={setValue} modules={["community"]} />

// Disabled
<PermissionTable items={items} value={value()} disabled />
```

The `value` record uses keys in `"{href}/{perm}"` format (e.g., `{ "/user/use": true, "/user/edit": false }`).

**PermissionTable Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `PermissionItem<TModule>[]` | - | Permission tree structure |
| `value` | `Record<string, boolean>` | - | Permission state record |
| `onValueChange` | `(value: Record<string, boolean>) => void` | - | State change callback |
| `modules` | `TModule[]` | - | Module filter (show only matching items) |
| `disabled` | `boolean` | - | Disable all checkboxes |

**PermissionItem type:**

```typescript
interface PermissionItem<TModule = string> {
  title: string;                       // Display text
  href?: string;                       // Permission path (used as value key prefix)
  modules?: TModule[];                 // Modules this item belongs to
  perms?: string[];                    // Permission types (e.g., ["use", "edit", "approve"])
  children?: PermissionItem<TModule>[]; // Child items
}
```

**Cascading behavior:** Checking a parent checks all children. Unchecking `perms[0]` (base permission) automatically unchecks all other permissions for that item.

---

## CrudSheet

Full-featured CRUD data sheet component. Wraps `DataSheet` with built-in search, filter form, inline editing, modal editing, Excel import/export, select mode, pagination, sorting, and topbar action integration. Uses compound component pattern with `CrudSheet.Column`, `CrudSheet.Filter`, `CrudSheet.Tools`, and `CrudSheet.Header`.

```tsx
import { CrudSheet, type SearchResult, type SortingDef } from "@simplysm/solid";

interface User {
  id?: number;
  name: string;
  email: string;
  isDeleted?: boolean;
}

interface UserFilter {
  keyword: string;
}

// Inline editing mode
<CrudSheet<User, UserFilter>
  search={async (filter, page, sorts) => {
    const result = await api.getUsers(filter, page, sorts);
    return { items: result.items, pageCount: result.pageCount };
  }}
  getItemKey={(item) => item.id}
  persistKey="user-crud"
  itemsPerPage={20}
  filterInitial={{ keyword: "" }}
  inlineEdit={{
    newItem: () => ({ name: "", email: "" }),
    submit: async (diffs) => { await api.saveUsers(diffs); },
    deleteProp: "isDeleted",
  }}
>
  <CrudSheet.Filter>
    {(filter, setFilter) => (
      <FormGroup.Item label="Keyword">
        <TextInput value={filter.keyword} onValueChange={(v) => setFilter("keyword", v)} />
      </FormGroup.Item>
    )}
  </CrudSheet.Filter>
  <CrudSheet.Column key="name" header="Name" class="px-2 py-1">
    {(ctx) => (
      <TextInput value={ctx.item.name} onValueChange={(v) => ctx.setItem("name", v)} />
    )}
  </CrudSheet.Column>
  <CrudSheet.Column key="email" header="Email" class="px-2 py-1">
    {(ctx) => (
      <TextInput value={ctx.item.email} onValueChange={(v) => ctx.setItem("email", v)} />
    )}
  </CrudSheet.Column>
</CrudSheet>

// Modal editing mode
<CrudSheet<User, UserFilter>
  search={async (filter, page, sorts) => {
    return await api.getUsers(filter, page, sorts);
  }}
  getItemKey={(item) => item.id}
  persistKey="user-modal-crud"
  itemsPerPage={20}
  modalEdit={{
    editItem: async (item) => {
      const result = await dialog.show((close) => <UserEditDialog item={item} onClose={close} />);
      return result === true;
    },
    deleteItems: async (items) => {
      if (!confirm("Delete selected items?")) return false;
      await api.deleteUsers(items.map((i) => i.id!));
      return true;
    },
  }}
>
  <CrudSheet.Column key="name" header="Name" editable class="px-2 py-1">
    {(ctx) => <>{ctx.item.name}</>}
  </CrudSheet.Column>
  <CrudSheet.Column key="email" header="Email" class="px-2 py-1">
    {(ctx) => <>{ctx.item.email}</>}
  </CrudSheet.Column>
</CrudSheet>

// Select mode (for picker dialogs)
<CrudSheet<User, UserFilter>
  search={async (filter, page, sorts) => {
    return await api.getUsers(filter, page, sorts);
  }}
  getItemKey={(item) => item.id}
  persistKey="user-select"
  itemsPerPage={20}
  selectMode="multi"
  onSelect={(result) => {
    // result.items: selected User[]
    // result.keys: selected (string | number)[]
    onConfirm(result.items);
  }}
>
  <CrudSheet.Column key="name" header="Name" class="px-2 py-1">
    {(ctx) => <>{ctx.item.name}</>}
  </CrudSheet.Column>
</CrudSheet>
```

**CrudSheet Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `search` | `(filter: TFilter, page: number, sorts: SortingDef[]) => Promise<SearchResult<TItem>>` | **(required)** | Search function. `page=0` means no pagination |
| `getItemKey` | `(item: TItem) => string \| number \| undefined` | **(required)** | Unique key extractor for diff tracking |
| `persistKey` | `string` | - | LocalStorage key for column configuration |
| `itemsPerPage` | `number` | - | Items per page (enables pagination when set) |
| `editable` | `() => boolean` | `() => true` | Whether editing is allowed |
| `itemEditable` | `(item: TItem) => boolean` | `() => true` | Per-item edit control (modal edit mode) |
| `itemDeletable` | `(item: TItem) => boolean` | `() => true` | Per-item delete control |
| `filterInitial` | `TFilter` | - | Initial filter state |
| `items` | `TItem[]` | - | Controlled items (external state) |
| `onItemsChange` | `(items: TItem[]) => void` | - | Items change callback (controlled mode) |
| `inlineEdit` | `InlineEditConfig<TItem>` | - | Inline editing configuration (mutually exclusive with `modalEdit`) |
| `modalEdit` | `ModalEditConfig<TItem>` | - | Modal editing configuration (mutually exclusive with `inlineEdit`) |
| `excel` | `ExcelConfig<TItem>` | - | Excel download/upload configuration |
| `selectMode` | `"single" \| "multi"` | - | Select mode (disables editing, shows selection UI) |
| `onSelect` | `(result: SelectResult<TItem>) => void` | - | Select confirmation callback |
| `hideAutoTools` | `boolean` | - | Hide auto-generated toolbar buttons |
| `class` | `string` | - | CSS class |

**InlineEditConfig:**

```typescript
interface InlineEditConfig<TItem> {
  submit: (diffs: ArrayDiffs2Result<TItem>[]) => Promise<void>;
  newItem: () => TItem;
  deleteProp?: keyof TItem & string;
}
```

| Field | Description |
|-------|-------------|
| `submit` | Save function receiving changed items (inserted/updated/deleted diffs) |
| `newItem` | Factory function for creating new empty rows |
| `deleteProp` | Property name for soft-delete flag (e.g., `"isDeleted"`) |

**ModalEditConfig:**

```typescript
interface ModalEditConfig<TItem> {
  editItem: (item?: TItem) => Promise<boolean>;
  deleteItems?: (items: TItem[]) => Promise<boolean>;
}
```

| Field | Description |
|-------|-------------|
| `editItem` | Open edit dialog. `undefined` = new item. Return `true` to refresh |
| `deleteItems` | Delete selected items. Return `true` to refresh |

**ExcelConfig:**

```typescript
interface ExcelConfig<TItem> {
  download: (items: TItem[]) => Promise<void>;
  upload?: (file: File) => Promise<void>;
}
```

**SelectResult:**

```typescript
interface SelectResult<TItem> {
  items: TItem[];
  keys: (string | number)[];
}
```

**Sub-components:**

- `CrudSheet.Column` -- Column definition (extends `DataSheet.Column` props + `editable`)
- `CrudSheet.Filter` -- Filter form render prop
- `CrudSheet.Tools` -- Custom toolbar render prop
- `CrudSheet.Header` -- Header area above filter

**CrudSheet.Column Props:**

Inherits all `DataSheet.Column` props (`key`, `header`, `width`, `fixed`, `hidden`, `sortable`, `resizable`, `class`, `headerContent`, `headerStyle`, `summary`, `tooltip`, `collapse`) plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editable` | `boolean` | `false` | Wrap cell with edit link (modal edit mode only) |
| `children` | `(ctx: CrudSheetCellContext<TItem>) => JSX.Element` | **(required)** | Cell render function |

**CrudSheetCellContext:**

```typescript
interface CrudSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => void;
}
```

`setItem` updates a specific field of the current row item (inline edit mode).

**CrudSheet.Filter:**

```tsx
<CrudSheet.Filter>
  {(filter, setFilter) => (
    <FormGroup.Item label="Search">
      <TextInput value={filter.keyword} onValueChange={(v) => setFilter("keyword", v)} />
    </FormGroup.Item>
  )}
</CrudSheet.Filter>
```

Receives `filter` (store) and `setFilter` (`SetStoreFunction`) as render prop arguments.

**CrudSheet.Tools:**

```tsx
<CrudSheet.Tools>
  {(ctx) => (
    <Button size="sm" onClick={() => ctx.refresh()}>Custom Refresh</Button>
  )}
</CrudSheet.Tools>
```

**CrudSheetContext (Tools render prop):**

```typescript
interface CrudSheetContext<TItem> {
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
```

**CrudSheet.Header:**

```tsx
<CrudSheet.Header>
  <h2 class="p-2 text-lg font-bold">User Management</h2>
</CrudSheet.Header>
```

Renders static content above the filter area.

**Keyboard shortcuts:**
- `Ctrl+S` -- Save (inline edit mode)
- `Ctrl+Alt+L` -- Refresh

**Topbar integration:** When used inside `Topbar.Container`, CrudSheet automatically registers Save and Refresh buttons in the topbar via `createTopbarActions`.

---

## CrudDetail

CRUD detail form component for single-record editing. Provides load, save, soft-delete/restore, change detection, and topbar action integration. Works both as a standalone page component and inside a `Dialog` (modal mode).

```tsx
import { CrudDetail, type CrudDetailInfo } from "@simplysm/solid";
import { FormTable, TextInput, NumberInput } from "@simplysm/solid";

interface User {
  id?: number;
  name: string;
  age: number;
}

// Page mode (standalone)
<CrudDetail<User>
  load={async () => {
    const user = await api.getUser(userId);
    return {
      data: user,
      info: { isNew: user.id == null, isDeleted: false, lastModifiedAt: user.updatedAt },
    };
  }}
  submit={async (data) => {
    await api.saveUser(data);
    return true; // return true to trigger success notification + refresh/close
  }}
  toggleDelete={async (del) => {
    await api.toggleDeleteUser(userId, del);
    return true;
  }}
>
  {(ctx) => (
    <FormTable>
      <tbody>
        <tr>
          <th>Name</th>
          <td>
            <TextInput value={ctx.data.name} onValueChange={(v) => ctx.setData("name", v)} />
          </td>
        </tr>
        <tr>
          <th>Age</th>
          <td>
            <NumberInput value={ctx.data.age} onValueChange={(v) => ctx.setData("age", v!)} />
          </td>
        </tr>
      </tbody>
    </FormTable>
  )}
</CrudDetail>

// Modal mode (inside Dialog via useDialog)
const dialog = useDialog();

const handleEdit = async () => {
  const result = await dialog.show<boolean>(
    () => (
      <CrudDetail<User>
        load={async () => ({ data: user, info: { isNew: false, isDeleted: false } })}
        submit={async (data) => { await api.saveUser(data); return true; }}
      >
        {(ctx) => (
          <FormTable>
            <tbody>
              <tr>
                <th>Name</th>
                <td><TextInput value={ctx.data.name} onValueChange={(v) => ctx.setData("name", v)} /></td>
              </tr>
            </tbody>
          </FormTable>
        )}
      </CrudDetail>
    ),
    { header: "Edit User", width: 500 },
  );
  if (result) { /* saved successfully */ }
};

// With custom tools and before/after slots
<CrudDetail<User>
  load={loadUser}
  submit={saveUser}
  editable={hasEditPermission()}
  deletable={hasDeletePermission()}
>
  {(ctx) => (
    <>
      <CrudDetail.Tools>
        <Button size="sm" variant="ghost" onClick={() => ctx.refresh()}>Custom Refresh</Button>
      </CrudDetail.Tools>
      <CrudDetail.Before>
        <div class="p-2 bg-info-50">Info banner (outside form)</div>
      </CrudDetail.Before>
      <FormTable>
        <tbody>
          <tr>
            <th>Name</th>
            <td><TextInput value={ctx.data.name} onValueChange={(v) => ctx.setData("name", v)} /></td>
          </tr>
        </tbody>
      </FormTable>
      <CrudDetail.After>
        <div class="p-2">Footer content (outside form)</div>
      </CrudDetail.After>
    </>
  )}
</CrudDetail>
```

**CrudDetail Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `load` | `() => Promise<{ data: TData; info: CrudDetailInfo }>` | **(required)** | Load function returning data and metadata |
| `children` | `(ctx: CrudDetailContext<TData>) => JSX.Element` | **(required)** | Render prop receiving context |
| `submit` | `(data: TData) => Promise<boolean \| undefined>` | - | Save function. Return `true` to trigger success notification |
| `toggleDelete` | `(del: boolean) => Promise<boolean \| undefined>` | - | Soft-delete/restore function. `del=true` for delete, `false` for restore |
| `editable` | `() => boolean` | `() => true` | Whether editing is allowed |
| `deletable` | `() => boolean` | `() => true` | Whether delete/restore is allowed |
| `data` | `TData` | - | Controlled data state |
| `onDataChange` | `(data: TData) => void` | - | Data change callback (controlled mode) |
| `class` | `string` | - | CSS class |

**CrudDetailInfo:**

```typescript
interface CrudDetailInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}
```

**CrudDetailContext (render prop argument):**

```typescript
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

**Sub-components:**
- `CrudDetail.Tools` -- Custom toolbar buttons (rendered in the toolbar area)
- `CrudDetail.Before` -- Content rendered before the form (outside `<form>`)
- `CrudDetail.After` -- Content rendered after the form (outside `<form>`)

**Page vs Modal mode:**
- **Page mode**: Toolbar with Save/Refresh/Delete buttons appears at the top. When inside `Topbar.Container`, Save and Refresh are also registered in the topbar via `createTopbarActions`.
- **Modal mode** (inside `useDialog`): Refresh button appears in the dialog header. Save/Delete buttons appear in the bottom bar. On save/delete success, the dialog closes with `true` as the return value.

**Keyboard shortcuts:**
- `Ctrl+S` -- Save
- `Ctrl+Alt+L` -- Refresh

**Change detection:** On refresh, if unsaved changes exist, a confirmation dialog is shown. On save, if no changes exist (and not a new record), an info notification is shown instead.
