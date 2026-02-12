# @simplysm/core-common

A common utility package for the Simplysm framework.
As a neutral base module usable in both Node.js and browser environments, it provides date/time types, error classes, object/array/string utilities, JSON serialization, ZIP processing, prototype extensions, and more.

## Installation

```bash
npm install @simplysm/core-common
# or
pnpm add @simplysm/core-common
```

## Initialization

Import the package at your application entry point (e.g., `index.ts`, `main.ts`):

```typescript
import "@simplysm/core-common";
```

This import globally activates Array, Map, and Set prototype extensions.
To use extension methods (`getOrCreate()`, `toggle()`, etc.), you must import this at app startup.

## Main Modules

### Errors

Custom error classes. All are based on `SdError` and support cause chaining.

| Class | Description |
|--------|------|
| `SdError` | Base error class (error tracking with cause chain, automatic nested stack integration) |
| `ArgumentError` | Argument validation error (YAML formatting) |
| `NotImplementedError` | Indicates unimplemented functionality |
| `TimeoutError` | Timeout error |

```typescript
import { SdError, ArgumentError, NotImplementedError, TimeoutError } from "@simplysm/core-common";

// SdError: track errors with cause chain
try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API call failed", "Failed to load user");
  // Result message: "Failed to load user => API call failed => original error message"
}

// ArgumentError: output argument object in YAML format
throw new ArgumentError("Invalid user", { userId: 123 });
// Result message: "Invalid user\n\nuserId: 123"

// NotImplementedError: indicate unimplemented branch
switch (type) {
  case "A": return handleA();
  case "B": throw new NotImplementedError(`Handling type ${type}`);
}

// TimeoutError: wait time exceeded
throw new TimeoutError(5, "API response wait exceeded");
// Result message: "Wait time exceeded(5): API response wait exceeded"
```

### Types

Immutable custom type classes. All transformation methods return new instances.

| Class | Description |
|--------|------|
| `DateTime` | Date + time (millisecond precision, local timezone) |
| `DateOnly` | Date only (no time) |
| `Time` | Time only (no date, 24-hour cycle) |
| `Uuid` | UUID v4 (based on `crypto.getRandomValues`) |
| `LazyGcMap` | Map with auto-expiration (LRU style) |

#### DateTime

```typescript
import { DateTime } from "@simplysm/core-common";

// Creation
const now = new DateTime();                          // Current time
const dt = new DateTime(2025, 1, 15, 10, 30, 0);    // Year, month, day, hour, minute, second
const fromTick = new DateTime(1705312200000);         // Tick (milliseconds)
const fromDate = new DateTime(new Date());            // Date object

// Parsing
DateTime.parse("2025-01-15 10:30:00");               // yyyy-MM-dd HH:mm:ss
DateTime.parse("2025-01-15 10:30:00.123");           // yyyy-MM-dd HH:mm:ss.fff
DateTime.parse("20250115103000");                     // yyyyMMddHHmmss
DateTime.parse("2025-01-15 오전 10:30:00");           // Korean AM/PM
DateTime.parse("2025-01-15T10:30:00Z");              // ISO 8601

// Properties (read-only)
dt.year;       // 2025
dt.month;      // 1 (1-12)
dt.day;        // 15
dt.hour;       // 10
dt.minute;     // 30
dt.second;     // 0
dt.millisecond; // 0
dt.tick;       // Millisecond timestamp
dt.dayOfWeek;  // Day of week (Sun~Sat: 0~6)
dt.isValid;    // Validity check

// Immutable transformations (return new instances)
dt.setYear(2026);         // Change year
dt.setMonth(3);           // Change month (day auto-adjusted)
dt.addDays(7);            // 7 days later
dt.addHours(-2);          // 2 hours ago
dt.addMonths(1);          // 1 month later

// Formatting
dt.toFormatString("yyyy-MM-dd");               // "2025-01-15"
dt.toFormatString("yyyy년 M월 d일 (ddd)");     // "2025년 1월 15일 (수)"
dt.toFormatString("tt h:mm:ss");               // "오전 10:30:00"
dt.toString();                                  // "2025-01-15T10:30:00.000+09:00"
```

