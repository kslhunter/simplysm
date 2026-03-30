# @simplysm/core-common

Platform-neutral utility library for the Simplysm framework. Provides type-safe primitives, collection extensions, error hierarchy, async utilities, and serialization helpers that work in both browser and Node.js environments.

## Installation

```bash
npm install @simplysm/core-common
```

## API Overview

### Environment

| API | Type | Description |
|-----|------|-------------|
| `env` | `const` | Unified environment variables from `import.meta.env` and `process.env`. `DEV` is parsed as boolean, `VER` as optional string. |
| `parseBoolEnv(value)` | `function` | Parse a value to boolean (`"true"`, `"1"`, `"yes"`, `"on"` case-insensitive -> `true`, otherwise `false`) |

-> See [docs/env.md](./docs/env.md) for details.

### Errors

| API | Type | Description |
|-----|------|-------------|
| `SdError` | `class` | Tree-structured error with chained messages via ES2024 `cause` |
| `ArgumentError` | `class` | Invalid argument error with YAML-formatted argument dump |
| `NotImplementedError` | `class` | Unimplemented feature error |
| `TimeoutError` | `class` | Timeout exceeded error with retry count |

-> See [docs/errors.md](./docs/errors.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `Uuid` | `class` | UUID v4 generation and parsing using `crypto.getRandomValues` |
| `LazyGcMap<K,V>` | `class` | Auto-expiring Map with LRU access tracking and GC timer |
| `DateTime` | `class` | Immutable date-time wrapper around `Date` with millisecond precision |
| `DateOnly` | `class` | Immutable date-only class (no time component) with week-sequence support |
| `Time` | `class` | Immutable time-only class with 24-hour wrapping |

-> See [docs/types.md](./docs/types.md) for details.

### Features

| API | Type | Description |
|-----|------|-------------|
| `DebounceQueue` | `class` | Async debounce queue -- only the last enqueued function runs after delay |
| `SerialQueue` | `class` | Async serial queue -- functions execute one at a time in order |
| `EventEmitter<TEvents>` | `class` | Type-safe event emitter built on `EventTarget` |

-> See [docs/features.md](./docs/features.md) for details.

### Array Extensions

| API | Type | Description |
|-----|------|-------------|
| `Array.prototype.single` | extension | Return single matching element or throw if multiple |
| `Array.prototype.first` | extension | Return first element or first matching |
| `Array.prototype.last` | extension | Return last element or last matching |
| `Array.prototype.filterExists` | extension | Remove null/undefined elements |
| `Array.prototype.ofType` | extension | Filter by primitive type string or constructor |
| `Array.prototype.filterAsync` | extension | Async sequential filter |
| `Array.prototype.mapAsync` | extension | Async sequential map |
| `Array.prototype.mapMany` | extension | Flatten or map-then-flatten |
| `Array.prototype.mapManyAsync` | extension | Async map then flatten |
| `Array.prototype.parallelAsync` | extension | Parallel async map via `Promise.all` |
| `Array.prototype.groupBy` | extension | Group by key selector |
| `Array.prototype.toMap` | extension | Convert to `Map` with key/value selectors |
| `Array.prototype.toMapAsync` | extension | Async version of `toMap` |
| `Array.prototype.toArrayMap` | extension | Convert to `Map<K, V[]>` |
| `Array.prototype.toSetMap` | extension | Convert to `Map<K, Set<V>>` |
| `Array.prototype.toMapValues` | extension | Group then aggregate values |
| `Array.prototype.toObject` | extension | Convert to `Record<string, V>` |
| `Array.prototype.toTree` | extension | Convert flat array to tree structure |
| `Array.prototype.distinct` | extension | Remove duplicates (new array) |
| `Array.prototype.orderBy` | extension | Sort ascending (new array) |
| `Array.prototype.orderByDesc` | extension | Sort descending (new array) |
| `Array.prototype.diffs` | extension | Compare two arrays (insert/delete/update) |
| `Array.prototype.oneWayDiffs` | extension | One-way diff (create/update/same) |
| `Array.prototype.merge` | extension | Merge two arrays by key |
| `Array.prototype.sum` | extension | Sum of elements |
| `Array.prototype.min` | extension | Minimum element |
| `Array.prototype.max` | extension | Maximum element |
| `Array.prototype.shuffle` | extension | Random shuffle (new array) |
| `Array.prototype.distinctThis` | extension | Remove duplicates in-place |
| `Array.prototype.orderByThis` | extension | Sort ascending in-place |
| `Array.prototype.orderByDescThis` | extension | Sort descending in-place |
| `Array.prototype.insert` | extension | Insert items at index in-place |
| `Array.prototype.remove` | extension | Remove items in-place |
| `Array.prototype.toggle` | extension | Toggle item in-place |
| `Array.prototype.clear` | extension | Remove all items in-place |
| `ArrayDiffsResult<T,P>` | `type` | Diff result: insert / delete / update |
| `ArrayOneWayDiffResult<T>` | `type` | One-way diff result: create / update / same |
| `TreeArray<T>` | `type` | Tree node type with `children` array |
| `ComparableType` | `type` | Union of sortable types |

-> See [docs/array-extensions.md](./docs/array-extensions.md) for details.

### Map Extensions

| API | Type | Description |
|-----|------|-------------|
| `Map.prototype.getOrCreate` | extension | Get value or create with default/factory |
| `Map.prototype.update` | extension | Update a value using a transform function |

-> See [docs/map-extensions.md](./docs/map-extensions.md) for details.

### Set Extensions

| API | Type | Description |
|-----|------|-------------|
| `Set.prototype.adds` | extension | Add multiple values at once |
| `Set.prototype.toggle` | extension | Toggle a value with optional force add/delete |

-> See [docs/set-extensions.md](./docs/set-extensions.md) for details.

### Utility Namespaces

All utility namespaces are exported as `export * as name` and accessed as `obj.clone(...)`, `str.toPascalCase(...)`, etc.

| Namespace | Description |
|-----------|-------------|
| `obj` | Deep clone, deep equal, deep merge, 3-way merge, omit, pick, chain value access, type-safe keys/entries/fromEntries/map |
| `str` | Korean suffix, full-width conversion, case conversion (pascal/camel/kebab/snake), isNullOrEmpty, insert |
| `num` | parseInt, parseFloat, parseRoundedInt, isNullOrEmpty, format with thousand separators |
| `bytes` | Uint8Array concat, hex, base64 conversion |
| `path` | POSIX path join, basename, extname (browser-compatible, no backslash support) |
| `json` | Custom JSON stringify/parse with DateTime, Uuid, Set, Map, Error, Uint8Array support |
| `xml` | XML parse/stringify via fast-xml-parser |
| `wait` | Async `until` (poll condition) and `time` (delay) |
| `transfer` | Worker-safe encode/decode for custom types with transferable list extraction |
| `err` | Extract error message from unknown catch value |
| `dt` | Date/time formatting with C#-style format strings, normalizeMonth, convert12To24 |
| `primitive` | Get PrimitiveTypeStr from runtime value |

-> See [docs/utilities.md](./docs/utilities.md) for details.

### Template Strings and Zip

| API | Type | Description |
|-----|------|-------------|
| `js` | tag function | JavaScript template tag with indent normalization |
| `ts` | tag function | TypeScript template tag with indent normalization |
| `html` | tag function | HTML template tag with indent normalization |
| `tsql` | tag function | MSSQL T-SQL template tag with indent normalization |
| `mysql` | tag function | MySQL template tag with indent normalization |
| `pgsql` | tag function | PostgreSQL template tag with indent normalization |
| `ZipArchive` | `class` | ZIP read/write/compress/extract with caching |
| `ZipArchiveProgress` | `interface` | Progress callback data for extraction |

-> See [docs/template-strings-and-zip.md](./docs/template-strings-and-zip.md) for details.

### Type Utilities

| API | Type | Description |
|-----|------|-------------|
| `Bytes` | `type` | Alias for `Uint8Array` (replaces `Buffer`) |
| `PrimitiveTypeMap` | `type` | Maps type-string keys to their TypeScript types |
| `PrimitiveTypeStr` | `type` | `keyof PrimitiveTypeMap` |
| `PrimitiveType` | `type` | Union of all primitive type values plus `undefined` |
| `DeepPartial<T>` | `type` | Recursively makes all properties optional |
| `Type<T>` | `interface` | Constructor type (`new (...args: unknown[]) => T`) |

-> See [docs/type-utilities.md](./docs/type-utilities.md) for details.

## Usage Examples

### Deep Cloning and Comparing

```typescript
import { obj } from "@simplysm/core-common";

const original = { a: 1, b: { c: [2, 3] } };
const cloned = obj.clone(original);
obj.equal(original, cloned); // true

const merged = obj.merge(original, { b: { d: 4 } });
// { a: 1, b: { c: [2, 3], d: 4 } }
```

### Array Extensions

```typescript
import "@simplysm/core-common";

const users = [
  { id: 1, role: "admin", name: "Alice" },
  { id: 2, role: "user", name: "Bob" },
  { id: 3, role: "user", name: "Carol" },
];

users.groupBy((u) => u.role);
// [{ key: "admin", values: [Alice] }, { key: "user", values: [Bob, Carol] }]

users.toMap((u) => u.id);
// Map { 1 => Alice, 2 => Bob, 3 => Carol }

[3, 1, 2].orderBy(); // [1, 2, 3]
[1, 2, 2, 3].distinct(); // [1, 2, 3]
```

### JSON Serialization with Custom Types

```typescript
import { json, DateTime, Uuid } from "@simplysm/core-common";

const data = {
  id: Uuid.generate(),
  createdAt: new DateTime(2025, 6, 15, 10, 30, 0),
  tags: new Set(["a", "b"]),
};

const serialized = json.stringify(data);
const restored = json.parse(serialized);
// restored.id is Uuid, restored.createdAt is DateTime, restored.tags is Set
```
