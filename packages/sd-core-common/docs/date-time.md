# Date & Time Types

Three immutable-style date/time classes that wrap the native `Date` object (or a tick value) and provide 1-based month indexing, arithmetic, formatting, and week-sequence calculation.

All "setter" methods (`setYear`, `addMonths`, etc.) return a **new instance** -- the original is not mutated.

## DateOnly

Date without time component (`yyyy-MM-dd`).

### Constructors

```ts
new DateOnly()                                // current date
new DateOnly(year: number, month: number, day: number)
new DateOnly(tick: number)                    // millisecond tick
new DateOnly(date: Date)                      // from native Date
```

### Static Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `parse` | `static parse(str: string): DateOnly` | Parse from string. Supports ISO 8601 dates and `yyyyMMdd` format. Throws `ArgumentError` on failure. |
| `getDateByYearWeekSeq` | `static getDateByYearWeekSeq(arg: { year: number; month?: number; weekSeq: number }, weekStartDay?: number, minDaysInFirstWeek?: number): DateOnly` | Get the start date of a given year/month + week-sequence number. |

### Properties

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `date` | `Date` | readonly | Underlying native Date. |
| `year` | `number` | get/set | Year. |
| `month` | `number` | get/set | Month, 1-based. |
| `day` | `number` | get/set | Day of month. |
| `tick` | `number` | get/set | Millisecond timestamp. Setting snaps to start of day. |
| `week` | `number` | get | Day of week, 0=Sunday .. 6=Saturday. |
| `isValidDate` | `boolean` | get | Whether the internal Date is valid (not NaN). |

### Instance Methods

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `setYear` | `setYear(year: number)` | `DateOnly` | New instance with given year. |
| `setMonth` | `setMonth(month: number)` | `DateOnly` | New instance with given month. Clamps day to last day of target month. Handles overflow/underflow (e.g., month 13 becomes January of next year). |
| `setDay` | `setDay(day: number)` | `DateOnly` | New instance with given day. |
| `addYears` | `addYears(years: number)` | `DateOnly` | Add years. |
| `addMonths` | `addMonths(months: number)` | `DateOnly` | Add months. |
| `addDays` | `addDays(days: number)` | `DateOnly` | Add days. |
| `toFormatString` | `toFormatString(format: string)` | `string` | Format using C#-style tokens (see [Format Tokens](#format-tokens)). |
| `toString` | `toString()` | `string` | Returns `yyyy-MM-dd`. |
| `getBaseYearMonthSeqForWeekSeq` | `getBaseYearMonthSeqForWeekSeq(weekStartDay?: number, minDaysInFirstWeek?: number)` | `{ year: number; monthSeq: number }` | Base year and month for week-sequence calculation. Default: `weekStartDay=1` (Monday), `minDaysInFirstWeek=4`. |
| `getWeekSeqStartDate` | `getWeekSeqStartDate(weekStartDay?: number, minDaysInFirstWeek?: number)` | `DateOnly` | Start date of the week this date belongs to. |
| `getWeekSeqOfYear` | `getWeekSeqOfYear(weekStartDay?: number, minDaysInFirstWeek?: number)` | `{ year: number; weekSeq: number }` | Year and week-of-year number (1-based). |
| `getWeekSeqOfMonth` | `getWeekSeqOfMonth(weekStartDay?: number, minDaysInFirstWeek?: number)` | `{ year: number; monthSeq: number; weekSeq: number }` | Year, month, and week-of-month number (1-based). |

---

## DateTime

Full date and time with millisecond precision.

### Constructors

```ts
new DateTime()                                // current date+time
new DateTime(year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number)
new DateTime(tick: number)                    // millisecond tick
new DateTime(date: Date)                      // from native Date
```

### Static Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `parse` | `static parse(str: string): DateTime` | Parse from string. Supports ISO 8601, `yyyy-MM-dd HH:mm:ss[.fff]`, `yyyyMMddHHmmss`, and Korean AM/PM format (`yyyy-MM-dd [AM/PM] HH:mm:ss`). Throws `ArgumentError` on failure. |

### Properties

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `date` | `Date` | readonly | Underlying native Date. |
| `year` | `number` | get/set | Year. |
| `month` | `number` | get/set | Month, 1-based. |
| `day` | `number` | get/set | Day of month. |
| `hour` | `number` | get/set | Hour, 0-23. |
| `minute` | `number` | get/set | Minute. |
| `second` | `number` | get/set | Second. |
| `millisecond` | `number` | get/set | Millisecond. |
| `tick` | `number` | get/set | Millisecond timestamp. |
| `week` | `number` | get | Day of week, 0=Sunday .. 6=Saturday. |
| `timezoneOffsetMinutes` | `number` | get | Local timezone offset in minutes (positive = east of UTC). |

