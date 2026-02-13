# Utilities

## Object utilities (obj)

### objClone

Deep clone (supports circular references, custom types like `DateTime`, `Uuid`).

```typescript
import { objClone } from "@simplysm/core-common";

const cloned = objClone({ date: new DateTime(), nested: { arr: [1, 2] } });
```

### objEqual

Deep comparison with include/exclude keys and array order ignore option.

```typescript
import { objEqual } from "@simplysm/core-common";

objEqual({ a: 1, b: [2] }, { a: 1, b: [2] });                       // true
objEqual(arr1, arr2, { ignoreArrayIndex: true });                     // Ignore array order
objEqual(obj1, obj2, { topLevelExcludes: ["updatedAt"] });            // Exclude specific keys
```

### objMerge

Deep merge (source + target, array processing option).

```typescript
import { objMerge } from "@simplysm/core-common";

objMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } });
// { a: 1, b: { c: 2, d: 3 } }
```

### objMerge3

3-way merge with conflict detection.

```typescript
import { objMerge3 } from "@simplysm/core-common";

const { conflict, result } = objMerge3(
  { a: 1, b: 2 },  // source (change #1)
  { a: 1, b: 1 },  // origin (base)
  { a: 2, b: 1 },  // target (change #2)
);
// conflict: false, result: { a: 2, b: 2 }
```

### objOmit

Exclude specific keys.

```typescript
import { objOmit } from "@simplysm/core-common";

objOmit(user, ["password", "email"]);
```

### objPick

Select specific keys.

```typescript
import { objPick } from "@simplysm/core-common";

objPick(user, ["name", "age"]);
```

### objGetChainValue

Query value by chain path (`"a.b[0].c"`).

```typescript
import { objGetChainValue } from "@simplysm/core-common";

objGetChainValue(obj, "a.b[0].c");
```

### objSetChainValue

Set value by chain path.

```typescript
import { objSetChainValue } from "@simplysm/core-common";

objSetChainValue(obj, "a.b[0].c", "value");
```

### objDeleteChainValue

Delete value by chain path.

```typescript
import { objDeleteChainValue } from "@simplysm/core-common";

objDeleteChainValue(obj, "a.b[0].c");
```

### objKeys

Type-safe `Object.keys`.

```typescript
import { objKeys } from "@simplysm/core-common";

objKeys(obj); // (keyof typeof obj)[]
```

### objEntries

Type-safe `Object.entries`.

```typescript
import { objEntries } from "@simplysm/core-common";

objEntries(obj); // [keyof typeof obj, typeof obj[keyof typeof obj]][]
```

### objFromEntries

Type-safe `Object.fromEntries`.

```typescript
import { objFromEntries } from "@simplysm/core-common";
```

### objMap

Transform each entry of object and return new object.

```typescript
import { objMap } from "@simplysm/core-common";

objMap(colors, (key, rgb) => [null, `rgb(${rgb})`]); // Transform values only (keep keys)
```

---

## JSON utilities (json)

Serializes/restores `DateTime`, `DateOnly`, `Time`, `Uuid`, `Date`, `Set`, `Map`, `Error`, `Uint8Array` types using `__type__` metadata.

### jsonStringify

JSON serialization with custom type support.

```typescript
import { jsonStringify, DateTime, Uuid } from "@simplysm/core-common";

const data = {
  createdAt: new DateTime(2025, 1, 15),
  id: Uuid.new(),
  tags: new Set(["a", "b"]),
  meta: new Map([["key", "value"]]),
  file: new Uint8Array([1, 2, 3]),
};

// Serialization (preserves custom types)
const json = jsonStringify(data, { space: 2 });

// For logging: hide binary data
jsonStringify(data, { redactBytes: true });
// Uint8Array content replaced with "__hidden__"
```

### jsonParse

JSON deserialization with custom type restoration.

```typescript
import { jsonParse } from "@simplysm/core-common";

// Deserialization (restores custom types)
const parsed = jsonParse(json);
// parsed.createdAt instanceof DateTime === true
// parsed.id instanceof Uuid === true
// parsed.tags instanceof Set === true
```

---

## XML utilities (xml)

### xmlParse

Parse XML string to object (attributes: `$`, text: `_`).

```typescript
import { xmlParse } from "@simplysm/core-common";

const obj = xmlParse('<root id="1"><item>hello</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }] } }

// Remove namespace prefix
xmlParse('<ns:root><ns:item>text</ns:item></ns:root>', { stripTagPrefix: true });
// { root: { item: [{ _: "text" }] } }
```

