# Types

Immutable date/time classes, UUID, auto-expiring map, and shared type aliases.

## DateTime

```typescript
class DateTime {
  constructor();
  constructor(year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);

  static parse(str: string): DateTime;

  readonly date: Date;

  get year(): number;
  get month(): number;
  get day(): number;
  get hour(): number;
  get minute(): number;
  get second(): number;
  get millisecond(): number;
  get tick(): number;
  get dayOfWeek(): number;
  get timezoneOffsetMinutes(): number;
  get isValid(): boolean;

  setYear(year: number): DateTime;
  setMonth(month: number): DateTime;
  setDay(day: number): DateTime;
  setHour(hour: number): DateTime;
  setMinute(minute: number): DateTime;
  setSecond(second: number): DateTime;
  setMillisecond(millisecond: number): DateTime;

  addYears(years: number): DateTime;
  addMonths(months: number): DateTime;
  addDays(days: number): DateTime;
  addHours(hours: number): DateTime;
  addMinutes(minutes: number): DateTime;
  addSeconds(seconds: number): DateTime;
  addMilliseconds(milliseconds: number): DateTime;

  toFormatString(formatStr: string): string;
  toString(): string; // "yyyy-MM-ddTHH:mm:ss.fffzzz"
}
```

Immutable DateTime class wrapping JavaScript `Date`. Supports millisecond precision with local timezone. All setter and add methods return a new instance.

**Parsing formats:** `yyyy-MM-dd HH:mm:ss`, `yyyy-MM-dd HH:mm:ss.fff`, `yyyyMMddHHmmss`, `yyyy-MM-dd AM/PM HH:mm:ss`, ISO 8601.

---

## DateOnly

```typescript
class DateOnly {
  constructor();
  constructor(year: number, month: number, day: number);
  constructor(tick: number);
  constructor(date: Date);

  static parse(str: string): DateOnly;
  static getDateByYearWeekSeq(
    arg: { year: number; month?: number; weekSeq: number },
    weekStartDay?: number,
    minDaysInFirstWeek?: number,
  ): DateOnly;

  readonly date: Date;

  get year(): number;
  get month(): number;
  get day(): number;
  get tick(): number;
  get dayOfWeek(): number;
  get isValid(): boolean;

  setYear(year: number): DateOnly;
  setMonth(month: number): DateOnly;
  setDay(day: number): DateOnly;

  addYears(years: number): DateOnly;
  addMonths(months: number): DateOnly;
  addDays(days: number): DateOnly;

  getBaseYearMonthSeqForWeekSeq(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; monthSeq: number };
  getWeekSeqStartDate(weekStartDay?: number, minDaysInFirstWeek?: number): DateOnly;
  getWeekSeqOfYear(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; weekSeq: number };
  getWeekSeqOfMonth(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; monthSeq: number; weekSeq: number };

  toFormatString(formatStr: string): string;
  toString(): string; // "yyyy-MM-dd"
}
```

Immutable date-only class (no time). Includes ISO 8601 week calculation utilities.

**Parsing formats:** `yyyy-MM-dd`, `yyyyMMdd`, ISO 8601.

---

## Time

```typescript
class Time {
  constructor();
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);

  static parse(str: string): Time;

  get hour(): number;
  get minute(): number;
  get second(): number;
  get millisecond(): number;
  get tick(): number;
  get isValid(): boolean;

  setHour(hour: number): Time;
  setMinute(minute: number): Time;
  setSecond(second: number): Time;
  setMillisecond(millisecond: number): Time;

  addHours(hours: number): Time;
  addMinutes(minutes: number): Time;
  addSeconds(seconds: number): Time;
  addMilliseconds(milliseconds: number): Time;

  toFormatString(formatStr: string): string;
  toString(): string; // "HH:mm:ss.fff"
}
```

Immutable time-only class. Values exceeding 24 hours or negative values are automatically normalized with wraparound.

**Parsing formats:** `HH:mm:ss`, `HH:mm:ss.fff`, `AM/PM HH:mm:ss`, ISO 8601 (time part extracted).

---

## Uuid

```typescript
class Uuid {
  static generate(): Uuid;
  static fromBytes(bytes: Bytes): Uuid;

  constructor(uuid: string);

  toString(): string;
  toBytes(): Bytes;
}
```

UUID v4 class using `crypto.getRandomValues`. Validates format on construction.

---

## LazyGcMap

```typescript
class LazyGcMap<TKey, TValue> {
  constructor(options: {
    gcInterval?: number;
    expireTime: number;
    onExpire?: (key: TKey, value: TValue) => void | Promise<void>;
  });

  get size(): number;

  has(key: TKey): boolean;
  get(key: TKey): TValue | undefined;
  set(key: TKey, value: TValue): void;
  delete(key: TKey): boolean;
  clear(): void;
  getOrCreate(key: TKey, factory: () => TValue): TValue;

  values(): IterableIterator<TValue>;
  keys(): IterableIterator<TKey>;
  entries(): IterableIterator<[TKey, TValue]>;

  dispose(): void;
  [Symbol.dispose](): void;
}
```

A Map with LRU-style automatic expiration. Access time is updated on `get` and `getOrCreate`. Entries not accessed within `expireTime` are automatically removed. Must call `dispose()` or use `using` statement to stop the GC timer.

---

## Type Aliases

```typescript
type Bytes = Uint8Array;

type PrimitiveTypeStr = "string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes";

type PrimitiveType = string | number | boolean | DateTime | DateOnly | Time | Uuid | Bytes | undefined;

type DeepPartial<T> = Partial<{ [K in keyof T]: T[K] extends PrimitiveType ? T[K] : DeepPartial<T[K]> }>;

interface Type<T> extends Function {
  new (...args: unknown[]): T;
}
```

---

## Usage Examples

```typescript
import { DateTime, DateOnly, Time, Uuid, LazyGcMap } from "@simplysm/core-common";

// DateTime
const now = new DateTime();
const specific = new DateTime(2025, 3, 15, 10, 30, 0);
const parsed = DateTime.parse("2025-03-15 10:30:00");
const tomorrow = now.addDays(1);
const formatted = now.toFormatString("yyyy-MM-dd HH:mm");

// DateOnly
const today = new DateOnly();
const week = today.getWeekSeqOfYear(); // { year, weekSeq }

// Time
const time = new Time(14, 30, 0);
const wrapped = time.addHours(12); // wraps around 24h

// Uuid
const id = Uuid.generate();
const bytes = id.toBytes();
const restored = Uuid.fromBytes(bytes);

// LazyGcMap
using cache = new LazyGcMap<string, object>({ expireTime: 60_000 });
cache.set("key", { data: 1 });
const val = cache.getOrCreate("key2", () => ({ data: 2 }));
```
