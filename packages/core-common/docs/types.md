# Types

Value types provided by `@simplysm/core-common`: `Uuid`, `LazyGcMap`, `DateTime`, `DateOnly`, and `Time`.

---

## `Uuid`

UUID v4 class using `crypto.getRandomValues`.

```typescript
import { Uuid } from "@simplysm/core-common";

const id = Uuid.new();                                // create new UUID v4
const fromStr = new Uuid("550e8400-e29b-41d4-a716-446655440000");
const fromBytes = Uuid.fromBytes(new Uint8Array(16)); // 16-byte array

id.toString(); // "xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx"
id.toBytes();  // Uint8Array (16 bytes)
```

| Member | Description |
|--------|-------------|
| `Uuid.new()` | Creates a new UUID v4 instance |
| `Uuid.fromBytes(bytes)` | Creates from 16-byte `Uint8Array`. Throws `ArgumentError` if not 16 bytes |
| `new Uuid(str)` | Parses UUID string. Throws `ArgumentError` on invalid format |
| `.toString()` | Returns UUID string |
| `.toBytes()` | Returns 16-byte `Uint8Array` |

---

## `LazyGcMap<TKey, TValue>`

A `Map` that automatically expires and removes entries not accessed within a configurable time window.

```typescript
import { LazyGcMap } from "@simplysm/core-common";

// Recommended: using statement (auto-dispose)
await using map = new LazyGcMap({ expireTime: 60_000 });

map.set("key", value);
map.get("key");           // updates last-access time
map.has("key");           // does not update last-access time
map.getOrCreate("key", () => computeValue());
map.delete("key");
map.clear();
map.dispose();            // stop GC timer and clear data
```

| Constructor option | Type | Description |
|--------------------|------|-------------|
| `expireTime` | `number` | Milliseconds since last access before expiry (required) |
| `gcInterval` | `number?` | GC timer interval in ms. Defaults to `expireTime / 10` (min 1000 ms) |
| `onExpire` | `(key, value) => void \| Promise<void>` | Callback on expiry (errors are logged and ignored) |

---

## `DateTime`

Immutable date-time class wrapping JavaScript `Date` with a convenient API. Millisecond precision, local timezone.

```typescript
import { DateTime } from "@simplysm/core-common";

const now  = new DateTime();
const dt   = new DateTime(2025, 1, 15, 10, 30, 0);
const tick = new DateTime(Date.now());
const date = new DateTime(new Date());

DateTime.parse("2025-01-15 10:30:00");       // yyyy-MM-dd HH:mm:ss
DateTime.parse("20250115103000");             // yyyyMMddHHmmss
DateTime.parse("2025-01-15T10:30:00Z");       // ISO 8601
DateTime.parse("2025-01-15 AM 10:30:00");     // AM/PM format
```

| Member | Description |
|--------|-------------|
| `DateTime.parse(str)` | Parses string to `DateTime`. Throws `ArgumentError` on unsupported format |
| `.year / .month / .day` | Date components (month is 1-based) |
| `.hour / .minute / .second / .millisecond` | Time components |
| `.tick` | Milliseconds since Unix epoch |
| `.dayOfWeek` | Day of week (0=Sunday … 6=Saturday) |
| `.timezoneOffsetMinutes` | Local timezone offset in minutes |
| `.isValid` | Whether the date is valid |
| `.setYear/Month/Day/Hour/Minute/Second/Millisecond(n)` | Returns new instance with field replaced |
| `.addYears/Months/Days/Hours/Minutes/Seconds/Milliseconds(n)` | Returns new instance with field added |
| `.toFormatString(fmt)` | Formats using format string (see `formatDate` for tokens) |
| `.toString()` | `"yyyy-MM-ddTHH:mm:ss.fffzzz"` format |

---

## `DateOnly`

Immutable date-only class (no time component). Local timezone.

```typescript
import { DateOnly } from "@simplysm/core-common";

const today   = new DateOnly();
const specific = new DateOnly(2025, 1, 15);
const parsed   = DateOnly.parse("2025-01-15");
const fromTick = new DateOnly(Date.now());

// Week utilities
DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 }); // Monday of week 2
specific.getWeekSeqOfYear();  // { year: 2025, weekSeq: 3 }
specific.getWeekSeqOfMonth(); // { year: 2025, monthSeq: 1, weekSeq: 3 }
```

