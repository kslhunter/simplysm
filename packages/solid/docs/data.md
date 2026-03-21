# Data Components

Source: `src/components/data/**/*.tsx`

## Table

Styled HTML table with border-separated cells.

```ts
interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  inset?: boolean;  // borderless style for embedding
}
```

### Sub-components

- **`Table.Row`** -- `<tr>` element. Extends `JSX.HTMLAttributes<HTMLTableRowElement>`.
- **`Table.HeaderCell`** -- `<th>` element with bold text and muted background. Extends `JSX.ThHTMLAttributes<HTMLTableCellElement>`.
- **`Table.Cell`** -- `<td>` element with borders. Extends `JSX.TdHTMLAttributes<HTMLTableCellElement>`.

## List

Vertical list container with nesting support via `ListContext`.

```ts
interface ListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;  // borderless style
}
```

Uses `ListContext` to track nesting level for indentation.

### ListContext

```ts
interface ListContextValue {
  level: number;
}

const ListContext: Context<ListContextValue>;  // default: { level: 0 }
function useListContext(): ListContextValue;
```

### ListItem

Interactive list item with selection, expansion, and ripple support.

```ts
interface ListItemProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "onClick"> {
  selected?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  size?: ComponentSize;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClick?: (e: MouseEvent) => void;
}
```

- **`ListItem.Children`** -- Nested content rendered inside a `Collapse`. Children are wrapped in a nested `List`.

## Pagination

Page navigation control with first/prev/next/last buttons.

```ts
interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  page: number;
  onPageChange?: (page: number) => void;
  totalPageCount: number;
  displayPageCount?: number;  // default: 10
  size?: ComponentSize;
}
```

## DataSheet

Spreadsheet-like data grid with sorting, selection, expansion, reorder, column resize, and configuration.

```ts
interface DataSheetProps<TItem> {
  items: TItem[];
  getItemKey: (item: TItem) => string | number | undefined;
  getItemChildren?: (item: TItem, index: number, depth: number) => TItem[] | undefined;
  storageKey?: string;
  inset?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
  totalPageCount?: number;
  sorts?: SortingDef[];
  onSortsChange?: (sorts: SortingDef[]) => void;
  selectionMode?: "single" | "multiple";
  selectedKeys?: (string | number)[];
  onSelectedKeysChange?: (keys: (string | number)[]) => void;
  onSelect?: (result: { items: TItem[]; keys: (string | number)[] }) => void;
  onReorder?: (event: DataSheetReorderEvent<TItem>) => void;
  class?: string;
  style?: JSX.CSSProperties;
  children: JSX.Element;
}
```

### Sub-components

- **`DataSheet.Column<TItem>`** -- Column definition.

```ts
interface DataSheetColumnProps<TItem> {
  key: string;
  header?: string | string[];
  width?: string;
  minWidth?: string;
  fixed?: boolean;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  sortKey?: string;
  resizable?: boolean;
  summary?: (items: TItem[]) => JSX.Element;
  children: (ctx: DataSheetCellContext<TItem>) => JSX.Element;
}

interface DataSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
}
```

### DataSheet.Config

Column visibility and order configuration dialog, persisted via storage.

```ts
interface DataSheetConfig {
  columns: DataSheetConfigColumn[];
}

interface DataSheetConfigColumn {
  key: string;
  hidden?: boolean;
  width?: string;
}
```

### Related Types

```ts
interface SortingDef {
  key: string;
  desc: boolean;
}

interface DataSheetReorderEvent<TItem> {
  item: TItem;
  position: "before" | "after" | "inside";
  target: TItem;
}
```

## Calendar

Month calendar displaying items on date cells.

```ts
interface CalendarProps<TValue> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  year: number;
  month: number;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
  items?: TValue[];
  getItemDate?: (item: TValue) => DateOnly;
  renderItem?: (item: TValue, index: number) => JSX.Element;
  onDateClick?: (date: DateOnly) => void;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
}
```

## Kanban

Kanban board with drag-and-drop cards between lanes.

```ts
interface KanbanProps<TCardValue, TLaneValue> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  onDrop?: (info: KanbanDropInfo<TLaneValue, TCardValue>) => void;
  children: JSX.Element;
}

interface KanbanDropInfo<TLaneValue, TCardValue> {
  card: KanbanCardRef<TLaneValue, TCardValue>;
  target: KanbanDropTarget<TCardValue>;
}
```

### Sub-components

- **`Kanban.Lane<TLaneValue>`** -- Lane container.

```ts
interface KanbanLaneProps<TLaneValue> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value: TLaneValue;
  header?: JSX.Element;
  children: JSX.Element;
}
```

- **`Kanban.Card<TCardValue>`** -- Draggable card.

```ts
interface KanbanCardProps<TCardValue> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value: TCardValue;
  children: JSX.Element;
}
```
