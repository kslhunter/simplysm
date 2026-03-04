# ComponentSize Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Unify all component size patterns to use `sizeClasses[size ?? "default"]` instead of `size && sizeClasses[size]` with hardcoded default padding in base classes.

**Architecture:** Move size-related classes (padding, height, min-w) from base classes into size Records with a `default` entry. Change all conditional `&&` patterns to always-apply with `?? "default"` fallback. Simplify redundant `"default" | ComponentSize` union types.

**Tech Stack:** TypeScript, SolidJS, Tailwind CSS (clsx, tailwind-merge)

---

### Task 1: Style files — base class cleanup + Record default

**Files:**
- Modify: `packages/solid/src/components/form-control/checkbox/Checkbox.styles.ts`
- Modify: `packages/solid/src/components/form-control/field/Field.styles.ts`
- Modify: `packages/solid/src/components/form-control/DropdownTrigger.styles.ts`
- Modify: `packages/solid/src/components/data/list/ListItem.styles.ts`

**Step 1: Modify Checkbox.styles.ts**

Remove `padding.default` and `"h-field"` from `checkboxBaseClass`. Add `default` to `checkboxSizeClasses` and `checkboxInsetSizeHeightClasses`:

```typescript
// checkboxBaseClass — REMOVE padding.default and "h-field":
export const checkboxBaseClass = clsx(
  "inline-flex items-center gap-2",
  "whitespace-nowrap",
  "cursor-pointer",
  // padding.default REMOVED
  // "h-field" REMOVED
  "border border-transparent",
  "rounded",
  "focus:outline-none",
  "focus-visible:ring-2",
);

// checkboxSizeClasses — ADD default:
export const checkboxSizeClasses: Record<CheckboxSize, string> = {
  default: clsx("h-field", padding.default),
  xs: clsx("h-field-xs", padding.xs),
  sm: clsx("h-field-sm", padding.sm),
  lg: clsx("h-field-lg", padding.lg),
  xl: clsx("h-field-xl", padding.xl),
};

// checkboxInsetSizeHeightClasses — ADD default:
export const checkboxInsetSizeHeightClasses: Record<CheckboxSize, string> = {
  default: clsx`h-field-inset`,
  xs: clsx`h-field-inset-xs`,
  sm: clsx`h-field-inset-sm`,
  lg: clsx`h-field-inset-lg`,
  xl: clsx`h-field-inset-xl`,
};
```

**Step 2: Modify Field.styles.ts**

Remove `padding.default` and `"h-field"` from `fieldBaseClass`. Remove `padding.default` from `textAreaBaseClass`. Add `default` to `fieldSizeClasses`, `fieldInsetSizeHeightClasses`, `textAreaSizeClasses`. Simplify `fieldGapClasses` type. Remove `fieldInsetHeightClass` (merged into Record):

```typescript
// fieldBaseClass — REMOVE padding.default and "h-field":
export const fieldBaseClass = clsx(
  "inline-flex items-center",
  fieldSurface,
  // padding.default REMOVED
  // "h-field" REMOVED
  "[text-decoration:inherit]",
);

// fieldSizeClasses — ADD default:
export const fieldSizeClasses: Record<FieldSize, string> = {
  default: clsx("h-field", padding.default),
  xs: clsx("h-field-xs", padding.xs),
  sm: clsx("h-field-sm", padding.sm),
  lg: clsx("h-field-lg", padding.lg),
  xl: clsx("h-field-xl", padding.xl),
};

// fieldInsetHeightClass — REMOVE (merged into Record)
// export const fieldInsetHeightClass = clsx`h-field-inset`;  // DELETE

// fieldInsetSizeHeightClasses — ADD default:
export const fieldInsetSizeHeightClasses: Record<FieldSize, string> = {
  default: clsx`h-field-inset`,
  xs: clsx`h-field-inset-xs`,
  sm: clsx`h-field-inset-sm`,
  lg: clsx`h-field-inset-lg`,
  xl: clsx`h-field-inset-xl`,
};

// textAreaBaseClass — REMOVE padding.default:
export const textAreaBaseClass = clsx("inline-block w-48", fieldSurface);
// NOTE: padding.default removed — comes from textAreaSizeClasses

// textAreaSizeClasses — ADD default:
export const textAreaSizeClasses: Record<FieldSize, string> = {
  default: padding.default,
  xs: padding.xs,
  sm: padding.sm,
  lg: padding.lg,
  xl: padding.xl,
};

// fieldGapClasses — SIMPLIFY type (remove redundant "default" union):
export const fieldGapClasses: Record<FieldSize, string> = {
  default: gap.default,
  xs: gap.xs,
  sm: gap.sm,
  lg: gap.lg,
  xl: gap.xl,
};

// getFieldWrapperClass — change conditional to always-apply:
export function getFieldWrapperClass(options: { ... }): string {
  return twMerge(
    fieldBaseClass,
    options.extra,
    fieldSizeClasses[options.size ?? "default"],        // was: options.size && fieldSizeClasses[options.size]
    options.disabled && fieldDisabledClass,
    options.inset && fieldInsetClass,
    options.inset && fieldInsetSizeHeightClasses[options.size ?? "default"],  // was: options.inset && (options.size ? ... : fieldInsetHeightClass)
    options.includeCustomClass,
  );
}

// getTextareaWrapperClass — change conditional to always-apply:
export function getTextareaWrapperClass(options: { ... }): string {
  return twMerge(
    textAreaBaseClass,
    textAreaSizeClasses[options.size ?? "default"],  // was: options.size && textAreaSizeClasses[options.size]
    options.disabled && fieldDisabledClass,
    options.inset && fieldInsetClass,
    options.includeCustomClass,
  );
}
```

