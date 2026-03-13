# @simplysm/sd-core-common

Platform-neutral foundation library for the Simplysm framework. Provides custom date/time types, prototype extensions for built-in collections, deep-clone/merge/equality utilities, validation, serialization (JSON/CSV/XML), error classes, decorators, and async queue helpers. This package has no internal `@simplysm/*` dependencies and runs in both Node.js and browser environments.

## Installation

```bash
npm install @simplysm/sd-core-common
# or
yarn add @simplysm/sd-core-common
```

## Documentation

| Category | Description | Link |
|---|---|---|
| Date & Time Types | `DateOnly`, `DateTime`, `Time` -- immutable-style date/time classes with week-sequence, formatting, and arithmetic | [docs/date-time.md](docs/date-time.md) |
| Collection Extensions | Prototype extensions for `Array`, `Map`, `Set` -- query, group, diff, sort, and mutate | [docs/collection-extensions.md](docs/collection-extensions.md) |
| Utility Classes | `ObjectUtils`, `StringUtils`, `NumberUtils`, `MathUtils`, `FnUtils`, `Wait` -- clone, merge, equal, validate, format, parse | [docs/utilities.md](docs/utilities.md) |
| Serialization | `JsonConvert`, `CsvConvert`, `XmlConvert`, `TransferableConvert` -- serialize/deserialize with custom type support | [docs/serialization.md](docs/serialization.md) |
| Errors | `SdError`, `ArgumentError`, `NeverEntryError`, `NotImplementError`, `TimeoutError` | [docs/errors.md](docs/errors.md) |
| Decorators | `NotifyPropertyChange`, `PropertyValidate`, `PropertyGetSetDecoratorBase` | [docs/decorators.md](docs/decorators.md) |
| Async Queues | `SdAsyncFnDebounceQueue`, `SdAsyncFnSerialQueue` | [docs/async-queues.md](docs/async-queues.md) |
| Other Types | `Uuid`, `LazyGcMap`, `TreeMap`, type aliases, template string tags, `SdZip` | [docs/other-types.md](docs/other-types.md) |

## Quick Example

```ts
import {
  DateOnly,
  DateTime,
  Time,
  Uuid,
  ObjectUtils,
  JsonConvert,
  Wait,
} from "@simplysm/sd-core-common";

// Date/Time
const today = new DateOnly();
const nextMonth = today.addMonths(1);
console.log(today.toFormatString("yyyy-MM-dd")); // "2026-03-13"

const now = new DateTime();
console.log(now.toFormatString("yyyy-MM-dd HH:mm:ss")); // "2026-03-13 14:30:00"

// Collection extensions (auto-applied via import)
const items = [3, 1, 4, 1, 5];
items.distinct();           // [3, 1, 4, 5]
items.orderBy();            // [1, 1, 3, 4, 5]
items.sum();                // 14
items.groupBy((x) => x % 2 === 0);
// [{ key: false, values: [3, 1, 1, 5] }, { key: true, values: [4] }]

// Deep clone & equality
const a = { x: 1, nested: { y: [2, 3] } };
const b = ObjectUtils.clone(a);
ObjectUtils.equal(a, b); // true

// Type-aware JSON serialization
const json = JsonConvert.stringify({ id: Uuid.new(), date: new DateOnly() });
const parsed = JsonConvert.parse(json); // id is Uuid, date is DateOnly

// Async wait
await Wait.until(() => someCondition(), 100, 5000);
```
