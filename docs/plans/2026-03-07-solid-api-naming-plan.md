# Solid API Naming Standardization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Rename 5 groups of public API identifiers in `@simplysm/solid` to align with industry conventions and internal naming rules.

**Architecture:** Pure mechanical find-replace across types, props, interfaces, function names, file names, and their consumers. No logic changes. TypeScript compiler validates completeness.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, pnpm

---

### Task 1: ComponentSize `"default"` → `"md"` — type + style records

**Files:**
- Modify: `packages/solid/src/styles/control.styles.ts:9-25`

**Step 1: Rename type and record keys**

In `packages/solid/src/styles/control.styles.ts`, change:

```ts
// Line 9: type
export type ComponentSize = "default" | "xs" | "sm" | "lg" | "xl";
// →
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";

// Line 12: pad record key
  default: clsx`px-2 py-1`,
// →
  md: clsx`px-2 py-1`,

// Line 20: gap record key
  default: clsx`gap-1`,
// →
  md: clsx`gap-1`,
```

**Step 2: Commit**

```bash
git add packages/solid/src/styles/control.styles.ts
git commit -m "refactor(solid): rename ComponentSize 'default' to 'md' in type and base records"
```

---

### Task 2: ComponentSize `"default"` → `"md"` — style files

**Files:**
- Modify: `packages/solid/src/components/form-control/checkbox/Checkbox.styles.ts` (lines 34, 52)
- Modify: `packages/solid/src/components/form-control/field/Field.styles.ts` (lines 27, 45, 60, 78)
- Modify: `packages/solid/src/components/form-control/DropdownTrigger.styles.ts` (line 32)
- Modify: `packages/solid/src/components/data/list/ListItem.styles.ts` (line 21)

All changes are renaming `default:` → `md:` in size class records, and `pad.default`/`gap.default` → `pad.md`/`gap.md`.

**Step 1: Rename all `default:` keys and `pad.default`/`gap.default` references in each file**

`Checkbox.styles.ts`:
```ts
// Line 34: default: clsx("h-field", pad.default),  →  md: clsx("h-field", pad.md),
// Line 52: default: clsx`h-field-inset`,  →  md: clsx`h-field-inset`,
```

`Field.styles.ts`:
```ts
// Line 27: default: clsx("h-field", pad.default),  →  md: clsx("h-field", pad.md),
// Line 45: default: clsx`h-field-inset`,  →  md: clsx`h-field-inset`,
// Line 60: default: pad.default,  →  md: pad.md,
// Line 78: default: gap.default,  →  md: gap.md,
```

`DropdownTrigger.styles.ts`:
```ts
// Line 32: default: clsx(gap.default, pad.default),  →  md: clsx(gap.md, pad.md),
```

`ListItem.styles.ts`:
```ts
// Line 21: default: pad.default,  →  md: pad.md,
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/form-control/checkbox/Checkbox.styles.ts \
       packages/solid/src/components/form-control/field/Field.styles.ts \
       packages/solid/src/components/form-control/DropdownTrigger.styles.ts \
       packages/solid/src/components/data/list/ListItem.styles.ts
git commit -m "refactor(solid): rename 'default' to 'md' in style record keys"
```

---

### Task 3: ComponentSize `"default"` → `"md"` — component files (fallbacks + records)

