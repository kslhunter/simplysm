# UI - Layout Components

## Dock

### SdDockContainerControl

**Type:** `@Component` | **Selector:** `sd-dock-container`

Container that positions dock panels on sides around a central content area. Each `SdDockControl` child is placed on one side; the content area adjusts its padding dynamically.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `contentClass` | `string` | No | -- | CSS class for the content area |

---

### SdDockControl

**Type:** `@Component` | **Selector:** `sd-dock`

Dockable panel that sits on a side of `SdDockContainerControl`. Supports resizable handles.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `key` | `string` | No | -- | Persistence key for resized width/height |
| `position` | `"top" \| "bottom" \| "right" \| "left"` | No | `"top"` | Dock position |
| `resizable` | `boolean \| ""` | No | `false` | Enable resize handle |

---

## Flex

### SdFlexDirective

**Type:** `@Directive` | **Selector:** `sd-flex, [sd-flex]`

Applies flexbox layout with optional vertical direction and inline display.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `vertical` | `boolean \| ""` | No | `false` | Flex direction column |
| `inline` | `boolean \| ""` | No | `false` | Inline flex display |

---

### SdFlexGrowDirective

**Type:** `@Directive` | **Selector:** `[sd-flex-grow]`

Controls how a flex child takes up space.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sd-flex-grow` | `"auto" \| "fill" \| "min"` | Yes | -- | Sizing mode: `auto` (content-based), `fill` (flex-grow), `min` (shrink to minimum) |

---

## Form Layout

### SdFormBoxDirective

**Type:** `@Directive` | **Selector:** `sd-form-box, [sd-form-box]`

CSS-based form layout container with label/value pairs. Children use `SdFormBoxItemDirective`.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `inline` | `boolean \| ""` | No | `false` | Inline layout (horizontal) |

---

### SdFormBoxItemDirective

**Type:** `@Directive` | **Selector:** `sd-form-box-item, [sd-form-box-item]`

Item within a `SdFormBoxDirective`. Provides label and content areas.

No inputs.

---

### SdFormTableDirective

**Type:** `@Directive` | **Selector:** `sd-form-table, [sd-form-table]`

Table-based form layout. Uses HTML `<table>` structure for strict label/value alignment.

No inputs.

---

## Grid

### SdGridDirective

**Type:** `@Directive` | **Selector:** `sd-grid, [sd-grid]`

Responsive CSS grid container. Child items use `SdGridItemDirective` for column span control.

No inputs.

---

### SdGridItemDirective

**Type:** `@Directive` | **Selector:** `sd-grid-item, [sd-grid-item]`

Grid item with responsive column span breakpoints.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `colSpan` | `number` | No | `1` | Column span (default) |
| `colSpanSm` | `number` | No | -- | Column span at small breakpoint |
| `colSpanXs` | `number` | No | -- | Column span at extra-small breakpoint |
| `colSpanXxs` | `number` | No | -- | Column span at extra-extra-small breakpoint |

---

## Kanban

### SdKanbanBoardControl

**Type:** `@Component` | **Selector:** `sd-kanban-board`

Kanban board container that manages lanes and drag-drop between them.

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `selectedValues` | `T[]` | `[]` | Selected kanban card values |

#### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `drop` | `ISdKanbanBoardDropInfo<L, T>` | Card dropped onto a lane or position |

#### ISdKanbanBoardDropInfo

```typescript
interface ISdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue?: T;
  targetLaneValue?: L;
  targetKanbanValue?: T;
}
```

---

### SdKanbanLaneControl

**Type:** `@Component` | **Selector:** `sd-kanban-lane`

A lane/column within a kanban board. Contains kanban cards.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `value` | `L` | No | -- | Lane value identifier |
| `busy` | `boolean \| ""` | No | `false` | Show loading indicator |
| `useCollapse` | `boolean \| ""` | No | `false` | Enable collapse toggle |

#### Models

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `collapse` | `boolean` | `false` | Collapsed state |

---

### SdKanbanControl

**Type:** `@Component` | **Selector:** `sd-kanban`

Individual kanban card within a lane.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `value` | `T` | No | -- | Card value identifier |
| `selectable` | `boolean \| ""` | No | `false` | Can be selected |
| `draggable` | `boolean \| ""` | No | `false` | Can be dragged |
| `contentClass` | `string` | No | -- | CSS class for content |

---

## Other Layout

### SdCardDirective

**Type:** `@Directive` | **Selector:** `sd-card, [sd-card]`

Card container with border, padding, and background styling.

No inputs.

---

### SdGapControl

**Type:** `@Component` | **Selector:** `sd-gap`

Spacing element for creating gaps between components.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `height` | `"xxs" \| "xs" \| "sm" \| "default" \| "lg" \| "xl" \| "xxl"` | No | -- | Preset height |
| `heightPx` | `number` | No | -- | Custom height in pixels |
| `width` | `"xxs" \| "xs" \| "sm" \| "default" \| "lg" \| "xl" \| "xxl"` | No | -- | Preset width |
| `widthPx` | `number` | No | -- | Custom width in pixels |
| `widthEm` | `number` | No | -- | Custom width in em units |

---

### SdPaneDirective

**Type:** `@Directive` | **Selector:** `sd-pane, [sd-pane]`

Scrollable content pane with `overflow: auto`.

No inputs.

---

### SdTableDirective

**Type:** `@Directive` | **Selector:** `sd-table, [sd-table]`

Styled table container with consistent border and padding styles.

No inputs.

---

### SdViewControl

**Type:** `@Component` | **Selector:** `sd-view`

Container for switchable content views, typically used with `SdTabControl` or programmatic switching.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `value` | `any` | No | -- | Active view value |
| `fill` | `boolean \| ""` | No | `false` | Fill available space |

---

### SdViewItemControl

**Type:** `@Component` | **Selector:** `sd-view-item`

Individual view panel within `SdViewControl`. Visible when its value matches the parent's value.

#### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `value` | `any` | No | -- | View item value (matched against parent) |
