# Solid Review Round 2 — Fix Design

Date: 2026-03-06

## Overview

`packages/solid` 코드 리뷰에서 발견된 7개 finding에 대한 수정 설계.

## Findings

### Finding 2: SharedDataProvider `wait()` premature resolve

**File**: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx:278-280`

**Problem**: `busyCount` starts at 0. `wait()` checks `busyCount() <= 0`. If called after `configure()` but before any `items()`/`get()` accessor triggers lazy init, it resolves immediately with no data loaded.

**Fix**: In `configure()`, call `void entry.initialize()` for each entry immediately (eager init). This way `busyCount` increments before any `wait()` call, so `wait()` correctly waits for all fetches to complete.

- Add `initialize` to `createSharedDataEntry` return type
- In `configure()` loop, add `void entry.initialize()` after creating each entry
- Keep `void initialize()` in `items()`/`get()` accessors (idempotent — returns early if not idle)

### Finding 3: Kanban generic naming inconsistency

**File**: `packages/solid/src/components/data/kanban/Kanban.tsx:33-95`

**Problem**: Exported interfaces use bare `L`/`TCard`, component props use `TLaneValue`/`TCardValue`. Inconsistent within same file, violates T-prefix convention.

**Fix**: Rename all generics consistently:
- `L` → `TLaneValue`
- `TCard` → `TCardValue`
- Apply to all interfaces and component signatures in the file

### Finding 6: DataSheet `renderHeaderCell` 142-line nested function

**File**: `packages/solid/src/components/data/sheet/DataSheet.tsx:472-614`

**Problem**: Mixes fixed-column style calculation, sort state display, resize interaction in one 142-line closure.

**Fix**: Extract to `useDataSheetHeaderCell` hook in `hooks/` directory, following existing `useDataSheetReorder.ts` pattern.

New file: `packages/solid/src/components/data/sheet/hooks/useDataSheetHeaderCell.ts`

### Finding 8: CrudSheet `busyCount` try/catch/finally pattern scattered 7x

**File**: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:150-331`

**Problem**: 7 async handlers each manually manage busyCount increment/decrement, error notification, and optional refresh.

**Fix**: Extract local `withBusy` helper function within CrudSheet:

```ts
async function withBusy<T>(fn: () => Promise<T>): Promise<T | undefined> {
  setBusyCount(c => c + 1);
  try {
    return await fn();
  } catch (err) {
    logger.error(...);
    notification.danger(...);
    return undefined;
  } finally {
    setBusyCount(c => c - 1);
  }
}
```

### Finding 10: Barcode empty catch swallows all errors

**File**: `packages/solid/src/components/display/Barcode.tsx:38-40`

**Problem**: `catch { containerRef.innerHTML = ""; }` — no error feedback for invalid barcode type/value.

**Fix**: Add `console.warn("Barcode render failed:", err)` before clearing innerHTML.

### Finding 11: `DataSheet.autoSelect` single-value string literal type

**File**: `packages/solid/src/components/data/sheet/DataSheet.types.ts:28`

**Problem**: `autoSelect?: "click"` — functionally a boolean but reads as an enum.

**Fix**: Change to `autoSelect?: boolean`. Update usage from `=== "click"` to truthy check.

### Finding 12: `isItemSelectable` boolean|string return semantics

**File**: `packages/solid/src/components/data/sheet/DataSheet.types.ts:29`

**Problem**: String return means "not selectable, with tooltip reason" — not guessable from type alone.

**Fix**: Add JSDoc explaining the semantics:

```ts
/**
 * Determines if an item can be selected.
 * - `true` → selectable
 * - `false` → not selectable
 * - `string` → not selectable, string shown as tooltip explaining why
 */
isItemSelectable?: (item: TItem) => boolean | string;
```