#### DateOnly

```typescript
import { DateOnly } from "@simplysm/core-common";

// Creation and parsing
const today = new DateOnly();
const d = new DateOnly(2025, 1, 15);
DateOnly.parse("2025-01-15");     // No timezone influence
DateOnly.parse("20250115");       // No timezone influence

// Immutable transformations
d.addDays(30);
d.addMonths(-1);
d.setMonth(2);  // Jan 31 -> Feb 28 (auto-adjusted)

// Week calculation (ISO 8601 standard)
d.getWeekSeqOfYear();    // { year: 2025, weekSeq: 3 }
d.getWeekSeqOfMonth();   // { year: 2025, monthSeq: 1, weekSeq: 3 }

// US-style week (Sunday start, first week with 1+ days)
d.getWeekSeqOfYear(0, 1);

// Reverse calculate date from week
DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 }); // 2025-01-06 (Monday)

// Formatting
d.toFormatString("yyyy년 MM월 dd일"); // "2025년 01월 15일"
d.toString();                          // "2025-01-15"
```

#### Time

```typescript
import { Time } from "@simplysm/core-common";

// Creation and parsing
const now = new Time();
const t = new Time(14, 30, 0);
Time.parse("14:30:00");           // HH:mm:ss
Time.parse("14:30:00.123");       // HH:mm:ss.fff
Time.parse("오후 2:30:00");       // Korean AM/PM

// 24-hour cycle
t.addHours(12);    // 14:30 + 12 hours = 02:30 (cycles, not next day)
t.addMinutes(-60); // 14:30 - 60 minutes = 13:30

// Formatting
t.toFormatString("tt h:mm"); // "오후 2:30"
t.toString();                 // "14:30:00.000"
```

#### Uuid

```typescript
import { Uuid } from "@simplysm/core-common";

// Generate new UUID (cryptographically secure)
const id = Uuid.new();

// Create from string
const fromStr = new Uuid("550e8400-e29b-41d4-a716-446655440000");

// Byte conversion
const bytes = id.toBytes();           // Uint8Array (16 bytes)
const fromBytes = Uuid.fromBytes(bytes);

id.toString(); // "550e8400-e29b-41d4-a716-446655440000"
```

#### LazyGcMap

```typescript
import { LazyGcMap } from "@simplysm/core-common";

// using statement (recommended)
using map = new LazyGcMap<string, object>({
  gcInterval: 10000,  // GC execution interval: 10 seconds
  expireTime: 60000,  // Item expiration time: 60 seconds
  onExpire: (key, value) => {
    console.log(`Expired: ${key}`);
  },
});

map.set("key1", { data: "hello" });
map.get("key1");                       // Refreshes access time (LRU)
map.getOrCreate("key2", () => ({}));   // Create and return if not exists
map.has("key1");                       // Does not refresh access time
map.delete("key1");
```

### Features

Async operation control and event handling classes. All support `using` statements or `dispose()`.

| Class | Description |
|--------|------|
| `DebounceQueue` | Async debounce queue (executes only last request) |
| `SerialQueue` | Async serial queue (sequential execution) |
| `EventEmitter` | EventTarget wrapper (type-safe events) |

#### DebounceQueue

```typescript
import { DebounceQueue } from "@simplysm/core-common";

using queue = new DebounceQueue(300); // 300ms debounce

// Error handling
queue.on("error", (err) => console.error(err));

// Only last call is executed
queue.run(() => console.log("1")); // Ignored
queue.run(() => console.log("2")); // Ignored
queue.run(() => console.log("3")); // Executed after 300ms
```

#### SerialQueue

```typescript
import { SerialQueue } from "@simplysm/core-common";

using queue = new SerialQueue(100); // 100ms interval between tasks

queue.on("error", (err) => console.error(err));

queue.run(async () => { await fetch("/api/1"); });
queue.run(async () => { await fetch("/api/2"); }); // Runs after #1 completes
queue.run(async () => { await fetch("/api/3"); }); // Runs after #2 completes
```

