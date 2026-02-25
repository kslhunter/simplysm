/**
 * Result of year/month/day normalization when setting month
 */
export interface DtNormalizedMonth {
  year: number;
  month: number;
  day: number;
}

/**
 * Normalize year/month/day when setting month
 * - Adjust year if month is outside 1-12 range
 * - Adjust to last day of target month if current day is greater than the number of days in the target month
 *
 * @param year Base year
 * @param month Month to set (values outside 1-12 range allowed)
 * @param day Base day
 * @returns Normalized year, month, day
 *
 * @example
 * normalizeMonth(2025, 13, 15) // { year: 2026, month: 1, day: 15 }
 * normalizeMonth(2025, 2, 31)  // { year: 2025, month: 2, day: 28 }
 */
export function normalizeMonth(year: number, month: number, day: number): DtNormalizedMonth {
  // Normalize month overflow/underflow
  // Adjust year if month is outside 1-12 range
  const normalizedYear = year + Math.floor((month - 1) / 12);
  // JavaScript % operator returns negative for negative, so use (% 12 + 12) % 12 pattern to ensure 0-11 range, then convert to 1-12
  const normalizedMonth = ((((month - 1) % 12) + 12) % 12) + 1;

  // Get last day of target month
  const lastDay = new Date(normalizedYear, normalizedMonth, 0).getDate();
  const normalizedDay = Math.min(day, lastDay);

  return { year: normalizedYear, month: normalizedMonth, day: normalizedDay };
}

/**
 * Convert 12-hour format to 24-hour format
 * - 12:00 AM = 0:00, 12:00 PM = 12:00
 * - 1-11 AM = 1-11, 1-11 PM = 13-23
 *
 * @param rawHour 12-hour format hour (1-12)
 * @param isPM Whether PM
 * @returns 24-hour format hour (0-23)
 */
export function convert12To24(rawHour: number, isPM: boolean): number {
  if (rawHour === 12) {
    return isPM ? 12 : 0;
  }
  return isPM ? rawHour + 12 : rawHour;
}

//#region Regex caching (created once at module load)

/**
 * Format pattern regex
 *
 * Order is important:
 * In the dtFormat() function, longer patterns (yyyy, MM, dd, etc.) must be processed first
 * to prevent shorter patterns (y, M, d, etc.) from being partially matched.
 * Example: If "yyyy" is not processed first, "yy" may be matched twice
 */
const patterns = {
  yyyy: /yyyy/g,
  yy: /yy/g,
  MM: /MM/g,
  M: /M/g,
  ddd: /ddd/g,
  dd: /dd/g,
  d: /d/g,
  tt: /tt/g,
  hh: /hh/g,
  h: /h/g,
  HH: /HH/g,
  H: /H/g,
  mm: /mm/g,
  m: /m/g,
  ss: /ss/g,
  s: /s/g,
  fff: /fff/g,
  ff: /ff/g,
  f: /f/g,
  zzz: /zzz/g,
  zz: /zz/g,
  z: /z/g,
};

const weekStrings = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

//#endregion

/**
 * Convert date/time to string according to format string
 *
 * @param formatString Format string
 * @param args Date/time components
 *
 * @remarks
 * Supports the same format strings as C#:
 *
 * | Format | Description | Example |
 * |--------|-------------|---------|
 * | yyyy | 4-digit year | 2024 |
 * | yy | 2-digit year | 24 |
 * | MM | Zero-padded month | 01~12 |
 * | M | Month | 1~12 |
 * | ddd | Day of week | Sun, Mon, Tue, Wed, Thu, Fri, Sat |
 * | dd | Zero-padded day | 01~31 |
 * | d | Day | 1~31 |
 * | tt | AM/PM | AM, PM |
 * | hh | Zero-padded 12-hour | 01~12 |
 * | h | 12-hour | 1~12 |
 * | HH | Zero-padded 24-hour | 00~23 |
 * | H | 24-hour | 0~23 |
 * | mm | Zero-padded minute | 00~59 |
 * | m | Minute | 0~59 |
 * | ss | Zero-padded second | 00~59 |
 * | s | Second | 0~59 |
 * | fff | Milliseconds (3 digits) | 000~999 |
 * | ff | Milliseconds (2 digits) | 00~99 |
 * | f | Milliseconds (1 digit) | 0~9 |
 * | zzz | Timezone offset (±HH:mm) | +09:00 |
 * | zz | Timezone offset (±HH) | +09 |
 * | z | Timezone offset (±H) | +9 |
 *
 * @example
 * ```typescript
 * formatDate("yyyy-MM-dd", { year: 2024, month: 3, day: 15 });
 * // "2024-03-15"
 *
 * formatDate("yyyy-M-d (ddd)", { year: 2024, month: 3, day: 15 });
 * // "2024-3-15 (Fri)"
 *
 * formatDate("tt h:mm:ss", { hour: 14, minute: 30, second: 45 });
 * // "PM 2:30:45"
 * ```
 */
