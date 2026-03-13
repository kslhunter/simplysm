# Collection Extensions

Importing `@simplysm/sd-core-common` automatically extends the prototypes of `Array`, `Map`, and `Set` with additional methods.

## Array Extensions

### Readonly Methods (available on `ReadonlyArray<T>` and `Array<T>`)

#### Query

| Method | Returns | Description |
|---|---|---|
| `single(predicate?)` | `T \| undefined` | Returns the single matching element. Throws if more than one match exists. |
| `first(predicate?)` | `T \| undefined` | Returns the first matching element. |
| `last(predicate?)` | `T \| undefined` | Returns the last matching element. |
| `filterExists()` | `NonNullable<T>[]` | Filters out `null` and `undefined` values. |
| `ofType(type)` | `N[]` | Filters elements that are instances of the given type. |
| `filterAsync(predicate)` | `Promise<T[]>` | Async filter with sequential awaiting. |

#### Transform

| Method | Returns | Description |
|---|---|---|
| `mapAsync(selector)` | `Promise<R[]>` | Async sequential map. |
| `mapMany(selector?)` | `R[]` | Flat-map (flattens one level, filters nullish). Without selector, flattens an array of arrays. |
| `mapManyAsync(selector)` | `Promise<R[]>` | Async flat-map. |
| `parallelAsync(fn)` | `Promise<R[]>` | Parallel async map using `Promise.all`. |

#### Group & Convert

| Method | Returns | Description |
|---|---|---|
| `groupBy(keySelector, valueSelector?)` | `{ key: K; values: V[] }[]` | Group elements by key. Uses deep equality for key comparison. |
| `toMap(keySelector, valueSelector?)` | `Map<K, V>` | Convert to Map. Throws on duplicate keys. |
| `toMapAsync(keySelector, valueSelector?)` | `Promise<Map<K, V>>` | Async version of `toMap`. |
| `toArrayMap(keySelector, valueSelector?)` | `Map<K, V[]>` | Convert to Map where each key holds an array of values. |
| `toSetMap(keySelector, valueSelector?)` | `Map<K, Set<V>>` | Convert to Map where each key holds a Set of values. |
| `toMapValues(keySelector, valueSelector)` | `Map<K, V>` | Group by key, then apply `valueSelector` to the grouped array. |
| `toObject(keySelector, valueSelector?)` | `Record<string, V>` | Convert to plain object. Throws on duplicate keys. |
| `toTree(keyProp, parentKeyProp)` | `ITreeArray<T>[]` | Build a tree structure from a flat array with key/parent-key relationships. |

#### Sort & Deduplicate

| Method | Returns | Description |
|---|---|---|
| `distinct(matchAddress?)` | `T[]` | Remove duplicates. By default uses deep equality; pass `true` for reference (`===`) comparison. |
| `orderBy(selector?)` | `T[]` | Sort ascending (new array). Supports `string`, `number`, `DateOnly`, `DateTime`, `Time`. |
| `orderByDesc(selector?)` | `T[]` | Sort descending (new array). |
| `shuffle()` | `T[]` | Return a new randomly shuffled array (Fisher-Yates). |

#### Diff & Merge

| Method | Returns | Description |
|---|---|---|
| `diffs(target, options?)` | `TArrayDiffsResult<T, P>[]` | Compute insert/delete/update diffs between this and target array. Options: `keys` (match by key subset), `excludes` (ignore fields). |
| `oneWayDiffs(orgItems, keyProp, options?)` | `TArrayDiffs2Result<T>[]` | One-way diff: classify each element as `create`, `update`, or `same` against an original array or Map. |
| `merge(target, options?)` | `(T \| P \| T & P)[]` | Merge this array with a target array using diff results. |

#### Aggregate

| Method | Returns | Description |
|---|---|---|
| `sum(selector?)` | `number` | Sum of elements (or selected numeric values). |
| `min(selector?)` | `T \| P \| undefined` | Minimum value (number or string). |
| `max(selector?)` | `T \| P \| undefined` | Maximum value (number or string). |

### Mutable Methods (only on `Array<T>`)

These methods mutate the array **in-place** and return `this` for chaining.

| Method | Returns | Description |
|---|---|---|
| `distinctThis(matchAddress?)` | `T[]` | Remove duplicates in-place. |
| `orderByThis(selector?)` | `T[]` | Sort ascending in-place. |
| `orderByDescThis(selector?)` | `T[]` | Sort descending in-place. |
| `insert(index, ...items)` | `this` | Insert items at index. |
| `remove(item)` | `this` | Remove all occurrences of an item. |
| `remove(predicate)` | `this` | Remove all items matching predicate. |
| `toggle(item)` | `this` | Add item if absent, remove if present. |
| `clear()` | `this` | Remove all elements. |

### Exported Types

```ts
// Diff result: insert (source undefined), delete (target undefined), or update (both defined)
type TArrayDiffsResult<T, P> =
  | { source: undefined; target: P }
  | { source: T; target: undefined }
  | { source: T; target: P };

// One-way diff result
type TArrayDiffs2Result<T> =
  | { type: "create"; item: T; orgItem: undefined }
  | { type: "update"; item: T; orgItem: T }
  | { type: "same"; item: T; orgItem: T };

// Tree node with children
type ITreeArray<T> = T & { children: ITreeArray<T>[] };
```

---

## Map Extensions

| Method | Returns | Description |
|---|---|---|
| `getOrCreate(key, newValue)` | `V` | Get existing value or set and return `newValue`. `newValue` can be a value or a `() => V` factory function. |
| `update(key, updateFn)` | `void` | Update a key's value by applying `updateFn(currentValue)`. |

---

## Set Extensions

| Method | Returns | Description |
|---|---|---|
| `adds(...values)` | `this` | Add multiple values at once. |
| `toggle(value, addOrDel?)` | `this` | Toggle a value. Optionally force `"add"` or `"del"`. |
