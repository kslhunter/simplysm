# Data Display Components

## `SdListControl`

List container component.

Selector: `sd-list`

| Input | Type | Description |
|-------|------|-------------|
| `inset` | `boolean` (booleanAttribute) | Transparent background (default: `false`) |

## `SdListItemControl`

List item with accordion or flat layout. Supports collapsible child lists, ripple effect, selected state, tool template, and selected icon.

Selector: `sd-list-item`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `layout` | `"accordion" \| "flat"` | Layout mode (default: `"accordion"`) |
| `open` (model) | `boolean` | Collapse open state (default: `false`) |
| `selected` | `boolean` (booleanAttribute) | Selected state (default: `false`) |
| `selectedIcon` | `string` | Optional icon SVG for selection indicator |
| `readonly` | `boolean` (booleanAttribute) | Read-only mode (default: `false`) |

Content children:
- `#toolTpl` template: Additional tool area rendered on the right side
- `<sd-list>` child: Nested list shown in collapse

## `SdSheetControl`

Full-featured data grid with sorting, selection, tree expanding, pagination, column resizing, and configuration persistence.

Selector: `sd-sheet`

### Inputs

| Input | Type | Description |
|-------|------|-------------|
| `key` | `string` | Config key for column settings persistence |
| `items` | `T[]` | Data items (default: `[]`) |
| `trackByFn` | `(item: T, index: number) => unknown` | Track-by function for rows |
| `selectMode` | `"single" \| "multi"` | Selection mode |
| `autoSelect` | `"click" \| "focus"` | Auto-select trigger |
| `getItemSelectableFn` | `(item: T) => boolean \| string` | Item selectable check (string = disabled reason) |
| `getChildrenFn` | `(item: T, index: number) => T[] \| undefined` | Children accessor for tree mode |
| `useAutoSort` | `boolean` (booleanAttribute) | Enable client-side sorting (default: `false`) |
| `visiblePageCount` | `number` | Visible page buttons (default: `10`) |
| `totalPageCount` | `number` | Total pages (server-side pagination, default: `0`) |
| `itemsPerPage` | `number` | Items per page (client-side pagination, default: `0` = no pagination) |
| `focusMode` | `"row" \| "cell"` | Focus navigation mode (default: `"cell"`) |
| `inset` | `boolean` (booleanAttribute) | Borderless inset style (default: `false`) |
| `contentStyle` | `string` | Inline style for the scroll container |
| `getItemCellClassFn` | `(item: T, colKey: string) => string` | Cell CSS class function |
| `getItemCellStyleFn` | `(item: T, colKey: string) => string` | Cell inline style function |
| `hideConfigBar` | `boolean` (booleanAttribute) | Hide config/pagination bar (default: `false`) |

### Models

| Model | Type | Description |
|-------|------|-------------|
| `selectedItems` | `T[]` | Selected items (default: `[]`) |
| `expandedItems` | `T[]` | Expanded tree items (default: `[]`) |
| `sorts` | `ISortingDef[]` | Sort definitions (default: `[]`) |
| `currentPage` | `number` | Current page index, 0-based (default: `0`) |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `itemKeydown` | `ISdSheetItemKeydownEventParam<T>` | Row-level keydown event |
| `cellKeydown` | `ISdSheetItemKeydownEventParam<T>` | Cell-level keydown event |

## `SdSheetColumnDirective`

Column definition for `SdSheetControl`. Defines header, width, and cell/summary templates.

Selector: `sd-sheet-column`

| Input | Type | Description |
|-------|------|-------------|
| `key` | `string` (required) | Unique column key |
| `header` | `string \| string[]` | Header text (multi-level headers via array, default: `""`) |
| `width` | `string` | Column width (CSS value) |
| `fixed` | `boolean` (booleanAttribute) | Fixed column (default: `false`) |
| `hidden` | `boolean` (booleanAttribute) | Hidden column (default: `false`) |
| `collapse` | `boolean` (booleanAttribute) | Collapsed column (default: `false`) |
| `disableSorting` | `boolean` (booleanAttribute) | Disable sorting for this column (default: `false`) |
| `disableResizing` | `boolean` (booleanAttribute) | Disable resizing for this column (default: `false`) |
| `ordering` | `number` | Column display order (default: `0`) |

Content children:
- `#cellTpl` template: Cell content template. Context: `{ $implicit: T, item: T, index: number, depth: number, edit: boolean }`
- `#summaryTpl` template: Summary (footer) template

## `SdSheetConfigModal`

Modal for configuring sheet columns (visibility, order, width, fixed state). Implements `ISdModal<ISdSheetConfig>`.

Selector: `sd-sheet-config-modal`

| Input | Type | Description |
|-------|------|-------------|
| `columns` | `SdSheetColumnDirective[]` (required) | Column directives |
| `config` | `ISdSheetConfig` (required) | Current configuration |

## Types

### `ISdSheetColumnDef`

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Unique column key |
| `header` | `string \| string[]` | Header text |
| `width` | `string \| undefined` | Column width |
| `fixed` | `boolean` | Whether column is fixed |
| `hidden` | `boolean` | Whether column is hidden |
| `collapse` | `boolean` | Whether column is collapsed |
| `disableSorting` | `boolean` | Whether sorting is disabled |
| `disableResizing` | `boolean` | Whether resizing is disabled |
| `ordering` | `number` | Display order |

### `ISdSheetConfig`

| Field | Type | Description |
|-------|------|-------------|
| `columnRecord` | `Record<string, { width?: string; hidden?: boolean; fixed?: boolean; ordering?: number }>` | Per-column overrides |

### `ISdSheetHeaderDef`

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Header cell text |
| `colspan` | `number` | Column span |
| `rowspan` | `number` | Row span |
| `isLastRow` | `boolean` | Whether this is the last header row |
| `colDef` | `ISdSheetColumnDef \| undefined` | Associated column definition |

### `ISdSheetItemKeydownEventParam`

| Field | Type | Description |
|-------|------|-------------|
| `item` | `T` | The data item |
| `key` | `string` | Optional column key (for cell keydown) |
| `event` | `KeyboardEvent` | The keyboard event |
