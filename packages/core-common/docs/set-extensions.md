# Set Extensions

Prototype extensions added to the global `Set` type. Available after importing `@simplysm/core-common`.

## `Set.prototype.adds`

Add multiple values at once.

```typescript
interface Set<T> {
  adds(...values: T[]): this;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `values` | `T[]` | Values to add |

**Returns:** `this` (for method chaining)

---

## `Set.prototype.toggle`

Toggle a value in the set. If the value exists, remove it; if absent, add it. Optionally force add or delete.

```typescript
interface Set<T> {
  toggle(value: T, addOrDel?: "add" | "del"): this;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `T` | The value to toggle |
| `addOrDel` | `"add" \| "del" \| undefined` | Force `"add"` to always add, `"del"` to always remove. Omit for automatic toggle. |

**Returns:** `this` (for method chaining)
