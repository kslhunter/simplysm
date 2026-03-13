# Serialization

## JsonConvert

Type-aware JSON serialization that preserves Simplysm custom types (`DateTime`, `DateOnly`, `Time`, `Uuid`), `Date`, `Set`, `Map`, `Error`, and `Buffer` through a `__type__` wrapper convention.

### Methods

| Method | Description |
|---|---|
| `stringify(obj, options?)` | Serialize to JSON string. Custom types are encoded as `{ __type__: "TypeName", data: ... }`. |
| `parse<T>(json)` | Deserialize from JSON string. `__type__` wrappers are restored to their original types. `null` values are converted to `undefined`. |

### stringify options

| Option | Type | Description |
|---|---|---|
| `space` | `string \| number` | Indentation (passed to `JSON.stringify`). |
| `replacer` | `(key, value) => any` | Custom replacer applied before type encoding. |
| `hideBuffer` | `boolean` | If `true`, Buffer data is replaced with `"__hidden__"`. |

### Type Encoding Map

| Type | Encoded Form |
|---|---|
| `Date` | `{ __type__: "Date", data: "<ISO string>" }` |
| `DateTime` | `{ __type__: "DateTime", data: "<toString()>" }` |
| `DateOnly` | `{ __type__: "DateOnly", data: "<toString()>" }` |
| `Time` | `{ __type__: "Time", data: "<toString()>" }` |
| `Uuid` | `{ __type__: "Uuid", data: "<uuid string>" }` |
| `Set` | `{ __type__: "Set", data: [...values] }` |
| `Map` | `{ __type__: "Map", data: [[key, value], ...] }` |
| `Error` | `{ __type__: "Error", data: { name, message, stack, ... } }` |
| `Buffer` | `{ type: "Buffer", data: [...bytes] }` (native JSON.stringify behavior) |

### Example

```ts
import { JsonConvert, DateTime, Uuid } from "@simplysm/sd-core-common";

const data = {
  id: Uuid.new(),
  createdAt: new DateTime(2026, 1, 15, 10, 30, 0),
  tags: new Set(["a", "b"]),
};

const json = JsonConvert.stringify(data, { space: 2 });
const restored = JsonConvert.parse(json);
// restored.id instanceof Uuid       -> true
// restored.createdAt instanceof DateTime -> true
// restored.tags instanceof Set       -> true
```

---

## TransferableConvert

Encode/decode objects for efficient transfer between threads (e.g., `worker_threads`). Unlike `JsonConvert`, this uses tick-based encoding for date types (numeric, not string) and collects `ArrayBuffer` references into a transfer list for zero-copy transfer.

### Methods

| Method | Description |
|---|---|
| `encode(obj)` | Returns `{ result, transferList }`. `result` is the encoded object; `transferList` is an array of `Transferable` (ArrayBuffers) for `postMessage`. |
| `decode(obj)` | Restore `__type__`-wrapped values back to their original types. Mutates arrays and objects in-place for efficiency. |

### Type Encoding (differences from JsonConvert)

| Type | Encoded Form |
|---|---|
| `DateTime` | `{ __type__: "DateTime", data: <tick number> }` |
| `DateOnly` | `{ __type__: "DateOnly", data: <tick number> }` |
| `Time` | `{ __type__: "Time", data: <tick number> }` |
| `Uuid` | `{ __type__: "Uuid", data: "<uuid string>" }` |
| `Buffer`/`Uint8Array` | Passed through; underlying `ArrayBuffer` added to transfer list. |

---

## CsvConvert

### Methods

| Method | Description |
|---|---|
| `parse(content, columnSplitter)` | Parse CSV content into a 2D array of strings. Handles quoted fields and double-quote escaping. Empty cells become `undefined`. Throws if any row has a different column count from the first row. |

### Example

```ts
import { CsvConvert } from "@simplysm/sd-core-common";

const rows = CsvConvert.parse('name,age\r\n"Alice",30\r\nBob,25', ",");
// [["name", "age"], ["Alice", "30"], ["Bob", "25"]]
```

---

## XmlConvert

XML parsing and building powered by `fast-xml-parser`.

### Methods

| Method | Description |
|---|---|
| `parse(str, options?)` | Parse XML string to a JavaScript object. Attributes are grouped under `$`, text content under `_`. Non-root elements are always arrays. Option: `stripTagPrefix` removes namespace prefixes from tag names. |
| `stringify(obj, options?)` | Build XML string from a JavaScript object. Accepts `XmlBuilderOptions` from `fast-xml-parser`. |

### Conventions

- Attributes are stored in a `$` sub-object (no prefix).
- Text content is stored under the `_` key.
- All non-leaf child elements are wrapped in arrays.

### Example

```ts
import { XmlConvert } from "@simplysm/sd-core-common";

const obj = XmlConvert.parse('<root attr="1"><item>A</item><item>B</item></root>');
// { root: [{ $: { attr: "1" }, item: [{ _: "A" }, { _: "B" }] }] }

const xml = XmlConvert.stringify(obj);
// '<root attr="1"><item>A</item><item>B</item></root>'
```
