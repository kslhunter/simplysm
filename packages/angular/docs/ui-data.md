# UI Data

Data display components: lists and spreadsheet-style sheets.

## `SdListControl`

Simple list container.

```typescript
@Component({ selector: "sd-list" })
class SdListControl {
  inset = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `inset` | `boolean` | `false` | Makes background transparent |

## `SdListItemControl`

List item with optional accordion/flat layout, selection state, and tool slot.

```typescript
@Component({ selector: "sd-list-item" })
class SdListItemControl {
  layout = input<"accordion" | "flat">("accordion");
  open = model(false);
  selected = input(false, { transform: booleanAttribute });
  selectedIcon = input<string>();
  readonly = input(false, { transform: booleanAttribute });
  contentStyle = input<string>();
  contentClass = input<string>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `layout` | `"accordion" \| "flat"` | `"accordion"` | Child display mode |
| `open` | `boolean` | `false` | Accordion open state (two-way) |
| `selected` | `boolean` | `false` | Selected visual state |
| `selectedIcon` | `string \| undefined` | — | Icon shown when selected (no children) |
| `readonly` | `boolean` | `false` | Disables click interaction |
| `contentStyle` | `string \| undefined` | — | Inline style for content |
| `contentClass` | `string \| undefined` | — | CSS class for content |

Content template: `#toolTpl` — optional tool area.

## `SdSheetControl`

Full-featured data grid/spreadsheet with sorting, tree expansion, selection, pagination, column resizing, and config persistence.

```typescript
@Component({ selector: "sd-sheet" })
class SdSheetControl<T> {
  // Inputs
  key = input<string>();
  items = input<T[]>([]);
  trackByFn = input<(item: T, index: number) => unknown>();
  selectMode = input<"single" | "multi">();
  autoSelect = input<"click" | "focus">();
  getItemSelectableFn = input<(item: T) => boolean | string>();
  getChildrenFn = input<(item: T, index: number) => T[] | undefined>();
  useAutoSort = input(false, { transform: booleanAttribute });
  visiblePageCount = input(10);
  totalPageCount = input(0);
  itemsPerPage = input(0);
  focusMode = input<"row" | "cell">("cell");
  inset = input(false, { transform: booleanAttribute });
  contentStyle = input<string>();
  getItemCellClassFn = input<(item: T, colKey: string) => string>();
  getItemCellStyleFn = input<(item: T, colKey: string) => string | undefined>();
  hideConfigBar = input(false, { transform: booleanAttribute });

  // Models
  selectedItems = model<T[]>([]);
  expandedItems = model<T[]>([]);
  sorts = model<ISortingDef[]>([]);
  currentPage = model(0);

  // Outputs
  itemKeydown = output<ISdSheetItemKeydownEventParam<T>>();
  cellKeydown = output<ISdSheetItemKeydownEventParam<T>>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string \| undefined` | — | Enables column config persistence |
| `items` | `T[]` | `[]` | Data items to display |
| `trackByFn` | `((item, index) => unknown) \| undefined` | — | Identity function for change detection |
| `selectMode` | `"single" \| "multi" \| undefined` | — | Selection mode |
| `autoSelect` | `"click" \| "focus" \| undefined` | — | Auto-select trigger |
| `getItemSelectableFn` | `((item) => boolean \| string) \| undefined` | — | Per-item selectability; string = disabled reason |
| `getChildrenFn` | `((item, index) => T[] \| undefined) \| undefined` | — | Enables tree mode |
| `useAutoSort` | `boolean` | `false` | Client-side auto-sort |
| `focusMode` | `"row" \| "cell"` | `"cell"` | Keyboard focus granularity |
| `inset` | `boolean` | `false` | Removes outer border |
| `hideConfigBar` | `boolean` | `false` | Hides config button |

Content children: `SdSheetColumnDirective`.

## `SdSheetColumnDirective`

Column definition directive for `SdSheetControl`.

```typescript
@Directive({ selector: "sd-sheet-column" })
class SdSheetColumnDirective {
  key = input.required<string>();
  header = input<string | string[]>("");
  width = input<string>();
  fixed = input(false, { transform: booleanAttribute });
  hidden = input(false, { transform: booleanAttribute });
  collapse = input(false, { transform: booleanAttribute });
  disableSorting = input(false, { transform: booleanAttribute });
  disableResizing = input(false, { transform: booleanAttribute });
  ordering = input(0);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | — | Column identifier (required) |
| `header` | `string \| string[]` | `""` | Header text; array for hierarchical headers |
| `width` | `string \| undefined` | — | CSS width |
| `fixed` | `boolean` | `false` | Sticky left column |
| `hidden` | `boolean` | `false` | Hidden column |
| `collapse` | `boolean` | `false` | Collapsible column |
| `disableSorting` | `boolean` | `false` | Disable sort on this column |
| `disableResizing` | `boolean` | `false` | Disable resize on this column |
| `ordering` | `number` | `0` | Display order |

Content templates: `#cellTpl` (cell content), `#summaryTpl` (footer summary).

## `SdSheetConfigModal`

Modal for configuring sheet columns (visibility, order, fixed, width). Implements `ISdModal<ISdSheetConfig | undefined>`.

```typescript
@Component({ selector: "sd-sheet-config-modal" })
class SdSheetConfigModal implements ISdModal<ISdSheetConfig | undefined> {
  controls = input.required<readonly SdSheetColumnDirective[]>();
  config = input.required<ISdSheetConfig | undefined>();
  close = output<ISdSheetConfig | undefined>();
  initialized = signal(true);
}
```

## `ISdSheetColumnDef`

Runtime column definition used internally by `SdSheetControl`.

```typescript
interface ISdSheetColumnDef {
  key: string;
  header: string | string[];
  width: string | undefined;
  fixed: boolean;
  hidden: boolean;
  collapse: boolean;
  disableSorting: boolean;
  disableResizing: boolean;
  ordering: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Column identifier |
| `header` | `string \| string[]` | Header text |
| `width` | `string \| undefined` | CSS width |
| `fixed` | `boolean` | Sticky left |
| `hidden` | `boolean` | Hidden |
| `collapse` | `boolean` | Collapsible |
| `disableSorting` | `boolean` | Sorting disabled |
| `disableResizing` | `boolean` | Resizing disabled |
| `ordering` | `number` | Display order |

## `ISdSheetHeaderDef`

Header cell definition for multi-row headers.

```typescript
interface ISdSheetHeaderDef {
  text: string;
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
  colDef: ISdSheetColumnDef | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Header text |
| `colspan` | `number` | Column span |
| `rowspan` | `number` | Row span |
| `isLastRow` | `boolean` | Whether this is the bottom header row |
| `colDef` | `ISdSheetColumnDef \| undefined` | Associated column definition |

## `ISdSheetConfig`

Persisted user configuration for a sheet.

```typescript
interface ISdSheetConfig {
  columnRecord: Record<string, {
    width?: string;
    hidden?: boolean;
    fixed?: boolean;
    ordering?: number;
  }>;
}
```

## `ISdSheetItemKeydownEventParam`

Payload for `itemKeydown` and `cellKeydown` outputs.

```typescript
interface ISdSheetItemKeydownEventParam<T> {
  item: T;
  key?: string;
  event: KeyboardEvent;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `item` | `T` | The data item |
| `key` | `string \| undefined` | Column key (present on `cellKeydown`) |
| `event` | `KeyboardEvent` | Original keyboard event |
