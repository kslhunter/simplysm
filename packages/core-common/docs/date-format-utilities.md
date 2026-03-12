# Date Format Utilities

Imported as the `dt` namespace. C#-style date/time formatting and month normalization.

```typescript
import { dt } from "@simplysm/core-common";
```

## format

```typescript
function format(formatString: string, args: {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
  timezoneOffsetMinutes?: number;
}): string;
```

Converts date/time components to a string using a C#-compatible format string.

| Format | Description | Example |
|--------|-------------|---------|
| `yyyy` | 4-digit year | 2024 |
| `yy` | 2-digit year | 24 |
| `MM` | Zero-padded month | 01-12 |
| `M` | Month | 1-12 |
| `ddd` | Day of week (Korean) | Sun, Mon, ... |
| `dd` | Zero-padded day | 01-31 |
| `d` | Day | 1-31 |
| `tt` | AM/PM | AM, PM |
| `hh` | Zero-padded 12-hour | 01-12 |
| `h` | 12-hour | 1-12 |
| `HH` | Zero-padded 24-hour | 00-23 |
| `H` | 24-hour | 0-23 |
| `mm` | Zero-padded minute | 00-59 |
| `m` | Minute | 0-59 |
| `ss` | Zero-padded second | 00-59 |
| `s` | Second | 0-59 |
| `fff` | Milliseconds (3 digits) | 000-999 |
| `ff` | Milliseconds (2 digits) | 00-99 |
| `f` | Milliseconds (1 digit) | 0-9 |
| `zzz` | Timezone offset | +09:00 |
| `zz` | Timezone offset | +09 |
| `z` | Timezone offset | +9 |

---

## normalizeMonth

```typescript
function normalizeMonth(year: number, month: number, day: number): {
  year: number;
  month: number;
  day: number;
};
```

Normalizes year/month/day when month is outside 1-12 range. Adjusts day to last day of month if needed (e.g., Jan 31 + setMonth(2) = Feb 28).

---

## convert12To24

```typescript
function convert12To24(rawHour: number, isPM: boolean): number;
```

Converts 12-hour format to 24-hour format. `12 AM = 0`, `12 PM = 12`.

---

## Usage Examples

```typescript
import { dt } from "@simplysm/core-common";

dt.format("yyyy-MM-dd", { year: 2024, month: 3, day: 15 });
// "2024-03-15"

dt.format("tt h:mm:ss", { hour: 14, minute: 30, second: 45 });
// "PM 2:30:45"

dt.normalizeMonth(2025, 13, 15);
// { year: 2026, month: 1, day: 15 }

dt.normalizeMonth(2025, 2, 31);
// { year: 2025, month: 2, day: 28 }

dt.convert12To24(12, false); // 0 (12 AM)
dt.convert12To24(12, true);  // 12 (12 PM)
```
