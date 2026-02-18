# Extensions

Array, Map, Set prototype extensions. Activated by `import "@simplysm/core-common"`.

## Array extension methods

### Query

#### single

Return single element (error if 2+).

```typescript
import "@simplysm/core-common";

const users = [{ id: 1, name: "Alice" }];
users.single((u) => u.id === 1); // { id: 1, name: "Alice" }
users.single();                  // Returns the only element (throws if 2+)
```

#### first

Return first element.

```typescript
users.first();              // First element (or undefined)
users.first((u) => u.id > 0); // First matching element
```

#### last

Return last element.

```typescript
users.last();              // Last element (or undefined)
users.last((u) => u.id > 0); // Last matching element
```

---

### Filtering

#### filterExists

Remove `null`/`undefined`.

```typescript
[1, null, 2, undefined, 3].filterExists(); // [1, 2, 3]
```

#### ofType

Filter by type (`PrimitiveTypeStr` or constructor).

```typescript
import "@simplysm/core-common";

// Filter by PrimitiveTypeStr
mixed.ofType("string");   // string[]
mixed.ofType("DateTime"); // DateTime[]

// Filter by constructor
mixed.ofType(MyClass);    // MyClass[]
```

#### filterAsync

Async filter (sequential execution).

```typescript
import "@simplysm/core-common";

const activeUsers = await users.filterAsync(async (u) => await isActive(u.id));
```

---

### Mapping/Transformation

#### mapAsync

Async mapping (sequential execution).

```typescript
await ids.mapAsync(async (id) => await fetchUser(id));
```

#### mapMany

Flatten nested arrays and remove null/undefined.

```typescript
import "@simplysm/core-common";

// Flatten existing nested array
[[1, 2], [3, 4]].mapMany(); // [1, 2, 3, 4]

// Map then flatten
users.mapMany((u) => u.tags); // all tags from all users
```

#### mapManyAsync

Async mapMany (sequential execution).

```typescript
import "@simplysm/core-common";

await groups.mapManyAsync(async (g) => await fetchMembers(g.id));
```

#### parallelAsync

Parallel async mapping (`Promise.all`).

```typescript
await ids.parallelAsync(async (id) => await fetchUser(id));
```

---

### Grouping/Transformation

#### groupBy

Group by key. Supports primitive keys (O(n)) and object keys (O(n²)).

```typescript
const users = [
  { id: 1, name: "Alice", dept: "dev" },
  { id: 2, name: "Bob", dept: "dev" },
  { id: 3, name: "Charlie", dept: "hr" },
];

users.groupBy((u) => u.dept);
// [{ key: "dev", values: [...] }, { key: "hr", values: [...] }]

// With value selector
users.groupBy((u) => u.dept, (u) => u.name);
// [{ key: "dev", values: ["Alice", "Bob"] }, { key: "hr", values: ["Charlie"] }]
```

#### toMap

Convert to Map (throws on duplicate key).

```typescript
users.toMap((u) => u.id);          // Map<number, User>
users.toMap((u) => u.id, (u) => u.name); // Map<number, string>
```

#### toMapAsync

Async Map conversion (sequential execution).

```typescript
import "@simplysm/core-common";

await items.toMapAsync(async (item) => await resolveKey(item));
```

#### toArrayMap

Convert to `Map<K, V[]>`.

```typescript
users.toArrayMap((u) => u.dept); // Map<string, User[]>
```

#### toSetMap

Convert to `Map<K, Set<V>>`.

```typescript
import "@simplysm/core-common";

users.toSetMap((u) => u.dept);   // Map<string, Set<User>>
```

#### toMapValues

Group by key and aggregate each group with a value selector.

```typescript
import "@simplysm/core-common";

// Sum scores per department
users.toMapValues(
  (u) => u.dept,
  (group) => group.sum((u) => u.score),
); // Map<string, number>
```

#### toObject

Convert to `Record<string, V>` (throws on duplicate key).

```typescript
import "@simplysm/core-common";

users.toObject((u) => u.name);          // Record<string, User>
users.toObject((u) => u.name, (u) => u.id); // Record<string, number>
```

#### toTree

Convert flat array to tree structure.

```typescript
import "@simplysm/core-common";

interface Category { id: number; parentId?: number; name: string }

const tree = categories.toTree("id", "parentId");
// Nodes with null/undefined parentId become roots
// Each node gains a `children: TreeArray<Category>[]` property
```

---

### Deduplication

#### distinct

Remove duplicates (return new array).

```typescript
// Primitive values
[1, 2, 2, 3, 3].distinct(); // [1, 2, 3]

// Object deep equality (O(n²))
objects.distinct();

// Reference equality (O(n)) — fastest
objects.distinct(true);
objects.distinct({ matchAddress: true });

// Custom key function (O(n)) — recommended for large arrays of objects
objects.distinct({ keyFn: (item) => item.id });
```

#### distinctThis

Remove duplicates (modify original array).

```typescript
import "@simplysm/core-common";

const arr = [1, 2, 2, 3];
arr.distinctThis(); // arr is now [1, 2, 3]

// Same options as distinct
arr.distinctThis({ keyFn: (item) => item.id });
```