### xmlStringify

Serialize object to XML string.

```typescript
import { xmlStringify } from "@simplysm/core-common";

const xml = xmlStringify(obj);
// '<root id="1"><item>hello</item></root>'
```

---

## String utilities (str)

### strGetSuffix

Korean postposition handling (을/를, 은/는, 이/가, 과/와, 이랑/랑, 으로/로, 이라/라).

```typescript
import { strGetSuffix } from "@simplysm/core-common";

strGetSuffix("사과", "을"); // "를"
strGetSuffix("책", "이");   // "이"
strGetSuffix("서울", "로"); // "로" (ㄹ final consonant uses "로")
```

### strReplaceFullWidth

Convert full-width characters to half-width.

```typescript
import { strReplaceFullWidth } from "@simplysm/core-common";

strReplaceFullWidth("Ａ１２３（株）"); // "A123(株)"
```

### strToPascalCase

PascalCase conversion.

```typescript
import { strToPascalCase } from "@simplysm/core-common";
```

### strToCamelCase

camelCase conversion.

```typescript
import { strToCamelCase } from "@simplysm/core-common";

strToCamelCase("hello-world"); // "helloWorld"
```

### strToKebabCase

kebab-case conversion.

```typescript
import { strToKebabCase } from "@simplysm/core-common";

strToKebabCase("HelloWorld"); // "hello-world"
```

### strToSnakeCase

snake_case conversion.

```typescript
import { strToSnakeCase } from "@simplysm/core-common";
```

### strIsNullOrEmpty

Check for undefined/null/empty string (type guard).

```typescript
import { strIsNullOrEmpty } from "@simplysm/core-common";

if (strIsNullOrEmpty(name)) {
  // name: "" | undefined
} else {
  // name: string (non-empty string)
}
```

### strInsert

Insert at specific position in string.

```typescript
import { strInsert } from "@simplysm/core-common";
```

---

## Number utilities (num)

### numParseInt

Parse string to integer (remove non-digit characters).

```typescript
import { numParseInt } from "@simplysm/core-common";

numParseInt("12,345원"); // 12345
```

### numParseFloat

Parse string to float.

```typescript
import { numParseFloat } from "@simplysm/core-common";

numParseFloat("3.14%"); // 3.14
```

### numParseRoundedInt

Round float and return integer.

```typescript
import { numParseRoundedInt } from "@simplysm/core-common";
```

### numFormat

Thousands separator formatting.

```typescript
import { numFormat } from "@simplysm/core-common";

numFormat(1234567, { max: 2 });             // "1,234,567"
numFormat(1234, { min: 2, max: 2 });        // "1,234.00"
```

### numIsNullOrEmpty

Check for undefined/null/0 (type guard).

```typescript
import { numIsNullOrEmpty } from "@simplysm/core-common";

if (numIsNullOrEmpty(count)) {
  // count: 0 | undefined
}
```

---

## Date/time formatting (date-format)

### formatDate

Convert date/time to string according to format string. Supports the same format strings as C#.

| Format | Description | Example |
|------|------|------|
| `yyyy` | 4-digit year | 2024 |
| `yy` | 2-digit year | 24 |
| `MM` | 0-padded month | 01~12 |
| `M` | Month | 1~12 |
| `ddd` | Day of week (Korean) | 일, 월, 화, 수, 목, 금, 토 |
| `dd` | 0-padded day | 01~31 |
| `d` | Day | 1~31 |
| `tt` | AM/PM | 오전, 오후 |
| `HH` | 0-padded 24-hour | 00~23 |
| `hh` | 0-padded 12-hour | 01~12 |
| `mm` | 0-padded minute | 00~59 |
| `ss` | 0-padded second | 00~59 |
| `fff` | Millisecond (3 digits) | 000~999 |
| `zzz` | Timezone offset | +09:00 |

```typescript
import { formatDate } from "@simplysm/core-common";

formatDate("yyyy-MM-dd", { year: 2024, month: 3, day: 15 });
// "2024-03-15"

formatDate("yyyy년 M월 d일 (ddd)", { year: 2024, month: 3, day: 15 });
// "2024년 3월 15일 (금)"
```

### normalizeMonth

Normalize year/month/day when setting month.

```typescript
import { normalizeMonth } from "@simplysm/core-common";

normalizeMonth(2025, 13, 15); // { year: 2026, month: 1, day: 15 }
normalizeMonth(2025, 2, 31);  // { year: 2025, month: 2, day: 28 }
```

