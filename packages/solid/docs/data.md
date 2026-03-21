# Data Components

Source: `src/components/data/**`

## `Table`

Styled HTML table with border-separated cells.

```ts
interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  inset?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `inset` | `boolean` | Borderless style for embedding |

### Sub-components

- **`Table.Row`** -- `<tr>` element. Extends `JSX.HTMLAttributes<HTMLTableRowElement>`.
- **`Table.HeaderCell`** -- `<th>` element with bold text and muted background. Extends `JSX.ThHTMLAttributes<HTMLTableCellElement>`.
- **`Table.Cell`** -- `<td>` element with borders. Extends `JSX.TdHTMLAttributes<HTMLTableCellElement>`.

## `List`

Vertical list container with nesting support and keyboard navigation.

```ts
interface ListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}
```

### `ListContext`

```ts
interface ListContextValue {
  level: number;
}

const ListContext: Context<ListContextValue>;
function useListContext(): ListContextValue;
```

| Field | Type | Description |
|-------|------|-------------|
| `level` | `number` | Current nesting level (0-based) |

## `Pagination`

Page navigation control with first/prev/next/last buttons.

```ts
interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  page: number;
  onPageChange?: (page: number) => void;
  totalPageCount: number;
  displayPageCount?: number;
  size?: ComponentSize;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `page` | `number` | Current page (0-based) |
| `onPageChange` | `(page: number) => void` | Page change callback |
| `totalPageCount` | `number` | Total number of pages |
| `displayPageCount` | `number` | Number of page buttons to show (default: 10) |
| `size` | `ComponentSize` | Size scale |

## `DataSheet`

Full-featured data grid with sorting, selection, expansion, reorder, column resize, and configuration persistence.

```ts
interface DataSheetProps<TItem> {
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

| Field | Type | Description |
|-------|------|-------------|
| `items` | `TItem[]` | Data items array |
| `storageKey` | `string` | Key for persisting column config |
| `hideConfigBar` | `boolean` | Hide the configuration toolbar |
| `inset` | `boolean` | Borderless inset style |
| `contentStyle` | `JSX.CSSProperties \| string` | Style for content area |
| `sorts` | `SortingDef[]` | Current sort state |
| `onSortsChange` | `(sorts: SortingDef[]) => void` | Sort change callback |
| `autoSort` | `boolean` | Auto-sort items client-side |
| `page` | `number` | Current page |
| `onPageChange` | `(page: number) => void` | Page change callback |
| `totalPageCount` | `number` | Total page count |
| `pageSize` | `number` | Items per page |
| `displayPageCount` | `number` | Pagination button count |
| `selectionMode` | `"single" \| "multiple"` | Selection mode |
| `selection` | `TItem[]` | Selected items |
| `onSelectionChange` | `(items: TItem[]) => void` | Selection change callback |
| `autoSelect` | `boolean` | Auto-select first item |
| `isItemSelectable` | `(item: TItem) => boolean \| string` | Item selectability check |
| `expandedItems` | `TItem[]` | Currently expanded items |
| `onExpandedItemsChange` | `(items: TItem[]) => void` | Expansion change callback |
| `itemChildren` | `(item: TItem, index: number) => TItem[] \| undefined` | Get child items for tree display |
| `cellClass` | `(item: TItem, colKey: string) => string \| undefined` | Dynamic cell CSS class |
| `cellStyle` | `(item: TItem, colKey: string) => string \| undefined` | Dynamic cell CSS style |
| `onItemsReorder` | `(event: DataSheetReorderEvent<TItem>) => void` | Drag-and-drop reorder callback |

### `DataSheet.Column`

Column definition for DataSheet.

```ts
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
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Unique column identifier |
| `header` | `string \| string[]` | Header text (array for multi-row headers) |
| `headerContent` | `() => JSX.Element` | Custom header content renderer |
| `headerStyle` | `string` | Header cell CSS style |
| `summary` | `() => JSX.Element` | Summary row cell renderer |
| `tooltip` | `string` | Header tooltip text |
| `fixed` | `boolean` | Fix column to left side |
| `hidden` | `boolean` | Hide column |
| `collapse` | `boolean` | Allow column to be collapsed |
| `width` | `string` | Column width (CSS value) |
| `sortable` | `boolean` | Enable column sorting |
| `resizable` | `boolean` | Enable column resize |

### `DataSheetCellContext`

```ts
interface DataSheetCellContext<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `item` | `TItem` | Row data item |
| `index` | `number` | Item index in items array |
| `row` | `number` | Visual row number |
| `depth` | `number` | Tree nesting depth |

### Related Types

```ts
interface SortingDef {
  key: string;
  desc: boolean;
}

interface DataSheetConfig {
  columnRecord?: Partial<Record<string, DataSheetConfigColumn>>;
}

interface DataSheetConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}

