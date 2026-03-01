# @simplysm/core-common

Common utility package providing environment variables, array extensions, error classes, date/time types, async features, and a wide range of utility functions. Works in both browser and Node.js environments.

## Installation

```bash
pnpm add @simplysm/core-common
```

## Table of Contents

- [Array Extensions](#array-extensions)
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
| [`groupBy`](docs/array-extensions.md#readonly-array-methods) | Groups elements by key |
| [`toMap`](docs/array-extensions.md#readonly-array-methods) | Converts to `Map` |
| [`toTree`](docs/array-extensions.md#readonly-array-methods) | Builds a tree from a flat list |
| [`distinct`](docs/array-extensions.md#readonly-array-methods) | Returns unique elements |
| [`orderBy`](docs/array-extensions.md#readonly-array-methods) / [`orderByDesc`](docs/array-extensions.md#readonly-array-methods) | Sorted copy (ascending/descending) |
| [`diffs`](docs/array-extensions.md#readonly-array-methods) / [`oneWayDiffs`](docs/array-extensions.md#readonly-array-methods) | Array diff comparison |
| [`insert`](docs/array-extensions.md#mutable-array-methods) / [`remove`](docs/array-extensions.md#mutable-array-methods) / [`toggle`](docs/array-extensions.md#mutable-array-methods) | In-place mutation helpers |
| [`ArrayDiffsResult`](docs/array-extensions.md#related-types) / [`TreeArray`](docs/array-extensions.md#related-types) | Related TypeScript types |

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
| [`Bytes`](docs/types.md#primitive-types) / [`PrimitiveType`](docs/types.md#primitive-types) | Primitive type aliases |
| [`DeepPartial`](docs/types.md#utility-types) / [`ObjUndefToOptional`](docs/types.md#utility-types) | TypeScript utility types |

---

## Utils

Pure utility functions for common tasks: formatting, parsing, transformation, and I/O encoding.

[Full documentation](docs/utils.md)

| Symbol | Description |
|--------|-------------|
| [`env`](docs/utils.md#env) | Global environment object from `process.env` |
| [`formatDate`](docs/utils.md#formatedateformatstring-args) | C#-style date/time format string renderer |
| [`bytesConcat`](docs/utils.md#bytes-utilities) / [`bytesToHex`](docs/utils.md#bytes-utilities) / [`bytesFromBase64`](docs/utils.md#bytes-utilities) | Binary encoding helpers |
| [`jsonStringify`](docs/utils.md#json-utilities) / [`jsonParse`](docs/utils.md#json-utilities) | JSON with support for `DateTime`, `Uuid`, `Set`, `Map`, etc. |
| [`numFormat`](docs/utils.md#number-utilities) / [`numParseInt`](docs/utils.md#number-utilities) | Number formatting and parsing |
| [`objClone`](docs/utils.md#object-utilities) / [`objEqual`](docs/utils.md#object-utilities) / [`objMerge`](docs/utils.md#object-utilities) | Deep clone, equality, and merge |
| [`objGetChainValue`](docs/utils.md#object-utilities) / [`objSetChainValue`](docs/utils.md#object-utilities) | Dot-path chain access |
| [`strToPascalCase`](docs/utils.md#string-utilities) / [`strToKebabCase`](docs/utils.md#string-utilities) | String case conversion |
| [`koreanGetSuffix`](docs/utils.md#string-utilities) | Korean grammatical particle helper |
| [`js`](docs/utils.md#template-string-tags) / [`ts`](docs/utils.md#template-string-tags) / [`tsql`](docs/utils.md#template-string-tags) | Template literal syntax-highlighting tags |
| [`transferableEncode`](docs/utils.md#transferable-utilities) / [`transferableDecode`](docs/utils.md#transferable-utilities) | Web Worker transfer helpers |
| [`waitUntil`](docs/utils.md#wait-utilities) / [`waitTime`](docs/utils.md#wait-utilities) | Async wait primitives |
| [`xmlParse`](docs/utils.md#xml-utilities) / [`xmlStringify`](docs/utils.md#xml-utilities) | XML serialization |
| [`pathJoin`](docs/utils.md#path-utilities) / [`pathBasename`](docs/utils.md#path-utilities) | POSIX path helpers (browser/Capacitor) |
| [`errorMessage`](docs/utils.md#error-utility) | Safe error-to-string conversion |

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
