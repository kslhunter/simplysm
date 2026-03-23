# Utility Classes

General-purpose utility classes for object manipulation, string/number processing, async waiting, math, function parsing, CSV parsing, XML conversion, and network downloads.

## ObjectUtils

Comprehensive object manipulation utilities with awareness of Simplysm custom types (`DateTime`, `DateOnly`, `Time`, `Uuid`).

### Clone & Merge

| Method | Signature | Description |
|--------|-----------|-------------|
| `clone` | `static clone<T>(source: T, options?: { excludes?: string[]; useRefTypes?: any[]; onlyOneDepth?: boolean }): T` | Deep clone. Handles circular references, `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Buffer`, `Array`, `Map`. Options: `excludes` (skip keys), `useRefTypes` (keep reference for given constructors), `onlyOneDepth` (shallow clone). |
| `merge` | `static merge<T, P>(source: T, target: P, opt?: { arrayProcess?: "replace" \| "concat"; useDelTargetNull?: boolean }): T & P` | Deep merge `target` into a clone of `source`. Options: `arrayProcess` (`"replace"` replaces arrays, `"concat"` concatenates with dedup), `useDelTargetNull` (treat `null` in target as delete). |
| `merge3` | `static merge3<S, O, T>(source: S, origin: O, target: T, optionsObj?: Record<string, { keys?: string[]; excludes?: string[]; ignoreArrayIndex?: boolean }>): { conflict: boolean; result: O & S & T }` | Three-way merge. Detects conflicts when both source and target diverge from origin. |

### Equality

| Method | Signature | Description |
|--------|-----------|-------------|
| `equal` | `static equal(source: any, target: any, options?: { includes?: string[]; excludes?: string[]; ignoreArrayIndex?: boolean; onlyOneDepth?: boolean }): boolean` | Deep equality check. Supports `Date`, `DateTime`, `DateOnly`, `Time`, `Array`, `Map`, and plain objects. Options: `includes` (compare only these keys), `excludes` (skip keys), `ignoreArrayIndex` (order-independent array comparison), `onlyOneDepth` (shallow comparison). |

### Object Manipulation

| Method | Signature | Description |
|--------|-----------|-------------|
| `omit` | `static omit<T, K extends keyof T>(item: T, omitKeys: K[]): Omit<T, K>` | Return a new object without the specified keys. |
| `omitByFilter` | `static omitByFilter<T>(item: T, omitKeyFn: (key: keyof T) => boolean): T` | Return a new object excluding keys where `omitKeyFn(key)` returns `true`. |
| `pick` | `static pick<T, K extends keyof T>(item: T, keys: K[]): Pick<T, K>` | Return a new object with only the specified keys. |
| `pickByType` | `static pickByType<T, A extends TFlatType>(item: T, type: Type<A>): { ... }` | Return a new object with only properties matching the given type constructor (`String`, `Number`, `Boolean`, `DateOnly`, `DateTime`, `Time`, `Uuid`, `Buffer`). |
| `clearUndefined` | `static clearUndefined<T>(obj: T): T` | Delete all `undefined`-valued keys from the object (mutates in-place). |
| `clear` | `static clear<T extends {}>(obj: T): {}` | Delete all keys from the object (mutates in-place). |
| `nullToUndefined` | `static nullToUndefined<T>(obj: T): T \| undefined` | Recursively convert all `null` values to `undefined`. Leaves `Date`, `DateTime`, `DateOnly`, `Time` instances untouched. |
| `optToUndef` | `static optToUndef<T>(obj: TUndefToOptional<T>): T` | Type-level cast from optional-property style to explicit-undefined style. No runtime transformation. |
| `unflattenObject` | `static unflattenObject(flatObj: Record<string, any>): Record<string, any>` | Convert a dot-notation flat object (`{ "a.b.c": 1 }`) into nested structure (`{ a: { b: { c: 1 } } }`). |

### Chain Value Access

| Method | Signature | Description |
|--------|-----------|-------------|
| `getChainValue` | `static getChainValue(obj: any, chain: string, optional?: true): any` | Get a nested value using dot/bracket notation string (e.g., `"a.b[0].c"`). With `optional`, returns `undefined` instead of throwing on missing intermediate paths. |
| `getChainValueByDepth` | `static getChainValueByDepth<T, K extends keyof T>(obj: T, key: K, depth: number, optional?: true): T[K]` | Get a value by repeatedly accessing the same key `depth` times. Useful for tree traversal. |
| `setChainValue` | `static setChainValue(obj: any, chain: string, value: any): void` | Set a nested value using dot/bracket notation string. Creates intermediate objects as needed. |
| `deleteChainValue` | `static deleteChainValue(obj: any, chain: string): void` | Delete a nested value using dot/bracket notation string. |

