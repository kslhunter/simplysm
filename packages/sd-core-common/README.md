# @simplysm/sd-core-common

Platform-neutral foundation library for the Simplysm framework. Provides custom date/time types, prototype extensions for built-in collections, deep-clone/merge/equality utilities, validation, serialization (JSON/CSV/XML), error classes, decorators, async queue helpers, and zip file manipulation. This package has no internal `@simplysm/*` dependencies and runs in both Node.js and browser environments.

## Installation

```bash
npm install @simplysm/sd-core-common
# or
yarn add @simplysm/sd-core-common
```

## API Overview

### Decorators

| API | Type | Description |
|-----|------|-------------|
| `NotifyPropertyChange` | Function (decorator) | Property decorator that triggers `onPropertyChange()` on set |
| `INotifyPropertyChange` | Interface | Interface for classes using `@NotifyPropertyChange()` |
| `PropertyGetSetDecoratorBase` | Function | Low-level helper for building get/set intercepting decorators |
| `IPropertyGetSetDecoratorBaseParam` | Interface | Configuration for `PropertyGetSetDecoratorBase` hooks |
| `PropertyValidate` | Function (decorator) | Property decorator that validates values on set |
| `TPropertyValidateReplacer` | Type | Value transformer function for `PropertyValidate` |
| `TClassDecoratorReturn` | Type | Return type for class decorators |
| `TPropertyDecoratorReturn` | Type | Return type for property decorators |

-> See [docs/decorators.md](./docs/decorators.md) for details.

### Errors

| API | Type | Description |
|-----|------|-------------|
| `SdError` | Class | Base error with inner error chaining |
| `ArgumentError` | Class | Invalid argument error with YAML-formatted details |
| `NeverEntryError` | Class | Unreachable code path error |
| `NotImplementError` | Class | Not-yet-implemented error |
| `TimeoutError` | Class | Timeout exceeded error |

-> See [docs/errors.md](./docs/errors.md) for details.

### Template Strings

| API | Type | Description |
|-----|------|-------------|
| `html` | Function | Tagged template for HTML with auto-trim |
| `javascript` | Function | Tagged template for JavaScript with auto-trim |
| `typescript` | Function | Tagged template for TypeScript with auto-trim |
| `string` | Function | Tagged template for general text with auto-trim |
| `tsql` | Function | Tagged template for T-SQL with auto-trim |
| `mysql` | Function | Tagged template for MySQL with auto-trim |

-> See [docs/template-strings.md](./docs/template-strings.md) for details.

### Date & Time

| API | Type | Description |
|-----|------|-------------|
| `DateOnly` | Class | Date without time (`yyyy-MM-dd`) with arithmetic and week-sequence |
| `DateTime` | Class | Full date+time with millisecond precision |
| `Time` | Class | Time-of-day only (`HH:mm:ss.fff`) |
| `DateTimeFormatUtils` | Class | C#-style date/time format token processor |

-> See [docs/date-time.md](./docs/date-time.md) for details.

### Type Utilities

| API | Type | Description |
|-----|------|-------------|
| `Type<T>` | Interface | Constructor type (`new (...args) => T`) |
| `TFlatType` | Type | Union of all leaf types (primitives + DateOnly/DateTime/Time/Uuid/Buffer) |
| `DeepPartial<T>` | Type | Recursively make all properties optional |
| `Uuid` | Class | UUID v4 generator and container |
| `WrappedType<T>` | Type | Primitive-to-wrapper conversion (`string` -> `String`) |
| `UnwrappedType<T>` | Type | Wrapper-to-primitive conversion (`String` -> `string`) |

-> See [docs/type-utilities.md](./docs/type-utilities.md) for details.

### Collections

| API | Type | Description |
|-----|------|-------------|
| `LazyGcMap<K, V>` | Class | Map with automatic GC of expired entries (LRU-style) |
| `TreeMap<T>` | Class | Nested Map navigated by key arrays |

-> See [docs/collections.md](./docs/collections.md) for details.

### Utilities

| API | Type | Description |
|-----|------|-------------|
| `ObjectUtils` | Class | Deep clone, merge, equal, pick, omit, chain access, validation |
| `StringUtils` | Class | Case conversion, Korean suffix, null check, fullwidth conversion |
| `NumberUtils` | Class | Parsing, formatting, null check |
| `MathUtils` | Class | Random integer generation |
| `FnUtils` | Class | Function source code parsing |
| `Wait` | Class | Async polling and sleep |
| `CsvConvert` | Class | CSV parsing with quote handling |
| `JsonConvert` | Class | Type-aware JSON serialization (DateTime, Uuid, Set, Map, etc.) |
| `XmlConvert` | Class | XML parse/build via fast-xml-parser |
| `TransferableConvert` | Class | Encode/decode for worker thread transfer |
| `NetUtils` | Class | HTTP download with progress tracking |
| `SdAsyncFnDebounceQueue` | Class | Debounce queue -- only last submitted function runs |
| `SdAsyncFnSerialQueue` | Class | Serial queue -- functions execute one at a time in FIFO order |

