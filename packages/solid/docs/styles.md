# Styles & Directives

Source: `src/styles/**`, `src/directives/**`

## Base Styles

Design tokens for borders, backgrounds, and text colors.

```ts
const border: {
  default: string;
  subtle: string;
};

const bg: {
  surface: string;
  muted: string;
  subtle: string;
};

const text: {
  default: string;
  muted: string;
  placeholder: string;
};
```

| Token | Fields | Description |
|-------|--------|-------------|
| `border` | `default`, `subtle` | Border color tokens |
| `bg` | `surface`, `muted`, `subtle` | Background color tokens |
| `text` | `default`, `muted`, `placeholder` | Text color tokens |

## Control Styles

Design tokens for interactive controls.

```ts
const state: {
  disabled: string;
};

type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";

const pad: Record<ComponentSize, string>;
const gap: Record<ComponentSize, string>;
```

| Token | Type | Description |
|-------|------|-------------|
| `state.disabled` | `string` | Disabled state CSS classes |
| `ComponentSize` | type | Size scale union |
| `pad` | `Record<ComponentSize, string>` | Padding by component size |
| `gap` | `Record<ComponentSize, string>` | Gap by component size |

## Theme Styles

Semantic theme color tokens.

```ts
type SemanticTheme = "primary" | "info" | "success" | "warning" | "danger" | "base";

const themeTokens: Record<SemanticTheme, {
  solid: string;
  solidHover: string;
  light: string;
  text: string;
  hoverBg: string;
  border: string;
}>;
```

Each theme provides these token fields:

| Field | Description |
|-------|-------------|
| `solid` | Solid background color |
| `solidHover` | Solid background hover color |
| `light` | Light/subtle background color |
| `text` | Text color |
| `hoverBg` | Hover background color |
| `border` | Border color |

## Directives

### `ripple`

Material-style ripple effect directive for interactive elements.

```ts
function ripple(el: HTMLElement, accessor: Accessor<boolean>): void;
```

Usage:
```tsx
<button use:ripple={!props.disabled}>Click me</button>
```

Pass `true` to enable, `false` to disable. Adds a circular ripple animation on pointer down.