**Step 3: Modify DropdownTrigger.styles.ts**

Add `default` to `triggerSizeClasses`. In `getTriggerClass`, remove `padding.default` and change conditional to always-apply:

```typescript
// triggerSizeClasses — ADD default:
export const triggerSizeClasses: Record<ComponentSize, string> = {
  default: clsx(gap.default, padding.default),
  xs: clsx(gap.xs, padding.xs),
  sm: clsx(gap.sm, padding.sm),
  lg: clsx(gap.lg, padding.lg),
  xl: clsx(gap.xl, padding.xl),
};

// getTriggerClass — REMOVE padding.default, change conditional:
export function getTriggerClass(options: { ... }): string {
  return twMerge(
    triggerBaseClass,
    // padding.default REMOVED
    triggerSizeClasses[options.size ?? "default"],  // was: options.size && triggerSizeClasses[options.size]
    options.disabled && triggerDisabledClass,
    options.inset && triggerInsetClass,
    options.class,
  );
}
```

**Step 4: Modify ListItem.styles.ts**

Remove `"py-1"` and `"px-1.5"` from `listItemBaseClass`. Add `default` to `listItemSizeClasses`:

```typescript
// listItemBaseClass — REMOVE "py-1" and "px-1.5":
export const listItemBaseClass = clsx(
  "flex",
  "items-center",
  "gap-2",
  // "py-1" REMOVED
  // "px-1.5" REMOVED
  "m-px",
  "cursor-pointer",
  "rounded-md",
  "transition-colors",
  "focus:outline-none",
  "focus-visible:bg-base-200 dark:focus-visible:bg-base-700",
  "hover:bg-base-500/10 dark:hover:bg-base-700",
);

// listItemSizeClasses — ADD default:
export const listItemSizeClasses: Record<ComponentSize, string> = {
  default: padding.default,
  xs: padding.xs,
  sm: padding.sm,
  lg: padding.lg,
  xl: padding.xl,
};
```

**Step 5: Typecheck**

Run: `pnpm --filter @simplysm/solid exec tsc --noEmit`
Expected: May have errors in consumer files (to be fixed in later tasks)

---

### Task 2: Self-contained components — base class + Record + conditional

**Files:**
- Modify: `packages/solid/src/components/form-control/Button.tsx`
- Modify: `packages/solid/src/components/form-control/color-picker/ColorPicker.tsx`
- Modify: `packages/solid/src/components/form-control/editor/RichTextEditor.tsx`
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx`

**Step 1: Modify Button.tsx**

Remove `padding.default` and `"min-w-8"` from `baseClass`. Add `default` to `sizeClasses`. Change conditional:

```typescript
// baseClass — REMOVE padding.default and "min-w-8":
const baseClass = clsx(
  "inline-flex items-center",
  // padding.default REMOVED
  "font-bold",
  "justify-center",
  "text-center",
  "cursor-pointer",
  "transition",
  "rounded",
  "focus:outline-none",
  "focus-visible:ring-2",
  "border border-transparent",
  // "min-w-8" REMOVED
);

// sizeClasses — ADD default:
const sizeClasses: Record<ButtonSize, string> = {
  default: clsx("min-w-8", padding.default),
  xs: clsx("min-w-4", padding.xs),
  sm: clsx("min-w-6", padding.sm),
  lg: clsx("min-w-9", padding.lg),
  xl: clsx("min-w-10", padding.xl, "text-lg"),
};

// getClassName — change conditional:
// was: local.size && sizeClasses[local.size],
// now: sizeClasses[local.size ?? "default"],
```

**Step 2: Modify ColorPicker.tsx**

Add `default` to `sizeClasses`. Change conditional:

```typescript
// sizeClasses — ADD default:
const sizeClasses: Record<ComponentSize, string> = {
  default: clsx`size-field`,
  xs: "size-field-xs",
  sm: "size-field-sm",
  lg: "size-field-lg",
  xl: "size-field-xl",
};

