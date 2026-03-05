# @simplysm/solid API Naming Standardization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Rename DataSheet, CrudSheet, and StatePreset props to match industry standards.

**Architecture:** Pure identifier renames across types → hooks → components → wrappers → tests → demos. No logic changes. Layer-by-layer approach following dependency order.

**Tech Stack:** SolidJS, TypeScript, Vitest

---

## Rename Map

| Current | New | Components |
|---------|-----|------------|
| `selectMode` | `selectionMode` | DataSheet, CrudSheet |
| `selectedItems` / `onSelectedItemsChange` | `selection` / `onSelectionChange` | DataSheet, CrudSheet (prop + internal) |
| `persistKey` | `storageKey` | DataSheet, CrudSheet |
| `itemsPerPage` | `pageSize` | DataSheet |
| `presetKey` | `storageKey` | StatePreset |

---

### Task 1: Rename DataSheet types and hooks

**Files:**
- Modify: `packages/solid/src/components/data/sheet/types.ts:7-29`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetSelection.ts:5-9`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetPaging.ts:4-11`
- Modify: `packages/solid/src/components/data/sheet/hooks/useDataSheetFixedColumns.ts:5-8`
- Test: `packages/solid/tests/components/data/sheet/hooks/useDataSheetSelection.spec.ts`
- Test: `packages/solid/tests/components/data/sheet/hooks/useDataSheetPaging.spec.ts`
- Test: `packages/solid/tests/components/data/sheet/hooks/useDataSheetFixedColumns.spec.ts`

**Step 1: Rename props in types.ts**

In `DataSheetProps`, apply these renames:
- `persistKey` → `storageKey`
- `itemsPerPage` → `pageSize`
- `selectMode` → `selectionMode`
- `selectedItems` → `selection`
- `onSelectedItemsChange` → `onSelectionChange`

**Step 2: Rename in useDataSheetSelection.ts**

In `UseDataSheetSelectionProps`:
- `selectMode` → `selectionMode`
- `selectedItems` → `selection`
- `onSelectedItemsChange` → `onSelectionChange`

In `UseDataSheetSelectionReturn`:
- `selectedItems` → `selection`
- `setSelectedItems` → `setSelection`

Update all internal references to match (e.g., `props.selectMode` → `props.selectionMode`, `props.selectedItems` → `props.selection`).

**Step 3: Rename in useDataSheetPaging.ts**

In `UseDataSheetPagingOptions`:
- `itemsPerPage` → `pageSize`

Update internal references: `options.itemsPerPage()` → `options.pageSize()`.

**Step 4: Rename in useDataSheetFixedColumns.ts**

In `UseDataSheetFixedColumnsProps`:
- `selectMode` → `selectionMode`

Update internal reference: `props.selectMode` → `props.selectionMode`.

**Step 5: Update test files**

Apply the same renames in all three hook spec files:
- `useDataSheetSelection.spec.ts`: `selectMode` → `selectionMode`, `selectedItems` → `selection`, `onSelectedItemsChange` → `onSelectionChange`, `result.selectedItems()` → `result.selection()`, `result.setSelectedItems` → `result.setSelection`
- `useDataSheetPaging.spec.ts`: `itemsPerPage` → `pageSize`
- `useDataSheetFixedColumns.spec.ts`: `selectMode` → `selectionMode`

**Step 6: Run tests**

Run: `pnpm vitest packages/solid/tests/components/data/sheet/hooks/ --run`
Expected: ALL PASS

---

