# Solid Review Fixes (Round 2) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix 14 review findings in `packages/solid` covering type safety, correctness, naming, compound patterns, and SharedDataProvider lifecycle.

**Architecture:** Incremental fixes grouped by dependency order — file renames first, then type changes, correctness fixes, pattern normalization, and finally the SharedDataProvider refactoring.

**Tech Stack:** SolidJS, TypeScript, Vitest, Tailwind CSS

---

### Task 1: Rename auxiliary files (Finding 8)

Rename 4 files and update all import paths. No logic changes.

**Files:**
- Rename: `packages/solid/src/components/data/sheet/types.ts` → `DataSheet.types.ts`
- Rename: `packages/solid/src/components/data/sheet/sheetUtils.ts` → `DataSheet.utils.ts`
- Rename: `packages/solid/src/components/features/crud-detail/types.ts` → `CrudDetail.types.ts`
- Rename: `packages/solid/src/components/features/crud-sheet/types.ts` → `CrudSheet.types.ts`
- Modify: `packages/solid/src/index.ts:57,185,189` — update re-export paths
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:31,34` — `"./types"` → `"./DataSheet.types"`, `"./sheetUtils"` → `"./DataSheet.utils"`
- Modify: `packages/solid/src/components/data/sheet/DataSheetConfigDialog.tsx:9` — `"./types"` → `"./DataSheet.types"`
- Modify: `packages/solid/src/components/data/sheet/DataSheetColumn.tsx:3` — `"./types"` → `"./DataSheet.types"`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetExpansion.ts:2-3` — `"../types"` → `"../DataSheet.types"`, `"../sheetUtils"` → `"../DataSheet.utils"`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetFixedColumns.ts:3` — `"../types"` → `"../DataSheet.types"`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetReorder.ts:3-4` — `"../types"` → `"../DataSheet.types"`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts:2` — `"../types"` → `"../DataSheet.types"`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetSorting.ts:3-4` — `"../sheetUtils"` → `"../DataSheet.utils"`, `"../types"` → `"../DataSheet.types"`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx:38` — `"./types"` → `"./CrudDetail.types"`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:17,20,56` — `"../../data/sheet/types"` → `"../../data/sheet/DataSheet.types"`, `"../../data/sheet/sheetUtils"` → `"../../data/sheet/DataSheet.utils"`, `"./types"` → `"./CrudSheet.types"`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheetColumn.tsx:3` — `"./types"` → `"./CrudSheet.types"`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheetTools.tsx:2` — `"./types"` → `"./CrudSheet.types"`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.types.ts:3` (the file itself, after rename) — `"../../data/sheet/types"` → `"../../data/sheet/DataSheet.types"`
- Modify test imports: `tests/components/data/sheet/hooks/useDataSheetSelection.spec.ts:4` — `"../types"` → `"../DataSheet.types"`, and any other test files importing from renamed paths.

**Step 1: Rename files using git mv**

```bash
cd packages/solid/src/components/data/sheet && git mv types.ts DataSheet.types.ts && git mv sheetUtils.ts DataSheet.utils.ts
cd ../../features/crud-detail && git mv types.ts CrudDetail.types.ts
cd ../crud-sheet && git mv types.ts CrudSheet.types.ts
```

**Step 2: Update all import paths**

Find-and-replace across all files listed above. The import path changes are:
- `"./types"` → `"./DataSheet.types"` (within `data/sheet/`)
- `"../types"` → `"../DataSheet.types"` (within `data/sheet/hooks/`)
- `"./sheetUtils"` → `"./DataSheet.utils"` (within `data/sheet/`)
- `"../sheetUtils"` → `"../DataSheet.utils"` (within `data/sheet/hooks/`)
- `"./types"` → `"./CrudDetail.types"` (within `features/crud-detail/`)
- `"./types"` → `"./CrudSheet.types"` (within `features/crud-sheet/`)
- `"../../data/sheet/types"` → `"../../data/sheet/DataSheet.types"` (in CrudSheet files)
- `"../../data/sheet/sheetUtils"` → `"../../data/sheet/DataSheet.utils"` (in CrudSheet files)
- In `index.ts`: update the 3 re-export paths at lines 57, 185, 189

Also update test file imports referencing old paths.

**Step 3: Run typecheck to verify**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit`
Expected: PASS (no errors)

**Step 4: Commit**

```bash
git add -A packages/solid/src packages/solid/tests
git commit -m "refactor(solid): rename auxiliary files with main file prefix"
```

---

### Task 2: `isItemSelectable` type change (Finding 5)

