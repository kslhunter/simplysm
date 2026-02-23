# UI: Data Components

## SdListControl

A vertical list container.

**Selector:** `sd-list`

```html
<sd-list [inset]="true">
  <sd-list-item>Item 1</sd-list-item>
  <sd-list-item>Item 2</sd-list-item>
</sd-list>
```

**Inputs:** `inset: boolean` (default `false`) — transparent background when true.

---

## SdListItemControl

An item inside `SdListControl`. Supports selection, accordion/flat layout, nested lists, and an optional tool template.

**Selector:** `sd-list-item`

```html
<sd-list-item
  [selected]="item.id === selectedId"
  (click)="select(item)"
  [selectedIcon]="tablerCheck"
>
  {{ item.name }}
</sd-list-item>

<!-- Accordion with children -->
<sd-list-item [layout]="'accordion'">
  Category
  <sd-list>
    <sd-list-item>Child 1</sd-list-item>
  </sd-list>
</sd-list-item>
```

**Inputs:**

| Input          | Type                    | Default       | Description                  |
| -------------- | ----------------------- | ------------- | ---------------------------- |
| `open` (model) | `boolean`               | `false`       | Expanded state               |
| `selectedIcon` | `string`                | —             | SVG icon shown when selected |
| `selected`     | `boolean`               | `false`       | Selected state               |
| `layout`       | `"flat" \| "accordion"` | `"accordion"` | Display mode                 |
| `contentStyle` | `string`                | —             | Inline style for content     |
| `contentClass` | `string`                | —             | CSS class for content        |
| `readonly`     | `boolean`               | `false`       | Readonly state               |

**Content projection:**

- Default content — item label
- `sd-list` — nested child list (triggers accordion behavior)
- `#toolTpl` — tool template rendered inside the item row

---

## SdSheetControl

A full-featured data grid with sortable/resizable columns, column fixing, pagination, row selection, row expansion, keyboard navigation, and optional column configuration.

**Selector:** `sd-sheet`

```html
<sd-sheet
  [key]="'mySheet'"
  [items]="items()"
  [trackByFn]="trackByItem"
  [(selectedItemKeys)]="selectedKeys"
  [selectMode]="'multi'"
>
  <sd-sheet-column [key]="'name'" [header]="'Name'" [width]="'200px'">
    <ng-template [cell]="items()" let-item="item">
      <div class="p-xs-sm">{{ item.name }}</div>
    </ng-template>
  </sd-sheet-column>
  <sd-sheet-column [key]="'amount'" [header]="'Amount'">
    <ng-template [cell]="items()" let-item="item">
      <sd-textfield [type]="'number'" [(value)]="item.amount" [inset]="true" />
    </ng-template>
  </sd-sheet-column>
</sd-sheet>
```

**Key inputs:**

| Input              | Type                            | Description                          |
| ------------------ | ------------------------------- | ------------------------------------ |
| `key`              | `string`                        | Persisted config key                 |
| `items`            | `T[]`                           | Data rows                            |
| `trackByFn`        | `(item: T) => any`              | Track function                       |
| `selectedItemKeys` | `TKey[]` (model)                | Selected row keys                    |
| `selectMode`       | `"single" \| "multi"`           | Row selection mode                   |
| `autoSelect`       | `"click" \| undefined`          | Auto-select on click                 |
| `expandedItemKeys` | `TKey[]` (model)                | Expanded row keys                    |
| `getItemKeyFn`     | `(item: T) => TKey`             | Row key function                     |
| `getChildrenFn`    | `(item: T) => T[] \| undefined` | Children for tree rows               |
| `sortingDefs`      | `ISdSortingDef[]` (model)       | Sort definitions                     |
| `currentPage`      | `number` (model)                | Pagination current page              |
| `pageItemCount`    | `number`                        | Items per page (enables pagination)  |
| `totalItemCount`   | `number`                        | Total item count (for server paging) |
| `focusMode`        | `"row" \| "cell"`               | Focus highlight mode                 |
| `inset`            | `boolean`                       | Borderless style                     |
| `hideConfigBar`    | `boolean`                       | Hide column config bar               |
| `contentStyle`     | `string`                        | Container style                      |

