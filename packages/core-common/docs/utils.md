# Utils

Utility namespaces and functions exported from `@simplysm/core-common`.

All namespace utilities are exported as namespace objects (e.g., `obj`, `str`, `num`). Import the namespace and call functions as members.

---

## `env`

A global environment object derived from `process.env`.

```typescript
import { env } from "@simplysm/core-common";

if (env.DEV) {
  console.log("Development mode");
}
console.log(env.VER); // string | undefined
```

| Property | Type | Description |
|----------|------|-------------|
| `DEV` | `boolean` | `true` when `process.env.DEV` is truthy |
| `VER` | `string \| undefined` | Value of `process.env.VER` |
| `[key]` | `unknown` | Other `process.env` properties |

---

## `dt` — Date utilities

```typescript
import { dt } from "@simplysm/core-common";
```

### `dt.format(formatString, args)`

Formats date/time components into a string using a C#-style format string.

```typescript
dt.format("yyyy-MM-dd", { year: 2024, month: 3, day: 15 });
// "2024-03-15"

dt.format("yyyy-M-d (ddd)", { year: 2024, month: 3, day: 15 });
// "2024-3-15 (금)"

dt.format("tt h:mm:ss", { hour: 14, minute: 30, second: 45 });
// "PM 2:30:45"
```

Supported format tokens:

| Token | Description | Example |
|-------|-------------|---------|
| `yyyy` | 4-digit year | `2024` |
| `yy` | 2-digit year | `24` |
| `MM` | Zero-padded month | `01`–`12` |
| `M` | Month | `1`–`12` |
| `ddd` | Day of week (Korean) | `일`–`토` |
| `dd` | Zero-padded day | `01`–`31` |
| `d` | Day | `1`–`31` |
| `tt` | AM/PM | `AM`, `PM` |
| `hh` | Zero-padded 12-hour | `01`–`12` |
| `h` | 12-hour | `1`–`12` |
| `HH` | Zero-padded 24-hour | `00`–`23` |
| `H` | 24-hour | `0`–`23` |
| `mm` | Zero-padded minute | `00`–`59` |
| `m` | Minute | `0`–`59` |
| `ss` | Zero-padded second | `00`–`59` |
| `s` | Second | `0`–`59` |
| `fff` | Milliseconds (3 digits) | `000`–`999` |
| `ff` | Milliseconds (2 digits) | `00`–`99` |
| `f` | Milliseconds (1 digit) | `0`–`9` |
| `zzz` | Timezone offset `±HH:mm` | `+09:00` |
| `zz` | Timezone offset `±HH` | `+09` |
| `z` | Timezone offset `±H` | `+9` |

### `dt.normalizeMonth(year, month, day)`

Normalizes year/month/day when setting month. Adjusts year if month is outside 1–12, and clamps day to the last day of the target month.

```typescript
dt.normalizeMonth(2025, 13, 15); // { year: 2026, month: 1, day: 15 }
dt.normalizeMonth(2025, 2, 31);  // { year: 2025, month: 2, day: 28 }
```

Returns `DtNormalizedMonth` — `{ year: number, month: number, day: number }`.

### `dt.convert12To24(rawHour, isPM)`

Converts a 12-hour format hour to 24-hour format.

```typescript
dt.convert12To24(12, false); // 0  (12:00 AM)
dt.convert12To24(12, true);  // 12 (12:00 PM)
dt.convert12To24(3, true);   // 15
```

---

## `bytes` — Binary utilities

```typescript
import { bytes } from "@simplysm/core-common";

bytes.concat([new Uint8Array([1, 2]), new Uint8Array([3, 4])]);
// Uint8Array([1, 2, 3, 4])

bytes.toHex(new Uint8Array([255, 0, 127]));  // "ff007f"
bytes.fromHex("ff007f");                      // Uint8Array([255, 0, 127])

bytes.toBase64(new Uint8Array([72, 101, 108, 108, 111])); // "SGVsbG8="
bytes.fromBase64("SGVsbG8="); // Uint8Array([72, 101, 108, 108, 111])
```

| Function | Description |
|----------|-------------|
| `bytes.concat(arrays)` | Concatenate multiple `Uint8Array`s |
| `bytes.toHex(bytes)` | Convert `Uint8Array` to lowercase hex string |
| `bytes.fromHex(hex)` | Convert hex string to `Uint8Array`. Throws `ArgumentError` on invalid input |
| `bytes.toBase64(bytes)` | Convert `Uint8Array` to base64 string |
| `bytes.fromBase64(base64)` | Convert base64 string to `Uint8Array`. Throws `ArgumentError` on invalid input |

---

## `json` — JSON utilities

Serialization/deserialization supporting custom types (`DateTime`, `DateOnly`, `Time`, `Uuid`, `Set`, `Map`, `Error`, `Uint8Array`).

