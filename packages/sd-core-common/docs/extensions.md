# Extensions

Importing `@simplysm/sd-core-common` automatically extends the prototypes of `Array`, `Map`, and `Set` with additional methods. These are available globally after import.

## Array Extensions

### Readonly Methods

Available on both `ReadonlyArray<T>` and `Array<T>`.

#### Query

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `single` | `single(predicate?: (item: T, index: number) => boolean)` | `T \| undefined` | Returns the single matching element. Throws if more than one match exists. Without predicate, returns the single element if the array has exactly 0 or 1 elements. |
| `first` | `first(predicate?: (item: T, index: number) => boolean)` | `T \| undefined` | Returns the first matching element. Without predicate, returns `this[0]`. |
| `last` | `last(predicate?: (item: T, index: number) => boolean)` | `T \| undefined` | Returns the last matching element. Iterates backwards for efficiency. |
| `filterExists` | `filterExists()` | `NonNullable<T>[]` | Filters out `null` and `undefined` values. |
| `ofType` | `ofType<N extends T>(type: Type<WrappedType<N>>)` | `N[]` | Filters elements that are instances of the given type constructor. |
| `filterAsync` | `filterAsync(predicate: (item: T, index: number) => Promise<boolean>)` | `Promise<T[]>` | Async filter with sequential awaiting. |

#### Transform

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `mapAsync` | `mapAsync<R>(selector: (item: T, index: number) => Promise<R>)` | `Promise<R[]>` | Async sequential map. Each item is awaited before proceeding to the next. |
| `mapMany` | `mapMany()` | `T` | Flatten an array of arrays (one level). Filters out nullish values. |
| `mapMany` | `mapMany<R>(selector: (item: T, index: number) => R[])` | `R[]` | Map each element to an array, then flatten. Filters out nullish values. |
| `mapManyAsync` | `mapManyAsync<R>(selector: (item: T, index: number) => Promise<R[]>)` | `Promise<R[]>` | Async version of `mapMany` with selector. |
| `parallelAsync` | `parallelAsync<R>(fn: (item: T, index: number) => Promise<R>)` | `Promise<R[]>` | Parallel async map using `Promise.all`. |

#### Group & Convert

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `groupBy` | `groupBy<K>(keySelector: (item: T, index: number) => K)` | `{ key: K; values: T[] }[]` | Group elements by key. Uses deep equality (`ObjectUtils.equal`) for key comparison. |
| `groupBy` | `groupBy<K, V>(keySelector, valueSelector)` | `{ key: K; values: V[] }[]` | Group with value transformation. |
| `toMap` | `toMap<K>(keySelector: (item: T, index: number) => K)` | `Map<K, T>` | Convert to Map. Throws on duplicate keys. |
| `toMap` | `toMap<K, V>(keySelector, valueSelector)` | `Map<K, V>` | Convert to Map with value transformation. |
| `toMapAsync` | `toMapAsync<K>(keySelector: (item: T, index: number) => Promise<K>)` | `Promise<Map<K, T>>` | Async version of `toMap`. |
| `toMapAsync` | `toMapAsync<K, V>(keySelector, valueSelector)` | `Promise<Map<K, V>>` | Async version with value transformation. |
| `toArrayMap` | `toArrayMap<K>(keySelector: (item: T, index: number) => K)` | `Map<K, T[]>` | Convert to Map where each key holds an array of values. |
| `toArrayMap` | `toArrayMap<K, V>(keySelector, valueSelector)` | `Map<K, V[]>` | With value transformation. |
| `toSetMap` | `toSetMap<K>(keySelector: (item: T, index: number) => K)` | `Map<K, Set<T>>` | Convert to Map where each key holds a Set of values. |
| `toSetMap` | `toSetMap<K, V>(keySelector, valueSelector)` | `Map<K, Set<V>>` | With value transformation. |
| `toMapValues` | `toMapValues<K, V>(keySelector: (item: T, index: number) => K, valueSelector: (items: T[]) => V)` | `Map<K, V>` | Group by key, then apply `valueSelector` to the grouped array. |
| `toObject` | `toObject(keySelector: (item: T, index: number) => string)` | `Record<string, T>` | Convert to plain object. Throws on duplicate keys. |
| `toObject` | `toObject<V>(keySelector, valueSelector)` | `Record<string, V>` | With value transformation. |
| `toTree` | `toTree<K extends keyof T, P extends keyof T>(keyProp: K, parentKey: P)` | `ITreeArray<T>[]` | Build a tree structure from a flat array with key/parent-key relationships. Root items have `null`/`undefined` parent key. |