### Validation

| Method | Signature | Description |
|--------|-----------|-------------|
| `validate` | `static validate<T>(value: T, def: TValidateDef<T>): IValidateResult<T> \| undefined` | Validate a single value. Returns `IValidateResult` on failure, `undefined` on success. See [validation-types.md](./validation-types.md). |
| `validateObject` | `static validateObject<T>(obj: T, def: TValidateObjectDef<T>): TValidateObjectResult<T>` | Validate an object's properties. Returns a map of property-name to `IValidateResult`. |
| `validateObjectWithThrow` | `static validateObjectWithThrow<T>(displayName: string, obj: T, def: TValidateObjectDefWithName<T>): void` | Like `validateObject`, but throws a descriptive error listing all failures. |
| `validateArray` | `static validateArray<T>(arr: T[], def: TValidateObjectDef<T> \| ((item: T) => TValidateObjectDef<T>)): IValidateArrayResult<T>[]` | Validate each element in an array. Returns array of `{ index, item, result }` for failures. |
| `validateArrayWithThrow` | `static validateArrayWithThrow<T>(displayName: string, arr: T[], def: TValidateObjectDefWithName<T> \| ((item: T) => TValidateObjectDefWithName<T>)): void` | Like `validateArray`, but throws a descriptive error listing all failures. |

---

## CsvConvert

CSV parsing utility.

| Method | Signature | Description |
|--------|-----------|-------------|
| `parse` | `static parse(content: string, columnSplitter: string): (string \| undefined)[][]` | Parse CSV content into a 2D array. Handles quoted fields with double-quote escaping. Empty cells become `undefined`. Throws if any row has a different column count from the first row. Lines are split by `\r\n`. |

### Example

```ts
const rows = CsvConvert.parse('name,age\r\n"Alice",30\r\nBob,25', ",");
// [["name", "age"], ["Alice", "30"], ["Bob", "25"]]
```

---

## DateTimeFormatUtils