interface DataSheetColumnDef<TItem> {
  key: string;
  header: string[];
  headerContent?: () => JSX.Element;
  headerStyle?: string;
  summary?: () => JSX.Element;
  tooltip?: string;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  width?: string;
  class?: string;
  sortable: boolean;
  resizable: boolean;
  cell: (ctx: DataSheetCellContext<TItem>) => JSX.Element;
}

interface HeaderDef {
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  colIndex?: number;
  fixed?: boolean;
  width?: string;
  style?: string;
  headerContent?: () => JSX.Element;
}

interface FlatItem<TItem> {
  item: TItem;
  index: number;
  row: number;
  depth: number;
  hasChildren: boolean;
  parent?: TItem;
}

type DataSheetDragPosition = "before" | "after" | "inside";

interface DataSheetReorderEvent<TItem> {
  item: TItem;
  targetItem: TItem;
  position: DataSheetDragPosition;
}

interface DataSheetConfigColumnInfo {
  key: string;
  header: string[];
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  width?: string;
}
```

## `Calendar`

Monthly calendar view rendering custom items on date cells.

```ts
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

| Field | Type | Description |
|-------|------|-------------|
| `items` | `TValue[]` | Data items to display |
| `getItemDate` | `(item, index) => DateOnly` | Extract date from item |
| `renderItem` | `(item, index) => JSX.Element` | Render item on calendar cell |
| `yearMonth` | `DateOnly` | Current displayed month |
| `onYearMonthChange` | `(value: DateOnly) => void` | Month navigation callback |
| `weekStartDay` | `number` | First day of week (0=Sunday) |
| `minDaysInFirstWeek` | `number` | Minimum days in first week of month |

## `Kanban`

Kanban board with drag-and-drop cards between lanes. Compound with Lane, Card, LaneTitle, LaneTools sub-components.

```ts
interface KanbanProps<TCardValue = unknown, TLaneValue = unknown>
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onDrop"> {
  onDrop?: (info: KanbanDropInfo<TLaneValue, TCardValue>) => void;
  selectedValues?: TCardValue[];
  onSelectedValuesChange?: (values: TCardValue[]) => void;
  children?: JSX.Element;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `onDrop` | `(info: KanbanDropInfo) => void` | Drop event callback |
| `selectedValues` | `TCardValue[]` | Currently selected card values |
| `onSelectedValuesChange` | `(values: TCardValue[]) => void` | Selection change callback |

### `Kanban.Lane`

```ts
interface KanbanLaneProps<TLaneValue = unknown>
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: TLaneValue;
  busy?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children?: JSX.Element;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `value` | `TLaneValue` | Lane identifier value |
| `busy` | `boolean` | Show busy overlay |
| `collapsible` | `boolean` | Allow lane collapsing |
| `collapsed` | `boolean` | Lane collapsed state |
| `onCollapsedChange` | `(collapsed: boolean) => void` | Collapse state callback |

- **`Kanban.LaneTitle`** -- Lane title slot.
- **`Kanban.LaneTools`** -- Lane toolbar slot.

### `Kanban.Card`

```ts
interface KanbanCardProps<TCardValue = unknown>
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "draggable"> {
  value?: TCardValue;
  draggable?: boolean;
  selectable?: boolean;
  contentClass?: string;
  children?: JSX.Element;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `value` | `TCardValue` | Card identifier value |
| `draggable` | `boolean` | Enable drag-and-drop |
| `selectable` | `boolean` | Enable click selection |
| `contentClass` | `string` | CSS class for card content |

### Kanban Context Types

```ts
interface KanbanCardRef<TLaneValue = unknown, TCardValue = unknown> {
  value: TCardValue | undefined;
  laneValue: TLaneValue | undefined;
  heightOnDrag: number;
}

interface KanbanDropInfo<TLaneValue = unknown, TCardValue = unknown> {
  sourceValue?: TCardValue;
  targetLaneValue?: TLaneValue;
  targetCardValue?: TCardValue;
  position?: "before" | "after";
}

interface KanbanDropTarget<TCardValue = unknown> {
  element: HTMLElement;
  value: TCardValue | undefined;
  position: "before" | "after";
}

interface KanbanContextValue<TLaneValue = unknown, TCardValue = unknown> {
  dragCard: Accessor<KanbanCardRef<TLaneValue, TCardValue> | undefined>;
  setDragCard: Setter<KanbanCardRef<TLaneValue, TCardValue> | undefined>;
  onDropTo: (targetLaneValue: TLaneValue | undefined, targetCardValue: TCardValue | undefined, position: "before" | "after" | undefined) => void;
  selectedValues: Accessor<TCardValue[]>;
  setSelectedValues: (updater: TCardValue[] | ((prev: TCardValue[]) => TCardValue[])) => void;
  toggleSelection: (value: TCardValue) => void;
}

const KanbanContext: Context<KanbanContextValue>;
function useKanbanContext(): KanbanContextValue;

interface KanbanLaneContextValue<TLaneValue = unknown, TCardValue = unknown> {
  value: Accessor<TLaneValue | undefined>;
  dropTarget: Accessor<KanbanDropTarget<TCardValue> | undefined>;
  setDropTarget: (target: KanbanDropTarget<TCardValue> | undefined) => void;
  registerCard: (id: string, info: { value: TCardValue | undefined; selectable: boolean }) => void;
  unregisterCard: (id: string) => void;
}

