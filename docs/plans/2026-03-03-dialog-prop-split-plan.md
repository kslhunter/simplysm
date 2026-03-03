# Dialog Prop Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Replace `DialogConfig` object prop with split props (`dialog`, `dialogProps`, `dialogOptions`) on DataSelectButton, SharedDataSelect, and SharedDataSelectButton, with conditional dialogProps optionality and removal of `InjectedSelectProps`/`onSelect` bridge.

**Architecture:** Replace the types (`DialogConfig` → `SelectDialogBaseProps` + `DialogPropsField`), update the 3 component props interfaces to use split props with a generic `TDialogProps`, simplify `handleOpenDialog` to call `dialog.show()` directly without inline component, and update tests to use the new API.

**Tech Stack:** SolidJS, TypeScript (conditional types, multi-generic inference)

---

### Task 1: Replace types in DataSelectButton.tsx

**Files:**
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx:18,29-83,114-130,189-216`

**Step 1: Replace type definitions**

Replace lines 34-52 (`InjectedSelectProps` and `DialogConfig`) with:

```typescript
/** Base props for select dialog components (injected by DataSelectButton/SharedDataSelect + DialogProvider) */
export interface SelectDialogBaseProps<TKey = string | number> {
  close?: (result?: DataSelectDialogResult<TKey>) => void;
  selectMode: "single" | "multiple";
  selectedKeys: TKey[];
}

/** Extract user-specific props from dialog component (exclude injected base props) */
type UserDialogProps<P, TKey = string | number> = Omit<P, keyof SelectDialogBaseProps<TKey>>;

/** dialogProps: required when user props have required keys, optional otherwise */
type DialogPropsField<P, TKey = string | number> =
  {} extends UserDialogProps<P, TKey>
    ? { dialogProps?: UserDialogProps<P, TKey> }
    : { dialogProps: UserDialogProps<P, TKey> };
