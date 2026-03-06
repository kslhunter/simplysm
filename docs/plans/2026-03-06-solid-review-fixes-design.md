# Solid Package Review Fixes Design (Round 2)

## Overview

Design for 14 accepted findings from `packages/solid` comprehensive code review (round 2). Covers type safety, correctness, naming conventions, compound component patterns, and SharedDataProvider lifecycle refactoring.

## Section 1: Type/Name Cleanup (Findings 5, 8, 10, 13, 14, 15)

### Finding 5: `isItemSelectable` Type Change

Change `(item: TItem) => true | string` → `(item: TItem) => boolean | string`.

**Files:**
- `data/sheet/DataSheet.types.ts:29` — `DataSheetProps.isItemSelectable`
- `data/sheet/hooks/useDataSheetSelection.ts:9,15` — props type + `getItemSelectable` return type
- `features/crud-sheet/CrudSheet.types.ts:89` — `CrudSheetBaseProps.isItemSelectable`

No consumer code changes needed — all consumers already use `=== true` / `!== true` comparisons.

### Finding 8: Auxiliary File Renames

| Original | Target |
|----------|--------|
| `data/sheet/types.ts` | `data/sheet/DataSheet.types.ts` |
| `data/sheet/sheetUtils.ts` | `data/sheet/DataSheet.utils.ts` |
| `features/crud-detail/types.ts` | `features/crud-detail/CrudDetail.types.ts` |
| `features/crud-sheet/types.ts` | `features/crud-sheet/CrudSheet.types.ts` |

Update all import paths accordingly.

### Finding 10: DataSheetConfigDialog Internalization

- Remove `ConfigDialog: DataSheetConfigDialog` from `Object.assign` in `DataSheet.tsx:1025`
- Remove `export { DataSheetConfigDialog }` from `DataSheet.tsx:1027`
- Remove any re-export from `index.ts`

### Finding 13: `createTopbarActions` → `useTopbarActions`

Rename function and update all references:
- `Topbar.tsx:46` — definition
- `Topbar.tsx:49` — error message
- `CrudSheet.tsx:27,410` — import/call
- `CrudDetail.tsx:18,200` — import/call
- Test files: `TopbarActions.spec.tsx`, `createTopbarActions.spec.tsx` (rename to `useTopbarActions.spec.tsx`)
- `docs/layout.md`
- `index.ts` export
- `solid-demo/src/pages/layout/TopbarPage.tsx`

### Finding 14: `createAppStructure.ts` #region

Add #region blocks to 519-line file:
```
#region Types
#region Builder Functions
#region createAppStructure (main export)
```

### Finding 15: `Kanban.tsx` #region

Add #region blocks to 603-line file:
```
#region Types
#region KanbanCard
#region KanbanLane
#region KanbanBoard (main)
#region Export
```

## Section 2: Correctness Fixes (Findings 1, 4, 16)

### Finding 1: Combobox `allowsCustomValue` Safe Handling

**File:** `Combobox.tsx:346`

When `allowsCustomValue=true` and no `parseCustomValue` provided, treat custom value as undefined instead of unsafe cast:

```ts
// Before
const customValue = local.parseCustomValue ? local.parseCustomValue(query()) : (query() as TValue);
selectValue(customValue);

// After
if (local.parseCustomValue) {
  selectValue(local.parseCustomValue(query()));
} else {
  setInternalValue(undefined);
  setQuery("");
  setOpen(false);
}
```

### Finding 4: AddressSearch onerror

**File:** `AddressSearch.tsx:18-30`

Add `onerror` handler and `reject` path:

```ts
await new Promise<void>((resolve, reject) => {
  const scriptEl = document.createElement("script");
  scriptEl.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
  scriptEl.onload = (): void => { daum.postcode.load(() => { resolve(); }); };
  scriptEl.onerror = () => { reject(new Error("Failed to load Daum postcode script")); };
  document.head.appendChild(scriptEl);
});
```

### Finding 16: PrintProvider Canvas Context Null Check

**File:** `PrintProvider.tsx:250`

```ts
// Before
const ctx = sliceCanvas.getContext("2d")!;

// After
const ctx = sliceCanvas.getContext("2d");
if (!ctx) throw new Error("Failed to get 2D canvas context");
```

## Section 3: Type Safety (Findings 6, 7, 11)

