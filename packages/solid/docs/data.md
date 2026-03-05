# Data

Components for displaying and managing tabular, list, calendar, and kanban data.

---

## `Table`

Styled HTML table.

```tsx
import { Table } from "@simplysm/solid";

<Table inset>
  <thead>...</thead>
  <tbody>...</tbody>
</Table>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `inset` | `boolean` | Removes outer border/radius |

Extends `JSX.HTMLAttributes<HTMLTableElement>`.

---

## `List`

Keyboard-navigable list component with tree support.

```tsx
import { List } from "@simplysm/solid";

<List>
  <List.Item selected={selected === "a"} onClick={() => setSelected("a")}>
    Item A
  </List.Item>
</List>
```

**`ListProps`**

| Prop | Type | Description |
|------|------|-------------|
| `inset` | `boolean` | Borderless inset style |
| `size` | `ComponentSize` | Item size |

**`List.Item` Props**

| Prop | Type | Description |
|------|------|-------------|
| `selected` | `boolean` | Selected state |
| `disabled` | `boolean` | Disabled state |
| `readonly` | `boolean` | Readonly state (no pointer) |
| `onClick` | `() => void` | Click handler |

Sub-components: `List.Item`

---

## `ListContext`

Context for tracking nesting level in List.

```tsx
import { ListContext, useListContext } from "@simplysm/solid";
```

---

## `ListItem.styles`

Style constants for custom list item implementations.

```tsx
import {
  listItemBaseClass,
  listItemSizeClasses,
  listItemSelectedClass,
  listItemDisabledClass,
  listItemReadonlyClass,
  listItemIndentGuideClass,
  listItemContentClass,
  getListItemSelectedIconClass,
} from "@simplysm/solid";
```

---

## `Pagination`

Page navigation control.

```tsx
import { Pagination } from "@simplysm/solid";

<Pagination page={page} onPageChange={setPage} totalPageCount={total} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `page` | `number` | Current page (1-based) |
| `onPageChange` | `(page: number) => void` | Page change callback |
| `totalPageCount` | `number` | Total number of pages |
| `displayPageCount` | `number` | Number of page buttons shown |
| `size` | `ComponentSizeCompact` | Size |

---

## `DataSheet`

Feature-rich data grid with sorting, pagination, column resizing, fixed columns, row selection, tree expand/collapse, row reorder, and configurable column settings.

```tsx
import { DataSheet } from "@simplysm/solid";

<DataSheet items={items} persistKey="my-sheet">
  <DataSheet.Column key="name" header="Name">
    {(ctx) => <div class="px-2 py-1">{ctx.item.name}</div>}
  </DataSheet.Column>
</DataSheet>
```

Sub-components: `DataSheet.Column`

**`DataSheetProps<TItem>`**

| Prop | Type | Description |
|------|------|-------------|
| `items` | `TItem[]` | Data rows |
| `persistKey` | `string` | Key for persisting column config |
| `hideConfigBar` | `boolean` | Hides the settings toolbar |
| `inset` | `boolean` | Borderless inset style |
| `contentStyle` | `JSX.CSSProperties \| string` | Custom content style |
| `sorts` | `SortingDef[]` | Active sort definitions |
| `onSortsChange` | `(sorts) => void` | Sort change callback |
| `autoSort` | `boolean` | Enable automatic client-side sorting |
| `page` | `number` | Current page |
| `onPageChange` | `(page) => void` | Page change callback |
| `totalPageCount` | `number` | Total pages |
| `itemsPerPage` | `number` | Items per page |
| `displayPageCount` | `number` | Number of page buttons shown |
| `selectMode` | `"single" \| "multiple"` | Selection mode |
| `selectedItems` | `TItem[]` | Selected items |
| `onSelectedItemsChange` | `(items) => void` | Selection change callback |
| `autoSelect` | `"click"` | Auto-select trigger on row click |
| `itemSelectable` | `(item) => boolean \| string` | Item selectability |
| `expandedItems` | `TItem[]` | Expanded tree items |
| `onExpandedItemsChange` | `(items) => void` | Expand change callback |
| `getChildren` | `(item, index) => TItem[] \| undefined` | Tree children resolver |
| `cellClass` | `(item, colKey) => string \| undefined` | Per-cell class |
| `cellStyle` | `(item, colKey) => string \| undefined` | Per-cell style |
| `onItemsReorder` | `(event: DataSheetReorderEvent<TItem>) => void` | Reorder callback |
| `class` | `string` | Custom class |