**Files:**
- Modify: `packages/solid/src/components/form-control/Button.tsx` (line 27 record, line 60 fallback)
- Modify: `packages/solid/src/components/form-control/ThemeToggle.tsx` (lines 11, 19 records; lines 66, 68 fallbacks)
- Modify: `packages/solid/src/components/form-control/color-picker/ColorPicker.tsx` (line 11 record, line 91 fallback)
- Modify: `packages/solid/src/components/form-control/editor/RichTextEditor.tsx` (line 53 record, line 157 fallback)
- Modify: `packages/solid/src/components/form-control/state-preset/StatePreset.tsx` (lines 37, 45, 53, 61 records; lines 198, 202, 207, 212 fallbacks)
- Modify: `packages/solid/src/components/form-control/checkbox/SelectableBase.tsx` (lines 82, 84 fallbacks)
- Modify: `packages/solid/src/components/disclosure/Tabs.tsx` (line 35 record, line 42 fallback)
- Modify: `packages/solid/src/components/feedback/Progress.tsx` (line 19 record, line 34 fallback)
- Modify: `packages/solid/src/components/data/Pagination.tsx` (line 25 record, line 57 fallback)
- Modify: `packages/solid/src/components/data/list/ListItem.tsx` (line 145 fallback)
- Modify: `packages/solid/src/components/form-control/DropdownTrigger.styles.ts` (line 50 fallback — in `getDropdownTriggerClass` function)
- Modify: `packages/solid/src/components/form-control/field/Field.styles.ts` (lines 96, 99, 113 fallbacks — in `getFieldClass`/`getTextAreaClass` functions)
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx` (line 283 fallback)
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx` (line 168 fallback)
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx` (line 227 fallback)
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx` (line 135 fallback)

All changes: `"default"` → `"md"` in record keys and `?? "default"` → `?? "md"` in fallbacks, `pad.default` → `pad.md`, `gap.default` → `gap.md`.

**Step 1: Apply all renames**

For every file listed, replace:
- Record keys: `default:` → `md:` (only in ComponentSize records, NOT switch/case defaults)
- Fallback: `?? "default"` → `?? "md"`
- References: `pad.default` → `pad.md`, `gap.default` → `gap.md`

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor(solid): rename all ComponentSize 'default' fallbacks and records to 'md'"
```

---

### Task 4: Checkbox/Radio `value` → `checked`

**Files:**
- Modify: `packages/solid/src/components/form-control/checkbox/SelectableBase.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/Checkbox.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/Radio.tsx`

**Step 1: Rename in SelectableBase.tsx**

```ts
// Interface SelectableBaseProps (lines 21-34):
value?: boolean;                              → checked?: boolean;
onValueChange?: (value: boolean) => void;     → onCheckedChange?: (checked: boolean) => void;
validate?: (value: boolean) => string | ...   → validate?: (checked: boolean) => string | ...

// splitProps key list (lines 44-58):
"value",          → "checked",
"onValueChange",  → "onCheckedChange",

// createControllableSignal (lines 62-65):
const [value, setValue] = ...    → const [checked, setChecked] = ...
value: () => local.value ?? false,  → value: () => local.checked ?? false,
onChange: () => local.onValueChange, → onChange: () => local.onCheckedChange,

// handleClick (line 69):
setValue((v) => ...)  → setChecked((v) => ...)

// errorMsg (lines 93-97):
const v = local.value ?? false;  → const v = local.checked ?? false;
local.validate?.(v)              (no change — param name `v` stays)

// JSX (lines 105, 113):
aria-checked={value()}  → aria-checked={checked()}
<Show when={value()}>   → <Show when={checked()}>
```

**Step 2: Rename in Checkbox.tsx**

```ts
// Interface CheckboxProps (lines 7-20):
value?: boolean;                              → checked?: boolean;
onValueChange?: (value: boolean) => void;     → onCheckedChange?: (checked: boolean) => void;
validate?: (value: boolean) => string | ...   → validate?: (checked: boolean) => string | ...
```

**Step 3: Rename in Radio.tsx**

```ts
// Interface RadioProps (lines 5-18):
value?: boolean;                              → checked?: boolean;
onValueChange?: (value: boolean) => void;     → onCheckedChange?: (checked: boolean) => void;
validate?: (value: boolean) => string | ...   → validate?: (checked: boolean) => string | ...
```

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/checkbox/SelectableBase.tsx \
       packages/solid/src/components/form-control/checkbox/Checkbox.tsx \
       packages/solid/src/components/form-control/checkbox/Radio.tsx
git commit -m "refactor(solid): rename Checkbox/Radio value/onValueChange to checked/onCheckedChange"
```

---

### Task 5: DataSheet hooks `useDataSheet*` → `createDataSheet*` — file renames + identifier renames

**Files (rename + modify):**

