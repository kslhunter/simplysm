# Layout Components

## `SdDockContainerControl`

Container for docked panels. Calculates padding based on child dock sizes and positions.

Selector: `sd-dock-container`

| Input | Type | Description |
|-------|------|-------------|
| `contentClass` | `string` | CSS class for the content wrapper |

## `SdDockControl`

Dockable panel that attaches to a side of `SdDockContainerControl`. Supports optional user-resizing with config persistence.

Selector: `sd-dock`

| Input | Type | Description |
|-------|------|-------------|
| `key` | `string` | Config key for size persistence |
| `position` | `"top" \| "bottom" \| "right" \| "left"` | Dock position (default: `"top"`) |
| `resizable` | `boolean` (booleanAttribute) | Enable drag-to-resize (default: `false`) |

## `SdPaneDirective`

Applies fill-area pane styling to the host element. Sets CSS class `fill` and `display: block`.

Selector: `sd-pane`, `[sd-pane]`

No inputs.

## `SdGapControl`

Spacing element that renders as a gap with preset or pixel-based dimensions.

Selector: `sd-gap`

| Input | Type | Description |
|-------|------|-------------|
| `height` | `"xxs" \| "xs" \| "sm" \| "default" \| "lg" \| "xl" \| "xxl"` | Preset height |
| `heightPx` | `number` | Height in pixels |
| `width` | `"xxs" \| "xs" \| "sm" \| "default" \| "lg" \| "xl" \| "xxl"` | Preset width |
| `widthPx` | `number` | Width in pixels |
| `widthEm` | `number` | Width in em units |

## `SdViewControl`

View container for tab-like content switching. Shows the child `SdViewItemControl` whose value matches.

Selector: `sd-view`

| Input | Type | Description |
|-------|------|-------------|
| `value` | `any` | Currently active view value |
| `fill` | `boolean` (booleanAttribute) | Whether to fill parent height (default: `false`) |

## `SdViewItemControl`

Individual view item, shown when its value matches the parent `SdViewControl` value.

Selector: `sd-view-item`

| Input | Type | Description |
|-------|------|-------------|
| `value` | `any` | Value to match against parent |

## `SdCardDirective`

Applies card styling (CSS class `card`).

Selector: `sd-card`, `[sd-card]`

No inputs.

## `SdKanbanBoardControl`

Kanban board container with drag-and-drop support. Manages drag state and emits drop events.

Selector: `sd-kanban-board`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `selectedValues` (model) | `T[]` | Currently selected kanban values (default: `[]`) |

| Output | Type | Description |
|--------|------|-------------|
| `drop` | `ISdKanbanBoardDropInfo<L, T>` | Emitted when a kanban card is dropped |

### `ISdKanbanBoardDropInfo`

| Field | Type | Description |
|-------|------|-------------|
| `sourceKanbanValue` | `T` | Value of the dragged card |
| `targetLaneValue` | `L` | Value of the target lane |
| `targetKanbanValue` | `T` | Value of the target card (drop position) |

### `ISdKanbanDragRef`

| Field | Type | Description |
|-------|------|-------------|
| `value()` | `T \| undefined` | Value of the dragged card |
| `heightOnDrag()` | `number` | Height of the card being dragged |

### `ISdKanbanDropTarget`

| Field | Type | Description |
|-------|------|-------------|
| `targetLaneValue()` | `L \| undefined` | Value of the target lane |
| `targetKanbanValue?()` | `T \| undefined` | Value of the target card position |

## `SdKanbanLaneControl`

Kanban lane (column). Contains kanban cards and supports drag-drop targeting, collapse, and select-all.

Selector: `sd-kanban-lane`

| Input/Model | Type | Description |
|-------------|------|-------------|
| `busy` | `boolean` (booleanAttribute) | Show busy indicator (default: `false`) |
| `useCollapse` | `boolean` (booleanAttribute) | Enable collapse toggle (default: `false`) |
| `collapse` (model) | `boolean` | Collapse state (default: `false`) |
| `value` | `L` | Lane value identifier |

Content children:
- `#toolTpl` template: Tool bar content
- `#titleTpl` template: Title content

## `SdKanbanControl`

Kanban card item within a lane. Supports dragging and selection.

Selector: `sd-kanban`

| Input | Type | Description |
|-------|------|-------------|
| `value` | `T` | Card value identifier |
| `selectable` | `boolean` (booleanAttribute) | Enable shift-click selection (default: `false`) |
| `draggable` | `boolean` (booleanAttribute) | Enable drag-and-drop (default: `false`) |
| `contentClass` | `string` | CSS class for the card content |
