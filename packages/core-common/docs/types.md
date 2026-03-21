# Types

Data types and common type definitions.

Source: `src/types/*.ts`, `src/common.types.ts`, `src/env.ts`

---

## `Uuid`

UUID v4 class. Generates cryptographically secure UUIDs based on `crypto.getRandomValues` (Chrome 79+, Node.js compatible).

```typescript
export class Uuid {
  /** Create new UUID v4 instance */
  static generate(): Uuid;

  /**
   * Create UUID from 16-byte Uint8Array
   * @throws {ArgumentError} If byte size is not 16
   */
  static fromBytes(bytes: Bytes): Uuid;

  /**
   * @param uuid UUID string (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
   * @throws {ArgumentError} If format is invalid
   */
  constructor(uuid: string);

  /** Convert UUID to string */
  toString(): string;

  /** Convert UUID to 16-byte Uint8Array */
  toBytes(): Bytes;
}
```

---

## `DateTime`

Immutable date+time class wrapping JavaScript `Date`. Supports millisecond precision and operates based on local timezone.

```typescript
export class DateTime {
  readonly date: Date;

  /** Create with current time */
  constructor();
  /** Create with year, month, day, hour, minute, second, millisecond */
  constructor(year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number);
  /** Create from tick (millisecond) */
  constructor(tick: number);
  /** Create from Date object */
  constructor(date: Date);

  /**
   * Parse a string to create DateTime instance
   * Supported formats: 'yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd HH:mm:ss.fff', 'yyyyMMddHHmmss',
   *   'yyyy-MM-dd AM/PM HH:mm:ss', Korean AM/PM (오전/오후), ISO 8601
   * @throws ArgumentError If unsupported format
   */
  static parse(str: string): DateTime;
}
```

**Getters** (read-only): `year`, `month`, `day`, `hour`, `minute`, `second`, `millisecond`, `tick`, `dayOfWeek` (0=Sunday), `timezoneOffsetMinutes`, `isValid`

**Immutable setters** (return new instance): `setYear(year)`, `setMonth(month)`, `setDay(day)`, `setHour(hour)`, `setMinute(minute)`, `setSecond(second)`, `setMillisecond(millisecond)`

**Arithmetic** (return new instance): `addYears(n)`, `addMonths(n)`, `addDays(n)`, `addHours(n)`, `addMinutes(n)`, `addSeconds(n)`, `addMilliseconds(n)`

**Formatting**: `toFormatString(formatStr)`, `toString()` (default: `"yyyy-MM-ddTHH:mm:ss.fffzzz"`)

---

## `DateOnly`

Immutable date class (without time: `yyyy-MM-dd`). Operates based on local timezone.

```typescript
export class DateOnly {
  readonly date: Date;

  /** Current date */
  constructor();
  /** Initialize with year, month, day */
  constructor(year: number, month: number, day: number);
  /** Create from tick (millisecond) */
  constructor(tick: number);
  /** Create from Date type */
  constructor(date: Date);

  /**
   * Parse a string into DateOnly
   * Supported formats: 'yyyy-MM-dd', 'yyyyMMdd', ISO 8601
   */
  static parse(str: string): DateOnly;

  /**
   * Get the start date of a week based on week information
   */
  static getDateByYearWeekSeq(
    arg: { year: number; month?: number; weekSeq: number },
    weekStartDay?: number,
    minDaysInFirstWeek?: number,
  ): DateOnly;
}
```

**Getters** (read-only): `year`, `month`, `day`, `tick`, `dayOfWeek`, `isValid`

**Immutable setters**: `setYear(year)`, `setMonth(month)`, `setDay(day)`

**Arithmetic**: `addYears(n)`, `addMonths(n)`, `addDays(n)`

**Week calculation methods**:

```typescript
getBaseYearMonthSeqForWeekSeq(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; monthSeq: number };
getWeekSeqStartDate(weekStartDay?: number, minDaysInFirstWeek?: number): DateOnly;
getWeekSeqOfYear(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; weekSeq: number };
getWeekSeqOfMonth(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; monthSeq: number; weekSeq: number };
```

Defaults: `weekStartDay = 1` (Monday), `minDaysInFirstWeek = 4` (ISO 8601 standard).

**Formatting**: `toFormatString(formatStr)`, `toString()` (default: `"yyyy-MM-dd"`)

---

## `Time`

Immutable time class (without date: `HH:mm:ss.fff`). Values exceeding 24 hours or negative values are automatically normalized (24-hour wraparound).

```typescript
export class Time {
  /** Create with current time */
  constructor();
  /** Create with hour, minute, second, millisecond */
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  /** Create from tick (millisecond) */
  constructor(tick: number);
  /** Create by extracting time part only from Date object */
  constructor(date: Date);

  /**
   * Parse a string to create Time instance
   * Supported formats: 'HH:mm:ss', 'HH:mm:ss.fff', 'AM/PM HH:mm:ss', ISO 8601 (extract time part)
   * @throws ArgumentError If unsupported format
   */
  static parse(str: string): Time;
}
```

**Getters**: `hour`, `minute`, `second`, `millisecond`, `tick`, `isValid`

**Immutable setters**: `setHour(hour)`, `setMinute(minute)`, `setSecond(second)`, `setMillisecond(millisecond)`

**Arithmetic** (24-hour wraparound): `addHours(n)`, `addMinutes(n)`, `addSeconds(n)`, `addMilliseconds(n)`

**Formatting**: `toFormatString(formatStr)`, `toString()` (default: `"HH:mm:ss.fff"`)

---

## `LazyGcMap`

Map with automatic expiration feature. Updates access time in LRU manner; auto-deletes if not accessed for specified time. Supports the `using` statement (`Symbol.dispose`).

```typescript
export class LazyGcMap<TKey, TValue> {
  /**
   * @param options.gcInterval GC interval in ms. Default: 1/10 of expireTime (minimum 1000ms)
   * @param options.expireTime Expiration time in ms since last access
   * @param options.onExpire Callback called on expiration (can be async)
   */
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

**Example:**

```typescript
using map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 });
map.set("session", data);
const val = map.getOrCreate("key", () => computeExpensive());
```

---

## `Bytes`

Binary type alias used instead of `Buffer`.

```typescript
export type Bytes = Uint8Array;
```

---

## `PrimitiveTypeMap`

Primitive type mapping shared with orm-common.

```typescript
export type PrimitiveTypeMap = {
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

---

## `PrimitiveTypeStr`

```typescript
export type PrimitiveTypeStr = keyof PrimitiveTypeMap;
```

---

## `PrimitiveType`

```typescript
export type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;
```

---

## `DeepPartial<T>`

Recursively makes all properties of an object optional. Primitive types are kept as-is.

```typescript
export type DeepPartial<TObject> = Partial<{
  [K in keyof TObject]: TObject[K] extends PrimitiveType ? TObject[K] : DeepPartial<TObject[K]>;
}>;
```

---

## `Type<T>`

Constructor type used for dependency injection, factory patterns, and `instanceof` checks.

```typescript
export interface Type<TInstance> extends Function {
  new (...args: unknown[]): TInstance;
}
```

---

## `env`

Unified environment variable accessor. Merges `import.meta.env` and `process.env`. `DEV` is parsed as boolean, `VER` as optional string.

```typescript
export const env: {
  DEV: boolean;
  VER?: string;
  [key: string]: unknown;
};
```