---

### Sorting

#### orderBy

Ascending sort (return new array).

```typescript
users.orderBy((u) => u.name);      // Sort by name ascending
numbers.orderBy();                  // Sort numbers ascending
```

#### orderByDesc

Descending sort (return new array).

```typescript
users.orderByDesc((u) => u.id);
```

#### orderByThis

Ascending sort (modify original array).

```typescript
import "@simplysm/core-common";

arr.orderByThis((item) => item.name);
```

#### orderByDescThis

Descending sort (modify original array).

```typescript
import "@simplysm/core-common";

arr.orderByDescThis((item) => item.score);
```

---

### Comparison/Merging

#### diffs

Compare differences between two arrays. Returns INSERT/DELETE/UPDATE entries.

```typescript
import "@simplysm/core-common";

const result = oldList.diffs(newList, { keys: ["id"] });
for (const diff of result) {
  if (diff.source === undefined) { /* target-only: INSERT */ }
  else if (diff.target === undefined) { /* source-only: DELETE */ }
  else { /* both exist: UPDATE */ }
}

// Exclude certain fields from equality check
oldList.diffs(newList, { keys: ["id"], excludes: ["updatedAt"] });
```

#### oneWayDiffs

One-way diff comparison (create/update/same). Compares current items against original items.

```typescript
import "@simplysm/core-common";

const diffs = currentItems.oneWayDiffs(originalItems, "id");
// { type: "create", item, orgItem: undefined }
// { type: "update", item, orgItem }
// { type: "same",   item, orgItem } (only when includeSame: true)

// With options
currentItems.oneWayDiffs(originalItems, "id", {
  includeSame: true,       // Include unchanged items in result
  excludes: ["updatedAt"], // Ignore these fields when checking for changes
  includes: ["name"],      // Only compare these fields
});

// Pass a pre-built Map for O(1) lookup
const orgMap = originalItems.toMap((item) => item.id);
currentItems.oneWayDiffs(orgMap, "id");
```

#### merge

Merge arrays: apply target changes onto source.

```typescript
import "@simplysm/core-common";

const merged = source.merge(target, { keys: ["id"] });
// Items present in both: merged with objMerge
// Items only in target: appended
// Items only in source: kept as-is
```

---

### Aggregation

#### sum

Sum values.

```typescript
import "@simplysm/core-common";

[1, 2, 3].sum(); // 6
users.sum((u) => u.score); // total score
```

#### min

Minimum value.

```typescript
import "@simplysm/core-common";

[3, 1, 2].min(); // 1
users.min((u) => u.age); // youngest age
```

#### max

Maximum value.

```typescript
import "@simplysm/core-common";

[3, 1, 2].max(); // 3
users.max((u) => u.score); // highest score
```

---

### Mutation

#### insert

Insert at specific position (modify original).

```typescript
import "@simplysm/core-common";

const arr = [1, 2, 3];
arr.insert(1, 10, 11); // [1, 10, 11, 2, 3]
```

#### remove

Remove item or items matching predicate (modify original).

```typescript
import "@simplysm/core-common";

arr.remove(2);                           // Remove by value
arr.remove((item) => item > 2);          // Remove by predicate
```

#### toggle

Toggle item — remove if exists, add if not (modify original).

```typescript
import "@simplysm/core-common";

arr.toggle(3); // removes 3 if present, adds if not
```

#### clear

Remove all items (modify original).

```typescript
import "@simplysm/core-common";

arr.clear(); // arr is now []
```

#### shuffle

Shuffle (return new array).

```typescript
import "@simplysm/core-common";

[1, 2, 3, 4, 5].shuffle(); // random order
```

---

## Map extension methods

### getOrCreate

If key doesn't exist, set new value and return.

```typescript
const map = new Map<string, number[]>();

// Direct value
map.getOrCreate("key", []);

// Factory function (called only when key is missing)
map.getOrCreate("key", () => expensiveComputation());
```

> **Note:** If the Map value type is a function (e.g., `Map<string, () => void>`), wrap the function in a factory to store it as a value: `map.getOrCreate("key", () => myFn)`.

### update

Update value for key using function. The update function receives `undefined` if the key doesn't exist.

```typescript
const countMap = new Map<string, number>();
countMap.update("key", (v) => (v ?? 0) + 1); // Increment counter

const arrayMap = new Map<string, string[]>();
arrayMap.update("key", (v) => [...(v ?? []), "item"]); // Append to array
```

---

## Set extension methods

### adds

Add multiple values at once.

```typescript
const set = new Set<number>([1, 2, 3]);
set.adds(4, 5, 6); // {1, 2, 3, 4, 5, 6}
```

### toggle

Toggle value (remove if exists, add if not). Optionally force add or delete.

```typescript
set.toggle(2);          // 2 exists → remove
set.toggle(7);          // 7 not exists → add
set.toggle(8, "add");   // Force add regardless of current state
set.toggle(1, "del");   // Force delete regardless of current state
```
