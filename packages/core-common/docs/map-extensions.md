# Map Extensions

Prototype extensions added to the global `Map` type. Available after importing `@simplysm/core-common`.

## `Map.prototype.getOrCreate`

Get the value for a key. If the key does not exist, create a new value (using the provided value or factory function), store it, and return it.

```typescript
interface Map<K, V> {
  getOrCreate(key: K, newValue: V): V;
  getOrCreate(key: K, newValueFn: () => V): V;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `K` | The key to look up |
| `newValue` | `V` | Default value to store if key is absent |
| `newValueFn` | `() => V` | Factory function called only if key is absent |

**Returns:** `V` -- the existing or newly created value.

**Note:** If `V` is a function type (e.g., `Map<string, () => void>`), passing a function directly as the second argument will be treated as a factory. Wrap it in another function: `map.getOrCreate("key", () => myFn)`.

---

## `Map.prototype.update`

Update the value for a key using a transform function. The function receives the current value (or `undefined` if the key does not exist) and its return value is stored.

```typescript
interface Map<K, V> {
  update(key: K, updateFn: (v: V | undefined) => V): void;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `K` | The key to update |
| `updateFn` | `(v: V \| undefined) => V` | Transform function. Receives current value or `undefined`. |
