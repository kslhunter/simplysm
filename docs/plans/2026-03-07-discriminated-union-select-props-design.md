# Discriminated Union for Select-like Component Props

## Goal

Apply discriminated union pattern to `DataSelectButton`, `SharedDataSelect`, and `SharedDataSelectButton` props, separating single/multiple mode types for external API type-safety.

`Select` component already uses this pattern (`SelectSingleBaseProps` / `SelectMultipleBaseProps`). This design extends the same approach to the remaining select-like components.

## Current State

```typescript
// DataSelectButton (current - union pattern)
value?: TKey | TKey[];
onValueChange?: (value: TKey | TKey[] | undefined) => void;
multiple?: boolean;
```

## Target State

```typescript
// Single mode
{ multiple?: false; value?: TKey; onValueChange?: (v: TKey | undefined) => void }
// Multiple mode
{ multiple: true; value?: TKey[]; onValueChange?: (v: TKey[]) => void }
```

## Design Decisions

1. **Each component defines its own discriminated union** — no shared helper type across components. Keeps each component self-contained and readable.
2. **Internal logic unchanged** — `splitProps` doesn't support discriminant narrowing in SolidJS, so internal code retains existing `as` casts (same as Select.tsx:410). Only the external props API becomes type-safe.
3. **Select pattern mirroring** — follow the exact structure from Select.tsx:275-330: `CommonProps` + `SingleProps extends Common` + `MultipleProps extends Common` + union type.

## Changes Per Component

### 1. DataSelectButton (`DataSelectButton.tsx`)

**Before:**
```typescript
export type DataSelectButtonProps<TItem, TKey, TDialogProps> = {
  value?: TKey | TKey[];
  onValueChange?: (value: TKey | TKey[] | undefined) => void;
  multiple?: boolean;
  // ...common props
} & DialogPropsField<TDialogProps, TKey>;
```

**After:**
```typescript
interface DataSelectButtonCommonProps<TItem, TKey, TDialogProps> {
  load: (keys: TKey[]) => TItem[] | Promise<TItem[]>;
  renderItem: (item: TItem) => JSX.Element;
  dialog: Component<TDialogProps>;
  dialogOptions?: DialogShowOptions;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  validate?: (value: unknown) => string | undefined;
  lazyValidation?: boolean;
}

interface DataSelectButtonSingleProps<TItem, TKey, TDialogProps>
  extends DataSelectButtonCommonProps<TItem, TKey, TDialogProps> {
  multiple?: false;
  value?: TKey;
  onValueChange?: (value: TKey | undefined) => void;
}

interface DataSelectButtonMultipleProps<TItem, TKey, TDialogProps>
  extends DataSelectButtonCommonProps<TItem, TKey, TDialogProps> {
  multiple: true;
  value?: TKey[];
  onValueChange?: (value: TKey[]) => void;
}

export type DataSelectButtonProps<TItem, TKey, TDialogProps> =
  | (DataSelectButtonSingleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps, TKey>)
  | (DataSelectButtonMultipleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps, TKey>);
```

Internal logic: no changes needed. `splitProps` + existing casts remain.

### 2. SharedDataSelect (`SharedDataSelect.tsx`)

Same pattern. Replace:
```typescript
value?: TKey | TKey[];
onValueChange?: (value: TKey | TKey[] | undefined) => void;
multiple?: boolean;
```
With discriminated union: `SharedDataSelectSingleProps` / `SharedDataSelectMultipleProps`.

### 3. SharedDataSelectButton (`SharedDataSelectButton.tsx`)

Replace `DataSelectButtonProps<TItem>["value"]` index access with its own discriminated union props. Same Single/Multiple pattern.

### 4. Internal Logic (all 3 components)

No changes. Continue using `local.multiple` runtime checks with existing `as` casts, identical to Select.tsx pattern.

### 5. Tests

Existing tests already separate single/multiple usage patterns. Type changes should not require test logic changes — only type annotations if any are explicit.

## Scope

### In scope
- Props type definitions for DataSelectButton, SharedDataSelect, SharedDataSelectButton
- Export type updates in index.ts if needed

### Out of scope
- Select component (already done)
- SharedDataSelectList (single-only, no multiple mode)
- Internal logic refactoring
- Runtime behavior changes

## Impact

- **External packages using these components**: Breaking change for consumers who rely on `value?: TKey | TKey[]` union type. However, no external consumers found in monorepo.
- **sd-cli templates**: Only uses SharedDataSelectList — not affected.
