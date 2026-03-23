# Collections

Specialized collection classes beyond the built-in `Map` and `Set`.

## LazyGcMap\<K, V\>

A `Map`-like structure with automatic garbage collection of expired entries. Entries that have not been accessed within `expireTime` are removed by a periodic GC timer that runs at `gcInterval`. The timer is lazy: it starts when the first entry is added and stops when the map becomes empty.

### Constructor

```ts
new LazyGcMap<K, V>(options: {
  gcInterval: number;
  expireTime: number;
  onExpire?: (key: K, value: V) => void | Promise<void>;
})
```

| Option | Type | Description |
|--------|------|-------------|
| `gcInterval` | `number` | How often GC runs, in milliseconds (e.g., 10000 for every 10 seconds). |
| `expireTime` | `number` | How long an entry lives without being accessed, in milliseconds (e.g., 60000 for 1 minute). |
| `onExpire` | `(key: K, value: V) => void \| Promise<void>` | Optional callback invoked when an entry is garbage-collected. |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `size` | `number` | Number of entries currently in the map. |

### Methods

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `has` | `has(key: K)` | `boolean` | Check if key exists. Does not refresh access time. |
| `get` | `get(key: K)` | `V \| undefined` | Get value. Refreshes the entry's access time (LRU behavior). |
| `set` | `set(key: K, value: V)` | `void` | Set value. Starts GC timer if not already running. |
| `delete` | `delete(key: K)` | `boolean` | Delete an entry. Stops GC timer if the map becomes empty. |
| `clear` | `clear()` | `void` | Remove all entries and stop the GC timer. |
| `getOrCreate` | `getOrCreate(key: K, factory: () => V)` | `V` | Get existing value, or create via `factory()`, set it, and return it. |
| `values` | `values()` | `IterableIterator<V>` | Iterate over values (generator). |

### Example

```ts
import { LazyGcMap } from "@simplysm/sd-core-common";

const cache = new LazyGcMap<string, object>({
  gcInterval: 10_000,   // check every 10s
  expireTime: 60_000,   // expire after 1 min of no access
  onExpire: (key) => console.log(`Expired: ${key}`),
});

cache.set("session-1", { user: "Alice" });
cache.get("session-1"); // refreshes access time
```

## TreeMap\<T\>

A nested `Map` structure that uses a key array to navigate multiple levels of maps. Useful for multi-dimensional lookups.

### Constructor

```ts
new TreeMap<T>()
```

### Methods

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `set` | `set(keys: any[], val: T)` | `void` | Set a value at the given key path. Intermediate Maps are created as needed via `Map.getOrCreate`. |
| `get` | `get(keys: any[])` | `T \| undefined` | Get a value at the given key path. Returns `undefined` if any intermediate key is missing. |
| `getOrCreate` | `getOrCreate(keys: any[], value: T)` | `T` | Get existing value at key path, or set and return the given value. |
| `clear` | `clear()` | `void` | Clear the entire tree. |

### Example

```ts
import { TreeMap } from "@simplysm/sd-core-common";

const tree = new TreeMap<number>();
tree.set(["a", "b", "c"], 42);
tree.get(["a", "b", "c"]); // 42
tree.get(["a", "b", "x"]); // undefined
tree.clear();
```