#### EventEmitter

```typescript
import { EventEmitter } from "@simplysm/core-common";

interface MyEvents {
  data: string;
  error: Error;
  done: void;
}

class MyService extends EventEmitter<MyEvents> {
  process(): void {
    this.emit("data", "result data");
    this.emit("done"); // void type called without arguments
  }
}

const service = new MyService();
service.on("data", (data) => console.log(data)); // data: string (type inferred)
service.off("data", listener);                   // Remove listener
service.listenerCount("data");                   // Number of registered listeners
service.dispose();                                // Remove all listeners
```

### Utils

Utility functions.

#### Object utilities (obj)

| Function | Description |
|------|------|
| `objClone` | Deep clone (supports circular references, custom types) |
| `objEqual` | Deep comparison (include/exclude keys, array order ignore option) |
| `objMerge` | Deep merge (source + target, array processing option) |
| `objMerge3` | 3-way merge (conflict detection) |
| `objOmit` | Exclude specific keys |
| `objPick` | Select specific keys |
| `objGetChainValue` | Query value by chain path (`"a.b[0].c"`) |
| `objSetChainValue` | Set value by chain path |
| `objDeleteChainValue` | Delete value by chain path |
| `objKeys` | Type-safe `Object.keys` |
| `objEntries` | Type-safe `Object.entries` |
| `objFromEntries` | Type-safe `Object.fromEntries` |
| `objMap` | Transform each entry of object and return new object |

```typescript
import {
  objClone, objEqual, objMerge, objMerge3,
  objOmit, objPick, objGetChainValue, objSetChainValue,
  objKeys, objEntries, objMap,
} from "@simplysm/core-common";

// Deep clone (supports custom types like DateTime, Uuid)
const cloned = objClone({ date: new DateTime(), nested: { arr: [1, 2] } });

// Deep comparison
objEqual({ a: 1, b: [2] }, { a: 1, b: [2] });                       // true
objEqual(arr1, arr2, { ignoreArrayIndex: true });                     // Ignore array order
objEqual(obj1, obj2, { topLevelExcludes: ["updatedAt"] });            // Exclude specific keys

// Deep merge
objMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } });
// { a: 1, b: { c: 2, d: 3 } }

// 3-way merge (conflict detection)
const { conflict, result } = objMerge3(
  { a: 1, b: 2 },  // source (change #1)
  { a: 1, b: 1 },  // origin (base)
  { a: 2, b: 1 },  // target (change #2)
);
// conflict: false, result: { a: 2, b: 2 }

// Key selection/exclusion
objOmit(user, ["password", "email"]);
objPick(user, ["name", "age"]);

// Chain path
objGetChainValue(obj, "a.b[0].c");
objSetChainValue(obj, "a.b[0].c", "value");

// Type-safe Object utilities
objKeys(obj);       // (keyof typeof obj)[]
objEntries(obj);    // [keyof typeof obj, typeof obj[keyof typeof obj]][]
objMap(colors, (key, rgb) => [null, `rgb(${rgb})`]); // Transform values only (keep keys)
```

#### JSON utilities (json)

| Function | Description |
|------|------|
| `jsonStringify` | JSON serialization with custom type support |
| `jsonParse` | JSON deserialization with custom type restoration |

Serializes/restores `DateTime`, `DateOnly`, `Time`, `Uuid`, `Date`, `Set`, `Map`, `Error`, `Uint8Array` types using `__type__` metadata.

```typescript
import { jsonStringify, jsonParse, DateTime, Uuid } from "@simplysm/core-common";

const data = {
  createdAt: new DateTime(2025, 1, 15),
  id: Uuid.new(),
  tags: new Set(["a", "b"]),
  meta: new Map([["key", "value"]]),
  file: new Uint8Array([1, 2, 3]),
};

// Serialization (preserves custom types)
const json = jsonStringify(data, { space: 2 });

// Deserialization (restores custom types)
const parsed = jsonParse(json);
// parsed.createdAt instanceof DateTime === true
// parsed.id instanceof Uuid === true
// parsed.tags instanceof Set === true

// For logging: hide binary data
jsonStringify(data, { redactBytes: true });
// Uint8Array content replaced with "__hidden__"
```

