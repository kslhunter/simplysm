# @simplysm/core-common

Core module (common) — platform-neutral core utilities for the Simplysm framework.

Provides error classes, immutable date/time types, prototype extensions, event handling, and utility namespaces that work in both browser and Node.js environments.

## Installation

```bash
npm install @simplysm/core-common
```

## Side-Effect Imports

Importing the package entry point (`@simplysm/core-common`) automatically patches `Array`, `Map`, and `Set` prototypes with extension methods. These are declared as side effects in `package.json`:

- `extensions/arr-ext` — Array prototype extensions
- `extensions/map-ext` — Map prototype extensions
- `extensions/set-ext` — Set prototype extensions

If you import only specific modules (e.g., `@simplysm/core-common/dist/types/date-time`), the prototype extensions are **not** applied unless you also import the entry point or the extension modules directly.

## API Overview

### Errors

| API | Type | Description |
|-----|------|-------------|
| `SdError` | class | Error with tree-structured cause chaining |
| `ArgumentError` | class | Invalid argument error with YAML-formatted details |
| `NotImplementedError` | class | Unimplemented feature error |
| `TimeoutError` | class | Waiting time exceeded error |

-> See [docs/errors.md](./docs/errors.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `Uuid` | class | UUID v4 generation and parsing |
| `DateTime` | class | Immutable date+time (millisecond precision) |
| `DateOnly` | class | Immutable date without time |
| `Time` | class | Immutable time without date (24h wraparound) |
| `LazyGcMap` | class | Map with LRU-based automatic expiration |
| `Bytes` | type alias | `Uint8Array` (replaces `Buffer`) |
| `PrimitiveTypeMap` | type | Mapping of type name strings to types |
| `PrimitiveTypeStr` | type | `keyof PrimitiveTypeMap` |
| `PrimitiveType` | type | Union of all primitive types |
| `DeepPartial<T>` | type | Recursively makes all properties optional |
| `Type<T>` | interface | Constructor type for DI and factory patterns |
| `env` | const | Unified `DEV` / `VER` environment accessor |

-> See [docs/types.md](./docs/types.md) for details.

### Features

| API | Type | Description |
|-----|------|-------------|
| `EventEmitter` | class | Type-safe event emitter (EventTarget wrapper) |
| `DebounceQueue` | class | Async debounce — only the last call executes |
| `SerialQueue` | class | Async serial execution queue |

-> See [docs/features.md](./docs/features.md) for details.

### Prototype Extensions (side-effect)

| API | Type | Description |
|-----|------|-------------|
| `Array` extensions | prototype | 34 methods — query, transform, diff, sort, mutate |
| `Map` extensions | prototype | `getOrCreate`, `update` |
| `Set` extensions | prototype | `adds`, `toggle` |

-> See [docs/extensions.md](./docs/extensions.md) for details.

### Utilities

| API | Type | Description |
|-----|------|-------------|
| `obj` | namespace | clone, equal, merge, merge3, omit, pick, chain access |
| `str` | namespace | Korean particles, case conversion, full-width replacement |
| `num` | namespace | parseInt, parseFloat, format with separators |
| `bytes` | namespace | concat, hex, base64 conversion |
| `path` | namespace | POSIX-only join, basename, extname |
| `json` | namespace | Custom-type-aware JSON stringify/parse |
| `xml` | namespace | XML parse/stringify via fast-xml-parser |
| `wait` | namespace | `until` (polling) and `time` (delay) |
| `transfer` | namespace | Worker-safe encode/decode for custom types |
| `err` | namespace | Extract message from unknown error |
| `dt` | namespace | Date format, month normalization, 12h/24h conversion |
| `primitive` | namespace | Infer `PrimitiveTypeStr` from a value |
| `js`, `ts`, `html`, `tsql`, `mysql`, `pgsql` | function | Template tag functions for syntax highlighting |
| `ZipArchive` | class | ZIP read/write/compress with caching |

-> See [docs/utils.md](./docs/utils.md) for details.

## Quick Usage Examples

### DateTime (immutable date/time)

```typescript
import { DateTime, DateOnly } from "@simplysm/core-common";

const now = new DateTime();
const tomorrow = now.addDays(1);
const formatted = now.toFormatString("yyyy-MM-dd HH:mm:ss");
const parsed = DateTime.parse("2025-01-15 10:30:00");

const today = new DateOnly();
const weekInfo = today.getWeekSeqOfYear(); // { year, weekSeq }
```

### Object utilities

```typescript
import { obj, json } from "@simplysm/core-common";

const cloned = obj.clone(deepObject);
const isEqual = obj.equal(a, b, { ignoreArrayIndex: true });
const merged = obj.merge(base, override);
const value = obj.getChainValue(data, "a.b[0].c");

// Custom-type-aware JSON
const str = json.stringify({ date: new DateTime(), id: Uuid.generate() });
const restored = json.parse(str); // DateTime and Uuid instances restored
```

### Array extensions

```typescript
import "@simplysm/core-common";

const items = [3, 1, 4, 1, 5];
items.distinct();          // [3, 1, 4, 5]
items.orderBy();           // [1, 1, 3, 4, 5]
items.sum();               // 14
items.groupBy((x) => x % 2 === 0 ? "even" : "odd");

const users = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
users.toMap((u) => u.id);  // Map { 1 => {...}, 2 => {...} }
users.single((u) => u.id === 1); // { id: 1, name: "A" }
```

### EventEmitter

```typescript
import { EventEmitter } from "@simplysm/core-common";

interface MyEvents { data: string; done: void }

class MyService extends EventEmitter<MyEvents> {}

const svc = new MyService();
svc.on("data", (msg) => console.log(msg));
svc.emit("data", "hello");
svc.emit("done");
```

## License

Apache-2.0
