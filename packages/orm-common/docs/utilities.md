# Utilities

Result parsing helpers for transforming raw database output to typed TypeScript objects.

Source: `src/utils/result-parser.ts`

## parseQueryResult

Transform raw DB query results to TypeScript objects via `ResultMeta`. Handles type parsing, flat-to-nested transformation, and JOIN grouping.

```typescript
async function parseQueryResult<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined>;
```

**Parameters:**

- `rawResults` -- Raw result array from the database driver (flat key-value records)
- `meta` -- Type transformation and JOIN structure information (`ResultMeta`)

**Returns:**

- Type-transformed and nested result array, or `undefined` if input is empty or all records are empty after parsing

**Behavior:**

- **Type parsing** -- Converts raw values (strings from DB) to proper TypeScript types based on `meta.columns` mapping (e.g., `"1"` to `1` for number, `"2026-01-15T10:00:00Z"` to `DateTime`)
- **Flat-to-nested** -- Transforms dot-notation keys to nested objects (e.g., `"posts.id"` becomes `{ posts: { id: ... } }`)
- **JOIN grouping** -- Groups rows by non-JOIN columns, collecting JOIN data into arrays (1:N) or single objects (1:1)
- **Async** -- Yields to the event loop every 100 records to prevent blocking
- **Empty handling** -- Returns `undefined` for empty input or when all parsed records are empty objects

### Example: Simple Type Parsing

```typescript
const raw = [
  { id: "1", name: "Alice", createdAt: "2026-01-07T10:00:00.000Z" },
];

const meta: ResultMeta = {
  columns: { id: "number", name: "string", createdAt: "DateTime" },
  joins: {},
};

const result = await parseQueryResult(raw, meta);
// [{ id: 1, name: "Alice", createdAt: DateTime("2026-01-07T10:00:00.000Z") }]
```

### Example: JOIN Result Nesting

```typescript
const raw = [
  { id: 1, name: "User1", "posts.id": 10, "posts.title": "Post1" },
  { id: 1, name: "User1", "posts.id": 11, "posts.title": "Post2" },
  { id: 2, name: "User2", "posts.id": 20, "posts.title": "Post3" },
];

const meta: ResultMeta = {
  columns: {
    id: "number",
    name: "string",
    "posts.id": "number",
    "posts.title": "string",
  },
  joins: {
    posts: { isSingle: false },
  },
};

const result = await parseQueryResult(raw, meta);
// [
//   { id: 1, name: "User1", posts: [{ id: 10, title: "Post1" }, { id: 11, title: "Post2" }] },
//   { id: 2, name: "User2", posts: [{ id: 20, title: "Post3" }] },
// ]
```

### Example: Single JOIN (1:1)

```typescript
const raw = [
  { id: 1, title: "Post1", "author.id": 10, "author.name": "Alice" },
  { id: 2, title: "Post2", "author.id": 10, "author.name": "Alice" },
];

const meta: ResultMeta = {
  columns: {
    id: "number",
    title: "string",
    "author.id": "number",
    "author.name": "string",
  },
  joins: {
    author: { isSingle: true },
  },
};

const result = await parseQueryResult(raw, meta);
// [
//   { id: 1, title: "Post1", author: { id: 10, name: "Alice" } },
//   { id: 2, title: "Post2", author: { id: 10, name: "Alice" } },
// ]
```

---

## Type Parsing Rules

| ColumnPrimitiveStr | Input | Output |
|--------------------|-------|--------|
| `"number"` | `"123"` / `123` | `123` (throws if NaN) |
| `"string"` | any | `String(value)` |
| `"boolean"` | `0` / `"0"` / `false` | `false` |
| `"boolean"` | `1` / `"1"` / `true` | `true` |
| `"DateTime"` | ISO string | `DateTime.parse(value)` |
| `"DateOnly"` | date string | `DateOnly.parse(value)` |
| `"Time"` | time string | `Time.parse(value)` |
| `"Uuid"` | `Uint8Array` / string | `Uuid.fromBytes(value)` / `new Uuid(value)` |
| `"Bytes"` | `Uint8Array` / hex string | as-is / `bytes.fromHex(value)` |

`null` and `undefined` values are returned as `undefined` (keys are omitted from the result).