-> See [docs/utils.md](./docs/utils.md) for details.

### Zip

| API | Type | Description |
|-----|------|-------------|
| `SdZip` | Class | Async zip reader/writer with extract, write, and compress |

-> See [docs/zip.md](./docs/zip.md) for details.

### Extensions (Prototype Augmentations)

| API | Type | Description |
|-----|------|-------------|
| `Array` extensions | Prototype | 30+ methods: single, first, last, groupBy, toMap, distinct, orderBy, diffs, sum, min, max, etc. |
| `Map` extensions | Prototype | `getOrCreate`, `update` |
| `Set` extensions | Prototype | `adds`, `toggle` |
| `TArrayDiffsResult` | Type | Diff result discriminated union (INSERT/DELETE/UPDATE) |
| `TArrayDiffs2Result` | Type | One-way diff result (create/update/same) |
| `ITreeArray` | Type | Tree node with children |

-> See [docs/extensions.md](./docs/extensions.md) for details.

### Validation Types

| API | Type | Description |
|-----|------|-------------|
| `TValidateDef<T>` | Type | Validation definition (type, array of types, or `IValidateDef`) |
| `IValidateDef<T>` | Interface | Full validation config (type, notnull, includes, validator) |
| `IValidateResult<T>` | Interface | Validation failure result |
| `IValidateDefWithName<T>` | Interface | Validation def with display name for error messages |
| `TValidateObjectDefWithName<T>` | Type | Object-level named validation definitions |
| `TUndefToOptional<T>` | Type | Convert undefined-able props to optional |
| `TOptionalToUndef<T>` | Type | Convert optional props to explicit undefined |

-> See [docs/validation-types.md](./docs/validation-types.md) for details.

## Usage Examples

### DateOnly -- Date Arithmetic

```ts
import { DateOnly } from "@simplysm/sd-core-common";

const today = new DateOnly();
const nextMonth = today.addMonths(1);
const formatted = today.toFormatString("yyyy-MM-dd");

const parsed = DateOnly.parse("2026-03-23");
const weekInfo = parsed.getWeekSeqOfYear(); // { year: 2026, weekSeq: 13 }
```

### ObjectUtils -- Clone, Merge, Validate

```ts
import { ObjectUtils } from "@simplysm/sd-core-common";

// Deep clone
const original = { x: 1, nested: { y: [2, 3] } };
const cloned = ObjectUtils.clone(original);

// Deep equality
ObjectUtils.equal(original, cloned); // true

// Deep merge
const merged = ObjectUtils.merge({ a: 1, b: { c: 2 } }, { b: { d: 3 }, e: 4 });
// { a: 1, b: { c: 2, d: 3 }, e: 4 }

// Validation
const error = ObjectUtils.validate(undefined, { type: String, notnull: true });
// { value: undefined, invalidateDef: { notnull: true } }
```

### Collection Extensions

```ts
import "@simplysm/sd-core-common"; // auto-registers extensions

const items = [3, 1, 4, 1, 5, 9];

items.distinct();                          // [3, 1, 4, 5, 9]
items.orderBy();                           // [1, 1, 3, 4, 5, 9]
items.sum();                               // 23
items.groupBy((x) => x % 2 === 0);
// [{ key: false, values: [3, 1, 1, 5, 9] }, { key: true, values: [4] }]

const map = new Map<string, number>();
map.getOrCreate("count", 0);              // 0 (created)
map.update("count", (v) => (v ?? 0) + 1); // count is now 1
```

### JsonConvert -- Type-Preserving Serialization

```ts
import { JsonConvert, DateTime, Uuid } from "@simplysm/sd-core-common";

const data = {
  id: Uuid.new(),
  createdAt: new DateTime(2026, 1, 15, 10, 30, 0),
  tags: new Set(["a", "b"]),
};

const json = JsonConvert.stringify(data, { space: 2 });
const restored = JsonConvert.parse(json);
// restored.id instanceof Uuid         -> true
// restored.createdAt instanceof DateTime -> true
// restored.tags instanceof Set         -> true
```