#### XML utilities (xml)

| Function | Description |
|------|------|
| `xmlParse` | Parse XML string to object (attributes: `$`, text: `_`) |
| `xmlStringify` | Serialize object to XML string |

```typescript
import { xmlParse, xmlStringify } from "@simplysm/core-common";

const obj = xmlParse('<root id="1"><item>hello</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }] } }

const xml = xmlStringify(obj);
// '<root id="1"><item>hello</item></root>'

// Remove namespace prefix
xmlParse('<ns:root><ns:item>text</ns:item></ns:root>', { stripTagPrefix: true });
// { root: { item: [{ _: "text" }] } }
```

#### String utilities (str)

| Function | Description |
|------|------|
| `strGetSuffix` | Korean postposition handling (을/를, 은/는, 이/가, 과/와, 이랑/랑, 으로/로, 이라/라) |
| `strReplaceFullWidth` | Convert full-width characters to half-width |
| `strToPascalCase` | PascalCase conversion |
| `strToCamelCase` | camelCase conversion |
| `strToKebabCase` | kebab-case conversion |
| `strToSnakeCase` | snake_case conversion |
| `strIsNullOrEmpty` | Check for undefined/null/empty string (type guard) |
| `strInsert` | Insert at specific position in string |

```typescript
import {
  strGetSuffix, strToCamelCase, strToKebabCase,
  strIsNullOrEmpty, strReplaceFullWidth,
} from "@simplysm/core-common";

// Korean postposition
strGetSuffix("사과", "을"); // "를"
strGetSuffix("책", "이");   // "이"
strGetSuffix("서울", "로"); // "로" (ㄹ final consonant uses "로")

// Case conversion
strToCamelCase("hello-world");   // "helloWorld"
strToKebabCase("HelloWorld");    // "hello-world"

// Empty string check (type guard)
if (strIsNullOrEmpty(name)) {
  // name: "" | undefined
} else {
  // name: string (non-empty string)
}

// Full-width -> half-width
strReplaceFullWidth("Ａ１２３（株）"); // "A123(株)"
```

#### Number utilities (num)

| Function | Description |
|------|------|
| `numParseInt` | Parse string to integer (remove non-digit characters) |
| `numParseFloat` | Parse string to float |
| `numParseRoundedInt` | Round float and return integer |
| `numFormat` | Thousands separator formatting |
| `numIsNullOrEmpty` | Check for undefined/null/0 (type guard) |

```typescript
import { numParseInt, numParseFloat, numFormat, numIsNullOrEmpty } from "@simplysm/core-common";

numParseInt("12,345원");                    // 12345
numParseFloat("3.14%");                     // 3.14
numFormat(1234567, { max: 2 });             // "1,234,567"
numFormat(1234, { min: 2, max: 2 });        // "1,234.00"

if (numIsNullOrEmpty(count)) {
  // count: 0 | undefined
}
```

#### Date/time formatting (date-format)

| Function | Description |
|------|------|
| `formatDate` | Convert date/time to string according to format string |
| `normalizeMonth` | Normalize year/month/day when setting month |

Supports the same format strings as C#:

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
import { formatDate, normalizeMonth } from "@simplysm/core-common";

formatDate("yyyy-MM-dd", { year: 2024, month: 3, day: 15 });
// "2024-03-15"

formatDate("yyyy년 M월 d일 (ddd)", { year: 2024, month: 3, day: 15 });
// "2024년 3월 15일 (금)"

normalizeMonth(2025, 13, 15); // { year: 2026, month: 1, day: 15 }
normalizeMonth(2025, 2, 31);  // { year: 2025, month: 2, day: 28 }
```

#### Byte utilities (bytes)

| Function | Description |
|------|------|
| `bytesConcat` | Concatenate multiple Uint8Arrays |
| `bytesToHex` | Convert Uint8Array to hex string |
| `bytesFromHex` | Convert hex string to Uint8Array |
| `bytesToBase64` | Convert Uint8Array to base64 string |
| `bytesFromBase64` | Convert base64 string to Uint8Array |

```typescript
import { bytesConcat, bytesToHex, bytesFromHex, bytesToBase64, bytesFromBase64 } from "@simplysm/core-common";

