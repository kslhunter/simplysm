# Styles, Directives, and Helpers

Design tokens, reusable CSS class patterns, SolidJS directives, and utility helpers.

---

## `base.styles`

Base design token class strings for borders, backgrounds, and text.

```tsx
import { border, bg, text } from "@simplysm/solid";

// border object: border.default, border.subtle, border.strong
// bg object: bg.surface, bg.overlay, bg.muted
// text object: text.default, text.muted, text.placeholder
```

| Export | Type | Description |
|--------|------|-------------|
| `border` | `object` | Border color class strings (`default`, `subtle`, `strong`) |
| `bg` | `object` | Background color class strings (`surface`, `overlay`, `muted`) |
| `text` | `object` | Text color class strings (`default`, `muted`, `placeholder`) |

---

## `control.styles`

Component size types and spacing class strings.

```tsx
import { state, ComponentSize, pad, gap } from "@simplysm/solid";
```

| Export | Type | Description |
|--------|------|-------------|
| `state` | `object` | Interactive state class strings (hover, focus, active, disabled) |
| `ComponentSize` | `type` | `"xs" \| "sm" \| "default" \| "lg" \| "xl"` |
| `pad` | `object` | Padding class strings per size (`xs`, `sm`, `default`, `lg`, `xl`) |
| `gap` | `object` | Gap class strings per size (`xs`, `sm`, `default`, `lg`, `xl`) |

---

## `theme.styles`

Semantic color theme types and per-theme Tailwind class sets.

```tsx
import { themeTokens, SemanticTheme } from "@simplysm/solid";

// SemanticTheme: "primary" | "info" | "success" | "warning" | "danger" | "base"
// themeTokens[theme].bg, themeTokens[theme].text, etc.
```

| Export | Type | Description |
|--------|------|-------------|
| `SemanticTheme` | `type` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` |
| `themeTokens` | `Record<SemanticTheme, ThemeTokens>` | Per-theme Tailwind class sets |

---

## `ripple` (directive)

SolidJS directive that adds a Material-style ripple click effect to an element.

```tsx
import { ripple } from "@simplysm/solid";

// In JSX (directive usage requires importing the identifier):
<button use:ripple={!props.disabled}>Click me</button>
```

```
ripple(el: HTMLElement, accessor: Accessor<boolean>): void
```

---

## `mergeStyles`

Merges multiple CSS style values (object or string format) into a single `JSX.CSSProperties` object. Later values take precedence. `undefined` values are ignored.

```tsx
import { mergeStyles } from "@simplysm/solid";

const style = mergeStyles(
  { color: "red" },
  "background: blue;",
  props.style,
);
// => { color: "red", background: "blue", ...props.style }
```

```
mergeStyles(...styles: (JSX.CSSProperties | string | undefined)[]): JSX.CSSProperties
```

---

## `createSlot`

Factory that creates a single-slot registration component for compound component patterns. The slot can hold at most one item at a time.

```tsx
import { createSlot } from "@simplysm/solid";

const [MySlot, createMySlotAccessor] = createSlot<MySlotProps>();

// Inside compound component:
const [slotItem, SlotProvider] = createMySlotAccessor();

// Usage in JSX tree:
<SlotProvider>
  <MySlot prop1="value" />
  {/* rest of children */}
</SlotProvider>
```

```
createSlot<TItem>(): [
  SlotComponent: (props: TItem) => null,
  createSlotAccessor: () => [Accessor<TItem | undefined>, ParentComponent]
]
```

---

## `createSlots`

Factory that creates a multi-slot registration component for compound component patterns. Multiple items can be registered.

```tsx
import { createSlots } from "@simplysm/solid";

const [ActionSlot, createActionSlotsAccessor] = createSlots<ActionProps>();

// Inside compound component:
const [actions, ActionsProvider] = createActionSlotsAccessor();

// Usage in JSX tree:
<ActionsProvider>
  <ActionSlot onClick={handler1}>Action 1</ActionSlot>
  <ActionSlot onClick={handler2}>Action 2</ActionSlot>
</ActionsProvider>
```

```
createSlots<TItem>(): [
  SlotComponent: (props: TItem) => null,
  createSlotsAccessor: () => [Accessor<TItem[]>, ParentComponent]
]
```

Also exports `SlotRegistrar<TItem>` interface:

```
interface SlotRegistrar<TItem> {
  add: (item: TItem) => void;
  remove: (item: TItem) => void;
}
```
