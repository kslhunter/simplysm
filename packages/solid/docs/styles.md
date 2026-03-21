# Styles & Directives

Source: `src/styles/**`, `src/directives/**`

## Base Styles (`base.styles`)

Foundational design tokens for borders, backgrounds, and text.

```typescript
export const border: {
  default: string;  // border-base-200 dark:border-base-700
  subtle: string;   // border-base-200 dark:border-base-700
};

export const bg: {
  surface: string;  // bg-white dark:bg-base-900
  muted: string;    // bg-base-100 dark:bg-base-800
  subtle: string;   // bg-base-200 dark:bg-base-700
};

export const text: {
  default: string;      // text-base-900 dark:text-base-100
  muted: string;        // text-base-400 dark:text-base-500
  placeholder: string;  // placeholder:text-base-400 dark:placeholder:text-base-500
};
```

---

## Control Styles (`control.styles`)

Size and state tokens for interactive components.

### `ComponentSize`

```typescript
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";
```

### `state`

```typescript
export const state: {
  disabled: string;  // pointer-events-none cursor-default opacity-30
};
```

### `pad`

Size-specific padding classes:

| Size | Value |
|------|-------|
| `xs` | `px-1 py-0` |
| `sm` | `px-1.5 py-0.5` |
| `md` | `px-2 py-1` |
| `lg` | `px-3 py-2` |
| `xl` | `px-4 py-3` |

### `gap`

Size-specific gap classes:

| Size | Value |
|------|-------|
| `xs` | `gap-0` |
| `sm` | `gap-0.5` |
| `md` | `gap-1` |
| `lg` | `gap-1.5` |
| `xl` | `gap-2` |

---

## Theme Styles (`theme.styles`)

Semantic color theme tokens for components.

### `SemanticTheme`

```typescript
export type SemanticTheme = "primary" | "info" | "success" | "warning" | "danger" | "base";
```

### `themeTokens`

```typescript
export const themeTokens: Record<SemanticTheme, {
  solid: string;       // Solid background + white text
  solidHover: string;  // Hover effect for solid
  light: string;       // Light background + dark text
  text: string;        // Text color only
  hoverBg: string;     // Hover background
  border: string;      // Border color
}>;
```

Each theme (`primary`, `info`, `success`, `warning`, `danger`, `base`) provides all six token fields.

---

## Ripple Directive (`ripple`)

Directive that adds a material-design ripple effect to interactive elements.

```typescript
export function ripple(el: HTMLElement, accessor: Accessor<boolean>): void;
```

### Usage

```tsx
<button use:ripple={!props.disabled}>Click me</button>
```

### Behavior

- Creates an internal ripple container with `overflow: hidden`
- Sets `position: relative` on static-positioned elements (restores on cleanup)
- Single ripple mode: removes previous ripple on new click
- Respects `prefers-reduced-motion: reduce`
- Full cleanup on unmount

### TypeScript Declaration

```typescript
declare module "solid-js" {
  namespace JSX {
    interface Directives {
      ripple: boolean;
    }
  }
}
```
