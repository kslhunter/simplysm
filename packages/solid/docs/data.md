# Data Components

Source: `src/components/data/**`

## `Table`

Simple HTML table component with border and padding styles.

```typescript
export interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  inset?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `inset` | `boolean` | Remove outer border and rounded corners |

### Sub-components

- **`Table.Row`** -- Table row (`<tr>`)
- **`Table.HeaderCell`** -- Header cell (`<th>`) with bold text and muted background
- **`Table.Cell`** -- Body cell (`<td>`)

---

## `List`

Container component for list items with tree-view keyboard navigation (Space/Enter, ArrowUp/Down, ArrowLeft/Right, Home/End).

```typescript
export interface ListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `inset` | `boolean` | Transparent background, no outer border |

### Sub-components

- **`List.Item`** -- Interactive list item (see `ListItem` below)

---

## `ListContext`

Context for tracking nesting level in nested lists.

```typescript
export interface ListContextValue {
  level: number;
}

export const ListContext: Context<ListContextValue>;
export const useListContext: () => ListContextValue;
```

---

## `ListItem.styles`

Shared style constants for list items.

| Export | Type | Description |
|--------|------|-------------|
| `listItemBaseClass` | `string` | Base item styles |
| `listItemSizeClasses` | `Record<ComponentSize, string>` | Size-specific padding |
| `listItemSelectedClass` | `string` | Selected state styles |
| `listItemDisabledClass` | `string` | Disabled state styles |
| `listItemReadonlyClass` | `string` | Read-only state styles |
| `listItemIndentGuideClass` | `string` | Indent guide line styles |
| `listItemBasePadLeft` | `Record<ComponentSize, number>` | Base left padding per size (rem) |
| `LIST_ITEM_INDENT_SIZE` | `number` | Indent size per nesting level (1.5 rem) |
| `listItemContentClass` | `string` | Item content area styles |
| `getListItemSelectedIconClass` | `(selected: boolean) => string` | Selection icon color |

---

## `Pagination`

Page navigation component with first/prev/next/last buttons and page number buttons.

```typescript
export interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  page: number;
  onPageChange?: (page: number) => void;
  totalPageCount: number;
  displayPageCount?: number;
  size?: ComponentSize;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `page` | `number` | Current page (1-based) |
| `onPageChange` | `(page: number) => void` | Page change callback |
| `totalPageCount` | `number` | Total number of pages |
| `displayPageCount` | `number` | Visible page buttons. Default: `10` |
| `size` | `ComponentSize` | Button size |

---

## `DataSheet`

Feature-rich data grid with sorting, pagination, selection, tree expansion, column resizing/reordering, fixed columns, and config persistence.

```typescript
export interface DataSheetProps<TItem> {
  items?: TItem[];
  storageKey?: string;
  hideConfigBar?: boolean;
  inset?: boolean;
  contentStyle?: JSX.CSSProperties | string;
  sorts?: SortingDef[];
  onSortsChange?: (sorts: SortingDef[]) => void;
  autoSort?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
  totalPageCount?: number;
  pageSize?: number;
  displayPageCount?: number;
  selectionMode?: "single" | "multiple";
  selection?: TItem[];
  onSelectionChange?: (items: TItem[]) => void;
  autoSelect?: boolean;
  isItemSelectable?: (item: TItem) => boolean | string;
  expandedItems?: TItem[];
  onExpandedItemsChange?: (items: TItem[]) => void;
  itemChildren?: (item: TItem, index: number) => TItem[] | undefined;
  cellClass?: (item: TItem, colKey: string) => string | undefined;
  cellStyle?: (item: TItem, colKey: string) => string | undefined;
  onItemsReorder?: (event: DataSheetReorderEvent<TItem>) => void;
  class?: string;
  children: JSX.Element;
}
```

### `DataSheetColumnProps`

```typescript
export interface DataSheetColumnProps<TItem> {
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
```

### `DataSheetCellContext`

```typescript
export interface DataSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
}
```

### `SortingDef`

```typescript
export interface SortingDef {
  key: string;
  desc: boolean;
}
```

### `DataSheetReorderEvent`

```typescript
export interface DataSheetReorderEvent<TItem> {
  item: TItem;
  targetItem: TItem;
  position: DataSheetDragPosition;
}

