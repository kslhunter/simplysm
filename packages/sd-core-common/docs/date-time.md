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

| Method | Description |
|---|---|
| `DateOnly.parse(str)` | Parse from string. Supports ISO 8601 dates and `yyyyMMdd` format. |
| `DateOnly.getDateByYearWeekSeq(arg, weekStartDay?, minDaysInFirstWeek?)` | Get the start date of a given year/month + week-sequence number. |

### Properties

| Property | Type | Description |
|---|---|---|
| `date` | `Date` | Underlying native Date (readonly). |
| `year` | `number` | Year (get/set). |
| `month` | `number` | Month, 1-based (get/set). |
| `day` | `number` | Day of month (get/set). |
| `tick` | `number` | Millisecond timestamp (get/set). |
| `week` | `number` | Day of week, 0=Sunday .. 6=Saturday (readonly). |
| `isValidDate` | `boolean` | Whether the internal Date is valid (readonly). |

### Instance Methods

| Method | Returns | Description |
|---|---|---|
| `setYear(year)` | `DateOnly` | New instance with given year. |
| `setMonth(month)` | `DateOnly` | New instance with given month. Clamps day to last day of target month. |
| `setDay(day)` | `DateOnly` | New instance with given day. |
| `addYears(years)` | `DateOnly` | Add years. |
| `addMonths(months)` | `DateOnly` | Add months. |
| `addDays(days)` | `DateOnly` | Add days. |
| `toFormatString(format)` | `string` | Format using C#-style tokens (see [Format Tokens](#format-tokens)). |
| `toString()` | `string` | Returns `yyyy-MM-dd`. |
| `getBaseYearMonthSeqForWeekSeq(weekStartDay?, minDaysInFirstWeek?)` | `{ year, monthSeq }` | Base year and month for week-sequence calculation. |
| `getWeekSeqStartDate(weekStartDay?, minDaysInFirstWeek?)` | `DateOnly` | Start date of the week this date belongs to. |
| `getWeekSeqOfYear(weekStartDay?, minDaysInFirstWeek?)` | `{ year, weekSeq }` | Year and week-of-year number (1-based). |
| `getWeekSeqOfMonth(weekStartDay?, minDaysInFirstWeek?)` | `{ year, monthSeq, weekSeq }` | Year, month, and week-of-month number (1-based). |

---

## DateTime

Full date and time with millisecond precision.

### Constructors

```ts
new DateTime()                                // current date+time
new DateTime(year, month, day, hour?, minute?, second?, millisecond?)
new DateTime(tick: number)                    // millisecond tick
new DateTime(date: Date)                      // from native Date
```

### Static Methods

| Method | Description |
|---|---|
| `DateTime.parse(str)` | Parse from string. Supports ISO 8601, `yyyy-MM-dd HH:mm:ss[.fff]`, `yyyyMMddHHmmss`, and Korean AM/PM format. |

### Properties

| Property | Type | Description |
|---|---|---|
| `date` | `Date` | Underlying native Date (readonly). |
| `year` | `number` | Year (get/set). |
| `month` | `number` | Month, 1-based (get/set). |
| `day` | `number` | Day (get/set). |
| `hour` | `number` | Hour, 0-23 (get/set). |
| `minute` | `number` | Minute (get/set). |
| `second` | `number` | Second (get/set). |
| `millisecond` | `number` | Millisecond (get/set). |
| `tick` | `number` | Millisecond timestamp (get/set). |
| `week` | `number` | Day of week (readonly). |
| `timezoneOffsetMinutes` | `number` | Local timezone offset in minutes (readonly). |

### Instance Methods

| Method | Returns | Description |
|---|---|---|
| `setYear(year)` | `DateTime` | New instance with given year. |
| `setMonth(month)` | `DateTime` | New instance with given month. Clamps day to last day of target month. |
| `setDay(day)` | `DateTime` | New instance with given day. |
| `setHour(hour)` | `DateTime` | New instance with given hour. |
| `setMinute(minute)` | `DateTime` | New instance with given minute. |
| `setSecond(second)` | `DateTime` | New instance with given second. |
| `setMillisecond(ms)` | `DateTime` | New instance with given millisecond. |
| `addYears(n)` | `DateTime` | Add years. |
| `addMonths(n)` | `DateTime` | Add months. |
| `addDays(n)` | `DateTime` | Add days. |
| `addHours(n)` | `DateTime` | Add hours. |
| `addMinutes(n)` | `DateTime` | Add minutes. |
| `addSeconds(n)` | `DateTime` | Add seconds. |
| `addMilliseconds(n)` | `DateTime` | Add milliseconds. |
| `toFormatString(format)` | `string` | Format using C#-style tokens (see [Format Tokens](#format-tokens)). |
| `toString()` | `string` | Returns ISO-like `yyyy-MM-ddTHH:mm:ss.fffzzz`. |

---

## Time

Time-of-day only, with millisecond precision (`HH:mm:ss.fff`). Internally stored as a tick count within a 24-hour range.

### Constructors

```ts
new Time()                                    // current time
new Time(hour: number, minute: number, second?: number, millisecond?: number)
new Time(tick: number)                        // tick within 24h (ms)
new Time(date: Date)                          // extract time from Date
```

### Static Methods

| Method | Description |
|---|---|
| `Time.parse(str)` | Parse from string. Supports `HH:mm:ss[.fff]` and Korean AM/PM format. |

### Properties

| Property | Type | Description |
|---|---|---|
| `hour` | `number` | Hour, 0-23 (get/set). |
| `minute` | `number` | Minute (get/set). |
| `second` | `number` | Second (get/set). |
| `millisecond` | `number` | Millisecond (get/set). |
| `tick` | `number` | Tick within 24h in milliseconds (get/set). |

### Instance Methods

| Method | Returns | Description |
|---|---|---|
| `setHour(hour)` | `Time` | New instance with given hour. |
| `setMinute(minute)` | `Time` | New instance with given minute. |
| `setSecond(second)` | `Time` | New instance with given second. |
| `setMillisecond(ms)` | `Time` | New instance with given millisecond. |
| `addHours(n)` | `Time` | Add hours (wraps at 24h boundary). |
| `addMinutes(n)` | `Time` | Add minutes. |
| `addSeconds(n)` | `Time` | Add seconds. |
| `addMilliseconds(n)` | `Time` | Add milliseconds. |
| `toFormatString(format)` | `string` | Format using C#-style tokens. |
| `toString()` | `string` | Returns `HH:mm:ss.fff`. |

---

## Format Tokens

Used by `toFormatString()` on all three classes. Follows [C# custom date/time format strings](https://docs.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings).

| Token | Output | Example |
|---|---|---|
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

### DateTimeFormatUtils

The static class `DateTimeFormatUtils` is used internally by all three types. It can also be called directly:

```ts
DateTimeFormatUtils.format("yyyy/MM/dd", { year: 2026, month: 3, day: 13 });
// "2026/03/13"
```