| Member | Description |
|--------|-------------|
| `DateOnly.parse(str)` | Supports `yyyy-MM-dd`, `yyyyMMdd`, ISO 8601 |
| `DateOnly.getDateByYearWeekSeq(arg, weekStartDay?, minDays?)` | Returns start date of the given week |
| `.year / .month / .day` | Date components (month is 1-based) |
| `.tick` | Milliseconds since Unix epoch (time part stripped) |
| `.dayOfWeek` | Day of week (0=Sunday … 6=Saturday) |
| `.isValid` | Whether the date is valid |
| `.setYear/Month/Day(n)` | Returns new instance with field replaced |
| `.addYears/Months/Days(n)` | Returns new instance with field added |
| `.getBaseYearMonthSeqForWeekSeq(weekStartDay?, minDays?)` | Base year/month for week calculation |
| `.getWeekSeqStartDate(weekStartDay?, minDays?)` | Start date of week containing this date |
| `.getWeekSeqOfYear(weekStartDay?, minDays?)` | `{ year, weekSeq }` within year |
| `.getWeekSeqOfMonth(weekStartDay?, minDays?)` | `{ year, monthSeq, weekSeq }` within month |
| `.toFormatString(fmt)` | Formats using format string |
| `.toString()` | `"yyyy-MM-dd"` format |

---

## `Time`

Immutable time-only class (no date component). Values exceeding 24 hours or negative values are automatically normalized via modulo.

```typescript
import { Time } from "@simplysm/core-common";

const now      = new Time();
const specific = new Time(10, 30, 0);
const parsed   = Time.parse("10:30:00");
const fromDate = new Time(new Date());

Time.parse("10:30:00.123");          // HH:mm:ss.fff
Time.parse("AM 10:30:00");           // AM/PM format
Time.parse("2025-01-15T10:30:00Z"); // ISO 8601 (extracts time part)
```

| Member | Description |
|--------|-------------|
| `Time.parse(str)` | Parses time string. Throws `ArgumentError` on unsupported format |
| `.hour / .minute / .second / .millisecond` | Time components |
| `.tick` | Milliseconds since midnight |
| `.isValid` | Whether the time is valid |
| `.setHour/Minute/Second/Millisecond(n)` | Returns new instance with field replaced |
| `.addHours/Minutes/Seconds/Milliseconds(n)` | Returns new instance with field added (24-hour wrap) |
| `.toFormatString(fmt)` | Formats using format string |
| `.toString()` | `"HH:mm:ss.fff"` format |

---

## TypeScript Type Aliases

### Primitive types

```typescript
import type { Bytes, PrimitiveTypeMap, PrimitiveTypeStr, PrimitiveType } from "@simplysm/core-common";
```

| Type | Description |
|------|-------------|
| `Bytes` | Alias for `Uint8Array` |
| `PrimitiveTypeMap` | Map of type string keys to their TypeScript types (`string`, `number`, `boolean`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Bytes`) |
| `PrimitiveTypeStr` | `keyof PrimitiveTypeMap` — one of the 8 primitive type keys |
| `PrimitiveType` | `PrimitiveTypeMap[PrimitiveTypeStr] | undefined` — any primitive value or undefined |

### Utility types

```typescript
import type { DeepPartial, Type, ObjUndefToOptional, ObjOptionalToUndef, EqualOptions, ObjMergeOptions, ObjMerge3KeyOptions, DtNormalizedMonth } from "@simplysm/core-common";
```

| Type | Description |
|------|-------------|
| `DeepPartial<T>` | Recursively makes all properties optional (primitives kept as-is) |
| `Type<TInstance>` | Constructor type: `new (...args) => TInstance` |
| `ObjUndefToOptional<T>` | Converts `prop: T \| undefined` to `prop?: T \| undefined` |
| `ObjOptionalToUndef<T>` | Converts `prop?: T` to `prop: T \| undefined` |
| `EqualOptions` | Options for `objEqual` |
| `ObjMergeOptions` | Options for `objMerge` |
| `ObjMerge3KeyOptions` | Per-key options for `objMerge3` |
| `DtNormalizedMonth` | Return type of `normalizeMonth`: `{ year, month, day }` |
