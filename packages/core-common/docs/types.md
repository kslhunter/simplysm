# Types

## Errors

Custom error classes. All are based on `SdError` and support cause chaining.

### SdError

Base error class with cause chain tracking and automatic nested stack integration.

```typescript
import { SdError } from "@simplysm/core-common";

// Track errors with cause chain
try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API call failed", "Failed to load user");
  // Result message: "Failed to load user => API call failed => original error message"
}
```

### ArgumentError

Argument validation error with YAML formatting.

```typescript
import { ArgumentError } from "@simplysm/core-common";

throw new ArgumentError("Invalid user", { userId: 123 });
// Result message: "Invalid user\n\nuserId: 123"
```

### NotImplementedError

Indicates unimplemented functionality.

```typescript
import { NotImplementedError } from "@simplysm/core-common";

switch (type) {
  case "A": return handleA();
  case "B": throw new NotImplementedError(`Handling type ${type}`);
}
```

### TimeoutError

Timeout error.

```typescript
import { TimeoutError } from "@simplysm/core-common";

throw new TimeoutError(5, "API response wait exceeded");
// Result message: "Wait time exceeded(5): API response wait exceeded"
```

---

## Custom Types

Immutable custom type classes. All transformation methods return new instances.

### DateTime

Date + time (millisecond precision, local timezone).

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

### DateOnly

Date only (no time).

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

### Time

Time only (no date, 24-hour cycle).

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

### Uuid

UUID v4 (based on `crypto.getRandomValues`).

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

### LazyGcMap

Map with auto-expiration (LRU style).

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

---

## Type Utilities

TypeScript utility types.

### Bytes

Alias for `Uint8Array` (`Buffer` replacement).

```typescript
import type { Bytes } from "@simplysm/core-common";

const data: Bytes = new Uint8Array([1, 2, 3]);
```

### PrimitiveTypeStr

Primitive type string keys.

```typescript
type PrimitiveTypeStr = "string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes";
```

### PrimitiveTypeMap

Mapping from `PrimitiveTypeStr` to actual type.

```typescript
type PrimitiveTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  DateTime: DateTime;
  DateOnly: DateOnly;
  Time: Time;
  Uuid: Uuid;
  Bytes: Bytes;
};
```

### PrimitiveType

Union of all Primitive types.

```typescript
type PrimitiveType = string | number | boolean | DateTime | DateOnly | Time | Uuid | Bytes;
```

### DeepPartial

Recursively convert all properties to optional.

```typescript
import type { DeepPartial } from "@simplysm/core-common";

interface Config {
  db: { host: string; port: number };
}
const partial: DeepPartial<Config> = { db: { host: "localhost" } };
```

### Type

Constructor type (for dependency injection, factory patterns).

```typescript
import type { Type } from "@simplysm/core-common";

function create<T>(ctor: Type<T>): T {
  return new ctor();
}
```

### ObjUndefToOptional

Convert properties with `undefined` to optional.

```typescript
import type { ObjUndefToOptional } from "@simplysm/core-common";

type Input = { a: string; b: number | undefined };
type Output = ObjUndefToOptional<Input>; // { a: string; b?: number }
```

### ObjOptionalToUndef

Convert optional properties to `required + undefined` union.

```typescript
import type { ObjOptionalToUndef } from "@simplysm/core-common";

type Input = { a: string; b?: number };
type Output = ObjOptionalToUndef<Input>; // { a: string; b: number | undefined }
```

### ArrayDiffsResult

Result of `Array.diffs()` — insert / delete / update entries.

```typescript
import type { ArrayDiffsResult } from "@simplysm/core-common";

const diffs: ArrayDiffsResult<User, User>[] = oldUsers.diffs(newUsers, { keys: ["id"] });
for (const diff of diffs) {
  if (diff.source === undefined) { /* INSERT */ }
  else if (diff.target === undefined) { /* DELETE */ }
  else { /* UPDATE */ }
}
```

### ArrayDiffs2Result

Result of `Array.oneWayDiffs()` — create / update / same entries.

```typescript
import type { ArrayDiffs2Result } from "@simplysm/core-common";
```

### TreeArray

Result of `Array.toTree()` — `T & { children: TreeArray<T>[] }`.

```typescript
import type { TreeArray } from "@simplysm/core-common";

interface Category { id: number; parentId: number | undefined; name: string }
const tree: TreeArray<Category>[] = categories.toTree("id", "parentId");
// Each node has a `children` array of the same type
```
