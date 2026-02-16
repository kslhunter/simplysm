# @simplysm/core-common

A common utility package for the Simplysm framework. As a neutral base module usable in both Node.js and browser environments, it provides date/time types, error classes, object/array/string utilities, JSON serialization, ZIP processing, prototype extensions, and more.

## Installation

```bash
npm install @simplysm/core-common
# or
pnpm add @simplysm/core-common
```

### Initialization

Import the package at your application entry point (e.g., `index.ts`, `main.ts`):

```typescript
import "@simplysm/core-common";
```

This import globally activates Array, Map, and Set prototype extensions.
To use extension methods (`getOrCreate()`, `toggle()`, etc.), you must import this at app startup.

## Main Modules

### Errors

- [`SdError`](docs/types.md#sderror) - Base error class with cause chain tracking
- [`ArgumentError`](docs/types.md#argumenterror) - Argument validation error with YAML formatting
- [`NotImplementedError`](docs/types.md#notimplementederror) - Indicates unimplemented functionality
- [`TimeoutError`](docs/types.md#timeouterror) - Timeout error

### Custom Types

- [`DateTime`](docs/types.md#datetime) - Date + time (millisecond precision, local timezone)
- [`DateOnly`](docs/types.md#dateonly) - Date only (no time)
- [`Time`](docs/types.md#time) - Time only (no date, 24-hour cycle)
- [`Uuid`](docs/types.md#uuid) - UUID v4 (cryptographically secure)
- [`LazyGcMap`](docs/types.md#lazygcmap) - Map with auto-expiration (LRU style)

### Features

- [`DebounceQueue`](docs/features.md#debouncequeue) - Async debounce queue (executes only last request)
- [`SerialQueue`](docs/features.md#serialqueue) - Async serial queue (sequential execution)
- [`EventEmitter`](docs/features.md#eventemitter) - EventTarget wrapper with type-safe events
- [`ZipArchive`](docs/features.md#ziparchive) - ZIP file compression/decompression utility

### Object Utilities

- [`objClone`](docs/utils.md#objclone) - Deep clone (supports circular references, custom types)
- [`objEqual`](docs/utils.md#objequal) - Deep comparison with options
- [`objMerge`](docs/utils.md#objmerge) - Deep merge (source + target)
- [`objMerge3`](docs/utils.md#objmerge3) - 3-way merge with conflict detection
- [`objOmit`](docs/utils.md#objomit) - Exclude specific keys
- [`objPick`](docs/utils.md#objpick) - Select specific keys
- [`objGetChainValue`](docs/utils.md#objgetchainvalue) - Query value by chain path
- [`objSetChainValue`](docs/utils.md#objsetchainvalue) - Set value by chain path
- [`objDeleteChainValue`](docs/utils.md#objdeletechainvalue) - Delete value by chain path
- [`objKeys`](docs/utils.md#objkeys) - Type-safe `Object.keys`
- [`objEntries`](docs/utils.md#objentries) - Type-safe `Object.entries`
- [`objFromEntries`](docs/utils.md#objfromentries) - Type-safe `Object.fromEntries`
- [`objMap`](docs/utils.md#objmap) - Transform each entry of object

### JSON Utilities

- [`jsonStringify`](docs/utils.md#jsonstringify) - JSON serialization with custom type support
- [`jsonParse`](docs/utils.md#jsonparse) - JSON deserialization with custom type restoration

### XML Utilities

- [`xmlParse`](docs/utils.md#xmlparse) - Parse XML string to object
- [`xmlStringify`](docs/utils.md#xmlstringify) - Serialize object to XML string

### String Utilities

- [`strGetSuffix`](docs/utils.md#strgetsuffix) - Korean postposition handling
- [`strReplaceFullWidth`](docs/utils.md#strreplacefullwidth) - Convert full-width to half-width
- [`strToPascalCase`](docs/utils.md#strtopascalcase) - PascalCase conversion
- [`strToCamelCase`](docs/utils.md#strtocamelcase) - camelCase conversion
- [`strToKebabCase`](docs/utils.md#strtokebabcase) - kebab-case conversion
- [`strToSnakeCase`](docs/utils.md#strtosnakecase) - snake_case conversion
- [`strIsNullOrEmpty`](docs/utils.md#strisnullorempty) - Check for undefined/null/empty (type guard)
- [`strInsert`](docs/utils.md#strinsert) - Insert at position in string

### Number Utilities

- [`numParseInt`](docs/utils.md#numparseint) - Parse string to integer
- [`numParseFloat`](docs/utils.md#numparsefloat) - Parse string to float
- [`numParseRoundedInt`](docs/utils.md#numparseroundedint) - Round float and return integer
- [`numFormat`](docs/utils.md#numformat) - Thousands separator formatting
- [`numIsNullOrEmpty`](docs/utils.md#numisnullorempty) - Check for undefined/null/0 (type guard)

### Date/Time Formatting

- [`formatDate`](docs/utils.md#formatdate) - Convert date/time to formatted string
- [`normalizeMonth`](docs/utils.md#normalizemonth) - Normalize year/month/day when setting month

### Byte Utilities

- [`bytesConcat`](docs/utils.md#bytesconcat) - Concatenate multiple Uint8Arrays
- [`bytesToHex`](docs/utils.md#bytestohex) - Convert Uint8Array to hex string
- [`bytesFromHex`](docs/utils.md#bytesfromhex) - Convert hex string to Uint8Array
- [`bytesToBase64`](docs/utils.md#bytestobase64) - Convert Uint8Array to base64 string
- [`bytesFromBase64`](docs/utils.md#bytesfrombase64) - Convert base64 string to Uint8Array

### Async Wait

- [`waitTime`](docs/utils.md#waittime) - Wait for specified time
- [`waitUntil`](docs/utils.md#waituntil) - Wait until condition is true

### Worker Data Conversion

- [`transferableEncode`](docs/utils.md#transferableencode) - Serialize custom types for Worker transfer
- [`transferableDecode`](docs/utils.md#transferabledecode) - Deserialize Worker data to custom types

### Path Utilities

- [`pathJoin`](docs/utils.md#pathjoin) - Combine paths (POSIX-style only)
- [`pathBasename`](docs/utils.md#pathbasename) - Extract filename
- [`pathExtname`](docs/utils.md#pathextname) - Extract extension

### Template Literal Tags

- [`js`](docs/utils.md#js) - JavaScript code highlighting
- [`ts`](docs/utils.md#ts) - TypeScript code highlighting
- [`html`](docs/utils.md#html) - HTML markup highlighting
- [`tsql`](docs/utils.md#tsql) - MSSQL T-SQL highlighting
- [`mysql`](docs/utils.md#mysql) - MySQL SQL highlighting
- [`pgsql`](docs/utils.md#pgsql) - PostgreSQL SQL highlighting

### Other Utilities

- [`getPrimitiveTypeStr`](docs/utils.md#getprimitivetypestr) - Infer `PrimitiveTypeStr` from runtime value
- [`env`](docs/utils.md#env) - Environment variable object

### Array Extensions

#### Query
- [`single`](docs/extensions.md#single) - Return single element (error if 2+)
- [`first`](docs/extensions.md#first) - Return first element
- [`last`](docs/extensions.md#last) - Return last element

#### Filtering
- [`filterExists`](docs/extensions.md#filterexists) - Remove `null`/`undefined`
- [`ofType`](docs/extensions.md#oftype) - Filter by type
- [`filterAsync`](docs/extensions.md#filterasync) - Async filter

#### Mapping/Transformation
- [`mapAsync`](docs/extensions.md#mapasync) - Async mapping (sequential)
- [`mapMany`](docs/extensions.md#mapmany) - flat + filterExists
- [`mapManyAsync`](docs/extensions.md#mapmanyasync) - Async mapMany
- [`parallelAsync`](docs/extensions.md#parallelasync) - Parallel async mapping

#### Grouping
- [`groupBy`](docs/extensions.md#groupby) - Group by key
- [`toMap`](docs/extensions.md#tomap) - Convert to Map
- [`toMapAsync`](docs/extensions.md#tomapasync) - Async Map conversion
- [`toArrayMap`](docs/extensions.md#toarraymap) - Convert to `Map<K, V[]>`
- [`toSetMap`](docs/extensions.md#tosetmap) - Convert to `Map<K, Set<V>>`
- [`toMapValues`](docs/extensions.md#tomapvalues) - Aggregate Map by group
- [`toObject`](docs/extensions.md#toobject) - Convert to `Record<string, V>`
- [`toTree`](docs/extensions.md#totree) - Convert to tree structure

#### Deduplication
- [`distinct`](docs/extensions.md#distinct) - Remove duplicates (new array)
- [`distinctThis`](docs/extensions.md#distinctthis) - Remove duplicates (modify original)

#### Sorting
- [`orderBy`](docs/extensions.md#orderby) - Ascending sort (new array)
- [`orderByDesc`](docs/extensions.md#orderbydesc) - Descending sort (new array)
- [`orderByThis`](docs/extensions.md#orderbythis) - Ascending sort (modify original)
- [`orderByDescThis`](docs/extensions.md#orderbydescthis) - Descending sort (modify original)

#### Comparison/Merging
- [`diffs`](docs/extensions.md#diffs) - Compare differences between arrays
- [`oneWayDiffs`](docs/extensions.md#onewaydiffs) - One-way diff comparison
- [`merge`](docs/extensions.md#merge) - Merge arrays

#### Aggregation
- [`sum`](docs/extensions.md#sum) - Sum
- [`min`](docs/extensions.md#min) - Minimum
- [`max`](docs/extensions.md#max) - Maximum

#### Mutation
- [`insert`](docs/extensions.md#insert) - Insert at specific position
- [`remove`](docs/extensions.md#remove) - Remove item
- [`toggle`](docs/extensions.md#toggle) - Toggle item
- [`clear`](docs/extensions.md#clear) - Remove all items
- [`shuffle`](docs/extensions.md#shuffle) - Shuffle array

### Map Extensions

- [`getOrCreate`](docs/extensions.md#getorcreate) - Get or create and return value
- [`update`](docs/extensions.md#update) - Update value using function

### Set Extensions

- [`adds`](docs/extensions.md#adds) - Add multiple values at once
- [`toggle`](docs/extensions.md#toggle-1) - Toggle value (add/remove)

## Types

- [`Bytes`](docs/types.md#bytes) - Alias for `Uint8Array`
- [`PrimitiveTypeStr`](docs/types.md#primitivetypestr) - Primitive type string keys
- [`PrimitiveTypeMap`](docs/types.md#primitivetypemap) - Mapping from type string to type
- [`PrimitiveType`](docs/types.md#primitivetype) - Union of all primitive types
- [`DeepPartial`](docs/types.md#deeppartial) - Recursively convert properties to optional
- [`Type`](docs/types.md#type) - Constructor type
- [`ObjUndefToOptional`](docs/types.md#objundeftooptional) - Convert `undefined` properties to optional
- [`ObjOptionalToUndef`](docs/types.md#objoptionaltoundef) - Convert optional properties to `required + undefined`
- [`ArrayDiffsResult`](docs/types.md#arraydiffsresult) - Result type of `Array.diffs()`
- [`ArrayDiffs2Result`](docs/types.md#arraydiffs2result) - Result type of `Array.oneWayDiffs()`
- [`TreeArray`](docs/types.md#treearray) - Result type of `Array.toTree()`

## Caveats

### Prototype Extension Conflicts

This package extends Array, Map, and Set prototypes.
Conflicts may occur when used with other libraries that extend the same method names.
In case of conflict, the last defined implementation is applied based on load order.

### Timezone Handling

When using `DateOnly.parse()`, `DateTime.parse()`:
- `yyyy-MM-dd`, `yyyyMMdd` format: parse directly from string (no timezone influence)
- ISO 8601 format (`2024-01-15T00:00:00Z`): interpret as UTC then convert to local

When server and client timezones differ, actively use `yyyy-MM-dd` format.

### Memory Management (LazyGcMap)

`LazyGcMap` has an internal GC timer, so it must be cleaned up.

```typescript
// using statement (recommended)
// gcInterval: GC execution interval (ms), expireTime: item expiration time (ms)
using map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 }); // GC every 10 seconds, expire after 60 seconds

// Or explicit dispose() call
const map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 }); // GC every 10 seconds, expire after 60 seconds
try {
  // ... use
} finally {
  map.dispose();
}
```

### jsonStringify's __type__ Reserved Word

`jsonStringify`/`jsonParse` uses objects with `__type__` and `data` keys for type restoration.
Be careful as user data in the form `{ __type__: "DateTime", data: "..." }` may be unintentionally type-converted.

### Circular References

- `objClone`: supports circular references (tracked with WeakMap)
- `jsonStringify`: throws TypeError on circular reference
- `transferableEncode`: throws TypeError on circular reference (includes path information)

## License

Apache-2.0