export type DataSheetDragPosition = "before" | "after" | "inside";
```

### `DataSheetConfig` / `DataSheetConfigColumn`

```typescript
export interface DataSheetConfig {
  columnRecord?: Partial<Record<string, DataSheetConfigColumn>>;
}

export interface DataSheetConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}
```

### `FlatItem`

```typescript
export interface FlatItem<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  hasChildren: boolean;
  parent?: TItem;
}
```

---

## `DataSheet.styles`

Shared style constants for DataSheet rendering. Key exports:

| Export | Description |
|--------|-------------|
| `dataSheetContainerClass` | Container class |
| `tableClass` | Table element class |
| `thClass` / `tdClass` | Header/body cell classes |
| `summaryThClass` | Summary row header class |
| `sortableThClass` | Sortable header class |
| `fixedClass` / `fixedLastClass` | Fixed column classes |
| `resizerClass` | Column resize handle class |
| `resizeIndicatorClass` | Resize drag indicator class |
| `featureThClass` / `featureTdClass` | Feature column classes |
| `expandToggleClass` | Expand toggle button class |
| `selectSingleClass` | Single select icon class |
| `reorderHandleClass` | Drag reorder handle class |
| `reorderIndicatorClass` | Reorder drag indicator class |
| `toolbarClass` | Toolbar class |
| `trRowClass` | Body row class with hover/selected overlays |
| `configButtonClass` | Settings button class |

---

## `Calendar`

Monthly calendar grid displaying items by date.

```typescript
export interface CalendarProps<TValue> extends Omit<
  JSX.HTMLAttributes<HTMLTableElement>,
  "children"
> {
  items: TValue[];
  getItemDate: (item: TValue, index: number) => DateOnly;
  renderItem: (item: TValue, index: number) => JSX.Element;
  yearMonth?: DateOnly;
  onYearMonthChange?: (value: DateOnly) => void;
  weekStartDay?: number;
  minDaysInFirstWeek?: number;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `items` | `TValue[]` | Data items to display |
| `getItemDate` | `(item, index) => DateOnly` | Extract date from item |
| `renderItem` | `(item, index) => JSX.Element` | Render item content |
| `yearMonth` | `DateOnly` | Displayed month |
| `onYearMonthChange` | `(value: DateOnly) => void` | Month change callback |
| `weekStartDay` | `number` | Week start day (0=Sun). Default: `0` |
| `minDaysInFirstWeek` | `number` | Min days in first week. Default: `1` |

---

## `Kanban`

Drag-and-drop kanban board with lanes, cards, and multi-select support.

### Types

```typescript
export interface KanbanCardRef<TLaneValue, TCardValue> {
  value: TCardValue | undefined;
  laneValue: TLaneValue | undefined;
  heightOnDrag: number;
}

export interface KanbanDropInfo<TLaneValue, TCardValue> {
  sourceValue?: TCardValue;
  targetLaneValue?: TLaneValue;
  targetCardValue?: TCardValue;
  position?: "before" | "after";
}

export interface KanbanDropTarget<TCardValue> {
  element: HTMLElement;
  value: TCardValue | undefined;
  position: "before" | "after";
}

export interface KanbanCardProps<TCardValue = unknown> {
  value?: TCardValue;
  draggable?: boolean;
  selectable?: boolean;
  contentClass?: string;
  children?: JSX.Element;
}
```

### `KanbanContextValue`

```typescript
export interface KanbanContextValue<TLaneValue, TCardValue> {
  dragCard: Accessor<KanbanCardRef<TLaneValue, TCardValue> | undefined>;
  setDragCard: Setter<KanbanCardRef<TLaneValue, TCardValue> | undefined>;
  onDropTo: (targetLaneValue, targetCardValue, position) => void;
  selectedValues: Accessor<TCardValue[]>;
  setSelectedValues: (updater) => void;
  toggleSelection: (value: TCardValue) => void;
}
```

### `KanbanLaneContextValue`

```typescript
export interface KanbanLaneContextValue<TLaneValue, TCardValue> {
  value: Accessor<TLaneValue | undefined>;
  dropTarget: Accessor<KanbanDropTarget<TCardValue> | undefined>;
  setDropTarget: (target) => void;
  registerCard: (id, info) => void;
  unregisterCard: (id) => void;
}
```

### Hooks

- **`useKanbanContext()`** -- Access board-level context
- **`useKanbanLaneContext()`** -- Access lane-level context
