# Data

## Table

```typescript
interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  inset?: boolean;
}
```

Basic HTML table with consistent styling.

**Sub-components:** `Table.Row`, `Table.HeaderCell`, `Table.Cell`

---

## List

```typescript
interface ListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}
```

Vertical list with keyboard navigation (ArrowUp/Down, Home/End) and tree-view support (ArrowRight/Left to expand/collapse).

**Sub-component:** `List.Item`

---

## Pagination

```typescript
interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  page: number;
  onPageChange?: (page: number) => void;
  totalPageCount: number;
  displayPageCount?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}
```

Page navigation control. `page` is 1-based. `displayPageCount` controls how many page numbers are visible at once.

---

## DataSheet

```typescript
interface DataSheetProps<TItem> {
  items?: TItem[];
  storageKey?: string;
  hideConfigBar?: boolean;
  inset?: boolean;
  contentStyle?: JSX.CSSProperties | string;

  // Sorting
  sorts?: SortingDef[];
  onSortsChange?: (sorts: SortingDef[]) => void;
  autoSort?: boolean;

  // Pagination
  page?: number;
  onPageChange?: (page: number) => void;
  totalPageCount?: number;
  pageSize?: number;
  displayPageCount?: number;

  // Selection
  selectionMode?: "single" | "multiple";
  selection?: TItem[];
  onSelectionChange?: (items: TItem[]) => void;
  autoSelect?: boolean;
  isItemSelectable?: (item: TItem) => boolean | string;

  // Tree expansion
  expandedItems?: TItem[];
  onExpandedItemsChange?: (items: TItem[]) => void;
  itemChildren?: (item: TItem, index: number) => TItem[] | undefined;

  // Cell styling
  cellClass?: (item: TItem, colKey: string) => string | undefined;
  cellStyle?: (item: TItem, colKey: string) => string | undefined;

  // Reordering
  onItemsReorder?: (event: DataSheetReorderEvent<TItem>) => void;

  class?: string;
  children: JSX.Element;
}
```

Advanced data grid with sorting, pagination, row selection, tree expansion, column reordering, and column configuration persistence.

- `storageKey` — persists column configuration (width, visibility, order) to sync storage
- `autoSort` — sorts items client-side without `onSortsChange`
- `autoSelect` — manages selection state internally
- `itemChildren` — enables tree-structured rows

**Sub-component:** `DataSheet.Column`

```typescript
interface DataSheetColumnProps<TItem> {
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

interface DataSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
}

interface SortingDef {
  key: string;
  desc: boolean;
}

interface DataSheetReorderEvent<TItem> {
  item: TItem;
  targetItem: TItem;
  position: "before" | "after" | "inside";
}
```

---

## Calendar

```typescript
interface CalendarProps<TValue> extends Omit<JSX.HTMLAttributes<HTMLTableElement>, "children"> {
  items: TValue[];
  getItemDate: (item: TValue, index: number) => DateOnly;
  renderItem: (item: TValue, index: number) => JSX.Element;
  yearMonth?: DateOnly;
  onYearMonthChange?: (value: DateOnly) => void;
  weekStartDay?: number;
  minDaysInFirstWeek?: number;
}
```

Monthly calendar view that renders items on their corresponding dates. `getItemDate` maps items to dates. `renderItem` renders each item cell.

---

## Kanban

```typescript
interface KanbanProps<TCardValue, TLaneValue> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onDrop"> {
  onDrop?: (info: KanbanDropInfo<TLaneValue, TCardValue>) => void;
  selectedValues?: TCardValue[];
  onSelectedValuesChange?: (values: TCardValue[]) => void;
  children?: JSX.Element;
}
```

Kanban board with drag-and-drop card management.

**Sub-components:**
- `Kanban.Lane` — `{ value?: TLaneValue; busy?: boolean; collapsible?: boolean; collapsed?: boolean; onCollapsedChange?: (collapsed: boolean) => void }`
- `Kanban.Card` — `{ value?: TCardValue; draggable?: boolean; selectable?: boolean; contentClass?: string }`
- `Kanban.LaneTitle` — lane title slot
- `Kanban.LaneTools` — lane toolbar slot

---

## Usage Examples

```typescript
import { DataSheet, Pagination } from "@simplysm/solid";

<DataSheet
  items={data()}
  sorts={sorts()}
  onSortsChange={setSorts}
  page={page()}
  onPageChange={setPage}
  totalPageCount={totalPages()}
  selectionMode="multiple"
  selection={selected()}
  onSelectionChange={setSelected}
  storageKey="my-table"
>
  <DataSheet.Column key="name" header="Name" sortable>
    {(ctx) => ctx.item.name}
  </DataSheet.Column>
  <DataSheet.Column key="age" header="Age" sortable width="80px">
    {(ctx) => ctx.item.age}
  </DataSheet.Column>
</DataSheet>
```