// getClassName — change conditional:
// was: local.size && sizeClasses[local.size],
// now: sizeClasses[local.size ?? "default"],
```

**Step 3: Modify RichTextEditor.tsx**

Remove `padding.xl` from `editorContentClass`. Add `default` to `editorContentSizeClasses`. Change conditional:

```typescript
// editorContentClass — REMOVE padding.xl:
const editorContentClass = clsx(
  // padding.xl REMOVED
  // "min-h-32" REMOVED (moved to Record)
  "outline-none",
  "prose prose-sm max-w-none",
  "dark:prose-invert",
);

// editorContentSizeClasses — ADD default:
const editorContentSizeClasses: Record<FieldSize, string> = {
  default: clsx(padding.xl, "min-h-32"),
  xs: clsx(padding.xs, "min-h-12"),
  sm: clsx(padding.sm, "min-h-24"),
  lg: clsx(padding.lg, "min-h-48"),
  xl: clsx(padding.xl, "min-h-64"),
};

// getContentClassName — change conditional:
// was: local.size && editorContentSizeClasses[local.size]
// now: editorContentSizeClasses[local.size ?? "default"]
```

**Step 4: Modify DataSelectButton.tsx**

Change `getTriggerContainerClass` to match the new DropdownTrigger pattern:

```typescript
// getTriggerContainerClass — REMOVE padding.default, change conditional:
function getTriggerContainerClass(options: { ... }): string {
  return twMerge(
    triggerBaseClass,
    // padding.default REMOVED
    triggerSizeClasses[options.size ?? "default"],  // was: options.size && triggerSizeClasses[options.size]
    options.disabled && triggerDisabledClass,
    options.inset && triggerInsetClass,
    options.class,
  );
}
```

---

### Task 3: Component usage files — conditional change

**Files:**
- Modify: `packages/solid/src/components/form-control/checkbox/Checkbox.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/Radio.tsx`
- Modify: `packages/solid/src/components/data/list/ListItem.tsx`
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx`

**Step 1: Modify Checkbox.tsx**

Change size conditional patterns:

```typescript
// Line ~77: was: local.size && checkboxSizeClasses[local.size],
// now: checkboxSizeClasses[local.size ?? "default"],

// Line ~79: was: local.inset && local.size && checkboxInsetSizeHeightClasses[local.size],
// now: local.inset && checkboxInsetSizeHeightClasses[local.size ?? "default"],
```

**Step 2: Modify Radio.tsx**

Same changes as Checkbox.tsx:

```typescript
// Line ~78: was: local.size && checkboxSizeClasses[local.size],
// now: checkboxSizeClasses[local.size ?? "default"],

// Line ~80: was: local.inset && local.size && checkboxInsetSizeHeightClasses[local.size],
// now: local.inset && checkboxInsetSizeHeightClasses[local.size ?? "default"],
```

**Step 3: Modify ListItem.tsx**

```typescript
// Line ~156: was: local.size && listItemSizeClasses[local.size],
// now: listItemSizeClasses[local.size ?? "default"],
```

**Step 4: Modify Textarea.tsx**

Remove `padding.default` from `textareaBaseClass`. Change conditionals:

```typescript
// textareaBaseClass — REMOVE padding.default:
const textareaBaseClass = clsx(
  "absolute left-0 top-0",
  "size-full",
  "resize-none overflow-hidden",
  "bg-transparent",
  // padding.default REMOVED
  "placeholder:text-base-400 dark:placeholder:text-base-500",
);

// Line ~166: was: local.size && textAreaSizeClasses[local.size],
// now: textAreaSizeClasses[local.size ?? "default"],

// Line ~272: was: local.size && textAreaSizeClasses[local.size]
// now: textAreaSizeClasses[local.size ?? "default"]
```

---

### Task 4: StatePreset.tsx — ternary + default vars cleanup

**Files:**
- Modify: `packages/solid/src/components/form-control/state-preset/StatePreset.tsx`

**Step 1: Remove separate default variables, add default to Records**

