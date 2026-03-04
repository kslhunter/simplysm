# ComponentSize Unification Design

## Problem

Two inconsistent patterns for handling component sizes:

1. **Conditional pattern (15 instances)**: `size && sizeClasses[size]` — base class has default padding hardcoded, size classes only applied when explicitly set
2. **Nullish coalescing pattern (3 instances)**: `sizeClasses[size ?? "default"]` — size Record has "default" key, always applied

## Solution

Unify all components to the nullish coalescing pattern.

### Migration Pattern

**Before:**
```tsx
const baseClass = clsx("...", padding.default, "h-field");
const sizeClasses: Record<ComponentSize, string> = {
  xs: ..., sm: ..., lg: ..., xl: ...
};
// Usage: twMerge(baseClass, size && sizeClasses[size])
```

**After:**
```tsx
const baseClass = clsx("...");
const sizeClasses: Record<ComponentSize, string> = {
  default: clsx("h-field", padding.default),
  xs: ..., sm: ..., lg: ..., xl: ...
};
// Usage: twMerge(baseClass, sizeClasses[size ?? "default"])
```

### Changes

1. Remove size-related classes (padding, height, min-w) from base classes
2. Add `default` entry to all size Records
3. Change `size && sizeClasses[size]` → `sizeClasses[size ?? "default"]`
4. Simplify `Record<"default" | ComponentSize>` → `Record<ComponentSize>`
5. Merge separate default variables (e.g., `chipDefaultClass`) into Records

## Files to Change

### Group A: Base class cleanup + Record default + conditional removal

| File | Remove from base class | Record default value |
|------|----------------------|---------------------|
| `Button.tsx` | `padding.default`, `"min-w-8"` | `clsx("min-w-8", padding.default)` |
| `Checkbox.styles.ts` | `padding.default`, `"h-field"` | `clsx("h-field", padding.default)` |
| `Checkbox.styles.ts` (inset height) | — | `` clsx`h-field-inset` `` |
| `Field.styles.ts` (fieldBase) | `padding.default`, `"h-field"` | `clsx("h-field", padding.default)` |
| `Field.styles.ts` (textAreaBase) | `padding.default` | `padding.default` |
| `Field.styles.ts` (inset height) | — | `` clsx`h-field-inset` `` |
| `DropdownTrigger.styles.ts` | `padding.default` in function | `clsx(gap.default, padding.default)` |
| `ListItem.styles.ts` | `"py-1"`, `"px-1.5"` | `padding.default` |
| `ColorPicker.tsx` | — | `` clsx`size-field` `` |
| `RichTextEditor.tsx` | `padding.xl` | `clsx(padding.xl, "min-h-32")` |
| `Textarea.tsx` | `padding.default` | *(uses Field's textAreaSizeClasses)* |
| `StatePreset.tsx` (chip) | Remove `chipDefaultClass` | `padding.default` |
| `StatePreset.tsx` (input) | Remove `inputDefaultClass` | `clsx(padding.default, "w-24")` |
| `StatePreset.tsx` (iconBtn) | Remove `iconBtnDefaultClass` | `"p-0.5"` |
| `StatePreset.tsx` (starBtn) | Remove `starBtnDefaultClass` | `"p-1"` |

### Group B: Type simplification only

| File | Change |
|------|--------|
| `Progress.tsx` | `Record<"default" \| ComponentSize>` → `Record<ComponentSize>` |
| `Pagination.tsx` | `Record<ComponentSize \| "default">` → `Record<ComponentSize>` |
| `Field.styles.ts` (fieldGapClasses) | `Record<FieldSize \| "default">` → `Record<FieldSize>` |

### Group C: ThemeToggle unification

- Replace `"sm" | "lg"` with `ComponentSize`
- Expand to full ComponentSize Record

### Group D: Component usage (.tsx files)

- `Checkbox.tsx`, `Radio.tsx`: `size && ...` → `sizeClasses[size ?? "default"]`
- `Combobox.tsx`, `DataSelectButton.tsx`, `Numpad.tsx`: same pattern change
- `Tabs.tsx`: switch/case → Record pattern