```typescript
import { json } from "@simplysm/core-common";

const obj = { date: new DateTime(), id: Uuid.generate(), tags: new Set(["a", "b"]) };
const str = json.stringify(obj, { space: 2 });
const restored = json.parse<typeof obj>(str);
// restored.date is a DateTime instance, restored.id is a Uuid instance
```

`json.stringify` options:

| Option | Type | Description |
|--------|------|-------------|
| `space` | `string \| number` | JSON indentation |
| `replacer` | `(key, value) => unknown` | Custom transform applied before default type conversion |
| `redactBytes` | `boolean` | Replace `Uint8Array` contents with `"__hidden__"` (for logging; result cannot be restored via `json.parse`) |

`json.parse<TResult>(json)` restores all supported types. All JSON `null` values are converted to `undefined`.

---

## `num` — Number utilities

```typescript
import { num } from "@simplysm/core-common";

num.parseInt("가-123나");       // -123
num.parseFloat("12.34px");     // 12.34
num.parseRoundedInt("12.7px"); // 13
num.isNullOrEmpty(0);          // true
num.isNullOrEmpty(5);          // false
num.format(1234.567, { max: 2 }); // "1,234.57"
num.format(1234, { min: 2 });     // "1,234.00"
```

| Function | Description |
|----------|-------------|
| `num.parseInt(text)` | Parse string to integer, stripping non-numeric characters. Returns `undefined` on failure |
| `num.parseFloat(text)` | Parse string to float, stripping non-numeric characters. Returns `undefined` on failure |
| `num.parseRoundedInt(text)` | Parse string to float then round to integer. Returns `undefined` on failure |
| `num.isNullOrEmpty(val)` | Type guard: returns `true` if value is `undefined`, `null`, or `0` |
| `num.format(val, digit?)` | Format number with thousand separators. `digit.max` = max decimal places, `digit.min` = min decimal places |

---

## `obj` — Object utilities

```typescript
import { obj } from "@simplysm/core-common";

// Deep clone
const cloned = obj.clone({ a: new DateTime(), b: [1, 2] });

// Deep equality
obj.equal({ a: 1 }, { a: 1 }); // true
obj.equal([1, 2], [2, 1], { ignoreArrayIndex: true }); // true

// Deep merge (target into source)
obj.merge({ a: 1, b: 2 }, { b: 3, c: 4 }); // { a: 1, b: 3, c: 4 }

// 3-way merge
const { conflict, result } = obj.merge3(
  { a: 1, b: 2 },  // source
  { a: 1, b: 1 },  // origin
  { a: 2, b: 1 },  // target
);
// conflict: false, result: { a: 2, b: 2 }

// Key selection / omission
obj.omit({ name: "Alice", age: 30 }, ["age"]);       // { name: "Alice" }
obj.pick({ name: "Alice", age: 30 }, ["name"]);      // { name: "Alice" }
obj.omitByFilter({ name: "Alice", _x: 1 }, (k) => String(k).startsWith("_")); // { name: "Alice" }

// Chain path access
const o = { a: { b: [{ c: 42 }] } };
obj.getChainValue(o, "a.b[0].c");          // 42
obj.setChainValue(o, "a.b[0].c", 99);
obj.deleteChainValue(o, "a.b[0].c");
obj.getChainValueByDepth(o, "a", 1);       // { b: [{ c: 42 }] }

// Type-safe Object helpers
obj.keys({ a: 1, b: 2 });                  // ["a", "b"] as (keyof ...)[]
obj.entries({ a: 1, b: "x" });             // [["a", 1], ["b", "x"]]
obj.fromEntries([["a", 1], ["b", 2]]);     // { a: 1, b: 2 }
obj.map({ r: "255,0,0" }, (k, v) => [null, `rgb(${v})`]); // { r: "rgb(255,0,0)" }

// Null/undefined helpers
obj.nullToUndefined({ a: null, b: 1 });    // { a: undefined, b: 1 } (mutates)
obj.clearUndefined({ a: undefined, b: 1 }); // { b: 1 } (mutates)
obj.clear({ a: 1, b: 2 });                 // {} (mutates)
obj.unflatten({ "a.b.c": 1 });             // { a: { b: { c: 1 } } }
```

