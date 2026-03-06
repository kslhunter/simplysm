# Array Extensions

Imported as a side effect when you import anything from `@simplysm/core-common`. Adds methods to `Array.prototype` and `ReadonlyArray`.

```typescript
import "@simplysm/core-common"; // or any named import triggers the side effect
```

## Readonly Array Methods

These methods return new arrays or values and do not mutate the original.

| Method | Signature | Description |
|--------|-----------|-------------|
| `single` | `(predicate?) => T \| undefined` | Returns the sole matching element. Throws `ArgumentError` if more than one match. |
| `first` | `(predicate?) => T \| undefined` | Returns the first matching element. |
| `last` | `(predicate?) => T \| undefined` | Returns the last matching element. |
| `filterExists` | `() => NonNullable<T>[]` | Removes `null`/`undefined` entries. |
| `filterAsync` | `(predicate) => Promise<T[]>` | Async filter (sequential). |
| `ofType` | `(type) => N[]` | Filters elements by primitive type string or constructor. |
| `mapAsync` | `(selector) => Promise<R[]>` | Async map (sequential). |
| `mapMany` | `(selector?) => R[]` | Flattens one level (with optional transform). |
| `mapManyAsync` | `(selector?) => Promise<R[]>` | Async map-and-flatten (sequential). |
| `parallelAsync` | `(fn) => Promise<R[]>` | Parallel async map (`Promise.all`). |
| `groupBy` | `(keySelector, valueSelector?) => { key, values }[]` | Groups elements by key. Supports object keys (O(n²)) and primitive keys (O(n)). |
| `toMap` | `(keySelector, valueSelector?) => Map<K, V>` | Converts to `Map`. Throws on duplicate key. |
| `toMapAsync` | `(keySelector, valueSelector?) => Promise<Map<K, V>>` | Async version of `toMap`. |
| `toArrayMap` | `(keySelector, valueSelector?) => Map<K, V[]>` | Converts to `Map` where values are arrays. |
| `toSetMap` | `(keySelector, valueSelector?) => Map<K, Set<V>>` | Converts to `Map` where values are sets. |
| `toMapValues` | `(keySelector, valueSelector) => Map<K, V>` | Groups by key, then reduces each group to a single value. |
| `toObject` | `(keySelector, valueSelector?) => Record<string, V>` | Converts to plain object. Throws on duplicate key. |
| `toTree` | `(keyProp, parentKey) => TreeArray<T>[]` | Builds a tree from a flat list using key/parentKey relationships. |
| `distinct` | `(options?) => T[]` | Returns unique elements. Options: `matchAddress` (reference), `keyFn` (custom key). |
| `orderBy` | `(selector?) => T[]` | Sorts ascending (new array). |
| `orderByDesc` | `(selector?) => T[]` | Sorts descending (new array). |
| `diffs` | `(target, options?) => ArrayDiffsResult[]` | Compares two arrays (insert/delete/update). |
| `oneWayDiffs` | `(orgItems, key, options?) => ArrayOneWayDiffResult[]` | One-way diff (create/update/same). |
| `merge` | `(target, options?) => (T \| P)[]` | Merges two arrays using diffs. |
| `sum` | `(selector?) => number` | Sums numeric values. |
| `min` | `(selector?) => string \| number \| undefined` | Returns minimum value. |
| `max` | `(selector?) => string \| number \| undefined` | Returns maximum value. |
| `shuffle` | `() => T[]` | Returns a new randomly shuffled array. |

## Mutable Array Methods

These methods modify the original array in place.

| Method | Signature | Description |
|--------|-----------|-------------|
| `distinctThis` | `(options?) => T[]` | Removes duplicates in place. |
| `orderByThis` | `(selector?) => T[]` | Sorts ascending in place. |
| `orderByDescThis` | `(selector?) => T[]` | Sorts descending in place. |
| `insert` | `(index, ...items) => this` | Inserts items at an index. |
| `remove` | `(itemOrSelector) => this` | Removes items by value or predicate. |
| `toggle` | `(item) => this` | Adds item if absent, removes it if present. |
| `clear` | `() => this` | Removes all items. |

## Examples

```typescript
import { } from "@simplysm/core-common"; // triggers side effect

const items = [3, 1, 2, 1];
items.distinct(); // [3, 1, 2]
items.orderBy();  // [1, 1, 2, 3]

const users = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
users.single((u) => u.id === 1); // { id: 1, name: "Alice" }
users.toMap((u) => u.id);        // Map { 1 => { id: 1, ... }, 2 => { id: 2, ... } }
```

## Related Types

```typescript
import type { ArrayDiffsResult, ArrayOneWayDiffResult, TreeArray, ComparableType } from "@simplysm/core-common";
```

| Type | Description |
|------|-------------|
| `ArrayDiffsResult<TOriginal, TOther>` | Result of `arr.diffs()`: `{ source, target }` pairs where one may be `undefined` |
| `ArrayOneWayDiffResult<TItem>` | Result of `arr.oneWayDiffs()`: `{ type: "create" \| "update" \| "same", item, orgItem }` |
| `TreeArray<TNode>` | `TNode & { children: TreeArray<TNode>[] }` — result of `arr.toTree()` |
| `ComparableType` | `string \| number \| boolean \| DateTime \| DateOnly \| Time \| undefined` |
