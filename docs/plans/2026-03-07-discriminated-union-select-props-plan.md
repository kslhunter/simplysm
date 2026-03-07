# Discriminated Union Select Props Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Apply discriminated union props pattern to DataSelectButton, SharedDataSelect, and SharedDataSelectButton, separating single/multiple mode types for external API type-safety.

**Architecture:** Mirror the existing Select component pattern (CommonProps + SingleProps + MultipleProps union). Internal logic unchanged — only props type definitions change. Each component defines its own discriminated union independently.

**Tech Stack:** TypeScript, SolidJS

---

### Task 1: DataSelectButton — discriminated union props

**Files:**
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx:52-84`
- Test: `packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx`

**Step 1: Write failing type-safety test**

Add a compile-time type assertion test at the end of `DataSelectButton.spec.tsx`. This test verifies that the discriminated union enforces correct types — single mode must not accept `TKey[]`, multiple mode must not accept `TKey`.

```typescript
describe("DataSelectButton type safety", () => {
  it("single mode types value as TKey", () => {
    const load = createTestLoad();
    // Single mode: value is number, onValueChange receives number | undefined
    const onValueChange = vi.fn<(v: number | undefined) => void>();
    renderWithDialog(() => (
      <DataSelectButton
        value={1}
        onValueChange={onValueChange}
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));
    // If this compiles, single mode type is correct
    expect(true).toBe(true);
  });

  it("multiple mode types value as TKey[]", () => {
    const load = createTestLoad();
    // Multiple mode: value is number[], onValueChange receives number[]
    const onValueChange = vi.fn<(v: number[]) => void>();
    renderWithDialog(() => (
      <DataSelectButton
        multiple
        value={[1, 2]}
        onValueChange={onValueChange}
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx --run`
Expected: FAIL — type error because current props expect `(v: TKey | TKey[] | undefined) => void` for onValueChange, not `(v: number | undefined) => void`.

**Step 3: Implement discriminated union props**

In `DataSelectButton.tsx`, replace the single `DataSelectButtonProps` type (lines 52-84) with:

```typescript
/** Common props shared between single and multiple modes */
interface DataSelectButtonCommonProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> {
  /** Function to load items by key */
  load: (keys: TKey[]) => TItem[] | Promise<TItem[]>;
  /** Item rendering function */
  renderItem: (item: TItem) => JSX.Element;
  /** Selection dialog component */
  dialog: Component<TDialogProps>;
  /** Dialog options (header, size, etc.) */
  dialogOptions?: DialogShowOptions;
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
  /** lazyValidation: show error only after focus is lost */
  lazyValidation?: boolean;
}

/** Single select props */
interface DataSelectButtonSingleProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> extends DataSelectButtonCommonProps<TItem, TKey, TDialogProps> {
  /** Single select mode */
  multiple?: false;
  /** Currently selected key */
  value?: TKey;
  /** Value change callback */
  onValueChange?: (value: TKey | undefined) => void;
}

/** Multiple select props */
interface DataSelectButtonMultipleProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> extends DataSelectButtonCommonProps<TItem, TKey, TDialogProps> {
  /** Multiple select mode */
  multiple: true;
  /** Currently selected keys */
  value?: TKey[];
  /** Value change callback */
  onValueChange?: (value: TKey[]) => void;
}

/** DataSelectButton Props */
export type DataSelectButtonProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps<TKey> = SelectDialogBaseProps<TKey>,
> =
  | (DataSelectButtonSingleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps, TKey>)
  | (DataSelectButtonMultipleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps, TKey>);
```

The function signature and internal logic remain unchanged — they already use `local.multiple` checks with type casts.

**Step 4: Run tests to verify all pass**

Run: `pnpm vitest packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx --run`
Expected: ALL PASS (both new type-safety tests and existing tests)

**Step 5: Commit**

```bash
git add packages/solid/src/components/features/data-select-button/DataSelectButton.tsx packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx
git commit -m "refactor(solid): apply discriminated union to DataSelectButton props"
```

---

### Task 2: SharedDataSelect — discriminated union props

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx:40-70`
- Test: `packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx`

**Step 1: Write failing type-safety test**

Add at the end of `SharedDataSelect.spec.tsx`:

```typescript
describe("SharedDataSelect type safety", () => {
  it("single mode types value as TKey", () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);
    const onValueChange = vi.fn<(v: number | undefined) => void>();

    renderWithDialog(() => (
      <SharedDataSelect data={accessor} value={1} onValueChange={onValueChange}>
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
      </SharedDataSelect>
    ));
    expect(true).toBe(true);
  });

  it("multiple mode types value as TKey[]", () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);
    const onValueChange = vi.fn<(v: number[]) => void>();

    renderWithDialog(() => (
      <SharedDataSelect multiple data={accessor} value={[1, 2]} onValueChange={onValueChange}>
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
      </SharedDataSelect>
    ));
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx --run`
Expected: FAIL — type error because current `onValueChange` expects `(v: TKey | TKey[] | undefined) => void`.

**Step 3: Implement discriminated union props**

In `SharedDataSelect.tsx`, replace the single `SharedDataSelectProps` type (lines 40-70) with:

```typescript
/** Common props shared between single and multiple modes */
interface SharedDataSelectCommonProps<
  TItem,
  TKey extends string | number = string | number,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> {
  /** Shared data accessor */
  data: SharedDataAccessor<TItem>;
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
}

/** Single select props */
interface SharedDataSelectSingleProps<
  TItem,
  TKey extends string | number = string | number,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> extends SharedDataSelectCommonProps<TItem, TKey, TDialogProps> {
  /** Single select mode */
  multiple?: false;
  /** Currently selected key value */
  value?: TKey;
  /** Value change callback */
  onValueChange?: (value: TKey | undefined) => void;
}

/** Multiple select props */
interface SharedDataSelectMultipleProps<
  TItem,
  TKey extends string | number = string | number,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> extends SharedDataSelectCommonProps<TItem, TKey, TDialogProps> {
  /** Multiple select mode */
  multiple: true;
  /** Currently selected key values */
  value?: TKey[];
  /** Value change callback */
  onValueChange?: (value: TKey[]) => void;
}

/** SharedDataSelect Props */
export type SharedDataSelectProps<
  TItem,
  TKey extends string | number = string | number,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> =
  | (SharedDataSelectSingleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps>)
  | (SharedDataSelectMultipleProps<TItem, TKey, TDialogProps> & DialogPropsField<TDialogProps>);
```

Internal logic unchanged — `rest.multiple` checks with existing casts and `as SelectProps<TItem>` remain.

**Step 4: Run tests to verify all pass**

Run: `pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx --run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelect.tsx packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx
git commit -m "refactor(solid): apply discriminated union to SharedDataSelect props"
```

---

### Task 3: SharedDataSelectButton — discriminated union props

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectButton.tsx:13-39`

**Step 1: Implement discriminated union props**

No separate test file exists for SharedDataSelectButton, and it is a thin wrapper that delegates to DataSelectButton. The type change is verified by TypeScript compilation. Replace the `SharedDataSelectButtonProps` type (lines 13-39) with:

```typescript
/** Common props shared between single and multiple modes */
interface SharedDataSelectButtonCommonProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> {
  /** Shared data accessor */
  data: SharedDataAccessor<TItem>;
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
}

/** Single select props */
interface SharedDataSelectButtonSingleProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> extends SharedDataSelectButtonCommonProps<TItem, TDialogProps> {
  /** Single select mode */
  multiple?: false;
  /** Currently selected key */
  value?: string | number;
  /** Value change callback */
  onValueChange?: (value: string | number | undefined) => void;
}

/** Multiple select props */
interface SharedDataSelectButtonMultipleProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> extends SharedDataSelectButtonCommonProps<TItem, TDialogProps> {
  /** Multiple select mode */
  multiple: true;
  /** Currently selected keys */
  value?: (string | number)[];
  /** Value change callback */
  onValueChange?: (value: (string | number)[]) => void;
}

/** SharedDataSelectButton Props */
export type SharedDataSelectButtonProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> =
  | (SharedDataSelectButtonSingleProps<TItem, TDialogProps> & DialogPropsField<TDialogProps>)
  | (SharedDataSelectButtonMultipleProps<TItem, TDialogProps> & DialogPropsField<TDialogProps>);
```

The function body remains unchanged — it passes props through to DataSelectButton via `{...(rest as any)}`.

**Step 2: Run typecheck to verify compilation**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit`
Expected: PASS — no type errors

**Step 3: Run all related tests to verify no regressions**

Run: `pnpm vitest packages/solid/tests/components/features/ --run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelectButton.tsx
git commit -m "refactor(solid): apply discriminated union to SharedDataSelectButton props"
```
