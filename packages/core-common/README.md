# @simplysm/core-common

Simplysm package - Core module (common)

## Installation

pnpm add @simplysm/core-common

## Source Index

### (top-level)

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/env.ts` | `env` | Runtime environment configuration object | - |
| `src/extensions/arr-ext.ts` | `ArrayDiffsResult`, `ArrayDiffs2Result`, `TreeArray`, `ComparableType` | Array diff, tree, and comparison utilities via prototype augmentation | `array-extension.spec.ts` |

### errors

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/errors/sd-error.ts` | `SdError` | Base error class with name-based error chain support | `errors.spec.ts` |
| `src/errors/argument-error.ts` | `ArgumentError` | Error thrown when a function receives an invalid argument | `errors.spec.ts` |
| `src/errors/not-implemented-error.ts` | `NotImplementedError` | Error indicating an unimplemented method or feature | `errors.spec.ts` |
| `src/errors/timeout-error.ts` | `TimeoutError` | Error thrown when an operation exceeds its time limit | `errors.spec.ts` |

### types

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/types/uuid.ts` | `Uuid` | UUID v4 generation and validation utility class | `uuid.spec.ts` |
| `src/types/lazy-gc-map.ts` | `LazyGcMap` | Map with lazy initialization and automatic garbage collection of unused entries | `lazy-gc-map.spec.ts` |
| `src/types/date-time.ts` | `DateTime` | Immutable date-time class with formatting, arithmetic, and comparison | `date-time.spec.ts` |
| `src/types/date-only.ts` | `DateOnly` | Immutable date-only class (year, month, day) without time component | `date-only.spec.ts` |
| `src/types/time.ts` | `Time` | Immutable time-of-day class (hour, minute, second) | `time.spec.ts` |

### features

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/features/debounce-queue.ts` | `DebounceQueue` | Queue that debounces rapid calls into a single delayed execution | `debounce-queue.spec.ts` |
| `src/features/serial-queue.ts` | `SerialQueue` | Queue that serializes async operations to run one at a time | `serial-queue.spec.ts` |
| `src/features/event-emitter.ts` | `EventEmitter` | Type-safe event emitter with on/off/emit pattern | `sd-event-emitter.spec.ts` |

### utils

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/utils/date-format.ts` | `DtNormalizedMonth`, `normalizeMonth`, `convert12To24`, `formatDate` | Date formatting and month normalization utilities | `date-format.spec.ts` |
| `src/utils/bytes.ts` | `bytesConcat`, `bytesToHex`, `bytesFromHex`, `bytesToBase64`, `bytesFromBase64` | Binary conversion utilities (hex, base64, concat) | `bytes-utils.spec.ts` |
| `src/utils/json.ts` | `jsonStringify`, `jsonParse` | JSON stringify/parse with custom type support (DateTime, DateOnly, etc.) | `json.spec.ts` |
| `src/utils/num.ts` | `numParseInt`, `numParseRoundedInt`, `numParseFloat`, `numIsNullOrEmpty`, `numFormat` | Number parsing and formatting utilities | `number.spec.ts` |
| `src/utils/obj.ts` | `objClone`, `EqualOptions`, `objEqual`, `ObjMergeOptions`, `objMerge`, `ObjMerge3KeyOptions`, `objMerge3`, `objOmit`, `objOmitByFilter`, `objPick`, `objGetChainValue`, `objGetChainValueByDepth`, `objSetChainValue`, `objDeleteChainValue`, `objClearUndefined`, `objClear`, `objNullToUndefined`, `objUnflatten`, `ObjUndefToOptional`, `ObjOptionalToUndef`, `objKeys`, `objEntries`, `objFromEntries`, `objMap` | Deep object utilities (clone, equal, merge, pick, omit, chain access) | `object.spec.ts` |
| `src/utils/primitive.ts` | `getPrimitiveTypeStr` | Primitive type string detection utility | `primitive.spec.ts` |
| `src/utils/str.ts` | `koreanGetSuffix`, `strReplaceFullWidth`, `strToPascalCase`, `strToCamelCase`, `strToKebabCase`, `strToSnakeCase`, `strIsNullOrEmpty`, `strInsert` | String utilities (case conversion, Korean suffix, full-width replacement) | `string.spec.ts` |
| `src/utils/template-strings.ts` | `js`, `ts`, `html`, `tsql`, `mysql`, `pgsql` | Tagged template literals for JS, TS, HTML, SQL syntax highlighting | `template-strings.spec.ts` |
| `src/utils/transferable.ts` | `transferableEncode`, `transferableDecode` | Encode/decode objects with Transferable types for structured clone | `transferable.spec.ts` |
| `src/utils/wait.ts` | `waitUntil`, `waitTime` | Async wait utilities (until condition, timed delay) | `wait.spec.ts` |
| `src/utils/xml.ts` | `xmlParse`, `xmlStringify` | XML parse and stringify utilities | `xml.spec.ts` |
| `src/utils/path.ts` | `pathJoin`, `pathBasename`, `pathExtname` | Platform-independent path join, basename, and extension utilities | `path.spec.ts` |
| `src/utils/error.ts` | `errorMessage` | Extract error message string from unknown error values | - |

### zip

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/zip/sd-zip.ts` | `ZipArchiveProgress`, `ZipArchive` | ZIP archive creation and extraction with progress callback | `sd-zip.spec.ts` |

### type utilities

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/common.types.ts` | `Bytes`, `PrimitiveTypeMap`, `PrimitiveTypeStr`, `PrimitiveType`, `DeepPartial`, `Type` | Common type utilities (Bytes, PrimitiveType, DeepPartial, Type) | - |

## License

Apache-2.0
