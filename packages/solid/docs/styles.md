# Styles + Directives

Source: `src/styles/*.ts`, `src/directives/*.ts`

## Base Styles

Source: `src/styles/base.styles.ts`

Design tokens for borders, backgrounds, and text.

```ts
const border = {
  default: "border-base-200 dark:border-base-700",
  subtle: "border-base-200 dark:border-base-700",
};

const bg = {
  surface: "bg-white dark:bg-base-900",
  muted: "bg-base-100 dark:bg-base-800",
  subtle: "bg-base-200 dark:bg-base-700",
};

const text = {
  default: "text-base-900 dark:text-base-100",
  muted: "text-base-400 dark:text-base-500",
  placeholder: "placeholder:text-base-400 dark:placeholder:text-base-500",
};
```

## Control Styles

Source: `src/styles/control.styles.ts`

Tokens for interactive component sizing, padding, gaps, and states.

```ts
const state = {
  disabled: "pointer-events-none cursor-default opacity-30",
};

type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";

const pad: Record<ComponentSize | string, string> = {
  md: "px-2 py-1",
  xs: "px-1 py-0",
  sm: "px-1.5 py-0.5",
  lg: "px-3 py-2",
  xl: "px-4 py-3",
};

const gap: Record<ComponentSize | string, string> = {
  md: "gap-1",
  xs: "gap-0",
  sm: "gap-0.5",
  lg: "gap-1.5",
  xl: "gap-2",
};
```

## Theme Styles

Source: `src/styles/theme.styles.ts`

Semantic color tokens for six themes: `primary`, `info`, `success`, `warning`, `danger`, `base`.

```ts
type SemanticTheme = "primary" | "info" | "success" | "warning" | "danger" | "base";

const themeTokens: Record<SemanticTheme, {
  solid: string;       // solid background + white text
  solidHover: string;  // hover state for solid
  light: string;       // light background + dark text
  text: string;        // text color only
  hoverBg: string;     // hover background
  border: string;      // border color
}>;
```

Each theme provides six variants:

| Variant | Usage |
|---------|-------|
| `solid` | Tag, Button(solid), Progress bar fill |
| `solidHover` | Button(solid) hover state |
| `light` | Alert background |
| `text` | Link color, Tab selected |
| `hoverBg` | Button(ghost) hover, List item hover |
| `border` | Button(outline) border |

Example values for `primary`:
```
solid:     "bg-primary-500 text-white"
solidHover: "hover:bg-primary-600 dark:hover:bg-primary-400"
light:     "bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100"
text:      "text-primary-600 dark:text-primary-400"
hoverBg:   "hover:bg-primary-100 dark:hover:bg-primary-800/30"
border:    "border-primary-300 dark:border-primary-600"
```

## Directives

### ripple

Directive that adds a material-design-style ripple effect on pointer down.

```ts
function ripple(el: HTMLElement, accessor: Accessor<boolean>): void;
```

Usage in TSX:

```tsx
<button use:ripple={!props.disabled}>Click me</button>
```

Behavior:
- Creates an internal ripple container with `overflow: hidden`.
- Changes element position to `relative` if it is `static` (restored on cleanup).
- Single ripple mode: removes previous ripple on new click.
- Respects `prefers-reduced-motion: reduce`.
- Ripple radius based on distance from click point to farthest corner.

To use the directive, import and void it at the top of your file:
```tsx
import { ripple } from "@simplysm/solid";
void ripple;
```