### Instance Methods

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `setYear` | `setYear(year: number)` | `DateTime` | New instance with given year. |
| `setMonth` | `setMonth(month: number)` | `DateTime` | New instance with given month. Clamps day to last day of target month. Handles overflow/underflow. |
| `setDay` | `setDay(day: number)` | `DateTime` | New instance with given day. |
| `setHour` | `setHour(hour: number)` | `DateTime` | New instance with given hour. |
| `setMinute` | `setMinute(minute: number)` | `DateTime` | New instance with given minute. |
| `setSecond` | `setSecond(second: number)` | `DateTime` | New instance with given second. |
| `setMillisecond` | `setMillisecond(millisecond: number)` | `DateTime` | New instance with given millisecond. |
| `addYears` | `addYears(years: number)` | `DateTime` | Add years. |
| `addMonths` | `addMonths(months: number)` | `DateTime` | Add months. |
| `addDays` | `addDays(days: number)` | `DateTime` | Add days. |
| `addHours` | `addHours(hours: number)` | `DateTime` | Add hours. |
| `addMinutes` | `addMinutes(minutes: number)` | `DateTime` | Add minutes. |
| `addSeconds` | `addSeconds(seconds: number)` | `DateTime` | Add seconds. |
| `addMilliseconds` | `addMilliseconds(milliseconds: number)` | `DateTime` | Add milliseconds. |
| `toFormatString` | `toFormatString(format: string)` | `string` | Format using C#-style tokens (see [Format Tokens](#format-tokens)). |
| `toString` | `toString()` | `string` | Returns ISO-like `yyyy-MM-ddTHH:mm:ss.fffzzz`. |

---

## Time

Time-of-day only, with millisecond precision (`HH:mm:ss.fff`). Internally stored as a tick count within a 24-hour range (0 to 86,399,999 ms).

### Constructors

```ts
new Time()                                    // current time
new Time(hour: number, minute: number, second?: number, millisecond?: number)
new Time(tick: number)                        // tick within 24h (ms)
new Time(date: Date)                          // extract time from Date
```

### Static Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `parse` | `static parse(str: string): Time` | Parse from string. Supports `HH:mm:ss[.fff]`, Korean AM/PM format (`[AM/PM] HH:mm:ss[.fff]`), and falls back to `DateTime.parse` extracting the time component. Throws `ArgumentError` on failure. |

### Properties

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `hour` | `number` | get/set | Hour, 0-23. |
| `minute` | `number` | get/set | Minute. |
| `second` | `number` | get/set | Second. |
| `millisecond` | `number` | get/set | Millisecond. |
| `tick` | `number` | get/set | Tick within 24h in milliseconds. Automatically wraps at 24-hour boundary. |

### Instance Methods

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `setHour` | `setHour(hour: number)` | `Time` | New instance with given hour. |
| `setMinute` | `setMinute(minute: number)` | `Time` | New instance with given minute. |
| `setSecond` | `setSecond(second: number)` | `Time` | New instance with given second. |
| `setMillisecond` | `setMillisecond(millisecond: number)` | `Time` | New instance with given millisecond. |
| `addHours` | `addHours(hours: number)` | `Time` | Add hours (wraps at 24h boundary). |
| `addMinutes` | `addMinutes(minutes: number)` | `Time` | Add minutes. |
| `addSeconds` | `addSeconds(seconds: number)` | `Time` | Add seconds. |
| `addMilliseconds` | `addMilliseconds(milliseconds: number)` | `Time` | Add milliseconds. |
| `toFormatString` | `toFormatString(format: string)` | `string` | Format using C#-style tokens. |
| `toString` | `toString()` | `string` | Returns `HH:mm:ss.fff`. |

---

## DateTimeFormatUtils

Static utility class used internally by `DateOnly`, `DateTime`, and `Time` for formatting. Can also be called directly.

```ts
class DateTimeFormatUtils {
  static format(
    format: string,
    args: {
      year?: number;
      month?: number;
      day?: number;
      hour?: number;
      minute?: number;
      second?: number;
      millisecond?: number;
      timezoneOffsetMinutes?: number;
    },
  ): string;
}
```

### Example

```ts
DateTimeFormatUtils.format("yyyy/MM/dd", { year: 2026, month: 3, day: 13 });
// "2026/03/13"
```

## Format Tokens

Used by `toFormatString()` on all three classes. Follows [C# custom date/time format strings](https://docs.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings).

| Token | Output | Example |
|-------|--------|---------|
| `yyyy` | 4-digit year | `2026` |
| `yy` | 2-digit year | `26` |
| `MM` | Zero-padded month | `03` |
| `M` | Month | `3` |
| `ddd` | Day of week (Korean) | `금` |
| `dd` | Zero-padded day | `13` |
| `d` | Day | `13` |
| `tt` | AM/PM (Korean) | `오전` / `오후` |
| `HH` | Zero-padded 24h hour | `09` |
| `H` | 24h hour | `9` |
| `hh` | Zero-padded 12h hour | `09` |
| `h` | 12h hour | `9` |
| `mm` | Zero-padded minute | `05` |
| `m` | Minute | `5` |
| `ss` | Zero-padded second | `07` |
| `s` | Second | `7` |
| `fff` | 3-digit millisecond | `042` |
| `ff` | 2-digit millisecond | `04` |
| `f` | 1-digit millisecond | `0` |
| `zzz` | Timezone offset `+HH:mm` | `+09:00` |
| `zz` | Timezone offset `+HH` | `+09` |
| `z` | Timezone offset `+H` | `+9` |
