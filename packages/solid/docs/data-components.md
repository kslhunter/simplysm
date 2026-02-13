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
  pageIndex={pageIndex()}
  onPageIndexChange={setPageIndex}
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
| `pageIndex` | `number` | - | Current page index (0-based) |
| `onPageIndexChange` | `(pageIndex: number) => void` | - | Page change callback |
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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inset` | `boolean` | - | Transparent background style |

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
| `page` | `number` | **(required)** | Current page (0-based) |
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
