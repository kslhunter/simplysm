# Utils

Utility functions exported from `@simplysm/core-common`. All are pure, tree-shakeable exports.

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

## Date utilities

### `formatDate(formatString, args)`

Formats date/time components into a string using a C#-style format string.

```typescript
import { formatDate } from "@simplysm/core-common";

formatDate("yyyy-MM-dd", { year: 2024, month: 3, day: 15 });
// "2024-03-15"

formatDate("yyyy-M-d (ddd)", { year: 2024, month: 3, day: 15 });
// "2024-3-15 (금)"

formatDate("tt h:mm:ss", { hour: 14, minute: 30, second: 45 });
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

Also exported: `normalizeMonth(year, month, day)` and `convert12To24(rawHour, isPM)`.

---

## Bytes utilities

```typescript
import {
  bytesConcat, bytesToHex, bytesFromHex,
  bytesToBase64, bytesFromBase64,
} from "@simplysm/core-common";

bytesConcat([new Uint8Array([1, 2]), new Uint8Array([3, 4])]);
// Uint8Array([1, 2, 3, 4])

bytesToHex(new Uint8Array([255, 0, 127]));  // "ff007f"
bytesFromHex("ff007f");                      // Uint8Array([255, 0, 127])

bytesToBase64(new Uint8Array([72, 101, 108, 108, 111])); // "SGVsbG8="
bytesFromBase64("SGVsbG8="); // Uint8Array([72, 101, 108, 108, 111])
```

---

## JSON utilities

Serialization/deserialization supporting custom types (`DateTime`, `DateOnly`, `Time`, `Uuid`, `Set`, `Map`, `Error`, `Uint8Array`).

```typescript
import { jsonStringify, jsonParse } from "@simplysm/core-common";

const obj = { date: new DateTime(), id: Uuid.new(), tags: new Set(["a", "b"]) };
const json = jsonStringify(obj, { space: 2 });
const restored = jsonParse<typeof obj>(json);
// restored.date is a DateTime instance, restored.id is a Uuid instance
```

`jsonStringify` options:

| Option | Type | Description |
|--------|------|-------------|
| `space` | `string \| number` | JSON indentation |
| `replacer` | `(key, value) => unknown` | Custom transform before default type conversion |
| `redactBytes` | `boolean` | Replace `Uint8Array` contents with `"__hidden__"` (for logging) |

---

## Number utilities

```typescript
import { numParseInt, numParseFloat, numParseRoundedInt, numIsNullOrEmpty, numFormat } from "@simplysm/core-common";

numParseInt("가-123나");   // -123
numParseFloat("12.34px"); // 12.34
numParseRoundedInt("12.7px"); // 13
numIsNullOrEmpty(0);      // true
numIsNullOrEmpty(5);      // false
numFormat(1234.567, { max: 2 }); // "1,234.57"
numFormat(1234, { min: 2 });     // "1,234.00"
```

---

## Object utilities

```typescript
import {
  objClone, objEqual, objMerge, objMerge3,
  objOmit, objOmitByFilter, objPick,
  objGetChainValue, objSetChainValue, objDeleteChainValue, objGetChainValueByDepth,
  objClearUndefined, objClear, objNullToUndefined, objUnflatten,
  objKeys, objEntries, objFromEntries, objMap,
} from "@simplysm/core-common";

// Deep clone
const cloned = objClone({ a: new DateTime(), b: [1, 2] });

// Deep equality
objEqual({ a: 1 }, { a: 1 }); // true
objEqual([1, 2], [2, 1], { ignoreArrayIndex: true }); // true

// Deep merge (target into source)
objMerge({ a: 1, b: 2 }, { b: 3, c: 4 }); // { a: 1, b: 3, c: 4 }

// 3-way merge
const { conflict, result } = objMerge3(
  { a: 1, b: 2 },  // source
  { a: 1, b: 1 },  // origin
  { a: 2, b: 1 },  // target
);
// conflict: false, result: { a: 2, b: 2 }

// Key selection / omission
objOmit({ name: "Alice", age: 30 }, ["age"]);       // { name: "Alice" }
objPick({ name: "Alice", age: 30 }, ["name"]);      // { name: "Alice" }
objOmitByFilter({ name: "Alice", _x: 1 }, (k) => String(k).startsWith("_")); // { name: "Alice" }

// Chain path access
const obj = { a: { b: [{ c: 42 }] } };
objGetChainValue(obj, "a.b[0].c");          // 42
objSetChainValue(obj, "a.b[0].c", 99);
objDeleteChainValue(obj, "a.b[0].c");

// Type-safe Object helpers
objKeys({ a: 1, b: 2 });                    // ["a", "b"] as (keyof ...)[]
objEntries({ a: 1, b: "x" });              // [["a", 1], ["b", "x"]]
objFromEntries([["a", 1], ["b", 2]]);      // { a: 1, b: 2 }
objMap({ r: "255,0,0" }, (k, v) => [null, `rgb(${v})`]); // { r: "rgb(255,0,0)" }