---

## Byte utilities (bytes)

### bytesConcat

Concatenate multiple Uint8Arrays.

```typescript
import { bytesConcat } from "@simplysm/core-common";

bytesConcat([new Uint8Array([1, 2]), new Uint8Array([3, 4])]);
// Uint8Array([1, 2, 3, 4])
```

### bytesToHex

Convert Uint8Array to hex string.

```typescript
import { bytesToHex } from "@simplysm/core-common";

bytesToHex(new Uint8Array([255, 0, 127])); // "ff007f"
```

### bytesFromHex

Convert hex string to Uint8Array.

```typescript
import { bytesFromHex } from "@simplysm/core-common";

bytesFromHex("ff007f"); // Uint8Array([255, 0, 127])
```

### bytesToBase64

Convert Uint8Array to base64 string.

```typescript
import { bytesToBase64 } from "@simplysm/core-common";

bytesToBase64(new Uint8Array([72, 101, 108, 108, 111])); // "SGVsbG8="
```

### bytesFromBase64

Convert base64 string to Uint8Array.

```typescript
import { bytesFromBase64 } from "@simplysm/core-common";

bytesFromBase64("SGVsbG8="); // Uint8Array([72, 101, 108, 108, 111])
```

---

## Async wait (wait)

### waitTime

Wait for specified time.

```typescript
import { waitTime } from "@simplysm/core-common";

await waitTime(1000); // Wait 1 second
```

### waitUntil

Wait until condition is true (max attempts limit).

```typescript
import { waitUntil } from "@simplysm/core-common";

// Wait for condition (100ms interval, max 50 attempts = 5 seconds)
await waitUntil(() => isReady, 100, 50);
// Throws TimeoutError after 50 attempts
```

---

## Worker data conversion (transferable)

### transferableEncode

Serialize custom types into Worker-transferable form.

```typescript
import { transferableEncode } from "@simplysm/core-common";

// Send to Worker
const { result, transferList } = transferableEncode(data);
worker.postMessage(result, transferList);
```

### transferableDecode

Deserialize Worker-received data to custom types.

```typescript
import { transferableDecode } from "@simplysm/core-common";

// Receive from Worker
const decoded = transferableDecode(event.data);
```

---

## Path utilities (path)

Replacement for Node.js `path` module. Supports POSIX-style paths (`/`) only.

### pathJoin

Combine paths (`path.join` replacement).

```typescript
import { pathJoin } from "@simplysm/core-common";

pathJoin("/home", "user", "file.txt"); // "/home/user/file.txt"
```

### pathBasename

Extract filename (`path.basename` replacement).

```typescript
import { pathBasename } from "@simplysm/core-common";

pathBasename("/home/user/file.txt");   // "file.txt"
pathBasename("file.txt", ".txt");      // "file"
```

### pathExtname

Extract extension (`path.extname` replacement).

```typescript
import { pathExtname } from "@simplysm/core-common";

pathExtname("file.txt"); // ".txt"
```

---

## Template literal tags (template-strings)

Tag functions for IDE code highlighting. Actual behavior is string combination + indentation cleanup.

### js

JavaScript code highlighting.

```typescript
import { js } from "@simplysm/core-common";
```

### ts

TypeScript code highlighting.

```typescript
import { ts } from "@simplysm/core-common";
```

### html

HTML markup highlighting.

```typescript
import { html } from "@simplysm/core-common";
```

### tsql

MSSQL T-SQL highlighting.

```typescript
import { tsql } from "@simplysm/core-common";

const query = tsql`
  SELECT TOP 10 *
  FROM Users
  WHERE Name LIKE '%${keyword}%'
`;
```

### mysql

MySQL SQL highlighting.

```typescript
import { mysql } from "@simplysm/core-common";
```

### pgsql

PostgreSQL SQL highlighting.

```typescript
import { pgsql } from "@simplysm/core-common";
```

---

## Other utilities

### getPrimitiveTypeStr

Infer `PrimitiveTypeStr` from runtime value.

```typescript
import { getPrimitiveTypeStr } from "@simplysm/core-common";

getPrimitiveTypeStr("hello");        // "string"
getPrimitiveTypeStr(123);            // "number"
getPrimitiveTypeStr(new DateTime()); // "DateTime"
```

### env

Environment variable object (`DEV`, `VER`, etc.).

```typescript
import { env } from "@simplysm/core-common";

if (env.DEV) {
  console.log("Development mode");
}
console.log(`Version: ${env.VER}`);
```