```typescript
// REMOVE chipDefaultClass = "px-3 py-1";
// REMOVE iconBtnDefaultClass = "p-0.5";
// REMOVE starBtnDefaultClass = "p-1";
// REMOVE inputDefaultClass = "px-3 py-1 w-24";

// chipSizeClasses — ADD default:
const chipSizeClasses: Record<StatePresetSize, string> = {
  default: padding.default,
  xs: clsx(padding.xs, "text-sm"),
  sm: padding.sm,
  lg: padding.lg,
  xl: clsx(padding.xl, "text-lg"),
};

// iconBtnSizeClasses — ADD default:
const iconBtnSizeClasses: Record<StatePresetSize, string> = {
  default: "p-0.5",
  xs: "p-0",
  sm: "p-0.5",
  lg: "p-1",
  xl: "p-1.5",
};

// starBtnSizeClasses — ADD default:
const starBtnSizeClasses: Record<StatePresetSize, string> = {
  default: "p-1",
  xs: "p-0",
  sm: "p-0.5",
  lg: "p-1.5",
  xl: "p-2",
};

// inputSizeClasses — ADD default:
const inputSizeClasses: Record<StatePresetSize, string> = {
  default: clsx(padding.default, "w-24"),
  xs: clsx("w-16", padding.xs, "text-sm"),
  sm: clsx(padding.sm, "w-20"),
  lg: clsx(padding.lg, "w-32"),
  xl: clsx(padding.xl, "w-36 text-lg"),
};
```

**Step 2: Change ternary patterns in JSX**

```typescript
// Line ~236: was: local.size ? chipSizeClasses[local.size] : chipDefaultClass
// now: chipSizeClasses[local.size ?? "default"]

// Line ~239: was: local.size ? iconBtnSizeClasses[local.size] : iconBtnDefaultClass
// now: iconBtnSizeClasses[local.size ?? "default"]

// Line ~242: was: local.size ? starBtnSizeClasses[local.size] : starBtnDefaultClass
// now: starBtnSizeClasses[local.size ?? "default"]

// Line ~245: was: local.size ? inputSizeClasses[local.size] : inputDefaultClass
// now: inputSizeClasses[local.size ?? "default"]
```

---

### Task 5: ThemeToggle.tsx — type unification

**Files:**
- Modify: `packages/solid/src/components/form-control/ThemeToggle.tsx`

**Step 1: Replace custom size type with ComponentSize, expand Records**

```typescript
// Import padding from control.styles
import { type ComponentSize, padding } from "../../styles/control.styles";

// Replace "sm" | "lg" Records with ComponentSize Records:
const sizeClasses: Record<ComponentSize, string> = {
  default: "p-1.5",
  xs: "p-0.5",
  sm: "p-1",
  lg: "p-2",
  xl: "p-2.5",
};

const iconSizes: Record<ComponentSize, string> = {
  default: "1.25em",
  xs: "0.75em",
  sm: "1em",
  lg: "1.5em",
  xl: "2em",
};

// Props: change size type
size?: ComponentSize;  // was: "sm" | "lg"

// Usage — change conditional:
// was: local.size && sizeClasses[local.size],
// now: sizeClasses[local.size ?? "default"],

// was: const iconSize = () => (local.size ? iconSizes[local.size] : "1.25em");
// now: const iconSize = () => iconSizes[local.size ?? "default"];
```

---

### Task 6: Tabs.tsx — switch/case → Record pattern

**Files:**
- Modify: `packages/solid/src/components/disclosure/Tabs.tsx`

**Step 1: Replace switch/case with Record**

```typescript
// Import padding from control.styles
import { type ComponentSize, padding } from "../../styles/control.styles";

// Replace switch/case (lines ~32-41) with Record:
const tabSizeClasses: Record<ComponentSize, string> = {
  default: "px-3 py-1.5 text-sm",
  xs: "px-1.5 py-0.5 text-xs",
  sm: "px-2.5 py-1 text-sm",
  lg: "px-4 py-2.5 text-base",
  xl: "px-5 py-3 text-lg",
};

// Usage — change from switch to Record lookup:
// was: switch(ctx.size()) { case "sm": ...; default: ...; }
// now: tabSizeClasses[ctx.size() ?? "default"]
```

---

### Task 7: Type simplification

**Files:**
- Modify: `packages/solid/src/components/feedback/Progress.tsx`
- Modify: `packages/solid/src/components/data/Pagination.tsx`

**Step 1: Simplify Progress.tsx**

```typescript
// was: Record<"default" | ComponentSize, string>
// now: Record<ComponentSize, string>
const sizeClasses: Record<ComponentSize, string> = { ... };
```

**Step 2: Simplify Pagination.tsx**

```typescript
// was: Record<ComponentSize | "default", string>
// now: Record<ComponentSize, string>
const gapClasses: Record<ComponentSize, string> = { ... };
```

Note: Field.styles.ts fieldGapClasses type was already simplified in Task 1.

---

### Task 8: Final typecheck verification

**Step 1: Run typecheck**

Run: `pnpm --filter @simplysm/solid exec tsc --noEmit`
Expected: PASS (0 errors)

**Step 2: Fix any remaining errors**

If errors remain, fix them following the same pattern (add `default` entries, change conditionals).