### Task 2: Rename DataSheet component

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:89-116,274-278,381-398,403,591,628-630,881`
- Test: `packages/solid/tests/components/data/sheet/DataSheet.spec.tsx`

**Step 1: Update splitProps keys in DataSheet.tsx**

In the `splitProps` call (~line 89), rename:
- `"persistKey"` → `"storageKey"`
- `"itemsPerPage"` → `"pageSize"`
- `"selectMode"` → `"selectionMode"`
- `"selectedItems"` → `"selection"`
- `"onSelectedItemsChange"` → `"onSelectionChange"`

**Step 2: Update all local.xxx references in DataSheet.tsx**

Search-and-replace within the file:
- `local.persistKey` → `local.storageKey`
- `local.itemsPerPage` → `local.pageSize`
- `local.selectMode` → `local.selectionMode`
- `local.selectedItems` → `local.selection`
- `local.onSelectedItemsChange` → `local.onSelectionChange`

Also update the hook call sites that pass these props:
- `useDataSheetPaging`: `itemsPerPage: () => local.itemsPerPage` → `pageSize: () => local.pageSize`
- `useDataSheetSelection`: `selectMode` → `selectionMode`, `selectedItems` → `selection`, `onSelectedItemsChange` → `onSelectionChange`
- `useDataSheetFixedColumns`: `selectMode` → `selectionMode`

And update the return values used from `useDataSheetSelection`:
- `selectedItems` → `selection`
- `setSelectedItems` → `setSelection`

**Step 3: Update DataSheet.spec.tsx**

Rename all occurrences:
- `persistKey` → `storageKey`
- `itemsPerPage` → `pageSize`

**Step 4: Run tests**

Run: `pnpm vitest packages/solid/tests/components/data/sheet/ --run`
Expected: ALL PASS

---

### Task 3: Rename CrudSheet types, component, and tests

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/types.ts:49-51,84,96`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:72,87,99,125,144,272,287,376,441,561-562,580-581,614,621-630,748,750,753,755`
- Test: `packages/solid/tests/components/features/crud-sheet/CrudSheet.spec.tsx`

**Step 1: Update CrudSheet types.ts**

In `CrudSheetContext`:
- `selectedItems()` → `selection()`

In `CrudSheetBaseProps`:
- `persistKey` → `storageKey`
- `selectMode` → `selectionMode`

**Step 2: Update CrudSheet.tsx**

In `splitProps`:
- `"persistKey"` → `"storageKey"`
- `"selectMode"` → `"selectionMode"`

Internal state and references:
- `const [selectedItems, setSelectedItems]` → `const [selection, setSelection]`
- All `selectedItems()` → `selection()`
- All `setSelectedItems(...)` → `setSelection(...)`
- `local.selectMode` → `local.selectionMode`
- `local.persistKey` → `local.storageKey`

DataSheet prop passing:
- `persistKey={...}` → `storageKey={...}`
- `selectMode={...}` → `selectionMode={...}`
- `selectedItems={...}` → `selection={...}`
- `onSelectedItemsChange={...}` → `onSelectionChange={...}`

CrudSheetContext value:
- `selectedItems` → `selection`

Also rename the `handleSelectedItemsChange` function → `handleSelectionChange`.

**Step 3: Update CrudSheet.spec.tsx**

- `selectMode=` → `selectionMode=`

**Step 4: Run tests**

Run: `pnpm vitest packages/solid/tests/components/features/crud-sheet/ --run`
Expected: ALL PASS

---

### Task 4: Rename wrapper components and their tests

**Files:**
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx`
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx`
- Test: `packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx`
- Test: `packages/solid/tests/components/features/shared-data/SharedDataSelect.spec.tsx`

**Step 1: Update DataSelectButton.tsx**

- `selectMode:` in interface → `selectionMode:`
- `selectMode:` in CrudSheet prop passing → `selectionMode:`

**Step 2: Update SharedDataSelect.tsx**

- `selectMode:` in CrudSheet prop passing → `selectionMode:`

**Step 3: Update DataSelectButton.spec.tsx**

- `selectMode` → `selectionMode` (prop references and assertions)
- `data-testid="select-mode"` and related → `data-testid="selection-mode"` (or keep test IDs, just update prop name in mock)

**Step 4: Update SharedDataSelect.spec.tsx**

- `selectMode` → `selectionMode` (prop references and assertions)

**Step 5: Run tests**

Run: `pnpm vitest packages/solid/tests/components/features/data-select-button/ packages/solid/tests/components/features/shared-data/ --run`
Expected: ALL PASS

---

### Task 5: Rename StatePreset

**Files:**
- Modify: `packages/solid/src/components/form-control/state-preset/StatePreset.tsx:26,73,87`

**Step 1: Update StatePreset.tsx**

In `StatePresetProps`:
- `presetKey` → `storageKey`

In `splitProps`:
- `"presetKey"` → `"storageKey"`

In `useSyncConfig` call:
- `local.presetKey` → `local.storageKey`

**Step 2: Manual verification**

StatePreset has no dedicated spec file. Verify manually:
- TypeCheck passes (task 6 will confirm)

---

### Task 6: Update demo pages

**Files:**
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetFullPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/CrudSheetPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/StatePresetPage.tsx`

**Step 1: Update all demo pages**

Apply the rename map to each demo page:
- `persistKey=` → `storageKey=`
- `itemsPerPage=` → `pageSize=`
- `selectMode=` → `selectionMode=`
- `selectedItems=` → `selection=`
- `onSelectedItemsChange=` → `onSelectionChange=`
- `presetKey=` → `storageKey=`

**Step 2: Run all tests**

Run: `pnpm vitest packages/solid/tests/ --run`
Expected: ALL PASS
