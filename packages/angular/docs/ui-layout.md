# UI Layout

Layout components for structuring page content: dock panels, panes, views, cards, and kanban boards.

## `SdDockContainerControl`

Flex container that positions child `SdDockControl` panels around a central content area.

```typescript
@Component({ selector: "sd-dock-container" })
class SdDockContainerControl {
  contentClass = input<string>();
}
```

| Input | Type | Description |
|-------|------|-------------|
| `contentClass` | `string \| undefined` | CSS class applied to the inner content div |

## `SdDockControl`

Dockable panel that attaches to a side of `SdDockContainerControl`. Supports resizing with optional config persistence.

```typescript
@Component({ selector: "sd-dock" })
class SdDockControl {
  key = input<string>();
  position = input<"top" | "bottom" | "right" | "left">("top");
  resizable = input(false, { transform: booleanAttribute });
  size = signal(0);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string \| undefined` | — | Persistence key for resize state |
| `position` | `"top" \| "bottom" \| "right" \| "left"` | `"top"` | Dock position |
| `resizable` | `boolean` | `false` | Enable drag-to-resize |

## `SdPaneDirective`

CSS utility directive that makes the host element fill its container with scrollable overflow.

```typescript
@Directive({ selector: "sd-pane, [sd-pane]" })
class SdPaneDirective { }
```

Applies `class="fill"` and `style="display: block"`.

## `SdGapControl`

Empty spacer element with configurable width and/or height.

```typescript
@Component({ selector: "sd-gap" })
class SdGapControl {
  height = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  heightPx = input<number>();
  width = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  widthPx = input<number>();
  widthEm = input<number>();
}
```

| Input | Type | Description |
|-------|------|-------------|
| `height` | size token \| undefined | Named vertical gap |
| `heightPx` | `number \| undefined` | Explicit height in px |
| `width` | size token \| undefined | Named horizontal gap |
| `widthPx` | `number \| undefined` | Explicit width in px |
| `widthEm` | `number \| undefined` | Explicit width in em |

## `SdViewControl`

Container that shows one child `SdViewItemControl` at a time based on a matched value.

```typescript
@Component({ selector: "sd-view" })
class SdViewControl {
  value = input<any>();
  fill = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `any` | — | Currently active view value |
| `fill` | `boolean` | `false` | When true, sets `height: 100%` |

## `SdViewItemControl`

Content panel shown only when its `value` matches the parent `SdViewControl.value`.

```typescript
@Component({ selector: "sd-view-item" })
class SdViewItemControl {
  value = input<any>();
  isSelected = computed(/* parent.value() === this.value() */);
}
```

## `SdCardDirective`

CSS marker directive that applies the `.card` class (background, border-radius, shadow, hover elevation).

```typescript
@Directive({ selector: "sd-card, [sd-card]" })
class SdCardDirective { }
```

## `SdKanbanBoardControl`

Container for kanban lanes. Manages drag-and-drop state and multi-selection.

```typescript
@Component({ selector: "sd-kanban-board" })
class SdKanbanBoardControl<L, T> {
  selectedValues = model<T[]>([]);
  drop = output<ISdKanbanBoardDropInfo<L, T>>();
  dragKanban = signal<ISdKanbanDragRef<L, T> | undefined>(undefined);
}
```

| Model/Output | Type | Description |
|--------------|------|-------------|
| `selectedValues` | `T[]` | Two-way bound selected kanban card values |
| `drop` | `ISdKanbanBoardDropInfo<L, T>` | Emitted when a card is dropped |

## `ISdKanbanBoardDropInfo`

```typescript
interface ISdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue?: T;
  targetLaneValue?: L;
  targetKanbanValue?: T;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sourceKanbanValue` | `T \| undefined` | Value of the dragged card |
| `targetLaneValue` | `L \| undefined` | Value of the target lane |
| `targetKanbanValue` | `T \| undefined` | Value of the card dropped before |

## `ISdKanbanDragRef`

```typescript
interface ISdKanbanDragRef<_L, T> {
  value(): T | undefined;
  heightOnDrag(): number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `value` | `() => T \| undefined` | Dragged card value |
| `heightOnDrag` | `() => number` | Card height at drag start (for placeholder) |

## `ISdKanbanDropTarget`

```typescript
interface ISdKanbanDropTarget<L, T> {
  targetLaneValue(): L | undefined;
  targetKanbanValue?(): T | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `targetLaneValue` | `() => L \| undefined` | Lane value of drop target |
| `targetKanbanValue` | `(() => T \| undefined) \| undefined` | Card value if dropping before a card |

## `SdKanbanControl`

Individual kanban card. Supports drag-and-drop and shift-click selection. Implements `ISdKanbanDragRef` and `ISdKanbanDropTarget`.

```typescript
@Component({ selector: "sd-kanban" })
class SdKanbanControl<L, T> implements ISdKanbanDragRef<L, T>, ISdKanbanDropTarget<L, T> {
  value = input<T>();
  selectable = input(false, { transform: booleanAttribute });
  draggable = input(false, { transform: booleanAttribute });
  contentClass = input<string>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `T \| undefined` | — | Card identity value |
| `selectable` | `boolean` | `false` | Enable shift-click selection |
| `draggable` | `boolean` | `false` | Enable drag-and-drop |
| `contentClass` | `string \| undefined` | — | CSS class for inner card |

## `SdKanbanLaneControl`

Kanban lane (column) that holds kanban cards. Implements `ISdKanbanDropTarget`. Supports collapse, select-all, and custom title/tool templates.

```typescript
@Component({ selector: "sd-kanban-lane" })
class SdKanbanLaneControl<L, T> implements ISdKanbanDropTarget<L, T> {
  value = input<L>();
  busy = input(false, { transform: booleanAttribute });
  useCollapse = input(false, { transform: booleanAttribute });
  collapse = model(false);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `L \| undefined` | — | Lane identity value |
| `busy` | `boolean` | `false` | Shows busy indicator |
| `useCollapse` | `boolean` | `false` | Enables collapse toggle |
| `collapse` | `boolean` | `false` | Two-way collapsed state |

Content templates: `#toolTpl`, `#titleTpl`.