Change return type from `true | string` to `boolean | string`.

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.types.ts:29`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts:9,15,37`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.types.ts:89`
- Test: `packages/solid/tests/components/data/sheet/hooks/useDataSheetSelection.spec.ts`

`useDataSheetSelection` (`packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts`) — hook managing single/multiple row selection with range select and last-clicked-row tracking. Uses `createControllableSignal` for controlled/uncontrolled pattern.

`createRoot` from `solid-js` — creates a reactive owner context for running signals/memos outside a component render cycle. Required in tests because SolidJS signals need a tracking scope to function.

**Step 1: Write failing test**

Add to `useDataSheetSelection.spec.ts`:

```typescript
it("treats false return from isItemSelectable as not selectable", () => {
  createRoot((dispose) => {
    const flatItems = () => createTestFlatItems(testItems);
    const sel = useDataSheetSelection<TestItem>(
      {
        selectionMode: "multiple",
        isItemSelectable: (item) => (item.selectable === false ? false : true),
      },
      flatItems,
    );

    // Item C has selectable: false → isItemSelectable returns false
    expect(sel.getItemSelectable(testItems[2])).toBe(false);
    // toggleSelect should NOT select a non-selectable item
    sel.toggleSelect(testItems[2]);
    expect(sel.selection()).toEqual([]);
    dispose();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/data/sheet/hooks/useDataSheetSelection.spec.ts`
Expected: FAIL — TypeScript error because `false` is not assignable to `true | string`

**Step 3: Update types**

In `DataSheet.types.ts:29`:
```typescript
isItemSelectable?: (item: TItem) => boolean | string;
```

In `useDataSheetSelection.ts:9`:
```typescript
isItemSelectable?: (item: TItem) => boolean | string;
```

In `useDataSheetSelection.ts:15` (return type of `getItemSelectable`):
```typescript
getItemSelectable: (item: TItem) => boolean | string;
```

In `useDataSheetSelection.ts:37` (function signature):
```typescript
function getItemSelectable(item: TItem): boolean | string {
```

In `CrudSheet.types.ts:89`:
```typescript
isItemSelectable?: (item: TItem) => boolean | string;
```

**Step 4: Run test to verify it passes**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/data/sheet/hooks/useDataSheetSelection.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.types.ts packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts packages/solid/src/components/features/crud-sheet/CrudSheet.types.ts packages/solid/tests/components/data/sheet/hooks/useDataSheetSelection.spec.ts
git commit -m "fix(solid): change isItemSelectable return type to boolean | string"
```

---

### Task 3: DataSheetConfigDialog internalization (Finding 10)

Remove DataSheetConfigDialog from public API. It is purely internal to DataSheet.

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:1022-1028`

**Step 1: Remove from Object.assign and export**

In `DataSheet.tsx`, change lines 1022-1028 from:
```typescript
//#region Export
export const DataSheet = Object.assign(DataSheetInner, {
  Column: DataSheetColumn,
  ConfigDialog: DataSheetConfigDialog,
});
export { DataSheetConfigDialog };
//#endregion
```
to:
```typescript
//#region Export
export const DataSheet = Object.assign(DataSheetInner, {
  Column: DataSheetColumn,
});
//#endregion
```

**Step 2: Run typecheck**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "refactor(solid): internalize DataSheetConfigDialog"
```

---

### Task 4: `createTopbarActions` → `useTopbarActions` rename (Finding 13)

Rename context-dependent function to follow `use*` convention.

**Files:**
- Modify: `packages/solid/src/components/layout/topbar/Topbar.tsx:46,49`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:27,410`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx:18,200`
- Modify: `packages/solid/docs/layout.md`
- Rename + Modify: `packages/solid/tests/components/layout/topbar/createTopbarActions.spec.tsx` → `useTopbarActions.spec.tsx`
- Modify: `packages/solid/tests/components/layout/topbar/TopbarActions.spec.tsx`
- Modify: `packages/solid-demo/src/pages/layout/TopbarPage.tsx`

**Step 1: Rename function definition**

In `Topbar.tsx:46-49`, change:
```typescript
export function useTopbarActions(accessor: () => JSX.Element): void {
  const ctx = useContext(TopbarActionsCtx);
  if (!ctx) {
    throw new Error("useTopbarActions can only be used inside Topbar.Container");
  }
```

**Step 2: Update all consumers**

- `CrudSheet.tsx:27`: `import { createTopbarActions,` → `import { useTopbarActions,`
- `CrudSheet.tsx:410`: `createTopbarActions(` → `useTopbarActions(`
- `CrudDetail.tsx:18`: `import { createTopbarActions,` → `import { useTopbarActions,`
- `CrudDetail.tsx:200`: `createTopbarActions(` → `useTopbarActions(`

**Step 3: Rename test file and update references**

```bash
cd packages/solid/tests/components/layout/topbar && git mv createTopbarActions.spec.tsx useTopbarActions.spec.tsx
```

In `useTopbarActions.spec.tsx`: replace all `createTopbarActions` with `useTopbarActions`.
In `TopbarActions.spec.tsx`: replace all `createTopbarActions` with `useTopbarActions`.

**Step 4: Update docs and demo**

In `packages/solid/docs/layout.md`: replace all `createTopbarActions` with `useTopbarActions`.
In `packages/solid-demo/src/pages/layout/TopbarPage.tsx`: replace all `createTopbarActions` with `useTopbarActions`.

**Step 5: Run tests**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/layout/topbar/`
Expected: PASS

**Step 6: Commit**

```bash
git add -A packages/solid/src packages/solid/tests packages/solid/docs packages/solid-demo
git commit -m "refactor(solid): rename createTopbarActions to useTopbarActions"
```

---

### Task 5: Add #region blocks to large files (Findings 14, 15)

No logic changes — only adding IDE-foldable section markers to large files.

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts`
- Modify: `packages/solid/src/components/data/kanban/Kanban.tsx`

`#region` / `#endregion` — TypeScript/IDE convention for collapsible code sections. Used in this codebase for files >300 lines where file splitting has a bigger tradeoff than keeping it together.

**Step 1: Add #region to createAppStructure.ts**

The file already has `// ── Section ──` comment markers. Add `#region`/`#endregion` pairs around each section. Keep existing comment markers as-is:

- Line 5: add `//#region Types` before `// ── Input Types ──`
- Line 39: add `//#endregion` after last type in Input/Output types block
- Line 84: add `//#region Type Inference` before `// ── Perms Type Inference ──`
- Line 115: add `//#endregion`
- Line 117: add `//#region Internal Helpers`
- Line 141: add `//#endregion`
- Line 143: add `//#region Routes`
- Line 172: add `//#endregion`
- Line 174: add `//#region Menus`
- Line 219: add `//#endregion`
- Line 221: add `//#region Perms`
- Line 398: add `//#endregion`
- Line 400: add `//#region Info`
- Line 417: add `//#endregion`
- Line 419: add `//#region createAppStructure`
- Line 519: add `//#endregion` at end of file

**Step 2: Add #region to Kanban.tsx**

The file already has `// ── Section ──` markers and a `#region Export` at the end. Add matching `#region` markers for other sections:

- Line 30: add `//#region Types` before `// ── Types ──`
- Line 49: add `//#endregion` after last type
- Line 51: add `//#region Board Context` before `// ── Board Context ──`
- Line 77: add `//#endregion`
- Line 78: add `//#region Lane Context` before `// ── Lane Context ──`
- Line 98: add `//#endregion`
- Line 100: add `//#region Slots` before slot definitions
- Line 107: add `//#endregion`
- Line 108: add `//#region KanbanCard` before `// ─── KanbanCard ──`
- Line 279: add `//#endregion`
- Line 281: add `//#region KanbanLane` before `// ─── KanbanLane ──`
- Line 509: add `//#endregion`
- Line 511: add `//#region KanbanBoard` before `// ─── Kanban (Board) ──`
- Line 593: add `//#endregion`
- (Lines 595-602 already have `//#region Export ... //#endregion`)

**Step 3: Verify no syntax errors**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/helpers/createAppStructure.ts packages/solid/src/components/data/kanban/Kanban.tsx
git commit -m "refactor(solid): add #region blocks to createAppStructure and Kanban"
```

---

### Task 6: Combobox allowsCustomValue fix (Finding 1)

Fix unsafe `query() as TValue` cast when `allowsCustomValue=true` without `parseCustomValue`.

**Files:**
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx:344-348`
- Test: `packages/solid/tests/components/form-control/combobox/Combobox.spec.tsx`

`createControllableSignal` (`packages/solid/src/hooks/createControllableSignal.ts`) — manages controlled/uncontrolled value pattern; returns `[getter, setter]` where setter accepts `TValue | undefined`.

**Step 1: Write failing test**

Add to `Combobox.spec.tsx`:

```typescript
it("sets undefined when allowsCustomValue is true without parseCustomValue", async () => {
  const onValueChange = vi.fn();
  const { container } = render(() => (
    <ConfigProvider clientName="test"><I18nProvider>
      <Combobox
        loadItems={() => []}
        renderValue={(v: string) => <>{v}</>}
        allowsCustomValue
        onValueChange={onValueChange}
      />
    </I18nProvider></ConfigProvider>
  ));

  const input = container.querySelector("input")!;
  fireEvent.input(input, { target: { value: "custom text" } });
  fireEvent.keyDown(input, { key: "Enter" });

  // Without parseCustomValue, value should be set to undefined (not cast string to TValue)
  await waitFor(() => {
    expect(onValueChange).toHaveBeenCalledWith(undefined);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/form-control/combobox/Combobox.spec.tsx`
Expected: FAIL — currently calls `onValueChange("custom text")` due to unsafe cast

**Step 3: Fix the code**

In `Combobox.tsx`, replace lines 344-348 (the Enter key handler inside `handleTriggerKeyDown`):

Before:
```typescript
    } else if (e.key === "Enter" && local.allowsCustomValue && query().trim() !== "") {
      e.preventDefault();
      const customValue = local.parseCustomValue ? local.parseCustomValue(query()) : (query() as TValue);
      selectValue(customValue);
    }
```

After:
```typescript
    } else if (e.key === "Enter" && local.allowsCustomValue && query().trim() !== "") {
      e.preventDefault();
      if (local.parseCustomValue) {
        selectValue(local.parseCustomValue(query()));
      } else {
        setInternalValue(undefined);
        setQuery("");
        setOpen(false);
      }
    }
```

Where `setInternalValue` is the setter from `createControllableSignal` (line 252), `setQuery` is the query signal setter (line 245), `setOpen` is the dropdown open state setter (line 243).

**Step 4: Run test to verify it passes**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/form-control/combobox/Combobox.spec.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/combobox/Combobox.tsx packages/solid/tests/components/form-control/combobox/Combobox.spec.tsx
git commit -m "fix(solid): handle missing parseCustomValue in Combobox allowsCustomValue"
```

---

### Task 7: AddressSearch onerror (Finding 4)

Add error handling for script load failure.

**Files:**
- Modify: `packages/solid/src/components/features/address/AddressSearch.tsx:18,28-29`
- Test: `packages/solid/tests/components/features/address/AddressSearch.spec.tsx`

**Step 1: Write failing test**

Add to `AddressSearch.spec.tsx`. The test verifies that script load failure is handled (Promise rejects instead of hanging):

```typescript
it("rejects when script fails to load", async () => {
  // Remove any existing script so the component tries to load it
  document.getElementById("daum_address")?.remove();

  const originalCreateElement = document.createElement.bind(document);
  const appendSpy = vi.spyOn(document.head, "appendChild").mockImplementation((node: Node) => {
    // Simulate script error after a tick
    setTimeout(() => {
      const script = node as HTMLScriptElement;
      script.onerror?.(new Event("error"));
    }, 0);
    return node;
  });

  // The component should handle the error without hanging
  const { unmount } = render(() => <AddressSearchContent />);

  // Give time for the async error to propagate
  await new Promise((r) => setTimeout(r, 50));

  // If Promise had no reject path, this test would timeout
  unmount();
  appendSpy.mockRestore();
});
```

**Step 2: Run test to verify current behavior**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/features/address/AddressSearch.spec.tsx`
Expected: Test may timeout or hang since there's no reject path

**Step 3: Fix the code**

In `AddressSearch.tsx`, change line 18 from:
```typescript
      await new Promise<void>((resolve) => {
```
to:
```typescript
      await new Promise<void>((resolve, reject) => {
```

And after line 28 (after the `scriptEl.onload` assignment), add:
```typescript
        scriptEl.onerror = () => {
          reject(new Error("Failed to load Daum postcode script"));
        };
```

**Step 4: Run test to verify it passes**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/features/address/AddressSearch.spec.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/features/address/AddressSearch.tsx packages/solid/tests/components/features/address/AddressSearch.spec.tsx
git commit -m "fix(solid): add onerror handler to AddressSearch script loading"
```

---

### Task 8: PrintProvider canvas context null check (Finding 16)

**Files:**
- Modify: `packages/solid/src/components/feedback/print/PrintProvider.tsx:250`

**Step 1: Fix the code**

Replace line 250:
```typescript
          const ctx = sliceCanvas.getContext("2d")!;
```
with:
```typescript
          const ctx = sliceCanvas.getContext("2d");
          if (!ctx) throw new Error("Failed to get 2D canvas context");
```

**Step 2: Run typecheck**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/feedback/print/PrintProvider.tsx
git commit -m "fix(solid): add null check for canvas 2D context in PrintProvider"
```

---

### Task 9: SharedDataSelect TKey generic + cast removal (Findings 6, 7)

Add type-safe `TKey` generic to SharedDataSelect and remove `as unknown as` cast.

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx`
- Test: `packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx`

`SharedDataAccessor<TItem>` (`packages/solid/src/providers/shared-data/SharedDataProvider.tsx`) — provides `items()`, `get(key)`, `emit()`, `getKey(item)`, `itemSearchText?`, `isItemHidden?`, `getParentKey?` for accessing shared data entries.

**Step 1: Write failing test**

Add to `SharedDataSelect.spec.tsx` — verify that `TKey` generic is accepted by the component:

```typescript
it("accepts typed TKey generic for value prop", () => {
  // This is primarily a compile-time test — if the generic parameter
  // is not accepted, TypeScript will error during the test build.
  const onValueChange = vi.fn();
  // Render with explicit number key type
  render(() => (
    <TestProviders>
      <SharedDataSelect<TestItem, number>
        data={mockAccessor}
        value={1}
        onValueChange={onValueChange}
      >
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <>{item.name}</>}
        </SharedDataSelect.ItemTemplate>
      </SharedDataSelect>
    </TestProviders>
  ));
  expect(true).toBe(true);
});
```

Note: Check the existing test file for `TestProviders` and `mockAccessor` patterns. Adapt accordingly.

**Step 2: Run test to verify it fails**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/features/shared-data/SharedDataSelect.spec.tsx`
Expected: FAIL — `SharedDataSelectProps` doesn't accept `TKey` generic parameter

**Step 3: Add TKey generic to props and component**

In `SharedDataSelect.tsx`:

1. Update props type definition (around line 41):
```typescript
export type SharedDataSelectProps<
  TItem,
  TKey extends string | number = string | number,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> = {
  data: SharedDataAccessor<TItem>;
  value?: TKey | TKey[];
  onValueChange?: (value: TKey | TKey[] | undefined) => void;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  inset?: boolean;
  filterFn?: (item: TItem, index: number) => boolean;
  dialog?: Component<TDialogProps>;
  dialogOptions?: DialogShowOptions;
  children: JSX.Element;
} & DialogPropsField<TDialogProps>;
```

2. Update component signature:
```typescript
const SharedDataSelectBase = <
  TItem,
  TKey extends string | number = string | number,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
>(
  props: SharedDataSelectProps<TItem, TKey, TDialogProps>,
): JSX.Element => {
```

3. Update internal functions to use `TKey`:
```typescript
  const normalizeKeys = (value: TKey | TKey[] | undefined | null): TKey[] => {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    return [value];
  };

  const keyToItem = (key: TKey): TItem | undefined => {
    return local.data.get(key);
  };

  const valueAsItem = createMemo((): TItem | TItem[] | undefined => {
    const key = rest.value;
    if (key === undefined || key === null) return undefined;
    if (Array.isArray(key)) {
      return key.map((k) => keyToItem(k)).filter((v): v is TItem => v !== undefined);
    }
    return keyToItem(key);
  });

  const itemToKey = (item: TItem | TItem[] | undefined): TKey | TKey[] | undefined => {
    if (item === undefined || item === null) return undefined;
    if (Array.isArray(item)) return item.map((i) => local.data.getKey(i)) as TKey[];
    return local.data.getKey(item) as TKey;
  };
```

4. Remove `as unknown as SelectProps` at line 180. Replace:
```typescript
  }) as unknown as SelectProps;
```
with:
```typescript
  }) as SelectProps<TItem>;
```
This single `as` is acceptable because the `mergeProps` result genuinely satisfies `SelectProps<TItem>` but TypeScript cannot infer it through the dynamic getter pattern.

5. Update dialog handler result type:
```typescript
    )) as DataSelectDialogResult<TKey> | undefined;
```

And update the value change calls to use `TKey`:
```typescript
    if (result) {
      const newKeys = result.selectedKeys as TKey[];
      if (rest.multiple) {
        rest.onValueChange?.(newKeys);
      } else {
        rest.onValueChange?.(newKeys.length > 0 ? newKeys[0] : undefined);
      }
    }
```

**Step 4: Run tests**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/features/shared-data/SharedDataSelect.spec.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelect.tsx packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx
git commit -m "feat(solid): add TKey generic to SharedDataSelect, remove unsafe casts"
```

---

### Task 10: DataSelectButton cast cleanup (Findings 7, 11 partial)

**Files:**
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx:207,216`

**Step 1: Fix casts**

At line 207, change:
```typescript
        setValue((newKeys.length > 0 ? newKeys[0] : undefined) as any);
```
to:
```typescript
        setValue((newKeys.length > 0 ? newKeys[0] : undefined) as TKey | undefined);
```

At line 216, change:
```typescript
      setValue([] as unknown as TKey[]);
```
to:
```typescript
      setValue([] as TKey[]);
```

**Step 2: Run typecheck + existing tests**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit && pnpm -F @simplysm/solid exec vitest run tests/components/features/data-select-button/DataSelectButton.spec.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/data-select-button/DataSelectButton.tsx
git commit -m "fix(solid): remove unsafe casts in DataSelectButton"
```

---

### Task 11: `any` removal — useDataSheetFixedColumns (Finding 11 partial)

**Files:**
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetFixedColumns.ts:3,8`

**Step 1: Fix type**

Change the import at line 3:
```typescript
import type { DataSheetColumnDef, DataSheetReorderEvent } from "../DataSheet.types";
```

Change line 8:
```typescript
  onItemsReorder?: (event: DataSheetReorderEvent<TItem>) => void;
```

**Step 2: Run typecheck**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/sheet/hooks/useDataSheetFixedColumns.ts
git commit -m "fix(solid): replace any with DataSheetReorderEvent in useDataSheetFixedColumns"
```

---

### Task 12: `any` removal — AddressSearch Daum API types (Finding 11 partial)

**Files:**
- Modify: `packages/solid/src/components/features/address/AddressSearch.tsx`

**Step 1: Add Daum API interfaces and apply**

Add after the `AddressSearchResult` interface (around line 9):

```typescript
interface DaumPostcodeResult {
  userSelectedType: "R" | "J";
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
  bname: string;
  buildingName: string;
  apartment: "Y" | "N";
}

interface DaumPostcodeSize {
  width: number;
  height: number;
}
```

Change line 35 from `(data: any)` to `(data: DaumPostcodeResult)`.
Change line 59 from `(size: any)` to `(size: DaumPostcodeSize)`.

**Step 2: Run typecheck**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/address/AddressSearch.tsx
git commit -m "fix(solid): define Daum API types instead of any in AddressSearch"
```

---

### Task 13: `any` removal — CrudSheet store setter (Finding 11 partial)

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:221`

`produce` from `solid-js/store` — creates an immer-like mutable draft for store updates, avoiding manual typed path arguments.

**Step 1: Fix the store setter**

Change line 221 from:
```typescript
    setItems(index as any, dp as any, !(item[dp] as boolean) as any);
```
to:
```typescript
    setItems(
      produce((draft) => {
        (draft[index] as Record<string, unknown>)[dp] = !(item[dp] as boolean);
      }),
    );
```

Verify that `produce` is already imported from `solid-js/store`. If not, add:
```typescript
import { produce } from "solid-js/store";
```

**Step 2: Run typecheck + existing tests**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit && pnpm -F @simplysm/solid exec vitest run tests/components/features/crud-sheet/CrudSheet.spec.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/crud-sheet/CrudSheet.tsx
git commit -m "fix(solid): use produce instead of any casts in CrudSheet store setter"
```

---

### Task 14: Compound component pattern — List.tsx (Finding 9, 1/6)

Remove separate interface + type assertion, use `Object.assign` pattern.

**Files:**
- Modify: `packages/solid/src/components/data/list/List.tsx:37-39,178-180`
- Test: `packages/solid/tests/components/data/List.spec.tsx`

`Object.assign(fn, { Sub })` — TypeScript preserves the call signature (including generics) of the first argument and merges the second argument's properties. This is the project convention for compound components.

**Step 1: Fix compound pattern**

Remove lines 37-39:
```typescript
interface ListComponent extends ParentComponent<ListProps> {
  Item: typeof ListItem;
}
```

Replace lines 178-180:
```typescript
export const List = ListBase as ListComponent;
List.Item = ListItem;
```
with:
```typescript
export const List = Object.assign(ListBase, {
  Item: ListItem,
});
```

**Step 2: Run existing tests**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/data/List.spec.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/data/list/List.tsx
git commit -m "refactor(solid): use Object.assign pattern for List compound component"
```

---

### Task 15: Compound component pattern — CheckboxGroup + RadioGroup (Finding 9, 2-3/6)

**Files:**
- Modify: `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx:101-112`
- Modify: `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx:98-109`
- Test: `packages/solid/tests/components/form-control/checkbox/CheckboxGroup.spec.tsx`
- Test: `packages/solid/tests/components/form-control/checkbox/RadioGroup.spec.tsx`

**Step 1: Fix CheckboxGroup**

Remove lines 101-108 (interface):
```typescript
interface CheckboxGroupComponent {
  <TValue = unknown>(props: CheckboxGroupProps<TValue>): JSX.Element;
  Item: <TValue = unknown>(props: {
    value: TValue;
    disabled?: boolean;
    children?: JSX.Element;
  }) => JSX.Element;
}
```

Change lines 110-112 from:
```typescript
export const CheckboxGroup = Object.assign(CheckboxGroupInner, {
  Item: CheckboxGroupItem,
}) as CheckboxGroupComponent;
```
to:
```typescript
export const CheckboxGroup = Object.assign(CheckboxGroupInner, {
  Item: CheckboxGroupItem,
});
```

**Step 2: Fix RadioGroup**

Remove lines 98-105 (interface):
```typescript
interface RadioGroupComponent {
  <TValue = unknown>(props: RadioGroupProps<TValue>): JSX.Element;
  Item: <TValue = unknown>(props: {
    value: TValue;
    disabled?: boolean;
    children?: JSX.Element;
  }) => JSX.Element;
}
```

Change lines 107-109 from:
```typescript
export const RadioGroup = Object.assign(RadioGroupInner, {
  Item: RadioGroupItem,
}) as RadioGroupComponent;
```
to:
```typescript
export const RadioGroup = Object.assign(RadioGroupInner, {
  Item: RadioGroupItem,
});
```

**Step 3: Run existing tests**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/form-control/checkbox/`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx packages/solid/src/components/form-control/checkbox/RadioGroup.tsx
git commit -m "refactor(solid): use Object.assign pattern for CheckboxGroup and RadioGroup"
```

---

### Task 16: Compound component pattern — NumberInput (Finding 9, 4/6)

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx:165-168,190,351-353`
- Test: `packages/solid/tests/components/form-control/field/NumberInput.spec.tsx`

**Step 1: Fix compound pattern**

Remove lines 165-168 (interface):
```typescript
interface NumberInputComponent {
  (props: NumberInputProps): JSX.Element;
  Prefix: typeof NumberInputPrefix;
}
```

Change line 190 from:
```typescript
export const NumberInput: NumberInputComponent = (props) => {
```
to:
```typescript
const NumberInputInner = (props: NumberInputProps): JSX.Element => {
```

Replace line 353:
```typescript
NumberInput.Prefix = NumberInputPrefix;
```
with (right after the closing of `NumberInputInner`):
```typescript
export const NumberInput = Object.assign(NumberInputInner, {
  Prefix: NumberInputPrefix,
});
```

**Step 2: Run existing tests**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/form-control/field/NumberInput.spec.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/field/NumberInput.tsx
git commit -m "refactor(solid): use Object.assign pattern for NumberInput compound component"
```

---

### Task 17: Compound component pattern — SharedDataSelectList (Finding 9, 5/6)

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx:78-82,84,277-280`
- Test: `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx`

**Step 1: Fix compound pattern**

Remove lines 78-82 (interface):
```typescript
export interface SharedDataSelectListComponent {
  <TItem>(props: SharedDataSelectListProps<TItem>): JSX.Element;
  ItemTemplate: typeof SharedDataSelectListItemTemplate;
  Filter: typeof SharedDataSelectListFilter;
}
```

Change line 84 from:
```typescript
export const SharedDataSelectList: SharedDataSelectListComponent = (<TItem,>(
```
to:
```typescript
const SharedDataSelectListInner = (<TItem,>(
```

Change line 277 from:
```typescript
}) as SharedDataSelectListComponent;
```
to:
```typescript
});
```

Replace lines 279-280:
```typescript
SharedDataSelectList.ItemTemplate = SharedDataSelectListItemTemplate;
SharedDataSelectList.Filter = SharedDataSelectListFilter;
```
with:
```typescript
export const SharedDataSelectList = Object.assign(SharedDataSelectListInner, {
  ItemTemplate: SharedDataSelectListItemTemplate,
  Filter: SharedDataSelectListFilter,
});
```

**Step 2: Run existing tests**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/features/shared-data/SharedDataSelectList.spec.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx
git commit -m "refactor(solid): use Object.assign pattern for SharedDataSelectList"
```

---

### Task 18: Compound component pattern — Select.Item (Finding 9, 6/6)

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx:147-149,167`
- Test: `packages/solid/tests/components/form-control/select/Select.spec.tsx`

**Step 1: Fix compound pattern**

Remove lines 147-149 (interface):
```typescript
interface SelectItemComponent<TValue = unknown> extends ParentComponent<SelectItemProps<TValue>> {
  Children: typeof SelectItemChildren;
}
```

Change line 167 from:
```typescript
const SelectItem: SelectItemComponent = <TValue,>(
```
to:
```typescript
const SelectItemInner = <TValue,>(
```

Find the closing of SelectItemInner (around line 240) and add after it:
```typescript
const SelectItem = Object.assign(SelectItemInner, {
  Children: SelectItemChildren,
});
```

The main export at line 715 uses `Item: SelectItem` — this reference is unchanged since the variable name is the same.

**Step 2: Run existing tests**

Run: `pnpm -F @simplysm/solid exec vitest run tests/components/form-control/select/`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/components/form-control/select/Select.tsx
git commit -m "refactor(solid): use Object.assign pattern for Select.Item"
```

---

### Task 19: SharedDataProvider lifecycle refactoring (Finding 2)

Extract per-key logic into `createSharedDataEntry` with state machine lifecycle.

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx`
- Test: `packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx`

`SharedDataChangeEvent` (`packages/solid/src/providers/shared-data/SharedDataChangeEvent.ts`) — event class used for WebSocket listener registration to receive shared data change notifications.

**Step 1: Write failing test for error recovery**

Add to `SharedDataProvider.spec.tsx`. Check how the existing tests set up the mock service client and adapt:

```typescript
it("retries initialization after error on next access", async () => {
  const fetchMock = vi.fn<[], Promise<TestUser[]>>()
    .mockRejectedValueOnce(new Error("Network error"))
    .mockResolvedValueOnce([{ id: 1, name: "Alice" }]);

  // Use the existing test helper pattern to render with mocked providers
  // Configure shared data with the failing fetch
  let sharedData: any;
  render(() => (
    <MockProviders>
      <SharedDataProvider>
        <TestConsumer onData={(d) => { sharedData = d; }} />
      </SharedDataProvider>
    </MockProviders>
  ));

  // Configure and trigger first access
  sharedData.configure((defs: any) => ({
    ...defs,
    users: {
      fetch: fetchMock,
      getKey: (item: TestUser) => item.id,
      orderBy: [],
    },
  }));

  // First access — triggers initialization, fetch fails
  sharedData.users.items();
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

  // Wait for error to propagate
  await new Promise((r) => setTimeout(r, 50));

  // Second access — should retry since state is "error"
  sharedData.users.items();
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});
```

Adapt the mock patterns to match the existing test file structure (check `createMockServiceClient`, `createMockNotification` helpers).

**Step 2: Run test to verify it fails**

Run: `pnpm -F @simplysm/solid exec vitest run tests/providers/shared-data/SharedDataProvider.spec.tsx`
Expected: FAIL — current code's `initialized = false` in catch only covers addListener failure, and loadData errors don't reset the flag

**Step 3: Extract createSharedDataEntry**

Refactor `SharedDataProvider.tsx`. The key changes:

1. Add state type at top of file:
```typescript
type EntryState = "idle" | "initializing" | "ready" | "error";
```

2. Inside `SharedDataProvider`, create the extraction function. It must be INSIDE the component because it needs access to `setBusyCount`, `versionMap`, `disposed`, `logger`, `notification`, and `ordering`:

```typescript
function createSharedDataEntry(
  name: string,
  def: SharedDataDefinition<unknown>,
  client: ReturnType<typeof serviceClient.get>,
): SharedDataAccessor<unknown> & { cleanup(): void } {
  const [items, setItems] = createSignal<unknown[]>([]);
  let state: EntryState = "idle";
  let listenerKey: string | undefined;

  const itemMap = createMemo(() => {
    const map = new Map<string | number, unknown>();
    for (const item of items()) {
      map.set(def.getKey(item as never), item);
    }
    return map;
  });

  async function loadData(changeKeys?: Array<string | number>): Promise<void> {
    const currentVersion = (versionMap.get(name) ?? 0) + 1;
    versionMap.set(name, currentVersion);
    setBusyCount((c) => c + 1);
    try {
      const resData = await def.fetch(changeKeys);
      if (versionMap.get(name) !== currentVersion) return;
      if (!changeKeys) {
        setItems(ordering(resData, def.orderBy));
      } else {
        setItems((prev) => {
          const filtered = prev.filter((item) => !changeKeys.includes(def.getKey(item as never)));
          filtered.push(...resData);
          return ordering(filtered, def.orderBy);
        });
      }
    } catch (err) {
      logger.error(`SharedData '${name}' fetch failed:`, err);
      notification.danger(
        "Shared data load failed",
        err instanceof Error ? err.message : `Error occurred while loading '${name}' data.`,
      );
      throw err; // Re-throw so initialize() catches it
    } finally {
      setBusyCount((c) => c - 1);
    }
  }

  async function initialize(): Promise<void> {
    if (state !== "idle" && state !== "error") return;
    state = "initializing";
    try {
      const key = await client.addListener(
        SharedDataChangeEvent,
        { name, filter: def.filter },
        async (changeKeys) => { await loadData(changeKeys as Array<string | number> | undefined); },
      );
      if (disposed) {
        void client.removeListener(key);
        return;
      }
      listenerKey = key;
      await loadData();
      state = "ready";
    } catch {
      state = "error";
    }
  }

  function cleanup(): void {
    if (listenerKey != null) {
      void client.removeListener(listenerKey);
    }
  }

  return {
    items: () => { void initialize(); return items(); },
    get: (key: string | number | undefined) => {
      void initialize();
      if (key === undefined) return undefined;
      return itemMap().get(key);
    },
    emit: async (changeKeys?: Array<string | number>) => {
      await client.emitEvent(
        SharedDataChangeEvent,
        (info) => info.name === name && obj.equal(info.filter, def.filter),
        changeKeys,
      );
    },
    getKey: def.getKey,
    itemSearchText: def.itemSearchText,
    isItemHidden: def.isItemHidden,
    getParentKey: def.getParentKey,
    cleanup,
  };
}
```

3. Simplify `configure()`:
```typescript
const entries = new Map<string, ReturnType<typeof createSharedDataEntry>>();

function configure(fn: (origin: Record<string, SharedDataDefinition<unknown>>) => Record<string, SharedDataDefinition<unknown>>): void {
  if (configured) throw new Error("SharedDataProvider: configure() can only be called once");
  configured = true;
  const definitions = fn({});
  currentDefinitions = definitions;

  for (const [name, def] of Object.entries(definitions)) {
    const client = serviceClient.get(def.serviceKey ?? "default");
    const entry = createSharedDataEntry(name, def, client);
    entries.set(name, entry);
    accessors[name] = entry;
  }
}
```

4. Simplify `onCleanup`:
```typescript
onCleanup(() => {
  disposed = true;
  for (const entry of entries.values()) {
    entry.cleanup();
  }
});
```

5. Remove the old `signalMap`, `memoMap`, `listenerKeyMap` maps and the old `loadData` and `ensureInitialized` functions since they are now encapsulated in `createSharedDataEntry`.

**Step 4: Run all SharedDataProvider tests**

Run: `pnpm -F @simplysm/solid exec vitest run tests/providers/shared-data/SharedDataProvider.spec.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/providers/shared-data/SharedDataProvider.tsx packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx
git commit -m "refactor(solid): extract createSharedDataEntry with state machine lifecycle"
```

---

### Task 20: Final verification

**Step 1: Run full typecheck**

Run: `pnpm -F @simplysm/solid exec tsc --noEmit`
Expected: PASS

**Step 2: Run all tests**

Run: `pnpm -F @simplysm/solid exec vitest run`
Expected: ALL PASS

**Step 3: Final commit if needed**

```bash
git status
# If there are fixup changes:
git add -A packages/solid
git commit -m "fix(solid): address remaining issues from review fixes"
```
