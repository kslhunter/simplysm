# Types

## `Uuid`

UUID v4 class. Generates cryptographically secure UUIDs using `crypto.getRandomValues`.

```typescript
class Uuid {
  static generate(): Uuid;
  static fromBytes(bytes: Bytes): Uuid;

  constructor(uuid: string);

  toString(): string;
  toBytes(): Bytes;
}
```

### Static Methods

| Method | Description |
|--------|-------------|
| `generate()` | Create a new random UUID v4 instance |
| `fromBytes(bytes)` | Create UUID from a 16-byte `Uint8Array`. Throws `ArgumentError` if length is not 16. |

### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `toString()` | `string` | UUID string in `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` format |
| `toBytes()` | `Bytes` | 16-byte `Uint8Array` representation |

### Constructor

| Parameter | Type | Description |
|-----------|------|-------------|
| `uuid` | `string` | UUID string. Must match format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. Throws `ArgumentError` if invalid. |

---

## `LazyGcMap<TKey, TValue>`

Auto-expiring Map with LRU-style access tracking. Items are automatically deleted after the configured expire time if not accessed. Must be disposed after use to stop the GC timer.

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

### Constructor Options

| Option | Type | Description |
|--------|------|-------------|
| `gcInterval` | `number \| undefined` | GC check interval in ms. Default: `expireTime / 10` (min 1000ms). |
| `expireTime` | `number` | Time in ms after last access before an item is expired. |
| `onExpire` | `(key, value) => void \| Promise<void>` | Callback invoked when an item expires. Errors are logged, not thrown. |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `size` | `number` | Number of stored items |
| `has(key)` | `boolean` | Check if key exists (does not refresh access time) |
| `get(key)` | `TValue \| undefined` | Get value and refresh access time (LRU) |
| `set(key, value)` | `void` | Store value and start GC timer if needed |
| `delete(key)` | `boolean` | Remove item. Stops GC timer if map becomes empty. |
| `clear()` | `void` | Remove all items (instance remains usable) |
| `getOrCreate(key, factory)` | `TValue` | Get existing value or create via factory, store, and return. Throws if disposed. |
| `values()` | `IterableIterator<TValue>` | Iterate over values |
| `keys()` | `IterableIterator<TKey>` | Iterate over keys |
| `entries()` | `IterableIterator<[TKey, TValue]>` | Iterate over [key, value] pairs |
| `dispose()` | `void` | Stop GC timer and clear all data |
| `[Symbol.dispose]()` | `void` | Supports `using` statement |

---

## `DateTime`

Immutable date-time class wrapping JavaScript `Date`. Provides millisecond precision and local timezone operation.

```typescript
class DateTime {
  readonly date: Date;

  constructor();
  constructor(year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);

  static parse(str: string): DateTime;

  // Getters
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

  // Immutable setters (return new instance)
  setYear(year: number): DateTime;
  setMonth(month: number): DateTime;
  setDay(day: number): DateTime;
  setHour(hour: number): DateTime;
  setMinute(minute: number): DateTime;
  setSecond(second: number): DateTime;
  setMillisecond(millisecond: number): DateTime;

  // Arithmetic (return new instance)
  addYears(years: number): DateTime;
  addMonths(months: number): DateTime;
  addDays(days: number): DateTime;
  addHours(hours: number): DateTime;
  addMinutes(minutes: number): DateTime;
  addSeconds(seconds: number): DateTime;
  addMilliseconds(milliseconds: number): DateTime;

  // Formatting
  toFormatString(formatStr: string): string;
  toString(): string;
}
```

### Static Methods

| Method | Description |
|--------|-------------|
| `parse(str)` | Parse string to DateTime. Supported formats: `yyyy-MM-dd HH:mm:ss`, `yyyy-MM-dd HH:mm:ss.fff`, `yyyyMMddHHmmss`, `yyyy-MM-dd AM/PM HH:mm:ss`, ISO 8601. Throws `ArgumentError` on failure. |

### Getters

| Property | Type | Description |
|----------|------|-------------|
| `year` | `number` | Full year |
| `month` | `number` | Month (1-12) |
| `day` | `number` | Day of month (1-31) |
| `hour` | `number` | Hour (0-23) |
| `minute` | `number` | Minute (0-59) |
| `second` | `number` | Second (0-59) |
| `millisecond` | `number` | Millisecond (0-999) |
| `tick` | `number` | Milliseconds since epoch |
| `dayOfWeek` | `number` | Day of week (0=Sunday, 6=Saturday) |
| `timezoneOffsetMinutes` | `number` | Local timezone offset in minutes (e.g., +540 for KST) |
| `isValid` | `boolean` | Whether the date is valid |