### Finding 6: SharedDataSelect TKey Generic

**File:** `SharedDataSelect.tsx`

Add `TKey` generic parameter:

```ts
export type SharedDataSelectProps<
  TItem,
  TKey = string | number,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> = {
  data: SharedDataAccessor<TItem>;
  value?: TKey | TKey[];
  onValueChange?: (value: TKey | TKey[] | undefined) => void;
  // ...rest
};
```

Update internal functions (`normalizeKeys`, `itemToKey`) to use `TKey` instead of `unknown`.

### Finding 7: `as unknown as` Removal

**SharedDataSelect.tsx:180** — Remove `as unknown as SelectProps` by properly typing `selectProps` after TKey generic is added.

**DataSelectButton.tsx:216** — Change `[] as unknown as TKey[]` → `[] as TKey[]` (safe narrowing of empty array).

### Finding 11: `any` → Proper Types

1. **useDataSheetFixedColumns.ts:8** — `(event: any)` → `(event: DataSheetReorderEvent<TItem>)`
2. **AddressSearch.tsx:35,59** — Define `DaumPostcodeResult` and `DaumPostcodeSize` interfaces for Daum API
3. **CrudSheet.tsx:221** — `setItems(index as any, ...)` → use `produce()` or properly typed store path
4. **DataSelectButton.tsx:207** — `as any` → proper generic typing via TKey union

## Section 4: Pattern Normalization (Finding 9)

Remove separate interface declarations + type assertions from 6 compound components. Use `Object.assign` for TypeScript inference (matching Combobox/Dialog pattern):

1. **List.tsx** — Remove `interface ListComponent`, use `Object.assign(ListBase, { Item: ListItem })`
2. **CheckboxGroup.tsx** — Remove `interface CheckboxGroupComponent`, remove `as` cast from Object.assign
3. **RadioGroup.tsx** — Same pattern as CheckboxGroup
4. **NumberInput.tsx** — Remove `interface NumberInputComponent`, extract inner function, use Object.assign
5. **SharedDataSelectList.tsx** — Remove `interface SharedDataSelectListComponent`, remove `as` cast
6. **Select.tsx (SelectItemComponent)** — Remove `interface SelectItemComponent`, use Object.assign

## Section 5: SharedDataProvider Lifecycle Refactoring (Finding 2)

### State Machine

Replace `initialized: boolean` with per-entry state:

```ts
type EntryState = "idle" | "initializing" | "ready" | "error";
```

### `createSharedDataEntry` Extraction

Extract per-key logic from `configure()` into a standalone function:

```ts
function createSharedDataEntry(
  name: string,
  def: SharedDataDefinition<unknown>,
  client: ServiceClient,
): SharedDataAccessor<unknown> & { cleanup(): void } {
  const [items, setItems] = createSignal<unknown[]>([]);
  let state: EntryState = "idle";
  let listenerKey: string | undefined;

  const itemMap = createMemo(() => { ... });

  // Serialized initialization: addListener completes before loadData
  async function initialize(): Promise<void> {
    if (state !== "idle" && state !== "error") return;
    state = "initializing";
    try {
      listenerKey = await client.addListener(SharedDataChangeEvent, ...);
      if (disposed) { void client.removeListener(listenerKey); return; }
      await loadData();
      state = "ready";
    } catch (err) {
      state = "error";
      logger.error(...);
    }
  }

  // Data loading with version counter (preserved from original)
  async function loadData(changeKeys?: ...): Promise<void> { ... }

  function cleanup(): void {
    if (listenerKey != null) void client.removeListener(listenerKey);
  }

  return {
    items: () => { void initialize(); return items(); },
    get: (key) => { void initialize(); ... },
    emit: async (changeKeys) => { ... },
    getKey: def.getKey,
    itemSearchText: def.itemSearchText,
    isItemHidden: def.isItemHidden,
    getParentKey: def.getParentKey,
    cleanup,
  };
}
```

### Key Improvements

1. **State machine**: error state allows retry on next access
2. **Serialization**: addListener completes before loadData starts (await)
3. **Per-key encapsulation**: each entry manages its own state independently
4. **Cleanup integration**: `onCleanup` calls each entry's `cleanup()`

### External API Unchanged

`SharedDataAccessor` interface (items, get, emit, getKey, etc.), `wait()`, `busy()`, `configure()` signatures remain identical.