| Old file | New file |
|---|---|
| `packages/solid/src/components/data/sheet/hooks/useDataSheetExpansion.ts` | `createDataSheetExpansion.ts` |
| `packages/solid/src/components/data/sheet/hooks/useDataSheetFixedColumns.ts` | `createDataSheetFixedColumns.ts` |
| `packages/solid/src/components/data/sheet/hooks/useDataSheetHeaderCell.tsx` | `createDataSheetHeaderCell.tsx` |
| `packages/solid/src/components/data/sheet/hooks/useDataSheetPaging.ts` | `createDataSheetPaging.ts` |
| `packages/solid/src/components/data/sheet/hooks/useDataSheetReorder.ts` | `createDataSheetReorder.ts` |
| `packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts` | `createDataSheetSelection.ts` |
| `packages/solid/src/components/data/sheet/hooks/useDataSheetSorting.ts` | `createDataSheetSorting.ts` |

**Modify:**
- `packages/solid/src/components/data/sheet/DataSheet.tsx` (lines 72-78 imports, call sites)

**Identifier renames per file:**

| Old | New |
|---|---|
| `useDataSheetExpansion` | `createDataSheetExpansion` |
| `UseDataSheetExpansionProps` | `CreateDataSheetExpansionProps` |
| `UseDataSheetExpansionReturn` | `CreateDataSheetExpansionReturn` |
| `useDataSheetFixedColumns` | `createDataSheetFixedColumns` |
| `UseDataSheetFixedColumnsProps` | `CreateDataSheetFixedColumnsProps` |
| `useDataSheetPaging` | `createDataSheetPaging` |
| `UseDataSheetPagingOptions` | `CreateDataSheetPagingOptions` |
| `UseDataSheetPagingReturn` | `CreateDataSheetPagingReturn` |
| `useDataSheetReorder` | `createDataSheetReorder` |
| `UseDataSheetReorderProps` | `CreateDataSheetReorderProps` |
| `useDataSheetSelection` | `createDataSheetSelection` |
| `UseDataSheetSelectionProps` | `CreateDataSheetSelectionProps` |
| `UseDataSheetSelectionReturn` | `CreateDataSheetSelectionReturn` |
| `useDataSheetSorting` | `createDataSheetSorting` |
| `UseDataSheetSortingOptions` | `CreateDataSheetSortingOptions` |
| `UseDataSheetSortingReturn` | `CreateDataSheetSortingReturn` |
| `useDataSheetHeaderCell` | `createDataSheetHeaderCell` |
| `UseDataSheetHeaderCellProps` | `CreateDataSheetHeaderCellProps` |

**Step 1: Rename files with `git mv`**

```bash
cd packages/solid/src/components/data/sheet/hooks
git mv useDataSheetExpansion.ts createDataSheetExpansion.ts
git mv useDataSheetFixedColumns.ts createDataSheetFixedColumns.ts
git mv useDataSheetHeaderCell.tsx createDataSheetHeaderCell.tsx
git mv useDataSheetPaging.ts createDataSheetPaging.ts
git mv useDataSheetReorder.ts createDataSheetReorder.ts
git mv useDataSheetSelection.ts createDataSheetSelection.ts
git mv useDataSheetSorting.ts createDataSheetSorting.ts
```

**Step 2: Rename identifiers inside each hook file**

For each file, replace all `UseDataSheet` → `CreateDataSheet` and `useDataSheet` → `createDataSheet` prefixes.

**Step 3: Update imports and call sites in DataSheet.tsx**

```ts
// Lines 72-78: update import paths + imported names
import { createDataSheetSorting } from "./hooks/createDataSheetSorting";
import { createDataSheetPaging } from "./hooks/createDataSheetPaging";
import { createDataSheetExpansion } from "./hooks/createDataSheetExpansion";
import { createDataSheetSelection } from "./hooks/createDataSheetSelection";
import { createDataSheetReorder } from "./hooks/createDataSheetReorder";
import { createDataSheetFixedColumns } from "./hooks/createDataSheetFixedColumns";
import { createDataSheetHeaderCell } from "./hooks/createDataSheetHeaderCell";
```

Also update all 7 call sites from `useDataSheet*` → `createDataSheet*`.

**Step 4: Update test files**