See [date-time.md](./date-time.md#datetimeformatutils) for full documentation.

---

## FnUtils

Function source code parsing utility.

| Method | Signature | Description |
|--------|-----------|-------------|
| `parse` | `static parse(fn: (...args: any[]) => any): { params: string[]; returnContent: string }` | Parse a function's source code to extract parameter names and the return expression string. Works with `function` declarations and arrow functions (both expression and block body with `return`). |

### Example

```ts
const result = FnUtils.parse((a, b) => a + b);
// { params: ["a", "b"], returnContent: "a + b" }
```

---

## JsonConvert

Type-aware JSON serialization that preserves Simplysm custom types (`DateTime`, `DateOnly`, `Time`, `Uuid`), `Date`, `Set`, `Map`, `Error`, and `Buffer` through a `__type__` wrapper convention.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `stringify` | `static stringify(obj: any, options?: { space?: string \| number; replacer?: (key: string \| undefined, value: any) => any; hideBuffer?: boolean }): string` | Serialize to JSON string. Custom types are encoded as `{ __type__: "TypeName", data: ... }`. |
| `parse` | `static parse<T = any>(json: string): T` | Deserialize from JSON string. `__type__` wrappers are restored to their original types. `null` values are converted to `undefined`. Wraps parse errors with `SdError`. |

### stringify Options

| Option | Type | Description |
|--------|------|-------------|
| `space` | `string \| number` | Indentation (passed to `JSON.stringify`). |
| `replacer` | `(key: string \| undefined, value: any) => any` | Custom replacer applied before type encoding. |
| `hideBuffer` | `boolean` | If `true`, Buffer data is replaced with `"__hidden__"`. |

### Type Encoding Map

| Type | Encoded Form |
|------|-------------|
| `Date` | `{ __type__: "Date", data: "<ISO string>" }` |
| `DateTime` | `{ __type__: "DateTime", data: "<toString()>" }` |
| `DateOnly` | `{ __type__: "DateOnly", data: "<toString()>" }` |
| `Time` | `{ __type__: "Time", data: "<toString()>" }` |
| `Uuid` | `{ __type__: "Uuid", data: "<uuid string>" }` |
| `Set` | `{ __type__: "Set", data: [...values] }` |
| `Map` | `{ __type__: "Map", data: [[key, value], ...] }` |
| `Error` | `{ __type__: "Error", data: { name, message, stack, code?, detail?, cause? } }` |
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

## MathUtils

| Method | Signature | Description |
|--------|-----------|-------------|
| `getRandomInt` | `static getRandomInt(min: number, max: number): number` | Generate a random integer in `[min, max)`. Uses `Math.random()`. |

---

## NetUtils

Abstract class with network utility methods.

| Method | Signature | Description |
|--------|-----------|-------------|
| `downloadBufferAsync` | `static async downloadBufferAsync(url: string, options?: { progressCallback?: (progress: INetDownloadProgress) => void; signal?: AbortSignal }): Promise<Buffer>` | Download a URL to a `Buffer` using the Fetch API with streaming. Supports progress tracking and abort signals. |

### INetDownloadProgress

| Field | Type | Description |
|-------|------|-------------|
| `contentLength` | `number` | Total content length from the `Content-Length` header. `-1` if unknown. |
| `receivedLength` | `number` | Number of bytes received so far. |

---

## NumberUtils

| Method | Signature | Description |
|--------|-----------|-------------|
| `parseInt` | `static parseInt(text: any, radix?: number): number \| undefined` | Parse integer from any input. Strips non-numeric characters (except `-` and `.`). Returns `undefined` on failure. If input is already a number, rounds it. Default radix is 10. |
| `parseRoundedInt` | `static parseRoundedInt(text: any): number \| undefined` | Parse as float then round to nearest integer. |
| `parseFloat` | `static parseFloat(text: any): number \| undefined` | Parse float from any input. Strips non-numeric characters. Returns `undefined` on failure. |
| `isNullOrEmpty` | `static isNullOrEmpty(val: number \| null \| undefined): val is 0 \| undefined \| null` | Type guard: returns `true` if `val` is `null`, `undefined`, or `0`. |
| `format` | `static format(val: number, digit?: { max?: number; min?: number }): string` | Format number with locale-aware thousand separators. Options: `max` (max fraction digits), `min` (min fraction digits). Returns `undefined` if `val` is `undefined`. |

---

## SdAsyncFnDebounceQueue

Debounces rapid function submissions. Only the **last** submitted function runs. If a new function is submitted while the previous one is still running, it replaces the pending function and executes after the current one completes. Extends `EventEmitter`.

### Constructor

```ts
new SdAsyncFnDebounceQueue(delay?: number)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `delay` | `number` | `undefined` | Delay in milliseconds before executing after the last `run()` call. |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `run` | `run(fn: () => void \| Promise<void>): void` | Submit a function. Previous pending (not yet started) functions are discarded. |
| `on` | `on(event: "error", listener: (err: SdError) => void): this` | Listen for errors from queued function execution. |

### Example

```ts
const queue = new SdAsyncFnDebounceQueue(300);
queue.on("error", (err) => console.error(err));

// Only the last call within 300ms actually executes
queue.run(async () => { /* fetch data for "a" */ });
queue.run(async () => { /* fetch data for "ab" */ });
queue.run(async () => { /* fetch data for "abc" -- this one runs */ });
```

---

## SdAsyncFnSerialQueue

Executes queued functions **one at a time**, in FIFO order. Each function waits for the previous one to complete before starting. Extends `EventEmitter`.

### Constructor

```ts
new SdAsyncFnSerialQueue(gap?: number)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `gap` | `number` | `0` | Delay in milliseconds between consecutive function executions. |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `run` | `run(fn: () => void \| Promise<void>): void` | Enqueue a function for serial execution. |
| `on` | `on(event: "error", listener: (err: SdError) => void): this` | Listen for errors from queued function execution. Processing continues with the next item. |

### Example

```ts
const queue = new SdAsyncFnSerialQueue(100); // 100ms gap between tasks
queue.on("error", (err) => console.error(err));

queue.run(async () => { /* task 1 */ });
queue.run(async () => { /* task 2 -- starts after task 1 + 100ms gap */ });
```

---

## StringUtils

| Method | Signature | Description |
|--------|-----------|-------------|
| `isNullOrEmpty` | `static isNullOrEmpty(str: string \| null \| undefined): str is "" \| undefined \| null` | Type guard: returns `true` if `str` is `null`, `undefined`, or `""`. |
| `toPascalCase` | `static toPascalCase(str: string): string` | Convert kebab-case or dot-case to `PascalCase`. |
| `toCamelCase` | `static toCamelCase(str: string): string` | Convert kebab-case or dot-case to `camelCase`. |
| `toKebabCase` | `static toKebabCase(str: string): string` | Convert PascalCase or camelCase to `kebab-case`. |
| `getSuffix` | `static getSuffix(text: string, type: "을" \| "은" \| "이" \| "와" \| "랑" \| "로" \| "라"): string` | Get the correct Korean particle suffix based on whether the last character has a trailing consonant (jongseong). |
| `replaceSpecialDefaultChar` | `static replaceSpecialDefaultChar(str: string): string` | Convert fullwidth characters to their ASCII equivalents (e.g., `A` -> `A`, `1` -> `1`, `()` -> `()`). |
| `insert` | `static insert(str: string, index: number, insertString: string): string` | Insert a substring at the given index position. |

---

## TransferableConvert

Encode/decode objects for efficient transfer between threads (e.g., `worker_threads`). Unlike `JsonConvert`, this uses tick-based encoding for date types (numeric, not string) and collects `ArrayBuffer` references into a transfer list for zero-copy transfer.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `encode` | `static encode(obj: any): { result: any; transferList: Transferable[] }` | Encode an object. `result` is the encoded object; `transferList` is an array of `Transferable` (ArrayBuffers) for `postMessage`. Recursively handles `Array`, `Map`, `Set`, plain objects. |
| `decode` | `static decode(obj: any): any` | Restore `__type__`-wrapped values back to their original types. Mutates arrays and objects in-place for efficiency. Recursively handles `Array`, `Map`, `Set`, plain objects. |

### Type Encoding (differences from JsonConvert)

| Type | Encoded Form |
|------|-------------|
| `DateTime` | `{ __type__: "DateTime", data: <tick number> }` |
| `DateOnly` | `{ __type__: "DateOnly", data: <tick number> }` |
| `Time` | `{ __type__: "Time", data: <tick number> }` |
| `Uuid` | `{ __type__: "Uuid", data: "<uuid string>" }` |
| `Error` | `{ __type__: "Error", data: { name, message, stack, code?, detail?, cause? } }` |
| `Buffer`/`Uint8Array` | Passed through; underlying `ArrayBuffer` added to transfer list. |

---

## Wait

Async waiting utilities.

| Method | Signature | Description |
|--------|-----------|-------------|
| `until` | `static async until(forwarder: () => boolean \| Promise<boolean>, milliseconds?: number, timeout?: number): Promise<void>` | Poll `forwarder()` at `milliseconds` intervals (default 100ms) until it returns `true`. Throws `TimeoutError` if `timeout` is exceeded. |
| `time` | `static async time(millisecond: number): Promise<void>` | Sleep for the given number of milliseconds. |

### Example

```ts
import { Wait } from "@simplysm/sd-core-common";

// Wait for a condition
await Wait.until(() => document.readyState === "complete", 100, 5000);

// Simple delay
await Wait.time(500);
```

---

## XmlConvert

XML parsing and building powered by `fast-xml-parser`.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `parse` | `static parse(str: string, options?: { stripTagPrefix?: boolean }): any` | Parse XML string to a JavaScript object. Attributes are grouped under `$`, text content under `_`. Non-root elements are always arrays. Option: `stripTagPrefix` removes namespace prefixes (e.g., `ns:tag` becomes `tag`) from tag names but preserves attribute prefixes. |
| `stringify` | `static stringify(obj: any, options?: XmlBuilderOptions): string` | Build XML string from a JavaScript object. Accepts `XmlBuilderOptions` from `fast-xml-parser`. Uses the same `$`/`_` conventions as `parse`. |

### Parse Conventions

- Attributes are stored in a `$` sub-object (no attribute name prefix).
- Text content is stored under the `_` key.
- All non-leaf, non-root child elements are wrapped in arrays.

### Example

```ts
import { XmlConvert } from "@simplysm/sd-core-common";

const obj = XmlConvert.parse('<root attr="1"><item>A</item><item>B</item></root>');
// { root: [{ $: { attr: "1" }, item: [{ _: "A" }, { _: "B" }] }] }

const xml = XmlConvert.stringify(obj);
// '<root attr="1"><item>A</item><item>B</item></root>'
```
