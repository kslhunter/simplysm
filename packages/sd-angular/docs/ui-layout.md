# UI: Layout Components

## SdDockContainerControl

Container that positions dock panels absolutely around a central content area. Each `SdDockControl` child is placed on one side; the content area adjusts its padding to fit.

**Selector:** `sd-dock-container`

```html
<sd-dock-container>
  <sd-dock [position]="'top'">
    <sd-topbar>...</sd-topbar>
  </sd-dock>
  <sd-dock [position]="'left'" [resizable]="true" [key]="'sidebar-width'">
    <sd-sidebar-menu [menus]="menus()" />
  </sd-dock>
  <sd-pane>
    <!-- main content -->
  </sd-pane>
</sd-dock-container>
```

**Inputs:** `contentClass: string`

---

## SdDockControl

A panel docked to one side of a `SdDockContainerControl`. Can be resizable; size is persisted via `SdSystemConfigProvider` when `key` is provided.

**Selector:** `sd-dock`

**Inputs:**

| Input       | Type                                     | Default | Description              |
| ----------- | ---------------------------------------- | ------- | ------------------------ |
| `key`       | `string`                                 | —       | Persistence key for size |
| `position`  | `"top" \| "bottom" \| "right" \| "left"` | `"top"` | Dock side                |
| `resizable` | `boolean`                                | `false` | Show resize handle       |

---

## SdFlexDirective

Applies flex-row or flex-column class utility.

**Selector:** `sd-flex`, `[sd-flex]`

```html
<div sd-flex><!-- flex-row --></div>
<div sd-flex [vertical]="true"><!-- flex-column --></div>
<span sd-flex [inline]="true"><!-- flex-row-inline --></span>
```

**Inputs:** `vertical: boolean` (default `false`), `inline: boolean` (default `false`)

---

## SdFlexGrowDirective

Applies a flex-grow utility class.

**Selector:** `[sd-flex-grow]`

```html
<div [sd-flex-grow]="'fill'"><!-- flex-fill --></div>
<div [sd-flex-grow]="'auto'"><!-- flex-auto --></div>
<div [sd-flex-grow]="'min'"><!-- flex-min --></div>
```

**Input:** `sd-flex-grow: "auto" | "fill" | "min"` (required)

---

## SdFormBoxDirective

Applies form-box layout (label+control pairs in a column).

**Selector:** `sd-form-box`, `[sd-form-box]`

```html
<div sd-form-box>
  <label sd-form-box-item>Name</label>
  <sd-textfield [(value)]="name" />
</div>
```

**Inputs:** `inline: boolean` (default `false`) — uses `form-box-inline` class.

---

## SdFormBoxItemDirective

Marks an element as a form-box label item.

**Selector:** `sd-form-box-item`, `[sd-form-box-item]`

Applies CSS class `form-box-item`.

---

## SdFormTableDirective

Applies `form-table` CSS layout (table-based form).

**Selector:** `sd-form-table`, `[sd-form-table]`

```html
<table sd-form-table>
  <tr>
    <th>Label</th>
    <td><sd-textfield [(value)]="val" /></td>
  </tr>
</table>
```

---

## SdGridDirective

Applies `grid` CSS class for CSS grid layout.

**Selector:** `sd-grid`, `[sd-grid]`

---

## SdGridItemDirective

Applies grid column span classes.

**Selector:** `sd-grid-item`, `[sd-grid-item]`

```html
<div sd-grid>
  <div [sd-grid-item]="true" [colSpan]="6" [colSpanSm]="12">...</div>
  <div [sd-grid-item]="true" [colSpan]="6">...</div>
</div>
```

**Inputs:** `colSpan: number` (default `1`), `colSpanSm: number`, `colSpanXs: number`, `colSpanXxs: number`

---

## SdKanbanBoardControl

The outer container for a kanban board. Manages drag-and-drop state and selected card values.

**Selector:** `sd-kanban-board`

```html
<sd-kanban-board [(selectedValues)]="selected" (drop)="onDrop($event)">
  <sd-kanban-lane [value]="'todo'">
    <sd-kanban [value]="item" [draggable]="true">{{ item.title }}</sd-kanban>
  </sd-kanban-lane>
</sd-kanban-board>
```

**Model:** `selectedValues: T[]`

**Output:** `(drop)` — `ISdKanbanBoardDropInfo<L, T>`

```typescript
interface ISdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue?: T;
  targetLaneValue?: L;
  targetKanbanValue?: T;
}
```

---

## SdKanbanLaneControl

A lane (column) inside `SdKanbanBoardControl`. Accepts drop targets.

**Selector:** `sd-kanban-lane`

**Inputs:** `value: L`, `busy: boolean`, `useCollapse: boolean`, `collapse` (model, `boolean`)

**Content projection:** `#titleTpl`, `#toolTpl`

---

## SdKanbanControl

A single kanban card inside `SdKanbanLaneControl`. Draggable and selectable (with Shift+click).

**Selector:** `sd-kanban`

**Inputs:** `value: T`, `selectable: boolean`, `draggable: boolean`, `contentClass: string`

---

## SdCardDirective

Applies `card` CSS class for card-style styling.

**Selector:** `sd-card`, `[sd-card]`

```html
<div sd-card>Card content</div>
```

---

## SdGapControl

Inserts a spacing gap element (horizontal or vertical).

**Selector:** `sd-gap`

```html
<sd-gap [height]="'default'" />
<sd-gap [width]="'lg'" />
<sd-gap [heightPx]="20" />
```

**Inputs:** `height`, `width` — size tokens (`"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl"`), `heightPx: number`, `widthPx: number`, `widthEm: number`

---

## SdPaneDirective

Fills its container (applies `fill` class and `display: block`).

**Selector:** `sd-pane`, `[sd-pane]`

```html
<sd-pane>
  <!-- fills remaining space -->
</sd-pane>
```

---

## SdTableDirective

Applies `table` CSS class with `display: table`.

**Selector:** `sd-table`, `[sd-table]`

```html
<div sd-table>
  <div class="tr">...</div>
</div>
```

---

## SdViewControl

A view container that shows one `SdViewItemControl` at a time based on matched value.

**Selector:** `sd-view`

```html
<sd-view [value]="activeTab">
  <sd-view-item [value]="'profile'">Profile content</sd-view-item>
  <sd-view-item [value]="'settings'">Settings content</sd-view-item>
</sd-view>
```

**Inputs:** `value: any`, `fill: boolean` (default `false`)

---

## SdViewItemControl

An item inside `SdViewControl`. Shown only when its `value` matches the parent `SdViewControl.value`.

**Selector:** `sd-view-item`

**Inputs:** `value: any`
