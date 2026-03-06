# @simplysm/core-common

Common utility package providing environment variables, array/map/set extensions, error classes, date/time types, async features, and a wide range of utility namespaces. Works in both browser and Node.js environments.

## Installation

```bash
pnpm add @simplysm/core-common
```

## Table of Contents

- [Array Extensions](#array-extensions)
- [Map Extensions](#map-extensions)
- [Set Extensions](#set-extensions)
- [Types](#types)
- [Utils](#utils)
- [Features](#features)
- [Errors](#errors)
- [Zip](#zip)

---

## Array Extensions

Prototype extensions added to `Array` and `ReadonlyArray` as a side effect of importing from this package. Covers querying, grouping, diffing, sorting, and async iteration.

[Full documentation](docs/array-extensions.md)

| Symbol | Description |
|--------|-------------|
| [`single`](docs/array-extensions.md#readonly-array-methods) | Returns the sole matching element (throws on multiple matches) |
| [`first`](docs/array-extensions.md#readonly-array-methods) | First matching element |
| [`last`](docs/array-extensions.md#readonly-array-methods) | Last matching element |
| [`filterExists`](docs/array-extensions.md#readonly-array-methods) | Removes `null`/`undefined` entries |
| [`filterAsync`](docs/array-extensions.md#readonly-array-methods) | Async filter (sequential) |
| [`ofType`](docs/array-extensions.md#readonly-array-methods) | Filter by primitive type string or constructor |
| [`mapAsync`](docs/array-extensions.md#readonly-array-methods) | Async map (sequential) |
| [`mapMany`](docs/array-extensions.md#readonly-array-methods) / [`mapManyAsync`](docs/array-extensions.md#readonly-array-methods) | Flatten with optional transform |
| [`parallelAsync`](docs/array-extensions.md#readonly-array-methods) | Parallel async map (`Promise.all`) |
| [`groupBy`](docs/array-extensions.md#readonly-array-methods) | Groups elements by key |
| [`toMap`](docs/array-extensions.md#readonly-array-methods) / [`toMapAsync`](docs/array-extensions.md#readonly-array-methods) | Converts to `Map` |
| [`toArrayMap`](docs/array-extensions.md#readonly-array-methods) | Converts to `Map` where values are arrays |
| [`toSetMap`](docs/array-extensions.md#readonly-array-methods) | Converts to `Map` where values are sets |
| [`toMapValues`](docs/array-extensions.md#readonly-array-methods) | Groups by key then reduces each group |
| [`toObject`](docs/array-extensions.md#readonly-array-methods) | Converts to plain `Record<string, V>` |
| [`toTree`](docs/array-extensions.md#readonly-array-methods) | Builds a tree from a flat list |
| [`distinct`](docs/array-extensions.md#readonly-array-methods) | Returns unique elements |
| [`orderBy`](docs/array-extensions.md#readonly-array-methods) / [`orderByDesc`](docs/array-extensions.md#readonly-array-methods) | Sorted copy (ascending/descending) |
| [`diffs`](docs/array-extensions.md#readonly-array-methods) / [`oneWayDiffs`](docs/array-extensions.md#readonly-array-methods) | Array diff comparison |
| [`merge`](docs/array-extensions.md#readonly-array-methods) | Merge two arrays using diffs |
| [`sum`](docs/array-extensions.md#readonly-array-methods) / [`min`](docs/array-extensions.md#readonly-array-methods) / [`max`](docs/array-extensions.md#readonly-array-methods) | Aggregation helpers |
| [`shuffle`](docs/array-extensions.md#readonly-array-methods) | Returns a new randomly shuffled array |
| [`distinctThis`](docs/array-extensions.md#mutable-array-methods) / [`orderByThis`](docs/array-extensions.md#mutable-array-methods) / [`orderByDescThis`](docs/array-extensions.md#mutable-array-methods) | In-place sort/dedup |
| [`insert`](docs/array-extensions.md#mutable-array-methods) / [`remove`](docs/array-extensions.md#mutable-array-methods) / [`toggle`](docs/array-extensions.md#mutable-array-methods) / [`clear`](docs/array-extensions.md#mutable-array-methods) | In-place mutation helpers |
| [`ArrayDiffsResult`](docs/array-extensions.md#related-types) / [`ArrayOneWayDiffResult`](docs/array-extensions.md#related-types) / [`TreeArray`](docs/array-extensions.md#related-types) / [`ComparableType`](docs/array-extensions.md#related-types) | Related TypeScript types |

---

## Map Extensions

Prototype extensions added to `Map` as a side effect of importing from this package.

[Full documentation](docs/utils.md#map-extensions-side-effect)

| Symbol | Description |
|--------|-------------|
| `getOrCreate` | Return existing value or set and return a new value via factory |
| `update` | Update value in place using a transform function |

---

## Set Extensions

Prototype extensions added to `Set` as a side effect of importing from this package.

[Full documentation](docs/utils.md#set-extensions-side-effect)

| Symbol | Description |
|--------|-------------|
| `adds` | Add multiple values at once |
| `toggle` | Remove if present, add if absent; optional forced direction |

---

## Types

Immutable value types and utility type aliases. All support parsing, formatting, and arithmetic.

[Full documentation](docs/types.md)

| Symbol | Description |
|--------|-------------|
| [`Uuid`](docs/types.md#uuid) | UUID v4 using `crypto.getRandomValues` |
| [`LazyGcMap`](docs/types.md#lazygcmaptkey-tvalue) | `Map` with automatic expiry-based garbage collection |
| [`DateTime`](docs/types.md#datetime) | Immutable date-time (millisecond precision, local timezone) |
| [`DateOnly`](docs/types.md#dateonly) | Immutable date without time; includes week-sequence helpers |
| [`Time`](docs/types.md#time) | Immutable time without date; 24-hour wrap normalization |
| [`Bytes`](docs/types.md#primitive-types) / [`PrimitiveType`](docs/types.md#primitive-types) / [`PrimitiveTypeStr`](docs/types.md#primitive-types) / [`PrimitiveTypeMap`](docs/types.md#primitive-types) | Primitive type aliases |
| [`DeepPartial`](docs/types.md#utility-types) / [`Type`](docs/types.md#utility-types) | TypeScript utility types |
| [`UndefToOptional`](docs/types.md#utility-types) / [`OptionalToUndef`](docs/types.md#utility-types) | Optional/undefined conversion types |
| [`EqualOptions`](docs/types.md#utility-types) / [`MergeOptions`](docs/types.md#utility-types) / [`Merge3KeyOptions`](docs/types.md#utility-types) | Option types for `obj.*` utilities |
| [`DtNormalizedMonth`](docs/types.md#utility-types) | Return type of `dt.normalizeMonth` |

---

## Utils

Pure utility namespaces for common tasks: formatting, parsing, transformation, and I/O encoding.

[Full documentation](docs/utils.md)

| Symbol | Description |
|--------|-------------|
| [`env`](docs/utils.md#env) | Global environment object from `process.env` |
| [`dt`](docs/utils.md#dt--date-utilities) | Date/time formatting and normalization (`dt.format`, `dt.normalizeMonth`, `dt.convert12To24`) |
| [`bytes`](docs/utils.md#bytes--binary-utilities) | Binary encoding helpers (`concat`, `toHex`, `fromHex`, `toBase64`, `fromBase64`) |
| [`json`](docs/utils.md#json--json-utilities) | JSON with support for `DateTime`, `Uuid`, `Set`, `Map`, etc. (`stringify`, `parse`) |
| [`num`](docs/utils.md#num--number-utilities) | Number formatting and parsing (`parseInt`, `parseFloat`, `parseRoundedInt`, `format`, `isNullOrEmpty`) |
| [`obj`](docs/utils.md#obj--object-utilities) | Deep clone, equality, merge, chain path access, key utilities |
| [`primitive`](docs/utils.md#primitive--primitive-type-utility) | Infer `PrimitiveTypeStr` from a value at runtime |
| [`str`](docs/utils.md#str--string-utilities) | String case conversion, Korean particle, full-width conversion, null check, insert |
| [`path`](docs/utils.md#path--path-utilities) | POSIX path helpers (`join`, `basename`, `extname`) |
| [`xml`](docs/utils.md#xml--xml-utilities) | XML serialization (`parse`, `stringify`) |
| [`wait`](docs/utils.md#wait--wait-utilities) | Async wait primitives (`until`, `time`) |
| [`transfer`](docs/utils.md#transfer--transferable-utilities) | Web Worker transfer helpers (`encode`, `decode`) |
| [`err`](docs/utils.md#err--error-utility) | Safe error-to-string conversion (`message`) |
| [`js`](docs/utils.md#template-string-tags) / [`ts`](docs/utils.md#template-string-tags) / [`html`](docs/utils.md#template-string-tags) / [`tsql`](docs/utils.md#template-string-tags) / [`mysql`](docs/utils.md#template-string-tags) / [`pgsql`](docs/utils.md#template-string-tags) | Template literal syntax-highlighting tags |

---

## Features

Async coordination primitives for debouncing, sequential execution, and typed event handling.

[Full documentation](docs/features.md)

| Symbol | Description |
|--------|-------------|
| [`DebounceQueue`](docs/features.md#debouncequeue) | Executes only the last of rapid-fire calls after a delay |
| [`SerialQueue`](docs/features.md#serialqueue) | Runs async tasks one at a time in submission order |
| [`EventEmitter`](docs/features.md#eventemittertevents) | Type-safe event emitter backed by `EventTarget` |

---

## Errors

Error classes with structured cause chaining and descriptive formatting.

[Full documentation](docs/errors.md)

| Symbol | Description |
|--------|-------------|
| [`SdError`](docs/errors.md#sderror) | Base error with tree-structured cause chaining |
| [`ArgumentError`](docs/errors.md#argumenterror) | Invalid argument with YAML-formatted values |
| [`NotImplementedError`](docs/errors.md#notimplementederror) | Placeholder for unimplemented code paths |
| [`TimeoutError`](docs/errors.md#timeouterror) | Thrown when a wait loop exceeds its attempt limit |

---

## Zip

ZIP archive reading, writing, and compression via `@zip.js/zip.js`.

[Full documentation](docs/zip.md)

| Symbol | Description |
|--------|-------------|
| [`ZipArchive`](docs/zip.md#ziparchive) | Read, write, and compress ZIP archives with `await using` support |
| [`ZipArchiveProgress`](docs/zip.md#ziparchive) | Progress callback interface for `extractAll` |