| Function | Description |
|----------|-------------|
| `obj.clone(source)` | Deep clone. Supports circular references, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Uint8Array`, `Map`, `Set`, `Error` |
| `obj.equal(source, target, options?)` | Deep equality comparison |
| `obj.merge(source, target, options?)` | Deep merge — target merged into source as base. Returns new object |
| `obj.merge3(source, origin, target, optionsObj?)` | 3-way merge. Returns `{ conflict: boolean, result }` |
| `obj.omit(item, omitKeys)` | Return new object with specified keys excluded |
| `obj.omitByFilter(item, fn)` | Return new object excluding keys where `fn(key)` is true |
| `obj.pick(item, pickKeys)` | Return new object containing only specified keys |
| `obj.getChainValue(obj, chain, optional?)` | Get value at dot/bracket path (e.g., `"a.b[0].c"`) |
| `obj.setChainValue(obj, chain, value)` | Set value at dot/bracket path |
| `obj.deleteChainValue(obj, chain)` | Delete value at dot/bracket path |
| `obj.getChainValueByDepth(obj, key, depth, optional?)` | Descend `depth` levels using the same key |
| `obj.keys(obj)` | Type-safe `Object.keys` |
| `obj.entries(obj)` | Type-safe `Object.entries` |
| `obj.fromEntries(entries)` | Type-safe `Object.fromEntries` |
| `obj.map(obj, fn)` | Transform each entry; `fn` returns `[newKey \| null, newValue]` (`null` keeps original key) |
| `obj.clearUndefined(obj)` | Delete keys with `undefined` values in place |
| `obj.clear(obj)` | Delete all keys in place |
| `obj.nullToUndefined(obj)` | Recursively convert `null` to `undefined` in place |
| `obj.unflatten(flatObj)` | Convert `{ "a.b.c": 1 }` to `{ a: { b: { c: 1 } } }` |

`obj.equal` options (`EqualOptions`):

| Option | Type | Description |
|--------|------|-------------|
| `topLevelIncludes` | `string[]` | Only compare these top-level keys |
| `topLevelExcludes` | `string[]` | Exclude these top-level keys from comparison |
| `ignoreArrayIndex` | `boolean` | Treat arrays as sets (order-independent, O(n²)) |
| `shallow` | `boolean` | Shallow (reference) comparison only |

`obj.merge` options (`MergeOptions`):

| Option | Type | Description |
|--------|------|-------------|
| `arrayProcess` | `"replace" \| "concat"` | `"replace"` (default): replace with target array; `"concat"`: merge and deduplicate |
| `useDelTargetNull` | `boolean` | When target value is `null`, delete the key from the result |

---

## `primitive` — Primitive type utility

```typescript
import { primitive } from "@simplysm/core-common";

primitive.typeStr("hello");          // "string"
primitive.typeStr(123);              // "number"
primitive.typeStr(new DateTime());   // "DateTime"
primitive.typeStr(new Uint8Array()); // "Bytes"
```

| Function | Description |
|----------|-------------|
| `primitive.typeStr(value)` | Infer `PrimitiveTypeStr` from a value at runtime. Throws `ArgumentError` on unsupported type |

---

## `str` — String utilities

```typescript
import { str } from "@simplysm/core-common";

// Korean particle based on final consonant
str.getKoreanSuffix("Apple", "을"); // "를"
str.getKoreanSuffix("책", "이");    // "이"

// Full-width to half-width
str.replaceFullWidth("Ａ１２３"); // "A123"

// Case conversion
str.toPascalCase("hello-world"); // "HelloWorld"
str.toCamelCase("hello-world");  // "helloWorld"
str.toKebabCase("HelloWorld");   // "hello-world"
str.toSnakeCase("HelloWorld");   // "hello_world"

// Null/empty check
str.isNullOrEmpty(undefined); // true
str.isNullOrEmpty("");        // true
str.isNullOrEmpty("hello");   // false

// Insert at position
str.insert("Hello World", 5, ","); // "Hello, World"
```

| Function | Description |
|----------|-------------|
| `str.getKoreanSuffix(text, type)` | Return the correct Korean grammatical particle based on the final consonant of `text`. `type`: `"을"` `"은"` `"이"` `"와"` `"랑"` `"로"` `"라"` |
| `str.replaceFullWidth(str)` | Convert full-width characters (Ａ-Ｚ, ａ-ｚ, ０-９, full-width space/parentheses) to half-width |
| `str.toPascalCase(str)` | Convert to PascalCase |
| `str.toCamelCase(str)` | Convert to camelCase |
| `str.toKebabCase(str)` | Convert to kebab-case |
| `str.toSnakeCase(str)` | Convert to snake_case |
| `str.isNullOrEmpty(str)` | Type guard: returns `true` if `undefined`, `null`, or `""` |
| `str.insert(str, index, insertString)` | Insert a string at the given index |

---

## `path` — Path utilities

POSIX-style path utilities for browser/Capacitor environments. POSIX `/` only — Windows `\` is not supported.

```typescript
import { path } from "@simplysm/core-common";

path.join("/base", "sub", "file.txt");     // "/base/sub/file.txt"
path.basename("/base/file.txt");            // "file.txt"
path.basename("/base/file.txt", ".txt");   // "file"
path.extname("/base/file.txt");            // ".txt"
path.extname("/base/.gitignore");          // "" (hidden file: no extension)
```

| Function | Description |
|----------|-------------|
| `path.join(...segments)` | Combine path segments (POSIX style) |
| `path.basename(filePath, ext?)` | Extract filename. If `ext` provided, strips the extension |
| `path.extname(filePath)` | Extract file extension including dot. Hidden files return `""` |

---

## `xml` — XML utilities

```typescript
import { xml } from "@simplysm/core-common";