Test files to rename + update identifiers:
- `packages/solid/tests/components/data/sheet/hooks/useDataSheetExpansion.spec.ts` → `createDataSheetExpansion.spec.ts`
- `packages/solid/tests/components/data/sheet/hooks/useDataSheetFixedColumns.spec.ts` → `createDataSheetFixedColumns.spec.ts`
- `packages/solid/tests/components/data/sheet/hooks/useDataSheetPaging.spec.ts` → `createDataSheetPaging.spec.ts`
- `packages/solid/tests/components/data/sheet/hooks/useDataSheetReorder.spec.ts` → `createDataSheetReorder.spec.ts`
- `packages/solid/tests/components/data/sheet/hooks/useDataSheetSelection.spec.ts` → `createDataSheetSelection.spec.ts`
- `packages/solid/tests/components/data/sheet/hooks/useDataSheetSorting.spec.ts` → `createDataSheetSorting.spec.ts`

Each test file: update import path, describe name, and all call sites.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(solid): rename useDataSheet* hooks to createDataSheet*"
```

---

### Task 6: Numpad `useEnterButton`/`useMinusButton` → `withEnterButton`/`withMinusButton`

**Files:**
- Modify: `packages/solid/src/components/form-control/numpad/Numpad.tsx`

**Step 1: Rename props and internal references**

```ts
// Interface NumpadProps (lines 24-26):
useEnterButton?: boolean;   → withEnterButton?: boolean;
useMinusButton?: boolean;   → withMinusButton?: boolean;

// JSDoc (lines 23, 25):
/** Show Enter button */    (no change)
/** Show minus button */    (no change)

// Internal usage (lines 135, 146, 160, 169):
props.useEnterButton  → props.withEnterButton
props.useMinusButton  → props.withMinusButton
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/form-control/numpad/Numpad.tsx
git commit -m "refactor(solid): rename Numpad useEnterButton/useMinusButton to withEnterButton/withMinusButton"
```

---

### Task 7: Dialog `closable` → `withCloseButton`

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx`

**Step 1: Rename in interfaces and internal usage**

```ts
// DialogShowOptions (line 49):
closable?: boolean;   → withCloseButton?: boolean;

// DialogProps (line 115):
closable?: boolean;   → withCloseButton?: boolean;
// JSDoc (line 114): "Show close button (default: true)" → stays the same

// splitProps key list (line 213):
"closable",   → "withCloseButton",

// JSX usage (line 578):
local.closable ?? true   → local.withCloseButton ?? true

// DialogProvider usage (line 729):
closable={entry.options.closable}   → withCloseButton={entry.options.withCloseButton}
```

**Step 2: Update Dialog test files if they reference `closable`**

Check `packages/solid/tests/components/disclosure/Dialog.spec.tsx` and `DialogProvider.spec.tsx` for `closable` references and update.

**Step 3: Commit**

```bash
git add packages/solid/src/components/disclosure/Dialog.tsx \
       packages/solid/tests/components/disclosure/Dialog.spec.tsx \
       packages/solid/tests/components/disclosure/DialogProvider.spec.tsx
git commit -m "refactor(solid): rename Dialog closable to withCloseButton"
```

---

### Task 8: Verification

**Step 1: Typecheck**

```bash
pnpm typecheck packages/solid
```

Expected: 0 errors

**Step 2: Run all solid tests**

```bash
pnpm vitest packages/solid/tests --project=solid --run
```

Expected: all pass

**Step 3: Grep for remnants of old names**

```bash
grep -rn '"default"' packages/solid/src/ --include="*.ts" --include="*.tsx" | grep -v ServiceClient | grep -v SharedData | grep -v 'default:' | grep -v JSDoc
grep -rn 'useDataSheet' packages/solid/src/ --include="*.ts" --include="*.tsx"
grep -rn 'useEnterButton\|useMinusButton' packages/solid/src/ --include="*.tsx"
grep -rn 'closable' packages/solid/src/ --include="*.tsx"
```

Expected: no matches (except ServiceClientProvider/SharedDataProvider which use `"default"` for connection keys — NOT ComponentSize).

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(solid): fix remaining old name references"
```
