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
| `h-field-xs` / `size-field-xs` | Extra-small field height (based on `py-0`) |
| `h-field-sm` / `size-field-sm` | Small field height (based on `py-0.5`) |
| `h-field-lg` / `size-field-lg` | Large field height (based on `py-2`) |
| `h-field-xl` / `size-field-xl` | Extra-large field height (based on `py-3`) |
| `h-field-inset` / `size-field-inset` | Inset field height (excludes border) |
| `h-field-inset-xs` / `size-field-inset-xs` | Extra-small inset field height |
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
| `z-notification` | 3000 | Notification banner |

## Dark Mode

Uses Tailwind's `class` strategy. `ThemeProvider` automatically toggles the `dark` class on the `<html>` element.

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

## Exported Style Tokens

`@simplysm/solid` exports TypeScript style constants and type definitions for use when building custom components that integrate with the library's design system.

### tokens.styles

```typescript
import {
  type ComponentSize,         // "xs" | "sm" | "lg" | "xl"
  type ComponentSizeCompact,  // "sm" | "lg" (used by ColorPicker, Progress)
  type SemanticTheme,         // "primary" | "info" | "success" | "warning" | "danger" | "base"
  borderDefault,         // Tailwind classes for default border color
  borderSubtle,          // Tailwind classes for subtle border color
  bgSurface,             // Tailwind classes for surface background
  textDefault,           // Tailwind classes for default text color
  textMuted,             // Tailwind classes for muted text color
  textPlaceholder,       // Tailwind classes for placeholder text color
  disabledOpacity,       // Tailwind classes for disabled state opacity
  paddingXs,             // Tailwind classes for extra-small padding (px-1 py-0)
  paddingSm,             // Tailwind classes for small padding (px-1.5 py-0.5)
  paddingLg,             // Tailwind classes for large padding (px-3 py-2)
  paddingXl,             // Tailwind classes for extra-large padding (px-4 py-3)
  themeTokens,           // Record<SemanticTheme, { solid, solidHover, light, text, hoverBg, border }>
} from "@simplysm/solid";
```

### patterns.styles

```typescript
import {
  iconButtonBase,         // Base classes for icon-only buttons
  insetFocusOutline,      // Focus outline (focus-within) for inset fields
  insetFocusOutlineSelf,  // Focus outline (focus) for inset trigger elements
  insetBase,              // Base layout classes for inset mode
  fieldSurface,           // Field surface (background, border, focus ring)
  inputBase,              // Base classes for <input> elements
} from "@simplysm/solid";
```

### Field.styles

```typescript
import {
  type FieldSize,                    // "xs" | "sm" | "lg" | "xl"
  fieldBaseClass,                    // Base wrapper classes (inline-flex, field surface, h-field)
  fieldSizeClasses,                  // Size variant classes per FieldSize
  fieldInsetClass,                   // Inset mode wrapper classes
  fieldInsetHeightClass,             // Inset height class (h-field-inset, excludes border)
  fieldInsetSizeHeightClasses,       // Inset height classes per size
  fieldDisabledClass,                // Disabled state classes
  textAreaBaseClass,                 // Base textarea wrapper classes
  textAreaSizeClasses,               // Textarea size classes per FieldSize
  fieldInputClass,                   // Base classes for field <input> element
  fieldGapClasses,                   // Gap classes per size (with prefix icon)
  getFieldWrapperClass,              // Utility to build field wrapper class string
  getTextareaWrapperClass,           // Utility to build textarea wrapper class string
} from "@simplysm/solid";
```

**`getFieldWrapperClass` options:**

| Option | Type | Description |
|--------|------|-------------|
| `size` | `FieldSize` | Size variant |
| `disabled` | `boolean` | Apply disabled styles |
| `inset` | `boolean` | Apply inset styles |
| `includeCustomClass` | `string \| false` | Additional CSS class (or `false` to skip) |
| `extra` | `string \| false` | Extra classes inserted before size/disabled/inset |

### Checkbox.styles

```typescript
import {
  type CheckboxSize,               // "xs" | "sm" | "lg" | "xl"
  checkboxBaseClass,               // Base wrapper classes
  indicatorBaseClass,              // Base indicator (box) classes
  checkedClass,                    // Checked state classes (primary color)
  checkboxSizeClasses,             // Size variant classes
  checkboxInsetClass,              // Inset mode classes
  checkboxInsetSizeHeightClasses,  // Inset height classes per size (excludes border)
  checkboxInlineClass,             // Inline display classes
  checkboxDisabledClass,           // Disabled state classes
} from "@simplysm/solid";
```

### DataSheet.styles

```typescript
import {
  dataSheetContainerClass, tableClass, thClass, thContentClass, tdClass,
  summaryThClass, insetContainerClass, insetTableClass, defaultContainerClass,
  sortableThClass, sortIconClass, toolbarClass, fixedClass, fixedLastClass,
  resizerClass, resizeIndicatorClass, featureThClass, featureTdClass,
  expandIndentGuideClass, expandIndentGuideLineClass, expandToggleClass,
  selectSingleClass, selectSingleSelectedClass, selectSingleUnselectedClass,
  reorderHandleClass, reorderIndicatorClass, configButtonClass,
  featureCellWrapperClass, featureCellBodyWrapperClass,
  featureCellClickableClass, featureCellBodyClickableClass,
  reorderCellWrapperClass,
} from "@simplysm/solid";
```

### ListItem.styles

```typescript
import {
  listItemBaseClass, listItemSizeClasses, listItemSelectedClass,
  listItemDisabledClass, listItemReadonlyClass, listItemIndentGuideClass,
  listItemContentClass, getListItemSelectedIconClass,
} from "@simplysm/solid";
```
