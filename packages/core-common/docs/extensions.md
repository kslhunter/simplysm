# Prototype Extensions (side-effect)

Prototype extensions for `Array`, `Map`, and `Set`. These are applied as side effects when importing `@simplysm/core-common`.

**Important:** Importing the package entry point automatically patches these prototypes. If you import only specific sub-modules, you must also import the extension modules or the entry point to get these methods.

Source: `src/extensions/*.ts`

---

## Array Extensions

### Readonly methods (return new array or value, do not mutate)

#### `single`

Return single element matching condition. Throws `ArgumentError` if 2+ elements match.

```typescript
single(predicate?: (item: T, index: number) => boolean): T | undefined;
```

#### `first`

Return first element.

```typescript
first(predicate?: (item: T, index: number) => boolean): T | undefined;
```

#### `last`

Return last element.

```typescript
last(predicate?: (item: T, index: number) => boolean): T | undefined;
```

#### `filterAsync`

Async filter (sequential execution).

```typescript
filterAsync(predicate: (item: T, index: number) => Promise<boolean>): Promise<T[]>;
```

#### `filterExists`

Remove `null` and `undefined` values.

```typescript
filterExists(): NonNullable<T>[];
```

#### `ofType`

Filter only elements of specific type (`PrimitiveTypeStr` or constructor type).

```typescript
ofType<TKey extends PrimitiveTypeStr>(type: TKey): Extract<T, PrimitiveTypeMap[TKey]>[];
ofType<TNarrow extends T>(type: Type<TNarrow>): TNarrow[];
```

#### `mapAsync`

Async mapping (sequential execution).

```typescript
mapAsync<R>(selector: (item: T, index: number) => Promise<R>): Promise<R[]>;
```

#### `mapMany`

Flatten nested array, or map then flatten.

```typescript
mapMany(): T extends readonly (infer U)[] ? U[] : T;
mapMany<R>(selector: (item: T, index: number) => R[]): R[];
```

#### `mapManyAsync`

Async mapping and then flatten (sequential execution).

```typescript
mapManyAsync<R>(selector: (item: T, index: number) => Promise<R[]>): Promise<R[]>;
```

#### `parallelAsync`

Async parallel processing using `Promise.all`.

```typescript
parallelAsync<R>(fn: (item: T, index: number) => Promise<R>): Promise<R[]>;
```

#### `groupBy`

Group by key. O(n) for primitive keys, O(n^2) for object keys (deep comparison).

```typescript
groupBy<K>(keySelector: (item: T, index: number) => K): { key: K; values: T[] }[];
groupBy<K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (item: T, index: number) => V,
): { key: K; values: V[] }[];
```

#### `toMap`

Convert to `Map`. Throws `ArgumentError` on duplicate keys.

```typescript
toMap<K>(keySelector: (item: T, index: number) => K): Map<K, T>;
toMap<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): Map<K, V>;
```

#### `toMapAsync`

Async version of `toMap`.

```typescript
toMapAsync<K>(keySelector: (item: T, index: number) => Promise<K>): Promise<Map<K, T>>;
toMapAsync<K, V>(
  keySelector: (item: T, index: number) => Promise<K> | K,
  valueSelector: (item: T, index: number) => Promise<V> | V,
): Promise<Map<K, V>>;
```

#### `toArrayMap`

Convert to `Map<K, T[]>` (groups values by key).

```typescript
toArrayMap<K>(keySelector: (item: T, index: number) => K): Map<K, T[]>;
toArrayMap<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): Map<K, V[]>;
```

#### `toSetMap`

Convert to `Map<K, Set<T>>`.

```typescript
toSetMap<K>(keySelector: (item: T, index: number) => K): Map<K, Set<T>>;
toSetMap<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (item: T, index: number) => V): Map<K, Set<V>>;
```

#### `toMapValues`

Group by key, then reduce each group's values.

```typescript
toMapValues<K, V>(
  keySelector: (item: T, index: number) => K,
  valueSelector: (items: T[]) => V,
): Map<K, V>;
```

#### `toObject`

Convert to plain object. Throws `ArgumentError` on duplicate keys.

```typescript
toObject(keySelector: (item: T, index: number) => string): Record<string, T>;
toObject<V>(keySelector: (item: T, index: number) => string, valueSelector: (item: T, index: number) => V): Record<string, V>;
```

#### `toTree`

Convert flat array to tree structure. Items with `null`/`undefined` parent key become roots. Uses `toArrayMap` for O(n) complexity.

```typescript
toTree<K extends keyof T, P extends keyof T>(keyProp: K, parentKey: P): TreeArray<T>[];
```

#### `distinct`

Remove duplicates. Options: `matchAddress` for reference comparison, `keyFn` for custom key (O(n)). Without `keyFn` on objects: O(n^2).

```typescript
distinct(options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number }): T[];
```