### Formatting

`toFormatString(formatStr)` uses C#-style format patterns. See `dt.format` in [utilities.md](./utilities.md) for the full pattern table.

`toString()` returns `"yyyy-MM-ddTHH:mm:ss.fffzzz"`.

---

## `DateOnly`

Immutable date-only class (no time component). Local timezone based.

```typescript
class DateOnly {
  readonly date: Date;

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

  // Getters
  get year(): number;
  get month(): number;
  get day(): number;
  get tick(): number;
  get dayOfWeek(): number;
  get isValid(): boolean;

  // Immutable setters
  setYear(year: number): DateOnly;
  setMonth(month: number): DateOnly;
  setDay(day: number): DateOnly;

  // Arithmetic
  addYears(years: number): DateOnly;
  addMonths(months: number): DateOnly;
  addDays(days: number): DateOnly;

  // Week sequence
  getBaseYearMonthSeqForWeekSeq(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; monthSeq: number };
  getWeekSeqStartDate(weekStartDay?: number, minDaysInFirstWeek?: number): DateOnly;
  getWeekSeqOfYear(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; weekSeq: number };
  getWeekSeqOfMonth(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; monthSeq: number; weekSeq: number };

  // Formatting
  toFormatString(formatStr: string): string;
  toString(): string;
}
```

### Static Methods

| Method | Description |
|--------|-------------|
| `parse(str)` | Parse string to DateOnly. Supported formats: `yyyy-MM-dd`, `yyyyMMdd`, ISO 8601. Throws `ArgumentError` on failure. |
| `getDateByYearWeekSeq(arg, weekStartDay?, minDaysInFirstWeek?)` | Get the start date of a given week number within a year or month. |

### Week Sequence Methods

All week methods accept optional parameters:
- `weekStartDay`: 0=Sunday, 1=Monday (default), ..., 6=Saturday
- `minDaysInFirstWeek`: Minimum days for first week (default: 4, ISO 8601)

| Method | Returns | Description |
|--------|---------|-------------|
| `getBaseYearMonthSeqForWeekSeq(...)` | `{ year, monthSeq }` | Base year and month for this date's week |
| `getWeekSeqStartDate(...)` | `DateOnly` | Start date of this date's week |
| `getWeekSeqOfYear(...)` | `{ year, weekSeq }` | Year and week number within that year |
| `getWeekSeqOfMonth(...)` | `{ year, monthSeq, weekSeq }` | Year, month, and week number within that month |

`toString()` returns `"yyyy-MM-dd"`.

---

## `Time`

Immutable time-only class (no date component). Values wrap around 24 hours. Negative values are normalized.

```typescript
class Time {
  constructor();
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);

  static parse(str: string): Time;

  // Getters
  get hour(): number;
  get minute(): number;
  get second(): number;
  get millisecond(): number;
  get tick(): number;
  get isValid(): boolean;

  // Immutable setters
  setHour(hour: number): Time;
  setMinute(minute: number): Time;
  setSecond(second: number): Time;
  setMillisecond(millisecond: number): Time;

  // Arithmetic (24-hour wrapping)
  addHours(hours: number): Time;
  addMinutes(minutes: number): Time;
  addSeconds(seconds: number): Time;
  addMilliseconds(milliseconds: number): Time;

  // Formatting
  toFormatString(formatStr: string): string;
  toString(): string;
}
```

### Static Methods

| Method | Description |
|--------|-------------|
| `parse(str)` | Parse string to Time. Supported formats: `HH:mm:ss`, `HH:mm:ss.fff`, `AM/PM HH:mm:ss`, ISO 8601 (time part extracted). Throws `ArgumentError` on failure. |

### Getters

| Property | Type | Description |
|----------|------|-------------|
| `hour` | `number` | Hour (0-23) |
| `minute` | `number` | Minute (0-59) |
| `second` | `number` | Second (0-59) |
| `millisecond` | `number` | Millisecond (0-999) |
| `tick` | `number` | Total milliseconds from midnight (0 to 86399999) |
| `isValid` | `boolean` | Whether the time is valid |

`toString()` returns `"HH:mm:ss.fff"`.