bytesConcat([new Uint8Array([1, 2]), new Uint8Array([3, 4])]);
// Uint8Array([1, 2, 3, 4])

bytesToHex(new Uint8Array([255, 0, 127]));  // "ff007f"
bytesFromHex("ff007f");                      // Uint8Array([255, 0, 127])

bytesToBase64(new Uint8Array([72, 101, 108, 108, 111]));  // "SGVsbG8="
bytesFromBase64("SGVsbG8=");                               // Uint8Array([72, 101, 108, 108, 111])
```

#### Async wait (wait)

| Function | Description |
|------|------|
| `waitTime` | Wait for specified time |
| `waitUntil` | Wait until condition is true (max attempts limit) |

```typescript
import { waitTime, waitUntil } from "@simplysm/core-common";

await waitTime(1000); // Wait 1 second

// Wait for condition (100ms interval, max 50 attempts = 5 seconds)
await waitUntil(() => isReady, 100, 50);
// Throws TimeoutError after 50 attempts
```

#### Worker data conversion (transferable)

| Function | Description |
|------|------|
| `transferableEncode` | Serialize custom types into Worker-transferable form |
| `transferableDecode` | Deserialize Worker-received data to custom types |

```typescript
import { transferableEncode, transferableDecode } from "@simplysm/core-common";

// Send to Worker
const { result, transferList } = transferableEncode(data);
worker.postMessage(result, transferList);

// Receive from Worker
const decoded = transferableDecode(event.data);
```

#### Path utilities (path)

Replacement for Node.js `path` module. Supports POSIX-style paths (`/`) only.

| Function | Description |
|------|------|
| `pathJoin` | Combine paths (`path.join` replacement) |
| `pathBasename` | Extract filename (`path.basename` replacement) |
| `pathExtname` | Extract extension (`path.extname` replacement) |

```typescript
import { pathJoin, pathBasename, pathExtname } from "@simplysm/core-common";

pathJoin("/home", "user", "file.txt"); // "/home/user/file.txt"
pathBasename("/home/user/file.txt");   // "file.txt"
pathBasename("file.txt", ".txt");      // "file"
pathExtname("file.txt");               // ".txt"
```

#### Template literal tags (template-strings)

Tag functions for IDE code highlighting. Actual behavior is string combination + indentation cleanup.

| Function | Description |
|------|------|
| `js` | JavaScript code highlighting |
| `ts` | TypeScript code highlighting |
| `html` | HTML markup highlighting |
| `tsql` | MSSQL T-SQL highlighting |
| `mysql` | MySQL SQL highlighting |
| `pgsql` | PostgreSQL SQL highlighting |

```typescript
import { tsql } from "@simplysm/core-common";

const query = tsql`
  SELECT TOP 10 *
  FROM Users
  WHERE Name LIKE '%${keyword}%'
`;
```

#### Other utilities

| Function/Type | Description |
|-----------|------|
| `getPrimitiveTypeStr` | Infer `PrimitiveTypeStr` from runtime value |
| `env` | Environment variable object (`DEV`, `VER`, etc.) |

```typescript
import { getPrimitiveTypeStr, env } from "@simplysm/core-common";

getPrimitiveTypeStr("hello");        // "string"
getPrimitiveTypeStr(123);            // "number"
getPrimitiveTypeStr(new DateTime()); // "DateTime"

if (env.DEV) {
  console.log("Development mode");
}
console.log(`Version: ${env.VER}`);
```

### Zip

ZIP file compression/decompression utility. Resources can be auto-cleaned with `await using`.

| Class | Description |
|--------|------|
| `ZipArchive` | ZIP file read/write/compress/extract |

```typescript
import { ZipArchive } from "@simplysm/core-common";