export function formatDate(
  formatString: string,
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
): string {
  const { year, month, day, hour, minute, second, millisecond, timezoneOffsetMinutes } = args;

  const absOffsetMinutes =
    timezoneOffsetMinutes !== undefined ? Math.abs(timezoneOffsetMinutes) : undefined;
  const offsetHour = absOffsetMinutes !== undefined ? Math.floor(absOffsetMinutes / 60) : undefined;
  const offsetMinute = absOffsetMinutes !== undefined ? absOffsetMinutes % 60 : undefined;
  const offsetSign =
    timezoneOffsetMinutes !== undefined ? (timezoneOffsetMinutes >= 0 ? "+" : "-") : undefined;

  const week =
    year !== undefined && month !== undefined && day !== undefined
      ? new Date(year, month - 1, day).getDay()
      : undefined;

  let result = formatString;

  // Year
  if (year !== undefined) {
    const yearStr = year.toString();
    result = result.replace(patterns.yyyy, yearStr);
    result = result.replace(patterns.yy, yearStr.substring(2, 4));
  }

  // Month
  if (month !== undefined) {
    const monthStr = month.toString();
    result = result.replace(patterns.MM, monthStr.padStart(2, "0"));
    result = result.replace(patterns.M, monthStr);
  }

  // Day of week
  if (week !== undefined) {
    result = result.replace(patterns.ddd, weekStrings[week]);
  }

  // Day
  if (day !== undefined) {
    const dayStr = day.toString();
    result = result.replace(patterns.dd, dayStr.padStart(2, "0"));
    result = result.replace(patterns.d, dayStr);
  }

  // Hour
  if (hour !== undefined) {
    result = result.replace(patterns.tt, hour < 12 ? "AM" : "PM");

    const hour12 = hour % 12 || 12;
    const hour12Str = hour12.toString();
    result = result.replace(patterns.hh, hour12Str.padStart(2, "0"));
    result = result.replace(patterns.h, hour12Str);

    const hourStr = hour.toString();
    result = result.replace(patterns.HH, hourStr.padStart(2, "0"));
    result = result.replace(patterns.H, hourStr);
  }

  // Minute
  if (minute !== undefined) {
    const minuteStr = minute.toString();
    result = result.replace(patterns.mm, minuteStr.padStart(2, "0"));
    result = result.replace(patterns.m, minuteStr);
  }

  // Second
  if (second !== undefined) {
    const secondStr = second.toString();
    result = result.replace(patterns.ss, secondStr.padStart(2, "0"));
    result = result.replace(patterns.s, secondStr);
  }

  // Millisecond
  if (millisecond !== undefined) {
    const msStr = millisecond.toString().padStart(3, "0");
    result = result.replace(patterns.fff, msStr);
    result = result.replace(patterns.ff, msStr.substring(0, 2));
    result = result.replace(patterns.f, msStr.substring(0, 1));
  }

  // Timezone
  if (offsetSign !== undefined && offsetHour !== undefined && offsetMinute !== undefined) {
    result = result.replace(
      patterns.zzz,
      `${offsetSign}${offsetHour.toString().padStart(2, "0")}:${offsetMinute.toString().padStart(2, "0")}`,
    );
    result = result.replace(patterns.zz, `${offsetSign}${offsetHour.toString().padStart(2, "0")}`);
    result = result.replace(patterns.z, `${offsetSign}${offsetHour}`);
  }

  return result;
}