**`DataSheetColumnProps<TItem>`**

| Prop | Type | Description |
|------|------|-------------|
| `key` | `string` | Column identifier |
| `header` | `string \| string[]` | Header text (string array for multi-level) |
| `headerContent` | `() => JSX.Element` | Custom header content |
| `headerStyle` | `string` | Custom header style |
| `summary` | `() => JSX.Element` | Summary row content |
| `tooltip` | `string` | Column tooltip |
| `fixed` | `boolean` | Sticky column |
| `hidden` | `boolean` | Initially hidden (user can show via config) |
| `collapse` | `boolean` | Initially collapsed |
| `width` | `string` | Column width CSS value |
| `class` | `string` | Cell class |
| `sortable` | `boolean` | Sortable (default: true) |
| `resizable` | `boolean` | Resizable (default: true) |
| `children` | `(ctx: DataSheetCellContext<TItem>) => JSX.Element` | Cell renderer |

**`DataSheetCellContext<TItem>`**

| Property | Type | Description |
|----------|------|-------------|
| `item` | `TItem` | Row data |
| `index` | `number` | Row index |
| `row` | `number` | Row number (flattened) |
| `depth` | `number` | Tree depth |

---

## DataSheet Types

```tsx
import type {
  DataSheetProps,
  DataSheetColumnProps,
  DataSheetCellContext,
  SortingDef,
  DataSheetConfig,
  DataSheetConfigColumn,
  DataSheetColumnDef,
  HeaderDef,
  FlatItem,
  DataSheetDragPosition,
  DataSheetReorderEvent,
  DataSheetConfigColumnInfo,
} from "@simplysm/solid";
```

---

## DataSheet Styles

CSS class constants exported for building custom DataSheet-like components.

```tsx
import {
  dataSheetContainerClass,
  tableClass,
  thClass,
  thContentClass,
  tdClass,
  summaryThClass,
  insetContainerClass,
  insetTableClass,
  defaultContainerClass,
  sortableThClass,
  sortIconClass,
  toolbarClass,
  fixedClass,
  fixedLastClass,
  resizerClass,
  resizeIndicatorClass,
  featureThClass,
  featureTdClass,
  expandIndentGuideClass,
  expandIndentGuideLineClass,
  expandToggleClass,
  selectSingleClass,
  selectSingleSelectedClass,
  selectSingleUnselectedClass,
  reorderHandleClass,
  reorderIndicatorClass,
  featureCellWrapperClass,
  featureCellBodyWrapperClass,
  featureCellClickableClass,
  featureCellBodyClickableClass,
  reorderCellWrapperClass,
  configButtonClass,
} from "@simplysm/solid";
```

---

## `Calendar`

Monthly calendar view that renders items on their respective dates.

```tsx
import { Calendar } from "@simplysm/solid";

<Calendar
  items={events}
  getItemDate={(event) => event.date}
  renderItem={(event) => <div>{event.title}</div>}
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `items` | `TValue[]` | Items to display |
| `getItemDate` | `(item) => DateOnly` | Date extractor |
| `renderItem` | `(item) => JSX.Element` | Item renderer |
| `yearMonth` | `DateOnly` | Controlled year/month |
| `onYearMonthChange` | `(ym) => void` | Year/month change callback |
| `weekStartDay` | `number` | First day of week (0=Sun) |
| `minDaysInFirstWeek` | `number` | Minimum days in first week |

---

## `Kanban`

Kanban board with drag-and-drop card reordering across lanes.

```tsx
import { Kanban } from "@simplysm/solid";

<Kanban items={cards} onDrop={handleDrop}>
  <Kanban.Lane value={lane} laneValue={lane}>
    <Kanban.LaneTitle>{lane.title}</Kanban.LaneTitle>
    <Kanban.Card value={card} cardValue={card}>
      {card.title}
    </Kanban.Card>
  </Kanban.Lane>
</Kanban>
```

Sub-components: `Kanban.Lane`, `Kanban.Card`, `Kanban.LaneTitle`, `Kanban.LaneTools`

---

## `KanbanContext`

Internal context and types for Kanban board components.

```tsx
import {
  KanbanContext,
  KanbanLaneContext,
  useKanbanContext,
  useKanbanLaneContext,
} from "@simplysm/solid";
```
