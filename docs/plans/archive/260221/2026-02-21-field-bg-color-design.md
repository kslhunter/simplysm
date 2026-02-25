# Field Background Color Design

## Goal

Change the background of directly-editable controls (keyboard input) from `bg-white dark:bg-base-900` (same as page background) to `bg-primary-50 dark:bg-primary-950/30` so that editable areas are visually distinguishable from the surrounding background.

## Target Components

| Component | Current Background | Change |
|-----------|-------------------|--------|
| TextInput | `bgSurface` via `fieldSurface` | Yes |
| NumberInput | `bgSurface` via `fieldSurface` | Yes |
| Textarea | `bgSurface` via `fieldSurface` | Yes |
| DatePicker | `bgSurface` via `fieldSurface` | Yes |
| TimePicker | `bgSurface` via `fieldSurface` | Yes |
| DateTimePicker | `bgSurface` via `fieldSurface` | Yes |
| RichTextEditor | `bg-white dark:bg-base-900` (hardcoded) | Yes |
| Combobox | `bg-transparent` (shared trigger) | Yes |
| Select | `bg-transparent` (shared trigger) | **No** |
| Checkbox/Radio | `bgSurface` direct | **No** |

## Changes (3 files)

### 1. `packages/solid/src/styles/patterns.styles.ts`

Replace `bgSurface` with `"bg-primary-50 dark:bg-primary-950/30"` in `fieldSurface`:

```typescript
export const fieldSurface = clsx(
  "bg-primary-50 dark:bg-primary-950/30",  // was: bgSurface
  textDefault,
  "border",
  borderDefault,
  "rounded",
  "focus-within:border-primary-500 dark:focus-within:border-primary-400",
);
```

This single change covers all field components (TextInput, NumberInput, Textarea, DatePicker, TimePicker, DateTimePicker).

### 2. `packages/solid/src/components/form-control/editor/RichTextEditor.tsx`

Change hardcoded bg in `editorWrapperClass`:

```typescript
const editorWrapperClass = clsx(
  "flex flex-col",
  "bg-primary-50 dark:bg-primary-950/30",  // was: "bg-white dark:bg-base-900"
  ...
);
```

### 3. `packages/solid/src/components/form-control/combobox/Combobox.tsx`

Add bg override via `getTriggerClass()` class parameter (only when not inset):

```typescript
const triggerCls = getTriggerClass({
  ...options,
  class: clsx(
    !props.inset && "bg-primary-50 dark:bg-primary-950/30",
    props.class,
  ),
});
```

## What stays the same

- **Borders**: All border styling unchanged (base-300)
- **Select**: bg-transparent (not directly editable)
- **Checkbox/Radio**: bgSurface (not keyboard-editable)
- **Inset mode**: Already uses bg-primary-50 (no change needed)
- **Disabled state**: bg-base-100 unchanged
- **Focus behavior**: border-primary-500 focus unchanged

## Visual Result

```
┌────────────────────────────────────────┐
│  Page background (bg-white)            │
│                                        │
│   ┌────────────────────────────┐       │
│   │ Input (bg-primary-50)      │       │
│   │   border: base-300         │       │
│   └────────────────────────────┘       │
│                                        │
└────────────────────────────────────────┘
```
