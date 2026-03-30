# Array Extensions

Prototype extensions added to both `Array` and `ReadonlyArray`. Available after importing `@simplysm/core-common`.

Also exports helper functions and result types.

## ReadonlyArray Extensions

These methods do not mutate the original array.

### `single`

Return the single element matching the predicate. Returns `undefined` if no match. Throws `ArgumentError` if more than one element matches.

```typescript
single(predicate?: (item: T, index: number) => boolean): T | undefined;
```

### `first`

Return the first element, or the first element matching the predicate.

```typescript
first(predicate?: (item: T, index: number) => boolean): T | undefined;
```

### `last`

Return the last element, or the last element matching the predicate.

```typescript
last(predicate?: (item: T, index: number) => boolean): T | undefined;
```

### `filterExists`

Remove all `null` and `undefined` elements.

```typescript
filterExists(): NonNullable<T>[];
```

### `ofType`

Filter elements by type. Accepts a `PrimitiveTypeStr` (e.g., `"string"`, `"DateTime"`) or a constructor function.

```typescript
ofType<TKey extends PrimitiveTypeStr>(type: TKey): Extract<T, PrimitiveTypeMap[TKey]>[];
ofType<TNarrow extends T>(type: Type<TNarrow>): TNarrow[];
```

### `filterAsync`

Async sequential filter. Evaluates the predicate for each element in order.

```typescript
filterAsync(predicate: (item: T, index: number) => Promise<boolean>): Promise<T[]>;
```

### `mapAsync`

Async sequential map. Evaluates the selector for each element in order.

```typescript
mapAsync<R>(selector: (item: T, index: number) => Promise<R>): Promise<R[]>;
```

### `mapMany`

Flatten a nested array, or map then flatten. Filters out null/undefined from the result.

```typescript
mapMany(): T extends readonly (infer U)[] ? U[] : T;
mapMany<R>(selector: (item: T, index: number) => R[]): R[];
```

### `mapManyAsync`

Async map then flatten.

```typescript
mapManyAsync<R>(selector: (item: T, index: number) => Promise<R[]>): Promise<R[]>;
```

### `parallelAsync`

Parallel async map using `Promise.all`. All promises run concurrently.

```typescript
parallelAsync<R>(fn: (item: T, index: number) => Promise<R>): Promise<R[]>;
```

### `groupBy`

Group elements by a key selector. Supports object keys via deep comparison (O(n^2)). Primitive keys use Map-based O(n) lookup.

```typescript
groupBy<K>(keySelector: (item: T, index: number) => K): { key: K; values: T[] }[];
groupBy<K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): { key: K; values: V[] }[];
```

### `toMap`

Convert to a `Map`. Throws `ArgumentError` on duplicate keys.

```typescript
toMap<K>(keySelector: (item: T, index: number) => K): Map<K, T>;
toMap<K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): Map<K, V>;
```

### `toMapAsync`

Async version of `toMap`.

```typescript
toMapAsync<K>(keySelector: (item: T, index: number) => Promise<K>): Promise<Map<K, T>>;
toMapAsync<K, V>(
  keySelector: (item: T, index: number) => Promise<K> | K,
  valueSelector: (item: T, index: number) => Promise<V> | V,
): Promise<Map<K, V>>;
```

### `toArrayMap`

Convert to a `Map<K, V[]>`. Multiple items with the same key are grouped into an array.

```typescript
toArrayMap<K>(keySelector: (item: T, index: number) => K): Map<K, T[]>;
toArrayMap<K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): Map<K, V[]>;
```

### `toSetMap`

Convert to a `Map<K, Set<V>>`.

```typescript
toSetMap<K>(keySelector: (item: T, index: number) => K): Map<K, Set<T>>;
toSetMap<K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): Map<K, Set<V>>;
```

### `toMapValues`

Group by key, then aggregate each group's items using a value selector.

```typescript
toMapValues<K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (items: T[]) => V,
): Map<K, V>;
```

### `toObject`

Convert to a plain object `Record<string, V>`. Throws `ArgumentError` on duplicate keys.

```typescript
toObject(keySelector: (item: T, index: number) => string): Record<string, T>;
toObject<V>(
  keySelector: (item: T, index: number) => string,
  valueSelector: (item: T, index: number) => V,
): Record<string, V>;
```

### `toTree`

Convert a flat array to a tree structure. Items where `parentKey` is null/undefined become root nodes. Uses O(n) Map-based indexing internally.

```typescript
toTree<K extends keyof T, P extends keyof T>(keyProp: K, parentKey: P): TreeArray<T>[];
```

### `distinct`

Remove duplicates (returns a new array).

```typescript
distinct(
  options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number },
): T[];
```

| Option | Description |
|--------|-------------|
| `true` or `{ matchAddress: true }` | Reference equality (Set-based, O(n)) |
| `{ keyFn }` | Custom key function (O(n)) |
| Default (no options) | Deep equality for objects (O(n^2)), type-based for primitives (O(n)) |

### `orderBy`