**Outputs:** `(itemKeydown)` — `ISdSheetItemKeydownEventParam<T>`

**Feature classes (internal):**

- `SdSheetCellAgent` — cell keyboard navigation and edit mode
- `SdSheetColumnFixingManager` — sticky column left offset tracking
- `SdSheetDomAccessor` — DOM element lookup by cell address
- `SdSheetFocusIndicatorRenderer` — renders focus indicator overlay
- `SdSheetLayoutEngine` — computes header rows and column definitions
- `SdSheetSelectRowIndicatorRenderer` — renders selection indicator overlay

---

## SdSheetColumnDirective

Defines a column inside `SdSheetControl`.

**Selector:** `sd-sheet-column`

```html
<sd-sheet-column [key]="'status'" [header]="['Group', 'Status']" [width]="'80px'" [fixed]="true">
  <ng-template [cell]="items()" let-item="item" let-edit="edit">
    @if (edit) {
    <sd-select [inset]="true" [(value)]="item.status">...</sd-select>
    } @else { {{ item.status }} }
  </ng-template>
</sd-sheet-column>
```

**Inputs:**

| Input             | Type                 | Description               |
| ----------------- | -------------------- | ------------------------- |
| `key`             | `string` (required)  | Column identifier         |
| `fixed`           | `boolean`            | Stick to left             |
| `header`          | `string \| string[]` | Header text or breadcrumb |
| `headerStyle`     | `string`             | Style for header cell     |
| `tooltip`         | `string`             | Tooltip on header         |
| `width`           | `string`             | Column width (CSS)        |
| `disableSorting`  | `boolean`            | Hide sort controls        |
| `disableResizing` | `boolean`            | Prevent column resize     |
| `hidden`          | `boolean`            | Hide column               |
| `collapse`        | `boolean`            | Collapsible column        |

**Content projection:**

- `ng-template[cell]` — cell template (`SdSheetColumnCellTemplateDirective`)
- `#headerTpl` — custom header template
- `#summaryTpl` — summary row template

---

## SdSheetColumnCellTemplateDirective

Type-guard directive for `ng-template[cell]` inside `SdSheetColumnDirective`.

**Selector:** `ng-template[cell]`

**Input:** `cell: TItem[]` (required)

**Context `SdSheetColumnCellTemplateContext<TItem>`:**

| Variable    | Type      | Description                  |
| ----------- | --------- | ---------------------------- |
| `$implicit` | `TItem`   | Row data                     |
| `item`      | `TItem`   | Row data (alias)             |
| `index`     | `number`  | Row index                    |
| `depth`     | `number`  | Tree depth                   |
| `edit`      | `boolean` | Whether cell is in edit mode |

---

## SdSheetConfigModal

Internal modal for configuring sheet column visibility, order, width, and fixed state. Used automatically by `SdSheetControl` when `key` is set.

**Selector:** `sd-sheet-config-modal`

Implements `ISdModal<ISdSheetConfig>`. Inputs: `sheetKey`, `controls`, `config`.

---

## Sheet Types

### ISdSheetConfig

```typescript
interface ISdSheetConfig {
  columnRecord: Record<string, ISdSheetConfigColumn | undefined> | undefined;
}

interface ISdSheetConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}
```

### ISdSheetColumnDef

```typescript
interface ISdSheetColumnDef<T> {
  control: SdSheetColumnDirective<T>;
  fixed: boolean;
  width: string | undefined;
  headerStyle: string | undefined;
}
```

### ISdSheetHeaderDef

```typescript
interface ISdSheetHeaderDef {
  control: SdSheetColumnDirective<any>;
  fixed: boolean;
  width: string | undefined;
  style: string | undefined;
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
}
```

### ISdSheetItemKeydownEventParam

```typescript
interface ISdSheetItemKeydownEventParam<T> {
  item: T;
  key?: string;
  event: KeyboardEvent;
}
```
