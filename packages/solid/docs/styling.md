# Styling & Tailwind Theme

`@simplysm/solid` provides the following custom themes via Tailwind CSS preset.

## Semantic Colors

| Name | Base Color | Usage |
|------|------------|-------|
| `primary` | blue | Primary actions |
| `info` | sky | Information |
| `success` | green | Success |
| `warning` | amber | Warning |
| `danger` | red | Danger/error |
| `base` | zinc | Neutral (backgrounds, borders, secondary text, etc.) |

> Use `base-*` instead of directly using `zinc-*`.

## Custom Sizes

| Class | Description |
|-------|-------------|
| `h-field` / `size-field` | Default field height (based on `py-1`) |
| `h-field-sm` / `size-field-sm` | Small field height (based on `py-0.5`) |
| `h-field-lg` / `size-field-lg` | Large field height (based on `py-2`) |
| `h-field-xl` / `size-field-xl` | Extra-large field height (based on `py-3`) |
| `h-field-inset` / `size-field-inset` | Inset field height (excludes border) |
| `h-field-inset-sm` / `size-field-inset-sm` | Small inset field height |
| `h-field-inset-lg` / `size-field-inset-lg` | Large inset field height |
| `h-field-inset-xl` / `size-field-inset-xl` | Extra-large inset field height |

## z-index Layers

| Class | Value | Description |
|-------|-------|-------------|
| `z-sidebar` | 100 | Sidebar |
| `z-sidebar-backdrop` | 99 | Sidebar backdrop |
| `z-busy` | 500 | Loading overlay |
| `z-dropdown` | 1000 | Dropdown popup |
| `z-modal-backdrop` | 1999 | Modal backdrop |
| `z-modal` | 2000 | Modal dialog |

## Dark Mode

Uses Tailwind's `class` strategy. `InitializeProvider` automatically toggles the `dark` class on the `<html>` element via the built-in theme provider.

```html
<!-- Light mode -->
<html>
<!-- Dark mode -->
<html class="dark">
```

## Styling Patterns

When using Tailwind classes in components, group them by semantic units with `clsx` and resolve conflicts with `twMerge`:

```typescript
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const baseClass = clsx(
  "inline-flex items-center",
  "px-2 py-1",
  "rounded",
  "border border-transparent",
);

const className = twMerge(baseClass, props.class);
```