Sort ascending (returns a new array). Supports `string`, `number`, `DateTime`, `DateOnly`, `Time`.

```typescript
orderBy(selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined): T[];
```

### `orderByDesc`

Sort descending (returns a new array).

```typescript
orderByDesc(selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined): T[];
```

### `diffs`

Compare this array (source) with a target array. Returns a list of insert/delete/update operations.

```typescript
diffs<P>(target: P[]): ArrayDiffsResult<T, P>[];
diffs<P extends Record<string, unknown>>(
  target: P[],
  options: { keys: string[]; excludes?: string[] },
): ArrayDiffsResult<T, P>[];
diffs<P extends Record<string, unknown>>(
  target: P[],
  options: { excludes: string[] },
): ArrayDiffsResult<T, P>[];
```

| Option | Description |
|--------|-------------|
| `keys` | Properties to use for matching source to target items |
| `excludes` | Properties to ignore in equality comparison |

### `oneWayDiffs`

One-way diff: compare this array against original items. Returns create/update/same results.

```typescript
oneWayDiffs<K extends keyof T>(
  orgItems: T[] | Map<T[K], T>,
  keyPropNameOrGetValFn: K | ((item: T) => string | number | undefined),
  options?: { includeSame?: boolean; excludes?: string[]; includes?: string[] },
): ArrayOneWayDiffResult<T>[];
```

### `merge`

Merge this array with a target array. Matched items are deep-merged; unmatched target items are appended.

```typescript
merge<P>(target: P[]): (T | P | (T & P))[];
merge<P extends Record<string, unknown>>(
  target: P[],
  options: { keys: string[]; excludes?: string[] },
): (T | P | (T & P))[];
merge<P extends Record<string, unknown>>(
  target: P[],
  options: { excludes: string[] },
): (T | P | (T & P))[];
```

### `sum`

Sum of elements. If no selector is provided, elements must be numbers.

```typescript
sum(selector?: (item: T, index: number) => number): number;
```

Returns `0` for empty arrays.

### `min`

Minimum element or minimum selected value.

```typescript
min(): T extends number | string ? T | undefined : never;
min<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;
```

### `max`

Maximum element or maximum selected value.

```typescript
max(): T extends number | string ? T | undefined : never;
max<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;
```

### `shuffle`

Return a new array with elements in random order (Fisher-Yates algorithm).

```typescript
shuffle(): T[];
```

---

## Mutable Array Extensions

These methods mutate the original array in-place.

### `distinctThis`

Remove duplicates in-place. Same options as `distinct`.

```typescript
distinctThis(
  options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number },
): T[];
```

### `orderByThis`

Sort ascending in-place.

```typescript
orderByThis(selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined): T[];
```

### `orderByDescThis`

Sort descending in-place.

```typescript
orderByDescThis(selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined): T[];
```

### `insert`

Insert items at a given index. Mutates the array.

```typescript
insert(index: number, ...items: T[]): this;
```

### `remove`

Remove items by value or predicate. Mutates the array.

```typescript
remove(item: T): this;
remove(selector: (item: T, index: number) => boolean): this;
```

### `toggle`

Toggle an item: remove if present, add (push) if absent.

```typescript
toggle(item: T): this;
```

### `clear`

Remove all items from the array.

```typescript
clear(): this;
```

---

## Exported Types

### `ArrayDiffsResult<TOriginal, TOther>`

```typescript
type ArrayDiffsResult<TOriginal, TOther> =
  | { source: undefined; target: TOther }       // INSERT
  | { source: TOriginal; target: undefined }     // DELETE
  | { source: TOriginal; target: TOther };       // UPDATE
```

### `ArrayOneWayDiffResult<TItem>`

```typescript
type ArrayOneWayDiffResult<TItem> =
  | { type: "create"; item: TItem; orgItem: undefined }
  | { type: "update"; item: TItem; orgItem: TItem }
  | { type: "same"; item: TItem; orgItem: TItem };
```

### `TreeArray<TNode>`

```typescript
type TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] };
```

### `ComparableType`

```typescript
type ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined;
```

---

## Exported Helper Functions

### `toComparable`

Convert DateTime, DateOnly, or Time to their tick value for comparison. Primitives pass through unchanged.

```typescript
function toComparable(value: ComparableType): string | number | boolean | undefined;
```

### `compareForOrder`

Comparison function for sorting. Handles null/undefined (sorted first in ascending, last in descending). Supports string (locale-aware), number, and boolean.

```typescript
function compareForOrder(pp: ComparableType, pn: ComparableType, desc: boolean): number;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pp` | `ComparableType` | First value |
| `pn` | `ComparableType` | Second value |
| `desc` | `boolean` | `true` for descending order |

**Returns:** Negative if `pp` should come first, positive if `pn` should come first, `0` if equal.

### `getDistinctIndices`

Get the set of indices to keep for deduplication. Handles all strategies: address comparison, custom key function, and deep equality.

```typescript
function getDistinctIndices<T>(
  items: readonly T[],
  options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number },
): Set<number>;
```