xml.parse('<root id="1"><item>hello</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }] } }

xml.parse('<ns:root><ns:item>val</ns:item></ns:root>', { stripTagPrefix: true });
// { root: { item: [{ _: "val" }] } }

xml.stringify({ root: { $: { id: "1" }, item: [{ _: "hello" }] } });
// '<root id="1"><item>hello</item></root>'
```

| Function | Description |
|----------|-------------|
| `xml.parse(str, options?)` | Parse XML string to object. Attributes in `$`, text nodes in `_`, children as arrays. `stripTagPrefix`: remove namespace prefixes from tag names |
| `xml.stringify(obj, options?)` | Serialize object to XML string. Accepts `fast-xml-parser` `XmlBuilderOptions` |

---

## `wait` — Wait utilities

```typescript
import { wait } from "@simplysm/core-common";

// Wait until condition is true (polls every 100ms, throws TimeoutError after 50 attempts)
await wait.until(() => isReady, 100, 50);

// Wait for a fixed duration
await wait.time(500); // wait 500ms
```

| Function | Description |
|----------|-------------|
| `wait.until(forwarder, milliseconds?, maxCount?)` | Poll `forwarder` every `milliseconds` (default 100ms). Throws `TimeoutError` when `maxCount` is exceeded |
| `wait.time(millisecond)` | Wait for a fixed duration in milliseconds |

---

## `transfer` — Transferable utilities

Encode/decode objects for transfer between Web Workers. Handles `DateTime`, `DateOnly`, `Time`, `Uuid`, `RegExp`, `Error`, `Uint8Array`, `Map`, `Set`, and plain objects.

```typescript
import { transfer } from "@simplysm/core-common";

// Send to Worker (zero-copy transfer of Uint8Array buffers)
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);

// Receive from Worker
worker.onmessage = (e) => {
  const decoded = transfer.decode(e.data);
};
```

| Function | Description |
|----------|-------------|
| `transfer.encode(obj)` | Convert objects with Simplysm types to plain transferable objects. Returns `{ result, transferList }`. Throws `TypeError` on circular reference |
| `transfer.decode(obj)` | Restore plain transferable objects back to Simplysm types |

---

## `err` — Error utility

```typescript
import { err } from "@simplysm/core-common";

try {
  // ...
} catch (e) {
  console.error(err.message(e)); // safe string regardless of error type
}
```

| Function | Description |
|----------|-------------|
| `err.message(err)` | Returns `err.message` if `err` is an `Error` instance, otherwise `String(err)` |

---

## Template string tags

Syntax-highlighting helpers for IDEs. All tags normalize indentation (remove common leading whitespace and trim blank leading/trailing lines).

```typescript
import { js, ts, html, tsql, mysql, pgsql } from "@simplysm/core-common";

const code = ts`
  interface User {
    name: string;
    age: number;
  }
`;

const query = tsql`
  SELECT TOP 10 *
  FROM Users
  WHERE Name = '${keyword}'
`;
```

Available tags: `js`, `ts`, `html`, `tsql`, `mysql`, `pgsql`.

---

## Map extensions (side effect)

Imported as a side effect when importing from `@simplysm/core-common`. Adds methods to `Map.prototype`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getOrCreate` | `(key, newValue \| factory) => V` | If key is absent, set and return `newValue` or the result of `factory()`. When `V` is a function type, wrap the function in a factory to store it as a value |
| `update` | `(key, updateFn) => void` | Call `updateFn(currentValue)` and set the result. `currentValue` is `undefined` if key is absent |

```typescript
import "@simplysm/core-common"; // triggers side effect

const countMap = new Map<string, number>();
countMap.update("hits", (v) => (v ?? 0) + 1);

const arrayMap = new Map<string, string[]>();
arrayMap.getOrCreate("items", () => []).push("a");
```

---

## Set extensions (side effect)

Imported as a side effect when importing from `@simplysm/core-common`. Adds methods to `Set.prototype`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `adds` | `(...values) => this` | Add multiple values at once |
| `toggle` | `(value, addOrDel?) => this` | Toggle: remove if present, add if absent. Pass `"add"` or `"del"` to force direction |

```typescript
import "@simplysm/core-common"; // triggers side effect

const set = new Set([1, 2, 3]);
set.toggle(2);           // removes 2 → {1, 3}
set.toggle(4);           // adds 4 → {1, 3, 4}
set.toggle(5, "add");    // force add
set.adds(6, 7, 8);       // add multiple at once
```
