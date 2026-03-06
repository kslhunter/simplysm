# core-* Packages Review Fixes Design

Based on sd-review findings for `packages/core-common`, `packages/core-browser`, and `packages/core-node`.

## Finding 1: `json.parse()` JSDoc Documentation

**File**: `packages/core-common/src/utils/json.ts:166-176`

Add to existing JSDoc `@remarks`:
```
All JSON null values are converted to undefined.
This is intentional for the simplysm framework's null-free convention.
```

No code change. Documentation only.

## Finding 2: `IndexedDbStore.withStore` Race Condition Fix

**File**: `packages/core-browser/src/utils/IndexedDbStore.ts:30-57`

Replace the current `result` variable + `.then()` + `tx.oncomplete` pattern:

1. `await fn(store)` directly to get result
2. Wait for `tx.oncomplete`/`tx.onerror` via separate Promise
3. On error: call `tx.abort()` explicitly, then `db.close()`
4. On success: wait for `tx.oncomplete`, then `db.close()` + return result

Internal callers (`get`, `put`, `getAll`) unchanged — same signature.

## Finding 3: `ArrayDiffs2Result` Type Rename

**Files**:
- `packages/core-common/src/extensions/arr-ext.types.ts:275` — definition
- `packages/core-common/src/extensions/arr-ext.ts` — implementation reference
- `packages/solid/src/components/features/crud-sheet/types.ts` — consumer
- `packages/core-common/docs/array-extensions.md` — docs

Rename `ArrayDiffs2Result` → `ArrayOneWayDiffResult`. Simple rename, no behavior change.

## Finding 4: `diffs()`/`merge()` Generic Constraint + Overload Split

**File**: `packages/core-common/src/extensions/arr-ext.types.ts:187-205`

Split into overloads:

```typescript
// Overload 1: no options (primitive arrays allowed)
diffs<TOtherItem>(target: TOtherItem[]): ArrayDiffsResult<TItem, TOtherItem>[];

// Overload 2: with keys (Record constraint)
diffs<TOtherItem extends Record<string, unknown>>(
  target: TOtherItem[],
  options: {
    keys: ((keyof TItem | keyof TOtherItem) & string)[];
    excludes?: ((keyof TItem | keyof TOtherItem) & string)[];
  },
): ArrayDiffsResult<TItem, TOtherItem>[];

// Overload 3: excludes only (Record constraint)
diffs<TOtherItem extends Record<string, unknown>>(
  target: TOtherItem[],
  options: {
    excludes: ((keyof TItem | keyof TOtherItem) & string)[];
  },
): ArrayDiffsResult<TItem, TOtherItem>[];
```

Same pattern for `merge()`.

**Implementation** (`arr-ext.ts`): Remove `as Record<string, unknown>` casts. Implementation signature uses the broadest type for runtime.

## Finding 5: `obj.ts` Remove `as unknown as` Cast

**File**: `packages/core-common/src/utils/obj.ts:73-80`

Replace:
```typescript
(cloned as unknown as Record<string, unknown>)[key] = cloneImpl(
  (source as unknown as Record<string, unknown>)[key], currPrevClones);
```

With `Object.defineProperty`:
```typescript
const desc = Object.getOwnPropertyDescriptor(source, key);
if (desc !== undefined) {
  Object.defineProperty(cloned, key, {
    ...desc,
    value: "value" in desc ? cloneImpl(desc.value, currPrevClones) : desc.value,
  });
}
```

No `as unknown as` needed. Handles getters correctly per clone's existing JSDoc.

## Finding 6: Single-Letter Generic Type Parameters

**10 files, 80+ locations**

Naming map:

| Current | New | Context |
|---------|-----|---------|
| `T` (array element) | `TItem` | arr-ext.ts, set-ext.ts |
| `T` (object) | `TObj` | obj.ts |
| `T` (Element) | `TEl` | element-ext.ts |
| `R` | `TResult` | arr-ext, obj |
| `K` (key) | `TKey` | arr-ext, map-ext, obj |
| `V` (value) | `TValue` | arr-ext, map-ext |
| `N` (narrowed) | `TNarrow` | arr-ext |
| `P` (prop/selected) | `TProp` / `TReturn` / `TParams` | arr-ext, worker/types |
| `K` (event name) | `TEventName` | event-emitter, worker |

**Files**:
- `packages/core-common/src/extensions/arr-ext.types.ts` (~20 locations)
- `packages/core-common/src/extensions/arr-ext.ts` (~35 locations)
- `packages/core-common/src/utils/obj.ts` (~8 locations)
- `packages/core-common/src/features/event-emitter.ts` (~4 locations)
- `packages/core-common/src/extensions/map-ext.ts` (~2 locations)
- `packages/core-common/src/extensions/set-ext.ts` (~2 locations)
- `packages/core-browser/src/extensions/element-ext.ts` (~6 locations)
- `packages/core-node/src/worker/types.ts` (~4 locations)
- `packages/core-node/src/worker/create-worker.ts` (~2 locations)

**Docs** to update: `array-extensions.md` (3), `types.md` (3)

## Finding 7: `distinct()`/`distinctThis()` Shared Helper

**File**: `packages/core-common/src/extensions/arr-ext.helpers.ts`

Add helper function:
```typescript
function getDistinctIndices<TItem>(
  items: readonly TItem[],
  options?: boolean | { matchAddress?: boolean; keyFn?: (item: TItem) => string | number },
): Set<number>
```

Consolidates the 3-branch deduplication logic (matchAddress, keyFn, default type-based) including all edge cases (-0 handling, symbol/function identity, deep object comparison).

- `distinct()` → builds new array from kept indices
- `distinctThis()` → splices non-kept indices in reverse order

## Finding 8: `fs.ts` + `path.ts` Namespace Pattern + Copy Helper

### 8a. Function Rename (remove prefix)

**fs.ts**: `fsExists` → `exists`, `fsCopy` → `copy`, etc. (29 functions)

**path.ts**: `pathPosix` → `posix`, `pathNorm` → `norm`, etc. (6 functions)

### 8b. index.ts Change

```typescript
// core-node/src/index.ts
export * as fs from "./utils/fs";
export * as path from "./utils/path";
```

### 8c. Consumer Import Migration (21 + 7 files)

```typescript
// Before:
import { fsCopy, fsExists, pathNorm } from "@simplysm/core-node";
// After:
import { fs, path } from "@simplysm/core-node";
fs.copy(...);
path.norm(...);
```

### 8d. `copy` sync/async Shared Helper

Extract directory traversal logic into private helper:

```typescript
interface CopyEntry {
  sourcePath: string;
  targetPath: string;
}

function collectCopyEntries(
  sourcePath: string,
  targetPath: string,
  children: string[],
  filter?: (absolutePath: string) => boolean,
): CopyEntry[]
```

`copySync`/`copy` only handle I/O dispatch.

## Impact Summary

| Package | Files Modified | Files Affected (consumers) |
|---------|---------------|---------------------------|
| core-common | ~12 source + 2 docs | 1 (solid crud-sheet types) |
| core-browser | 1 (IndexedDbStore) | 0 |
| core-node | 3 (fs, path, index) | 28 (21 fs + 7 path consumers) |
