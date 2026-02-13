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
```

#### first

Return first element.

```typescript
users.first(); // { id: 1, name: "Alice" }
```

#### last

Return last element.

```typescript
users.last(); // Last user
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
```

#### filterAsync

Async filter.

```typescript
import "@simplysm/core-common";
```

---

### Mapping/Transformation

#### mapAsync

Async mapping (sequential execution).

```typescript
await ids.mapAsync(async (id) => await fetchUser(id));
```

#### mapMany

flat + filterExists.

```typescript
import "@simplysm/core-common";
```

#### mapManyAsync

Async mapMany.

```typescript
import "@simplysm/core-common";
```

#### parallelAsync

Parallel async mapping (`Promise.all`).

```typescript
await ids.parallelAsync(async (id) => await fetchUser(id));
```

---

### Grouping/Transformation

#### groupBy

Group by key.

```typescript
const users = [
  { id: 1, name: "Alice", dept: "dev" },
  { id: 2, name: "Bob", dept: "dev" },
  { id: 3, name: "Charlie", dept: "hr" },
];

users.groupBy((u) => u.dept);
// [{ key: "dev", values: [...] }, { key: "hr", values: [...] }]
```

#### toMap

Convert to Map (error on duplicate key).

```typescript
users.toMap((u) => u.id); // Map<number, User>
```

#### toMapAsync

Async Map conversion.

```typescript
import "@simplysm/core-common";
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
```

#### toMapValues

Aggregate Map by group.

```typescript
import "@simplysm/core-common";
```

#### toObject

Convert to `Record<string, V>`.

```typescript
import "@simplysm/core-common";
```

#### toTree

Convert to tree structure.

```typescript
import "@simplysm/core-common";
```

---

### Deduplication

#### distinct

Remove duplicates (return new array).

```typescript
[1, 2, 2, 3, 3].distinct(); // [1, 2, 3]
```

#### distinctThis

Remove duplicates (modify original).

```typescript
import "@simplysm/core-common";
```

---

### Sorting

#### orderBy

Ascending sort (return new array).

```typescript
users.orderBy((u) => u.name);
```

#### orderByDesc

Descending sort (return new array).

```typescript
users.orderByDesc((u) => u.id);
```

#### orderByThis

Ascending sort (modify original).

```typescript
import "@simplysm/core-common";
```

#### orderByDescThis

Descending sort (modify original).

```typescript
import "@simplysm/core-common";
```

---

### Comparison/Merging

#### diffs

Compare differences between two arrays.

```typescript
import "@simplysm/core-common";
```

#### oneWayDiffs

One-way diff comparison (create/update/same).

```typescript
import "@simplysm/core-common";
```

#### merge

Merge arrays.

```typescript
import "@simplysm/core-common";
```

---

### Aggregation

#### sum

Sum.

```typescript
import "@simplysm/core-common";
```

#### min

Minimum.

```typescript
import "@simplysm/core-common";
```

#### max

Maximum.

```typescript
import "@simplysm/core-common";
```

---

### Mutation

#### insert

Insert at specific position.

```typescript
import "@simplysm/core-common";
```

#### remove

Remove item.

```typescript
import "@simplysm/core-common";
```

#### toggle

Remove if exists, add if not.

```typescript
import "@simplysm/core-common";
```

#### clear

Remove all items.

```typescript
import "@simplysm/core-common";
```

#### shuffle

Shuffle (return new array).

```typescript
import "@simplysm/core-common";
```

---

## Map extension methods

### getOrCreate

If key doesn't exist, set new value and return.

```typescript
const map = new Map<string, number[]>();

// Create and return if value doesn't exist
const arr = map.getOrCreate("key", []);
arr.push(1);

// Create with factory function (when computation is expensive)
map.getOrCreate("key2", () => expensiveComputation());
```

### update

Update value for key using function.

```typescript
const countMap = new Map<string, number>();
countMap.update("key", (v) => (v ?? 0) + 1); // Increment counter
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

Toggle value (remove if exists, add if not).

```typescript
set.toggle(2);         // 2 exists so remove -> {1, 3, 4, 5, 6}
set.toggle(7);         // 7 doesn't exist so add -> {1, 3, 4, 5, 6, 7}
set.toggle(8, "add");  // Force add
set.toggle(1, "del");  // Force delete
```
