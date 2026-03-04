# Styles, Directives, and Helpers

Design tokens, reusable CSS class patterns, SolidJS directives, and utility helpers.

---

## `tokens.styles`

Design token constants and type definitions shared across all components.

```tsx
import {
  borderDefault,
  borderSubtle,
  bgSurface,
  textDefault,
  textMuted,
  textPlaceholder,
  disabledOpacity,
  ComponentSize,
  ComponentSizeCompact,
  paddingXs,
  paddingSm,
  paddingLg,
  paddingXl,
  SemanticTheme,
  themeTokens,
} from "@simplysm/solid";
```

| Export | Type | Description |
|--------|------|-------------|
| `borderDefault` | `string` | Default border color class |
| `borderSubtle` | `string` | Subtle border color class |
| `bgSurface` | `string` | Surface background class |
| `textDefault` | `string` | Default text color class |
| `textMuted` | `string` | Muted text color class |
| `textPlaceholder` | `string` | Placeholder text color class |
| `disabledOpacity` | `string` | Disabled opacity class |
| `ComponentSize` | `type` | `"xs" \| "sm" \| "lg" \| "xl"` (default `"lg"`) |
| `ComponentSizeCompact` | `type` | `"sm" \| "lg"` |
| `paddingXs` | `string` | XS padding class |
| `paddingSm` | `string` | SM padding class |
| `paddingLg` | `string` | LG padding class |
| `paddingXl` | `string` | XL padding class |
| `SemanticTheme` | `type` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` |
| `themeTokens` | `Record<SemanticTheme, ThemeTokens>` | Per-theme Tailwind class sets |

---

## `patterns.styles`

Reusable Tailwind class patterns for common UI patterns.

```tsx
import {
  insetFocusOutline,
  insetFocusOutlineSelf,
  insetBase,
  fieldSurface,
  inputBase,
} from "@simplysm/solid";
```

| Export | Description |
|--------|-------------|
| `insetFocusOutline` | Focus ring for inset (borderless) elements |
| `insetFocusOutlineSelf` | Self-applied focus ring variant |
| `insetBase` | Base class for inset-styled components |
| `fieldSurface` | Background class for field surfaces |
| `inputBase` | Base class for input elements |

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