```

**Step 2: Replace DataSelectButtonProps**

Replace lines 54-83 (`DataSelectButtonProps` interface) with:

```typescript
/** DataSelectButton Props */
export type DataSelectButtonProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> = {
  /** Currently selected key(s) (single or multiple) */
  value?: TKey | TKey[];
  /** Value change callback */
  onValueChange?: (value: TKey | TKey[] | undefined) => void;
  /** Function to load items by key */
  load: (keys: TKey[]) => TItem[] | Promise<TItem[]>;
  /** Item rendering function */
  renderItem: (item: TItem) => JSX.Element;
  /** Selection dialog component */
  dialog: Component<TDialogProps>;
  /** Dialog options (header, size, etc.) */
  dialogOptions?: DialogShowOptions;
  /** Multiple selection mode */
  multiple?: boolean;
  /** Required input */
  required?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Trigger size */
  size?: ComponentSize;
  /** Borderless style */
  inset?: boolean;
  /** Custom validation function */
  validate?: (value: unknown) => string | undefined;
  /** touchMode: show error only after focus is lost */
  touchMode?: boolean;
} & DialogPropsField<TDialogProps, TKey>;
```

**Step 3: Update function signature and splitProps**

Change line 114-130 to update the function signature and splitProps keys:

```typescript
export function DataSelectButton<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
>(
  props: DataSelectButtonProps<TItem, TKey, TDialogProps>,
): JSX.Element {
  const [local] = splitProps(props as any, [
    "value",
    "onValueChange",
    "load",
    "dialog",
    "dialogProps",
    "dialogOptions",
    "renderItem",
    "multiple",
    "required",
    "disabled",
    "size",
    "inset",
    "validate",
    "touchMode",
  ]);
```

Note: `as any` is needed because `splitProps` cannot handle intersection types from `DialogPropsField`. The `local` variable will have the correct runtime behavior.

**Step 4: Simplify handleOpenDialog**

Replace lines 189-216 (the `handleOpenDialog` function and result handling):

```typescript
  // Open dialog
  const handleOpenDialog = async () => {
    if (local.disabled) return;

    const result = await dialog.show(
      local.dialog,
      {
        ...((local as any).dialogProps ?? {}),
        selectMode: local.multiple ? "multiple" : "single",
        selectedKeys: normalizeKeys(getValue()) as (string | number)[],
      },
      local.dialogOptions,
    );

    if (result) {
      const newKeys = result.selectedKeys;
      if (local.multiple) {
        setValue(newKeys);
      } else {
        setValue(newKeys.length > 0 ? newKeys[0] : undefined);
      }
    }
  };
```

**Step 5: Update import**

Line 18 — add `DialogShowOptions` to the import from `DialogContext`:

```typescript
import { useDialog, type DialogShowOptions } from "../../disclosure/DialogContext";
```

This import already exists on line 18 — verify it includes `DialogShowOptions`.

**Step 6: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: May have errors in files that still import `DialogConfig`/`InjectedSelectProps` — those will be fixed in subsequent tasks.

**Step 7: Commit**

```bash
git add packages/solid/src/components/features/data-select-button/DataSelectButton.tsx
git commit -m "refactor(solid): replace DialogConfig with split props in DataSelectButton"
```

---

### Task 2: Update SharedDataSelect.tsx

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx:1-20,68-95,103-106,155-184`

**Step 1: Update imports**

Replace lines 17-20:

```typescript
import {
  type DataSelectDialogResult,
  type SelectDialogBaseProps,
  type DialogPropsField,
} from "../data-select-button/DataSelectButton";
```

Note: `DialogPropsField` needs to be exported from DataSelectButton.tsx. Verify it's exported; if not, add `export` to the type definition.

**Step 2: Replace SharedDataSelectProps**

Replace lines 68-95 with:

```typescript
/** SharedDataSelect Props */
export type SharedDataSelectProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> = {
  /** Shared data accessor */
  data: SharedDataAccessor<TItem>;
  /** Currently selected key value (translated to item internally) */
  value?: unknown;
  /** Value change callback (receives key, not item) */
  onValueChange?: (value: unknown) => void;
  /** Multiple selection mode */
  multiple?: boolean;
  /** Required input */
  required?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Trigger size */
  size?: ComponentSize;
  /** Borderless style */
  inset?: boolean;
  /** Item filter function */
  filterFn?: (item: TItem, index: number) => boolean;
  /** Selection dialog component */
  dialog?: Component<TDialogProps>;
  /** Dialog options (header, size, etc.) */
  dialogOptions?: DialogShowOptions;
  /** Compound children: ItemTemplate, Action */
  children: JSX.Element;
} & DialogPropsField<TDialogProps>;
```

**Step 3: Add `DialogShowOptions` import**

Add `type DialogShowOptions` to the imports from `DialogContext`:

```typescript
import { useDialog, type DialogShowOptions } from "../../disclosure/DialogContext";
```

**Step 4: Update SharedDataSelectComponent generic**

Replace line 97-101:

```typescript
interface SharedDataSelectComponent {
  <TItem, TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps>(
    props: SharedDataSelectProps<TItem, TDialogProps>,
  ): JSX.Element;
  ItemTemplate: typeof ItemTemplate;
  Action: typeof Action;
}
```

**Step 5: Update function signature and splitProps**

Replace lines 103-106:

```typescript
const SharedDataSelectBase = <TItem, TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps>(
  props: SharedDataSelectProps<TItem, TDialogProps>,
): JSX.Element => {
  const [local, rest] = splitProps(props as any, [
    "data", "filterFn", "dialog", "dialogProps", "dialogOptions", "children",
  ]);
```

**Step 6: Simplify handleOpenDialog**

Replace lines 156-184:

```typescript
  // Open dialog and handle selection result
  const handleOpenDialog = async () => {
    if (!local.dialog) return;

    const result = await dialog.show(
      local.dialog,
      {
        ...((local as any).dialogProps ?? {}),
        selectMode: rest.multiple ? "multiple" : "single",
        selectedKeys: normalizeKeys(rest.value),
      },
      local.dialogOptions,
    );

    if (result) {
      const newKeys = result.selectedKeys;
      if (rest.multiple) {
        rest.onValueChange?.(newKeys);
      } else {
        rest.onValueChange?.(newKeys.length > 0 ? newKeys[0] : undefined);
      }
    }
  };
```

**Step 7: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelect.tsx
git commit -m "refactor(solid): replace DialogConfig with split props in SharedDataSelect"
```

---

### Task 3: Update SharedDataSelectButton.tsx

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectButton.tsx`

**Step 1: Replace entire file**

```typescript
import { type Component, type JSX, splitProps } from "solid-js";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import {
  DataSelectButton,
  type DataSelectButtonProps,
  type SelectDialogBaseProps,
  type DialogPropsField,
} from "../data-select-button/DataSelectButton";
import { type DialogShowOptions } from "../../disclosure/DialogContext";
import { type ComponentSize } from "../../../styles/tokens.styles";

/** SharedDataSelectButton Props */
export type SharedDataSelectButtonProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> = {
  /** Shared data accessor */
  data: SharedDataAccessor<TItem>;
  /** Currently selected key(s) (single or multiple) */
  value?: DataSelectButtonProps<TItem>["value"];
  /** Value change callback */
  onValueChange?: DataSelectButtonProps<TItem>["onValueChange"];
  /** Multiple selection mode */
  multiple?: boolean;
  /** Required input */
  required?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Trigger size */
  size?: ComponentSize;
  /** Borderless style */
  inset?: boolean;
  /** Selection dialog component */
  dialog: Component<TDialogProps>;
  /** Dialog options (header, size, etc.) */
  dialogOptions?: DialogShowOptions;
  /** Item rendering function */
  children: (item: TItem) => JSX.Element;
} & DialogPropsField<TDialogProps>;

export function SharedDataSelectButton<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
>(
  props: SharedDataSelectButtonProps<TItem, TDialogProps>,
): JSX.Element {
  const [local, rest] = splitProps(props as any, ["data", "children"]);

  return (
    <DataSelectButton
      load={(keys) => local.data.items().filter((item) => keys.includes(local.data.getKey(item)))}
      renderItem={local.children}
      {...rest}
    />
  );
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS (0 errors). All source files now use the new types.

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelectButton.tsx
git commit -m "refactor(solid): replace DialogConfig with split props in SharedDataSelectButton"
```

---

### Task 4: Update DataSelectButton.spec.tsx

**Files:**
- Modify: `packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx`

**Step 1: Update import**

Replace line 4:

```typescript
import { DataSelectButton, type SelectDialogBaseProps, type DataSelectDialogResult } from "@simplysm/solid";
```

**Step 2: Update TestDialogComponent**

Replace lines 29-39:

```typescript
// Dialog component for tests — uses close prop directly
function TestDialogComponent(props: SelectDialogBaseProps<number> & { confirmKeys: number[] }) {
  return (
    <div data-testid="dialog-content">
      <div data-testid="select-mode">{props.selectMode}</div>
      <div data-testid="selected-keys">{JSON.stringify([...props.selectedKeys])}</div>
      <button data-testid="dialog-confirm" onClick={() => props.close?.({ selectedKeys: props.confirmKeys })}>
        confirm
      </button>
    </div>
  );
}
```

**Step 3: Replace all `dialog={{ component: TestDialogComponent, props: { confirmKeys: [...] } }}` usages**

Replace every occurrence of `dialog={{ component: TestDialogComponent, props: { confirmKeys: [...] } }}` with:

```typescript
dialog={TestDialogComponent}
dialogProps={{ confirmKeys: [...] }}
```

Preserve the exact `confirmKeys` array value from each test. The occurrences are at approximately lines:
- 65, 82-83, 99, 120, 136, 153, 176, 200, 216, 232, 251, 284, 299, 312, 339, 353, 370, 393, 407, 438, 452, 465, 487

**Step 4: Run tests**

Run: `pnpm vitest packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx --run --project=solid`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx
git commit -m "test(solid): update DataSelectButton tests to split props API"
```

---

### Task 5: Update SharedDataSelect.spec.tsx

**Files:**
- Modify: `packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx`

**Step 1: Update imports**

Replace lines 4-7:

```typescript
import {
  SharedDataSelect,
  type SelectDialogBaseProps,
  type DataSelectDialogResult,
} from "@simplysm/solid";
```

**Step 2: Update TestDialogComponent**

Replace line 34:

```typescript
function TestDialogComponent(props: SelectDialogBaseProps<number> & { confirmKeys: number[] }) {
```

**Step 3: Update TestDialogComponent onClick handler**

Replace line 41 (`props.onSelect({ keys: props.confirmKeys })`) with:

```typescript
props.close?.({ selectedKeys: props.confirmKeys })
```

**Step 4: Replace all `dialog={{ ... }}` usages**

In test "opens dialog and applies selection result" (line ~112):

```typescript
dialog={TestDialogComponent}
dialogProps={{ confirmKeys: [2] }}
dialogOptions={{ header: "Select Item" }}
```

In test "passes selectedKeys to dialog component" (line ~150):

```typescript
dialog={TestDialogComponent}
dialogProps={{ confirmKeys: [] }}
```

**Step 5: Run tests**

Run: `pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx --run --project=solid`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx
git commit -m "test(solid): update SharedDataSelect tests to split props API"
```

---

### Task 6: Export new types and run full verification

**Files:**
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx` (ensure exports)

**Step 1: Verify exports**

Ensure `SelectDialogBaseProps` and `DialogPropsField` are exported from `DataSelectButton.tsx`. They should already be `export interface` / `export type`. Verify `UserDialogProps` does NOT need to be exported (internal helper only).

Also verify `DataSelectDialogResult` is still exported (should be unchanged).

**Step 2: Run full typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS (0 errors, 0 warnings)

**Step 3: Run full lint**

Run: `pnpm lint packages/solid --fix`
Expected: PASS (0 errors, 0 warnings)

**Step 4: Run all tests**

Run: `pnpm vitest packages/solid/tests --run --project=solid`
Expected: All tests PASS

**Step 5: Verify no remaining DialogConfig/InjectedSelectProps references**

Run: `grep -r "DialogConfig\|InjectedSelectProps" packages/solid/src/ packages/solid/tests/ --include="*.ts" --include="*.tsx"`
Expected: No matches

**Step 6: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "refactor(solid): final cleanup for dialog prop split migration"
```
