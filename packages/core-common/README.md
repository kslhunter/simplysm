# @simplysm/core-common

> Simplysm package - Core module (common)

A platform-neutral (Node.js and browser) utility library providing immutable date/time types, rich Array/Map/Set extensions, typed error classes, object manipulation, serialization (JSON/XML/ZIP), and async control primitives. It serves as the leaf dependency for the entire Simplysm monorepo.

## Installation

```bash
npm install @simplysm/core-common
```

## Documentation

| Category | Description |
|----------|-------------|
| [Types](docs/types.md) | Immutable date/time classes (`DateTime`, `DateOnly`, `Time`), `Uuid`, `LazyGcMap`, and shared type aliases |
| [Errors](docs/errors.md) | Error class hierarchy: `SdError`, `ArgumentError`, `NotImplementedError`, `TimeoutError` |
| [Features](docs/features.md) | Async control primitives: `EventEmitter`, `DebounceQueue`, `SerialQueue` |
| [Extensions](docs/extensions.md) | Prototype extensions for `Array`, `Map`, and `Set` |
| [Object Utilities](docs/object-utilities.md) | `obj` namespace: `clone`, `equal`, `merge`, `merge3`, `omit`, `pick`, chain access, and type-safe Object helpers |
| [String Utilities](docs/string-utilities.md) | `str` namespace: case conversion, Korean particles, full-width conversion, and string helpers |
| [Number Utilities](docs/number-utilities.md) | `num` namespace: robust parsing (`parseInt`, `parseFloat`) and locale-aware formatting |
| [Byte Utilities](docs/byte-utilities.md) | `bytes` namespace: `concat`, hex/base64 encode/decode for `Uint8Array` |
| [Path Utilities](docs/path-utilities.md) | `path` namespace: browser-safe `join`, `basename`, `extname` (POSIX only) |
| [JSON Utilities](docs/json-utilities.md) | `json` namespace: `stringify` / `parse` with custom type support (`DateTime`, `Set`, `Map`, `Error`, etc.) |
| [XML Utilities](docs/xml-utilities.md) | `xml` namespace: `parse` / `stringify` via fast-xml-parser |
| [Wait Utilities](docs/wait-utilities.md) | `wait` namespace: `time` (sleep) and `until` (poll with timeout) |
| [Transfer Utilities](docs/transfer-utilities.md) | `transfer` namespace: Worker-safe `encode` / `decode` for custom types |
| [Date Format Utilities](docs/date-format-utilities.md) | `dt` namespace: C#-style format strings and month normalization |
| [Primitive Utilities](docs/primitive-utilities.md) | `primitive` namespace: runtime type-string inference |
| [Error Utilities](docs/error-utilities.md) | `err` namespace: extract message from unknown catch values |
| [Template Strings](docs/template-strings.md) | Tagged template literals (`js`, `ts`, `html`, `tsql`, `mysql`, `pgsql`) with auto-indent normalization |
| [ZIP Archive](docs/zip-archive.md) | `ZipArchive` class for reading, writing, and compressing ZIP files |
| [Environment](docs/environment.md) | `env` object exposing `DEV` and `VER` from `process.env` |