#### `orderBy` / `orderByDesc`

Sort in ascending or descending order. Supports `string`, `number`, `DateTime`, `DateOnly`, `Time`.

```typescript
orderBy(selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined): T[];
orderByDesc(selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined): T[];
```

#### `diffs`

Compare two arrays and return INSERT / DELETE / UPDATE results.

```typescript
diffs<P>(target: P[]): ArrayDiffsResult<T, P>[];
diffs<P>(target: P[], options: { keys: string[]; excludes?: string[] }): ArrayDiffsResult<T, P>[];
diffs<P>(target: P[], options: { excludes: string[] }): ArrayDiffsResult<T, P>[];
```

#### `oneWayDiffs`

One-way diff against original items. Returns `"create"`, `"update"`, or `"same"` for each item.

```typescript
oneWayDiffs<K extends keyof T>(
  orgItems: T[] | Map<T[K], T>,
  keyPropNameOrGetValFn: K | ((item: T) => string | number | undefined),
  options?: { includeSame?: boolean; excludes?: string[]; includes?: string[] },
): ArrayOneWayDiffResult<T>[];
```

#### `merge`

Merge source and target arrays based on diff results.

```typescript
merge<P>(target: P[]): (T | P | (T & P))[];
merge<P>(target: P[], options: { keys: string[]; excludes?: string[] }): (T | P | (T & P))[];
```

#### `sum`

Return sum of elements. Returns `0` for empty arrays.

```typescript
sum(selector?: (item: T, index: number) => number): number;
```

#### `min` / `max`

Return minimum or maximum value.

```typescript
min(): T extends number | string ? T | undefined : never;
min<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;
max(): T extends number | string ? T | undefined : never;
max<P extends number | string>(selector?: (item: T, index: number) => P): P | undefined;
```

#### `shuffle`

Return a shuffled copy (Fisher-Yates algorithm).

```typescript
shuffle(): T[];
```

---

### Mutable methods (modify original array, marked `@mutates`)

#### `distinctThis`

Remove duplicates from original array.

```typescript
distinctThis(options?: boolean | { matchAddress?: boolean; keyFn?: (item: T) => string | number }): T[];
```

#### `orderByThis` / `orderByDescThis`

Sort original array in ascending or descending order.

```typescript
orderByThis(selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined): T[];
orderByDescThis(selector?: (item: T) => string | number | DateTime | DateOnly | Time | undefined): T[];
```

#### `insert`

Insert items at index.

```typescript
insert(index: number, ...items: T[]): this;
```

#### `remove`

Remove item or items matching condition.

```typescript
remove(item: T): this;
remove(selector: (item: T, index: number) => boolean): this;
```

#### `toggle`

Toggle item in array (remove if exists, add if not).

```typescript
toggle(item: T): this;
```

#### `clear`

Clear all items from array.

```typescript
clear(): this;
```

---

## Exported Types

```typescript
export type ArrayDiffsResult<TOriginal, TOther> =
  | { source: undefined; target: TOther }      // INSERT
  | { source: TOriginal; target: undefined }    // DELETE
  | { source: TOriginal; target: TOther };      // UPDATE

export type ArrayOneWayDiffResult<TItem> =
  | { type: "create"; item: TItem; orgItem: undefined }
  | { type: "update"; item: TItem; orgItem: TItem }
  | { type: "same"; item: TItem; orgItem: TItem };

export type TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] };

/** Type that can be sorted/compared */
export type ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined;
```

---

## Map Extensions

#### `getOrCreate`

If no value exists for key, set new value and return it. If the second argument is a function, it is called as a factory.

```typescript
getOrCreate(key: K, newValue: V): V;
getOrCreate(key: K, newValueFn: () => V): V;
```

**Caution:** If `V` is a function type, passing the function directly will be recognized as a factory and called. Wrap it in a factory to store the function itself.

#### `update`

Update value for key using function. Called even if key does not exist.

```typescript
update(key: K, updateFn: (v: V | undefined) => V): void;
```

**Example:**

```typescript
const countMap = new Map<string, number>();
countMap.update("key", (v) => (v ?? 0) + 1);

map.getOrCreate("users", []).push(newUser);
```

---

## Set Extensions

#### `adds`

Add multiple values at once.

```typescript
adds(...values: T[]): this;
```

#### `toggle`

Toggle value (remove if exists, add if not). Optional `addOrDel` parameter to force add or remove.

```typescript
toggle(value: T, addOrDel?: "add" | "del"): this;
```

**Example:**

```typescript
const set = new Set<number>([1, 2, 3]);
set.toggle(2);  // 2 exists, so remove -> {1, 3}
set.toggle(4);  // 4 doesn't exist, so add -> {1, 3, 4}

const isAdmin = true;
set.toggle(5, isAdmin ? "add" : "del"); // Force add
```
