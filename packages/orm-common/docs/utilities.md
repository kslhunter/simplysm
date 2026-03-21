# Utilities

## `parseQueryResult`

Transform raw DB query results to typed TypeScript objects via `ResultMeta`. Handles type parsing, nested object construction from flat JOIN results, and deduplication.

```typescript
async function parseQueryResult<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `rawResults` | `Record<string, unknown>[]` | Raw result array from database |
| `meta` | `ResultMeta` | Type transformation and JOIN structure information |

**Returns:** Type-transformed and nested result array. Returns `undefined` if input is empty or no valid results.

### Behavior

- **Type parsing**: Converts raw values to TypeScript types based on `meta.columns` mapping (e.g., string to `DateTime`, number to boolean).
- **JOIN nesting**: Converts flat `"posts.id"` keys into nested `{ posts: { id: ... } }` structures.
- **Deduplication**: Groups records by non-JOIN columns and collects JOIN data into arrays (or single objects for `isSingle: true`).
- **Async**: Yields to the event loop every 100 records to prevent blocking.
- **Empty handling**: Returns `undefined` for empty input or all-empty parsed records.
