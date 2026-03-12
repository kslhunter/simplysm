# Extensions

Prototype extensions for `Array`, `Map`, and `Set`. These are activated as side effects when importing from `@simplysm/core-common`.

## Array Extensions (ReadonlyArray)

### Query

```typescript
interface ReadonlyArray<T> {
  single(predicate?: (item: T, index: number) => boolean): T | undefined;
  first(predicate?: (item: T, index: number) => boolean): T | undefined;
  last(predicate?: (item: T, index: number) => boolean): T | undefined;
  filterExists(): NonNullable<T>[];
  ofType<K extends PrimitiveTypeStr>(type: K): Extract<T, PrimitiveTypeMap[K]>[];
  ofType<N extends T>(type: Type<N>): N[];
}
```

- `single` - Returns the only matching element; throws `ArgumentError` if more than one match.
- `first` / `last` - Returns the first/last matching element, or `undefined`.
- `filterExists` - Removes `null` and `undefined` values.
- `ofType` - Filters elements by primitive type string or constructor type.

### Async Operations

```typescript
interface ReadonlyArray<T> {
  filterAsync(predicate: (item: T, index: number) => Promise<boolean>): Promise<T[]>;
  mapAsync<R>(selector: (item: T, index: number) => Promise<R>): Promise<R[]>;
  mapManyAsync<R>(selector: (item: T, index: number) => Promise<R[]>): Promise<R[]>;
  parallelAsync<R>(fn: (item: T, index: number) => Promise<R>): Promise<R[]>;
}
```

- `filterAsync` / `mapAsync` / `mapManyAsync` - Sequential async operations (one at a time).
- `parallelAsync` - Parallel async via `Promise.all`.

### Transformation

```typescript
interface ReadonlyArray<T> {
  mapMany<R>(selector?: (item: T, index: number) => R[]): R[];
  groupBy<K>(keySelector: (item: T, index: number) => K): { key: K; values: T[] }[];
  groupBy<K, V>(keySelector: ..., valueSelector: ...): { key: K; values: V[] }[];
  toMap<K>(keySelector: ...): Map<K, T>;
  toMap<K, V>(keySelector: ..., valueSelector: ...): Map<K, V>;
  toMapAsync<K>(keySelector: ...): Promise<Map<K, T>>;
  toArrayMap<K>(keySelector: ...): Map<K, T[]>;
  toSetMap<K>(keySelector: ...): Map<K, Set<T>>;
  toMapValues<K, V>(keySelector: ..., valueSelector: ...): Map<K, V>;
  toObject(keySelector: ...): Record<string, T>;
  toObject<V>(keySelector: ..., valueSelector: ...): Record<string, V>;
  toTree<K extends keyof T, P extends keyof T>(keyProp: K, parentKey: P): TreeArray<T>[];
}
```

- `groupBy` - Groups by key. O(n) for primitive keys, O(n^2) for object keys.
- `toMap` - Converts to `Map` (throws on duplicate keys).
- `toArrayMap` / `toSetMap` - Converts to `Map<K, T[]>` or `Map<K, Set<T>>`.
- `toTree` - Converts flat array to tree structure using key/parent-key properties.

### Ordering and Deduplication

```typescript
interface ReadonlyArray<T> {
  distinct(options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number }): T[];
  orderBy(selector?: (item: T) => ComparableType): T[];
  orderByDesc(selector?: (item: T) => ComparableType): T[];
  shuffle(): T[];
}
```

These return new arrays without modifying the original.

### Aggregation

```typescript
interface ReadonlyArray<T> {
  sum(selector?: (item: T, index: number) => number): number;
  min(selector?: ...): number | string | undefined;
  max(selector?: ...): number | string | undefined;
}
```

### Diff and Merge

```typescript
interface ReadonlyArray<T> {
  diffs<P>(target: P[], options?: { keys?: string[]; excludes?: string[] }): ArrayDiffsResult<T, P>[];
  oneWayDiffs<K extends keyof T>(orgItems: T[] | Map<T[K], T>, keyPropNameOrGetValFn: K | ((item: T) => ...), options?: ...): ArrayOneWayDiffResult<T>[];
  merge<P>(target: P[], options?: { keys?: string[]; excludes?: string[] }): (T | P | (T & P))[];
}
```

- `diffs` - Computes INSERT/DELETE/UPDATE differences between two arrays.
- `oneWayDiffs` - One-way diff returning `create` / `update` / `same` results.
- `merge` - Deep merges matching elements from target into source.

---

## Array Extensions (Mutable)

These methods modify the original array in-place and return `this` for chaining.

```typescript
interface Array<T> {
  distinctThis(options?: ...): T[];
  orderByThis(selector?: ...): T[];
  orderByDescThis(selector?: ...): T[];
  insert(index: number, ...items: T[]): this;
  remove(itemOrSelector: T | ((item: T, index: number) => boolean)): this;
  toggle(item: T): this;
  clear(): this;
}
```

---

## Map Extensions

```typescript
interface Map<K, V> {
  getOrCreate(key: K, newValue: V): V;
  getOrCreate(key: K, newValueFn: () => V): V;
  update(key: K, updateFn: (v: V | undefined) => V): void;
}
```

- `getOrCreate` - Returns existing value, or creates and stores a new one. Accepts a direct value or a factory function.
- `update` - Updates value using a function that receives the current value (or `undefined` if key is missing).

---

## Set Extensions

```typescript
interface Set<T> {
  adds(...values: T[]): this;
  toggle(value: T, addOrDel?: "add" | "del"): this;
}
```

- `adds` - Adds multiple values at once.
- `toggle` - Toggles value presence. Optional `addOrDel` parameter forces add or delete.

---

## Exported Types

```typescript
type ArrayDiffsResult<T, P> =
  | { source: undefined; target: P }       // INSERT
  | { source: T; target: undefined }        // DELETE
  | { source: T; target: P };              // UPDATE

type ArrayOneWayDiffResult<T> =
  | { type: "create"; item: T; orgItem: undefined }
  | { type: "update"; item: T; orgItem: T }
  | { type: "same"; item: T; orgItem: T };

type TreeArray<T> = T & { children: TreeArray<T>[] };
type ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined;
```

---

## Usage Examples

```typescript
import "@simplysm/core-common";

// Array extensions
const items = [3, 1, 4, 1, 5, 9];
items.distinct();                // [3, 1, 4, 5, 9]
items.orderBy();                 // [1, 1, 3, 4, 5, 9]
items.sum();                     // 23
items.first((x) => x > 3);      // 4

const users = [
  { id: 1, dept: "A", name: "Alice" },
  { id: 2, dept: "B", name: "Bob" },
  { id: 3, dept: "A", name: "Charlie" },
];
users.groupBy((u) => u.dept);
// [{ key: "A", values: [Alice, Charlie] }, { key: "B", values: [Bob] }]

users.toMap((u) => u.id);
// Map { 1 => Alice, 2 => Bob, 3 => Charlie }

// Map extensions
const map = new Map<string, number>();
map.getOrCreate("counter", 0);  // 0
map.update("counter", (v) => (v ?? 0) + 1); // counter = 1

// Set extensions
const set = new Set([1, 2, 3]);
set.toggle(2);  // removes 2 -> {1, 3}
set.toggle(4);  // adds 4 -> {1, 3, 4}
set.adds(5, 6); // {1, 3, 4, 5, 6}
```
