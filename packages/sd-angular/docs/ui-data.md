# UI - Data Components

## List

### SdListControl

**Type:** `@Component` | **Selector:** `sd-list`

Styled vertical list container.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `inset` | `boolean \| ""` | No | `false` | Remove outer border/padding |

---

### SdListItemControl

**Type:** `@Component` | **Selector:** `sd-list-item`

List item with accordion (expandable children) or flat layout. Supports selection indicator icons.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `selectedIcon` | `string` | No | -- | Icon to display when selected |
| `selected` | `boolean \| ""` | No | `false` | Whether this item is selected |
| `layout` | `"flat" \| "accordion"` | No | `"accordion"` | Display layout mode |
| `contentStyle` | `string` | No | -- | CSS styles for content area |
| `contentClass` | `string` | No | -- | CSS class for content area |
| `readonly` | `boolean \| ""` | No | `false` | Prevent interaction |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | Accordion expanded state |

---

## Sheet

### SdSheetControl

**Type:** `@Component` | **Selector:** `sd-sheet`

Full-featured data grid component with column sorting, resizing, fixing, row selection, tree expansion, pagination, focus management, and persistent configuration.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `key` | `string` | Yes | -- | Unique key for config persistence |
| `items` | `T[]` | No | `[]` | Data items to display |
| `trackByFn` | `(item: T, index: number) => any` | No | `(item) => item` | Track-by function |
| `hideConfigBar` | `boolean \| ""` | No | `false` | Hide the configuration toolbar |
| `inset` | `boolean \| ""` | No | `false` | Remove outer border/padding |
| `contentStyle` | `string` | No | -- | CSS style for content area |
| `getItemCellClassFn` | `(item: T, colKey: string) => string \| undefined` | No | -- | Per-cell CSS class function |
| `getItemCellStyleFn` | `(item: T, colKey: string) => string \| undefined` | No | -- | Per-cell CSS style function |
| `useAutoSort` | `boolean \| ""` | No | `false` | Auto-sort items client-side |
| `visiblePageCount` | `number` | No | `10` | Number of page buttons to show |
| `totalPageCount` | `number` | No | `0` | Total number of pages |
| `itemsPerPage` | `number` | No | -- | Items per page (enables pagination) |
| `getChildrenFn` | `(item: T, index: number) => T[] \| undefined` | No | -- | Tree child items accessor |
| `selectMode` | `"single" \| "multi"` | No | -- | Selection mode |
| `autoSelect` | `"click" \| "focus"` | No | -- | Auto-select trigger |
| `getItemSelectableFn` | `(item: T) => boolean \| string` | No | -- | Per-item selection guard |
| `focusMode` | `"row" \| "cell"` | No | `"cell"` | Focus navigation mode |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `sorts` | `ISdSortingDef[]` | `[]` | Column sort definitions |
| `currentPage` | `number` | `0` | Current page index |
| `expandedItems` | `T[]` | `[]` | Expanded tree items |
| `selectedItems` | `T[]` | `[]` | Selected items |

#### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `itemKeydown` | `ISdSheetItemKeydownEventParam<T>` | Keydown on a row |
| `cellKeydown` | `ISdSheetItemKeydownEventParam<T>` | Keydown on a cell |

---

### SdSheetColumnDirective

**Type:** `@Directive` | **Selector:** `sd-sheet-column`

Defines a column within `SdSheetControl`. Contains header configuration, sizing, and the cell template.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `key` | `string` | Yes | -- | Unique column key |
| `fixed` | `boolean \| ""` | No | `false` | Fix column to the left |
| `header` | `string \| string[]` | No | -- | Header text(s) for multi-row headers |
| `headerStyle` | `string` | No | -- | CSS style for header cell |
| `tooltip` | `string` | No | -- | Header tooltip text |
| `width` | `string` | No | -- | Column width (CSS value) |
| `disableSorting` | `boolean \| ""` | No | `false` | Disable sorting for this column |
| `disableResizing` | `boolean \| ""` | No | `false` | Disable column resizing |
| `hidden` | `boolean \| ""` | No | `false` | Hide the column |
| `collapse` | `boolean \| ""` | No | `false` | Collapse the column |

---

### SdSheetColumnCellTemplateDirective

**Type:** `@Directive` | **Selector:** `ng-template[cell]`

Marks a template as the cell template for a sheet column. The template context provides `$implicit` (the item) and other row metadata.

---

### SdSheetConfigModal

**Type:** `@Component` | **Selector:** `sd-sheet-config-modal`

Modal for configuring sheet column visibility, order, fixed state, and width. Implements `ISdModal<ISdSheetConfig>`.

#### Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `sheetKey` | `string` | Yes | Sheet key for config persistence |
| `controls` | `readonly SdSheetColumnDirective<T>[]` | Yes | Column directives to configure |
| `config` | `ISdSheetConfig \| undefined` | Yes | Current config |

#### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `close` | `ISdSheetConfig \| undefined` | Updated config or undefined if canceled |

---

## Sheet Feature Classes

### SdSheetCellAgent

Manages cell-level interactions within the sheet (focus, edit state).

### SdSheetColumnFixingManager

Manages column fixed/unfixed state and left position calculations.

### SdSheetDomAccessor

Provides DOM query methods for accessing sheet elements (rows, cells, headers).

### SdSheetFocusIndicatorRenderer

Renders the focus indicator overlay on the currently focused cell.

### SdSheetLayoutEngine

Calculates column layouts, header structures, and content positioning.

### SdSheetSelectRowIndicatorRenderer

Renders the selection indicator overlay on selected rows.

---

## Sheet Types

### ISdSheetColumnDef

```typescript
interface ISdSheetColumnDef<T> {
  control: SdSheetColumnDirective<T>;
  fixed: boolean;
  width: string | undefined;
  headerStyle: string | undefined;
}
```

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
