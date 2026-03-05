# Solid Package API Naming Refactoring

## Overview

Rename 5 public API names in the solid package to improve consistency and alignment with industry conventions. **No logic changes** — rename only.

## Changes

### 1. Dialog `float`/`fill` → `mode` enum

**Before:**
```typescript
interface DialogProps {
  float?: boolean;
  fill?: boolean;
}
```

**After:**
```typescript
interface DialogProps {
  mode?: "float" | "fill";
}
```

- Default (undefined) = modal behavior (unchanged)
- `position` prop remains separate (only relevant when `mode === "float"`)
- Applies to both `DialogProps` and `DialogShowOptions`

**Internal logic changes:**
- `local.float` → `local.mode === "float"`
- `local.fill` → `local.mode === "fill"`
- splitProps: remove `"float"`, `"fill"`, add `"mode"`

### 2. Item predicate functions — `is*` prefix unification

| Before | After |
|--------|-------|
| `itemEditable` | `isItemEditable` |
| `itemDeletable` | `isItemDeletable` |
| `itemDeleted` | `isItemDeleted` |
| `itemSelectable` | `isItemSelectable` |

(`isItemHidden` already has `is` prefix — no change)

**Affected types:**
- `CrudSheetProps` (types.ts)
- `DataSheetSelectionProps` (types.ts)

### 3. `touchMode` → `lazyValidation`

Simple prop rename across all form-control components.

**Affected components:** Invalid, TextInput, NumberInput, Textarea, DatePicker, DateTimePicker, TimePicker, Select, Combobox, ColorPicker, Checkbox, Radio, CheckboxGroup, RadioGroup, SelectionGroupBase, SelectableBase, FieldShell, DataSelectButton

### 4. `canDeactivate` → `beforeClose`

**Before:**
```typescript
canDeactivate?: () => boolean;
```

**After:**
```typescript
beforeClose?: () => boolean;
```

Applies to both `DialogShowOptions` and `DialogProps`.

### 5. `multiDisplayDirection` → `tagDirection`

**Before:**
```typescript
multiDisplayDirection?: "horizontal" | "vertical";
```

**After:**
```typescript
tagDirection?: "horizontal" | "vertical";
```

In Select component only. Type union unchanged.

## Scope

- `packages/solid/` — component source + tests
- `packages/solid-demo/` — demo pages
- `packages/sd-cli/templates/` — project templates

## Test Strategy

- Rename props in existing tests (no new tests needed)
- All existing tests must pass after rename