// Read ZIP file
await using archive = new ZipArchive(zipBytes);
const content = await archive.get("file.txt");
const exists = await archive.exists("data.json");

// Extract all (with progress)
const files = await archive.extractAll((progress) => {
  console.log(`${progress.fileName}: ${progress.extractedSize}/${progress.totalSize}`);
});

// Create ZIP file
await using newArchive = new ZipArchive();
newArchive.write("file.txt", textBytes);
newArchive.write("data.json", jsonBytes);
const zipBytes = await newArchive.compress();
```

### Type Utilities

TypeScript utility types.

| Type | Description |
|------|------|
| `Bytes` | Alias for `Uint8Array` (`Buffer` replacement) |
| `PrimitiveTypeStr` | Primitive type string keys (`"string"`, `"number"`, `"boolean"`, `"DateTime"`, `"DateOnly"`, `"Time"`, `"Uuid"`, `"Bytes"`) |
| `PrimitiveTypeMap` | Mapping from `PrimitiveTypeStr` to actual type |
| `PrimitiveType` | Union of all Primitive types |
| `DeepPartial<T>` | Recursively convert all properties to optional |
| `Type<T>` | Constructor type (for dependency injection, factory patterns) |
| `ObjUndefToOptional<T>` | Convert properties with `undefined` to optional |
| `ObjOptionalToUndef<T>` | Convert optional properties to `required + undefined` union |
| `ArrayDiffsResult<T, P>` | Result of `Array.diffs()` — insert / delete / update entries |
| `ArrayDiffs2Result<T>` | Result of `Array.oneWayDiffs()` — create / update / same entries |
| `TreeArray<T>` | Result of `Array.toTree()` — `T & { children: TreeArray<T>[] }` |

```typescript
import type { DeepPartial, Type, Bytes, ArrayDiffsResult, TreeArray } from "@simplysm/core-common";

// DeepPartial: deep Partial
interface Config {
  db: { host: string; port: number };
}
const partial: DeepPartial<Config> = { db: { host: "localhost" } };

// Type: constructor type
function create<T>(ctor: Type<T>): T {
  return new ctor();
}

// Bytes: Buffer replacement
const data: Bytes = new Uint8Array([1, 2, 3]);

// ArrayDiffsResult: diff comparison result type
const diffs: ArrayDiffsResult<User, User>[] = oldUsers.diffs(newUsers, { keys: ["id"] });
for (const diff of diffs) {
  if (diff.source === undefined) { /* INSERT */ }
  else if (diff.target === undefined) { /* DELETE */ }
  else { /* UPDATE */ }
}