const KanbanLaneContext: Context<KanbanLaneContextValue>;
function useKanbanLaneContext(): KanbanLaneContextValue;
```

## ListItem Style Exports

Shared styling utilities for list item components.

```ts
const listItemBaseClass: string;
const listItemSizeClasses: Record<ComponentSize, string>;
const listItemSelectedClass: string;
const listItemDisabledClass: string;
const listItemReadonlyClass: string;
const listItemIndentGuideClass: string;
const listItemBasePadLeft: Record<ComponentSize, number>;
const LIST_ITEM_INDENT_SIZE: number;  // 1.5
const listItemContentClass: string;

function getListItemSelectedIconClass(selected: boolean): string;
```

| Export | Type | Description |
|--------|------|-------------|
| `listItemBaseClass` | `string` | Base list item styles |
| `listItemSizeClasses` | `Record<ComponentSize, string>` | Size-specific styles |
| `listItemSelectedClass` | `string` | Selected state styles |
| `listItemDisabledClass` | `string` | Disabled state styles |
| `listItemReadonlyClass` | `string` | Read-only state styles |
| `listItemIndentGuideClass` | `string` | Indent guide line styles |
| `listItemBasePadLeft` | `Record<ComponentSize, number>` | Base left padding by size |
| `LIST_ITEM_INDENT_SIZE` | `number` | Indent size per nesting level (1.5rem) |
| `listItemContentClass` | `string` | Content area styles |
| `getListItemSelectedIconClass` | `function` | Get selected icon CSS class |

## DataSheet Style Exports

Shared styling utilities for DataSheet components.

```ts
const dataSheetContainerClass: string;
const tableClass: string;
const thClass: string;
const thContentClass: string;
const tdClass: string;
const summaryThClass: string;
const insetContainerClass: string;
const insetTableClass: string;
const defaultContainerClass: string;
const sortableThClass: string;
const sortIconClass: string;
const toolbarClass: string;
const fixedClass: string;
const fixedLastClass: string;
const resizerClass: string;
const resizeIndicatorClass: string;
const featureThClass: string;
const featureTdClass: string;
const expandIndentGuideClass: string;
const expandIndentGuideLineClass: string;
const expandToggleClass: string;
const selectSingleClass: string;
const selectSingleSelectedClass: string;
const selectSingleUnselectedClass: string;
const reorderHandleClass: string;
const reorderIndicatorClass: string;
const featureCellWrapperClass: string;
const featureCellBodyWrapperClass: string;
const featureCellClickableClass: string;
const featureCellBodyClickableClass: string;
const reorderCellWrapperClass: string;
const configButtonClass: string;
const trRowClass: string;
```

| Export | Type | Description |
|--------|------|-------------|
| `dataSheetContainerClass` | `string` | Outer container styles |
| `tableClass` | `string` | Table element styles |
| `thClass` | `string` | Header cell styles |
| `thContentClass` | `string` | Header cell content wrapper |
| `tdClass` | `string` | Data cell styles |
| `summaryThClass` | `string` | Summary row header styles |
| `insetContainerClass` | `string` | Inset mode container |
| `insetTableClass` | `string` | Inset mode table |
| `defaultContainerClass` | `string` | Default mode container |
| `sortableThClass` | `string` | Sortable header styles |
| `sortIconClass` | `string` | Sort indicator icon |
| `toolbarClass` | `string` | Toolbar container |
| `fixedClass` | `string` | Fixed column styles |
| `fixedLastClass` | `string` | Last fixed column border |
| `resizerClass` | `string` | Column resize handle |
| `resizeIndicatorClass` | `string` | Resize indicator line |
| `featureThClass` | `string` | Feature column header |
| `featureTdClass` | `string` | Feature column cell |
| `expandIndentGuideClass` | `string` | Tree expand indent guide |
| `expandIndentGuideLineClass` | `string` | Indent guide line |
| `expandToggleClass` | `string` | Expand/collapse toggle |
| `selectSingleClass` | `string` | Single select indicator |
| `selectSingleSelectedClass` | `string` | Selected state indicator |
| `selectSingleUnselectedClass` | `string` | Unselected state indicator |
| `reorderHandleClass` | `string` | Drag reorder handle |
| `reorderIndicatorClass` | `string` | Reorder drop indicator |
| `featureCellWrapperClass` | `string` | Feature cell wrapper |
| `featureCellBodyWrapperClass` | `string` | Feature cell body wrapper |
| `featureCellClickableClass` | `string` | Clickable feature cell |
| `featureCellBodyClickableClass` | `string` | Clickable feature cell body |
| `reorderCellWrapperClass` | `string` | Reorder cell wrapper |
| `configButtonClass` | `string` | Config toolbar button |
| `trRowClass` | `string` | Table row styles |
