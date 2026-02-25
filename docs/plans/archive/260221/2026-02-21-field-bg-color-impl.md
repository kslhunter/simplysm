# Field Background Color Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Change the background of directly-editable controls from page-same `bg-white` to `bg-primary-50 dark:bg-primary-950/30` for visual distinction.

**Architecture:** Pure styling change across 3 files. `fieldSurface` pattern covers 6 field components at once; RichTextEditor and Combobox need individual updates.

**Tech Stack:** Tailwind CSS, clsx, tailwind-merge

---

### Task 1: Update fieldSurface pattern background

**Files:**
- Modify: `packages/solid/src/styles/patterns.styles.ts:34-41`

**Step 1: Change `fieldSurface` to use `bg-primary-50` instead of `bgSurface`**

In `packages/solid/src/styles/patterns.styles.ts`, replace:

```typescript
export const fieldSurface = clsx(
  bgSurface,
  textDefault,
  "border",
  borderDefault,
  "rounded",
  "focus-within:border-primary-500 dark:focus-within:border-primary-400",
);
```

With:

```typescript
export const fieldSurface = clsx(
  "bg-primary-50 dark:bg-primary-950/30",
  textDefault,
  "border",
  borderDefault,
  "rounded",
  "focus-within:border-primary-500 dark:focus-within:border-primary-400",
);
```

**Step 2: Clean up unused import**

`bgSurface` is no longer used in this file. Remove it from the import:

```typescript
// Before
import { bgSurface, borderDefault, textDefault, textPlaceholder } from "./tokens.styles";

// After
import { borderDefault, textDefault, textPlaceholder } from "./tokens.styles";
```

**Step 3: Typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS (no type errors, since this is a string value swap)

**Covers:** TextInput, NumberInput, Textarea, DatePicker, TimePicker, DateTimePicker (all use `fieldSurface` via `Field.styles.ts`)

---

### Task 2: Update RichTextEditor wrapper background

**Files:**
- Modify: `packages/solid/src/components/form-control/editor/RichTextEditor.tsx:50-57`

**Step 1: Change hardcoded bg in `editorWrapperClass`**

In `packages/solid/src/components/form-control/editor/RichTextEditor.tsx`, replace:

```typescript
const editorWrapperClass = clsx(
  "flex flex-col",
  "bg-white dark:bg-base-900",
  "text-base-900 dark:text-base-100",
  "border border-base-300 dark:border-base-700",
  "rounded",
  "focus-within:border-primary-500",
);
```

With:

```typescript
const editorWrapperClass = clsx(
  "flex flex-col",
  "bg-primary-50 dark:bg-primary-950/30",
  "text-base-900 dark:text-base-100",
  "border border-base-300 dark:border-base-700",
  "rounded",
  "focus-within:border-primary-500",
);
```

---

### Task 3: Update Combobox trigger background

**Files:**
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx:275-281`

**Step 1: Add bg override to `getTriggerClassName`**

The Combobox shares `DropdownTrigger.styles.ts` with Select. To change only Combobox, override via the `class` parameter. The `clsx` import already exists in this file.

In `packages/solid/src/components/form-control/combobox/Combobox.tsx`, replace:

```typescript
  const getTriggerClassName = () =>
    getTriggerClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      class: local.class,
    });
```

With:

```typescript
  const getTriggerClassName = () =>
    getTriggerClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      class: clsx(
        !local.inset && "bg-primary-50 dark:bg-primary-950/30",
        local.class,
      ),
    });
```

**Step 2: Typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

---

### Task 4: Visual verification

**Step 1: Start dev server**

Run: `pnpm dev`

**Step 2: Verify in browser**

Check the following on the demo page:
- TextInput: bg-primary-50 background with border (standalone mode)
- TextInput inset: same bg-primary-50 background without border (unchanged)
- NumberInput: bg-primary-50 background
- Textarea: bg-primary-50 background
- DatePicker/TimePicker: bg-primary-50 background
- Combobox: bg-primary-50 background
- Select: bg-transparent (unchanged, no background tint)
- Checkbox/Radio: unchanged
- Dark mode: all above with dark:bg-primary-950/30
- Disabled state: bg-base-100 (unchanged)