#### Sort & Deduplicate

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `distinct` | `distinct(matchAddress?: boolean)` | `T[]` | Return a new array with duplicates removed. By default uses deep equality (`ObjectUtils.equal`); pass `true` to use reference (`===`) comparison. Optimized for primitives. |
| `orderBy` | `orderBy(selector?: (item: T) => string \| number \| DateOnly \| DateTime \| Time \| undefined)` | `T[]` | Return a new array sorted ascending. Uses locale-aware string comparison. |
| `orderByDesc` | `orderByDesc(selector?: (item: T) => string \| number \| DateOnly \| DateTime \| Time \| undefined)` | `T[]` | Return a new array sorted descending. |
| `shuffle` | `shuffle()` | `T[]` | Return a new randomly shuffled array (Fisher-Yates algorithm). |

#### Diff & Merge

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `diffs` | `diffs<P>(target: P[], options?: { keys?: string[]; excludes?: string[] })` | `TArrayDiffsResult<T, P>[]` | Compute insert/delete/update diffs between this array and target. `keys`: match by key subset to detect updates. `excludes`: ignore fields during equality check. |
| `oneWayDiffs` | `oneWayDiffs<K extends keyof T>(orgItems: T[] \| Map<T[K], T>, keyPropNameOrFn: K \| ((item: T) => K), options?: { includeSame?: boolean; excludes?: string[]; includes?: string[] })` | `TArrayDiffs2Result<T>[]` | One-way diff: classify each element as `create`, `update`, or `same` against an original array or Map. |
| `merge` | `merge<P>(target: P[], options?: { keys?: string[]; excludes?: string[] })` | `(T \| P \| (T & P))[]` | Merge this array with a target array using diff results: updates are merged, inserts are appended. |

#### Aggregate

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `sum` | `sum(selector?: (item: T, index: number) => number)` | `number` | Sum of elements (or selected numeric values). Throws if any value is not a number. |
| `min` | `min()` | `T \| undefined` | Minimum value (for arrays of `number` or `string`). |
| `min` | `min<P extends number \| string>(selector?: (item: T, index: number) => P)` | `P \| undefined` | Minimum of selected values. |
| `max` | `max()` | `T \| undefined` | Maximum value (for arrays of `number` or `string`). |
| `max` | `max<P extends number \| string>(selector?: (item: T, index: number) => P)` | `P \| undefined` | Maximum of selected values. |

### Mutable Methods

Only available on `Array<T>`. These methods mutate the array **in-place** and return `this` for chaining.

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `distinctThis` | `distinctThis(matchAddress?: boolean)` | `T[]` | Remove duplicates in-place. |
| `orderByThis` | `orderByThis(selector?: (item: T) => string \| number \| DateTime \| DateOnly \| Time \| undefined)` | `T[]` | Sort ascending in-place. |
| `orderByDescThis` | `orderByDescThis(selector?: (item: T) => string \| number \| DateTime \| DateOnly \| Time \| undefined)` | `T[]` | Sort descending in-place. |
| `insert` | `insert(index: number, ...items: T[])` | `this` | Insert items at index. |
| `remove` | `remove(item: T)` | `this` | Remove all occurrences of an item. |
| `remove` | `remove(selector: (item: T, index: number) => boolean)` | `this` | Remove all items matching a predicate. |
| `toggle` | `toggle(item: T)` | `this` | Add item if absent, remove if present. |
| `clear` | `clear()` | `this` | Remove all elements. |

### Exported Types

```ts
type TArrayDiffsResult<T, P> =
  | { source: undefined; target: P }   // INSERT - exists only in target
  | { source: T; target: undefined }   // DELETE - exists only in source
  | { source: T; target: P };          // UPDATE - exists in both, but differ

type TArrayDiffs2Result<T> =
  | { type: "create"; item: T; orgItem: undefined }  // new item, no original
  | { type: "update"; item: T; orgItem: T }           // item changed from original
  | { type: "same"; item: T; orgItem: T };            // item unchanged

type ITreeArray<T> = T & { children: ITreeArray<T>[] };
```

---

## Map Extensions

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `getOrCreate` | `getOrCreate(key: K, newValue: V)` | `V` | Get existing value, or set `newValue` and return it. |
| `getOrCreate` | `getOrCreate(key: K, newValueFn: () => V)` | `V` | Get existing value, or call `newValueFn()`, set the result, and return it. |
| `update` | `update(key: K, updateFn: (v: V \| undefined) => V)` | `void` | Update a key's value by applying `updateFn(currentValue)`. If key doesn't exist, `currentValue` is `undefined`. |

---

## Set Extensions

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `adds` | `adds(...values: T[])` | `this` | Add multiple values at once. |
| `toggle` | `toggle(value: T, addOrDel?: "add" \| "del")` | `this` | Toggle a value's membership. Without the second argument, adds if absent or removes if present. Pass `"add"` to force add, `"del"` to force delete. |