// Null/undefined helpers
objNullToUndefined({ a: null, b: 1 });     // { a: undefined, b: 1 }
objClearUndefined({ a: undefined, b: 1 }); // { b: 1 } (mutates)
objClear({ a: 1, b: 2 });                  // {} (mutates)
objUnflatten({ "a.b.c": 1 });              // { a: { b: { c: 1 } } }
```

`objEqual` options (`EqualOptions`):

| Option | Type | Description |
|--------|------|-------------|
| `topLevelIncludes` | `string[]` | Only compare these top-level keys |
| `topLevelExcludes` | `string[]` | Exclude these top-level keys from comparison |
| `ignoreArrayIndex` | `boolean` | Treat arrays as sets (order-independent, O(n²)) |
| `onlyOneDepth` | `boolean` | Shallow (reference) comparison only |

`objMerge` options (`ObjMergeOptions`):

| Option | Type | Description |
|--------|------|-------------|
| `arrayProcess` | `"replace" \| "concat"` | `"replace"` (default): replace with target array; `"concat"`: merge and deduplicate |
| `useDelTargetNull` | `boolean` | When target value is `null`, delete the key from the result |

---

## Primitive type utility

```typescript
import { getPrimitiveTypeStr } from "@simplysm/core-common";

getPrimitiveTypeStr("hello");         // "string"
getPrimitiveTypeStr(123);             // "number"
getPrimitiveTypeStr(new DateTime());  // "DateTime"
getPrimitiveTypeStr(new Uint8Array()); // "Bytes"
```

---

## String utilities

```typescript
import {
  koreanGetSuffix,
  strReplaceFullWidth,
  strToPascalCase, strToCamelCase, strToKebabCase, strToSnakeCase,
  strIsNullOrEmpty,
  strInsert,
} from "@simplysm/core-common";

// Korean particle based on final consonant
koreanGetSuffix("Apple", "을"); // "를"
koreanGetSuffix("책", "이");    // "이"

// Full-width to half-width
strReplaceFullWidth("Ａ１２３"); // "A123"

// Case conversion
strToPascalCase("hello-world"); // "HelloWorld"
strToCamelCase("hello-world");  // "helloWorld"
strToKebabCase("HelloWorld");   // "hello-world"
strToSnakeCase("HelloWorld");   // "hello_world"

// Null/empty check
strIsNullOrEmpty(undefined); // true
strIsNullOrEmpty("");        // true
strIsNullOrEmpty("hello");   // false

// Insert at position
strInsert("Hello World", 5, ","); // "Hello, World"
```

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

## Transferable utilities

Encode/decode objects for transfer between Web Workers. Handles `DateTime`, `DateOnly`, `Time`, `Uuid`, `RegExp`, `Error`, `Uint8Array`, `Map`, `Set`, and plain objects.

```typescript
import { transferableEncode, transferableDecode } from "@simplysm/core-common";

// Send to Worker (zero-copy transfer of Uint8Array buffers)
const { result, transferList } = transferableEncode(data);
worker.postMessage(result, transferList);

// Receive from Worker
worker.onmessage = (e) => {
  const decoded = transferableDecode(e.data);
};
```

---

## Wait utilities

```typescript
import { waitUntil, waitTime } from "@simplysm/core-common";

// Wait until condition is true (polls every 100ms, throws TimeoutError after 50 attempts)
await waitUntil(() => isReady, 100, 50);

// Wait for a fixed duration
await waitTime(500); // wait 500ms
```

---

## XML utilities

```typescript
import { xmlParse, xmlStringify } from "@simplysm/core-common";

xmlParse('<root id="1"><item>hello</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }] } }

xmlParse('<ns:root><ns:item>val</ns:item></ns:root>', { stripTagPrefix: true });
// { root: { item: [{ _: "val" }] } }

xmlStringify({ root: { $: { id: "1" }, item: [{ _: "hello" }] } });
// '<root id="1"><item>hello</item></root>'
```

---

## Path utilities

POSIX-style path utilities for browser/Capacitor environments (POSIX `/` only, no Windows `\` support).

```typescript
import { pathJoin, pathBasename, pathExtname } from "@simplysm/core-common";

pathJoin("/base", "sub", "file.txt");     // "/base/sub/file.txt"
pathBasename("/base/file.txt");            // "file.txt"
pathBasename("/base/file.txt", ".txt");   // "file"
pathExtname("/base/file.txt");            // ".txt"
pathExtname("/base/.gitignore");          // "" (hidden file: no extension)
```

---

## Error utility

```typescript
import { errorMessage } from "@simplysm/core-common";

try {
  // ...
} catch (err) {
  console.error(errorMessage(err)); // safe string regardless of err type
}
```