// TreeArray: tree structure result type
interface Category { id: number; parentId: number | undefined; name: string }
const tree: TreeArray<Category>[] = categories.toTree("id", "parentId");
// Each node has a `children` array of the same type
```

### Extensions

Array, Map, Set prototype extensions. Activated by `import "@simplysm/core-common"`.

#### Array extension methods

**Query**:

| Method | Description |
|--------|------|
| `single(predicate?)` | Return single element (error if 2+) |
| `first(predicate?)` | Return first element |
| `last(predicate?)` | Return last element |

**Filtering**:

| Method | Description |
|--------|------|
| `filterExists()` | Remove `null`/`undefined` |
| `ofType(type)` | Filter by type (`PrimitiveTypeStr` or constructor) |
| `filterAsync(predicate)` | Async filter |

**Mapping/Transformation**:

| Method | Description |
|--------|------|
| `mapAsync(selector)` | Async mapping (sequential execution) |
| `mapMany(selector?)` | flat + filterExists |
| `mapManyAsync(selector?)` | Async mapMany |
| `parallelAsync(fn)` | Parallel async mapping (`Promise.all`) |

**Grouping/Transformation**:

| Method | Description |
|--------|------|
| `groupBy(keySelector, valueSelector?)` | Group by key |
| `toMap(keySelector, valueSelector?)` | Convert to Map (error on duplicate key) |
| `toMapAsync(keySelector, valueSelector?)` | Async Map conversion |
| `toArrayMap(keySelector, valueSelector?)` | Convert to `Map<K, V[]>` |
| `toSetMap(keySelector, valueSelector?)` | Convert to `Map<K, Set<V>>` |
| `toMapValues(keySelector, valueSelector)` | Aggregate Map by group |
| `toObject(keySelector, valueSelector?)` | Convert to `Record<string, V>` |
| `toTree(key, parentKey)` | Convert to tree structure |

**Deduplication**:

| Method | Description |
|--------|------|
| `distinct(options?)` | Remove duplicates (return new array) |
| `distinctThis(options?)` | Remove duplicates (modify original) |

**Sorting**:

| Method | Description |
|--------|------|
| `orderBy(selector?)` | Ascending sort (return new array) |
| `orderByDesc(selector?)` | Descending sort (return new array) |
| `orderByThis(selector?)` | Ascending sort (modify original) |
| `orderByDescThis(selector?)` | Descending sort (modify original) |

**Comparison/Merging**:

| Method | Description |
|--------|------|
| `diffs(target, options?)` | Compare differences between two arrays |
| `oneWayDiffs(orgItems, keyProp, options?)` | One-way diff comparison (create/update/same) |
| `merge(target, options?)` | Merge arrays |

**Aggregation**:

| Method | Description |
|--------|------|
| `sum(selector?)` | Sum |
| `min(selector?)` | Minimum |
| `max(selector?)` | Maximum |

**Mutation (modify original)**:

| Method | Description |
|--------|------|
| `insert(index, ...items)` | Insert at specific position |
| `remove(itemOrSelector)` | Remove item |
| `toggle(item)` | Remove if exists, add if not |
| `clear()` | Remove all items |
| `shuffle()` | Shuffle (return new array) |

```typescript
import "@simplysm/core-common";

const users = [
  { id: 1, name: "Alice", dept: "dev" },
  { id: 2, name: "Bob", dept: "dev" },
  { id: 3, name: "Charlie", dept: "hr" },
];

// Query
users.single((u) => u.id === 1);       // { id: 1, ... }
users.first();                           // { id: 1, ... }
users.last();                            // { id: 3, ... }

// Grouping
users.groupBy((u) => u.dept);
// [{ key: "dev", values: [...] }, { key: "hr", values: [...] }]

// Map conversion
users.toMap((u) => u.id);               // Map<number, User>
users.toArrayMap((u) => u.dept);         // Map<string, User[]>

// Sorting
users.orderBy((u) => u.name);
users.orderByDesc((u) => u.id);

// Filtering
[1, null, 2, undefined, 3].filterExists(); // [1, 2, 3]

// Deduplication
[1, 2, 2, 3, 3].distinct(); // [1, 2, 3]

// Async mapping (sequential execution)
await ids.mapAsync(async (id) => await fetchUser(id));

// Parallel async mapping
await ids.parallelAsync(async (id) => await fetchUser(id));
```

#### Map extension methods

| Method | Description |
|--------|------|
| `getOrCreate(key, value)` | If key doesn't exist, set new value and return |
| `update(key, updateFn)` | Update value for key using function |

```typescript
const map = new Map<string, number[]>();

// Create and return if value doesn't exist
const arr = map.getOrCreate("key", []);
arr.push(1);

// Create with factory function (when computation is expensive)
map.getOrCreate("key2", () => expensiveComputation());

// Update value
const countMap = new Map<string, number>();
countMap.update("key", (v) => (v ?? 0) + 1); // Increment counter
```

#### Set extension methods

| Method | Description |
|--------|------|
| `adds(...values)` | Add multiple values at once |
| `toggle(value, addOrDel?)` | Toggle value (remove if exists, add if not) |

```typescript
const set = new Set<number>([1, 2, 3]);

set.adds(4, 5, 6);       // {1, 2, 3, 4, 5, 6}
set.toggle(2);            // 2 exists so remove -> {1, 3, 4, 5, 6}
set.toggle(7);            // 7 doesn't exist so add -> {1, 3, 4, 5, 6, 7}
set.toggle(8, "add");     // Force add
set.toggle(1, "del");     // Force delete
```

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
