import { ArgumentError } from "../errors/argument-error";
import { convert12To24, formatDate, normalizeMonth } from "../utils/date-format";

/**
 * DateTime class (immutable)
 *
 * Wraps JavaScript Date object to provide immutability and convenient API.
 * Supports millisecond precision and operates based on local timezone.
 *
 * @example
 * const now = new DateTime();
 * const specific = new DateTime(2025, 1, 15, 10, 30, 0);
 * const parsed = DateTime.parse("2025-01-15 10:30:00");
 */
export class DateTime {
  readonly date: Date;

  /** Create with current time */
  constructor();
  /** Create with year, month, day, hour, minute, second, millisecond */
  constructor(
    year: number,
    month: number,
    day: number,
    hour?: number,
    minute?: number,
    second?: number,
    millisecond?: number,
  );
  /** Create from tick (millisecond) */
  constructor(tick: number);
  /** Create from Date object */
  constructor(date: Date);
  constructor(
    arg1?: number | Date,
    arg2?: number,
    arg3?: number,
    arg4?: number,
    arg5?: number,
    arg6?: number,
    arg7?: number,
  ) {
    if (arg1 === undefined) {
      this.date = new Date();
    } else if (arg2 !== undefined && arg3 !== undefined) {
      this.date = new Date(
        arg1 as number,
        arg2 - 1,
        arg3,
        arg4 ?? 0,
        arg5 ?? 0,
        arg6 ?? 0,
        arg7 ?? 0,
      );
    } else if (arg1 instanceof Date) {
      this.date = new Date(arg1.getTime());
    } else {
      this.date = new Date(arg1);
    }
  }

  /**
   * Parse a string to create DateTime instance
   *
   * @param str DateTime string
   * @returns Parsed DateTime instance
   * @throws ArgumentError If unsupported format
   *
   * @example
   * DateTime.parse("2025-01-15 10:30:00")     // yyyy-MM-dd HH:mm:ss
   * DateTime.parse("2025-01-15 10:30:00.123") // yyyy-MM-dd HH:mm:ss.fff
   * DateTime.parse("20250115103000")          // yyyyMMddHHmmss
   * DateTime.parse("2025-01-15 AM 10:30:00")  // yyyy-MM-dd AM/PM HH:mm:ss
   * DateTime.parse("2025-01-15T10:30:00Z")    // ISO 8601
   */
  static parse(str: string): DateTime {
    const parsedTick = Date.parse(str);
    if (!Number.isNaN(parsedTick)) {
      return new DateTime(parsedTick);
    }

    const match1 =
      /^([0-9]{4})-([0-9]{2})-([0-9]{2}) (AM|PM) ([0-9]{1,2}):([0-9]{2}):([0-9]{2})(\.([0-9]{1,3}))?$/i.exec(
        str,
      );
    if (match1 != null) {
      const rawHour = Number(match1[5]);
      const isPM = match1[4].toUpperCase() === "PM";
      const hour = convert12To24(rawHour, isPM);
      return new DateTime(
        Number(match1[1]),
        Number(match1[2]),
        Number(match1[3]),
        hour,
        Number(match1[6]),
        Number(match1[7]),
        match1[9] ? Number(match1[9].padEnd(3, "0")) : undefined,
      );
    }

    // Korean AM/PM format (오전/오후)
    const matchKorean =
      /^([0-9]{4})-([0-9]{2})-([0-9]{2}) (오전|오후) ([0-9]{1,2}):([0-9]{2}):([0-9]{2})(\.([0-9]{1,3}))?$/.exec(
        str,
      );
    if (matchKorean != null) {
      const rawHour = Number(matchKorean[5]);
      const isPM = matchKorean[4] === "오후";
      const hour = convert12To24(rawHour, isPM);
      return new DateTime(
        Number(matchKorean[1]),
        Number(matchKorean[2]),
        Number(matchKorean[3]),
        hour,
        Number(matchKorean[6]),
        Number(matchKorean[7]),
        matchKorean[9] ? Number(matchKorean[9].padEnd(3, "0")) : undefined,
      );
    }

    const match2 = /^[0-9]{14}$/.exec(str);
    if (match2 != null) {
      return new DateTime(
        Number(str.substring(0, 4)),
        Number(str.substring(4, 6)),
        Number(str.substring(6, 8)),
        Number(str.substring(8, 10)),
        Number(str.substring(10, 12)),
        Number(str.substring(12, 14)),
      );
    }

    const match3 =
      /^([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})(\.([0-9]{1,3}))?$/.exec(
        str,
      );
    if (match3 != null) {
      return new DateTime(
        Number(match3[1]),
        Number(match3[2]),
        Number(match3[3]),
        Number(match3[4]),
        Number(match3[5]),
        Number(match3[6]),
        match3[8] ? Number(match3[8].padEnd(3, "0")) : undefined,
      );
    }

    throw new ArgumentError(
      `Failed to parse datetime format. Supported formats: 'yyyy-MM-dd HH:mm:ss', 'yyyyMMddHHmmss', 'yyyy-MM-dd AM/PM HH:mm:ss', ISO 8601`,
      { input: str },
    );
  }

  //#region Getters (read-only)

  get year(): number {
    return this.date.getFullYear();
  }

  get month(): number {
    return this.date.getMonth() + 1;
  }

  get day(): number {
    return this.date.getDate();
  }

  get hour(): number {
    return this.date.getHours();
  }

  get minute(): number {
    return this.date.getMinutes();
  }

  get second(): number {
    return this.date.getSeconds();
  }

  get millisecond(): number {
    return this.date.getMilliseconds();
  }

  get tick(): number {
    return this.date.getTime();
  }

  /** Day of week (Sunday~Saturday: 0~6) */
  get dayOfWeek(): number {
    return this.date.getDay();
  }

  get timezoneOffsetMinutes(): number {
    return -this.date.getTimezoneOffset();
  }

  /** Whether the datetime is set correctly */
  get isValid(): boolean {
    return this.date instanceof Date && !Number.isNaN(this.date.getTime());
  }

  //#endregion

  //#region Immutable transformation methods (returns new instance)

  /** Return new instance with specified year */
  setYear(year: number): DateTime {
    return new DateTime(
      year,
      this.month,
      this.day,
      this.hour,
      this.minute,
      this.second,
      this.millisecond,
    );
  }

  /**
   * Return new DateTime instance with specified month
   * @param month Month to set (1-12, out-of-range values are adjusted in year)
   * @note If current day is greater than target month's day count, it will be adjusted to last day of month
   *       (e.g., setMonth(2) on Jan 31 → Feb 28 or 29)
   */
  setMonth(month: number): DateTime {
    const normalized = normalizeMonth(this.year, month, this.day);
    return new DateTime(
      normalized.year,
      normalized.month,
      normalized.day,
      this.hour,
      this.minute,
      this.second,
      this.millisecond,
    );
  }

  /**
   * Return new DateTime instance with specified day
   * @param day Day to set
   * @note Days outside valid month range are automatically adjusted to next/previous month per JavaScript Date behavior
   *       (e.g., day=32 in January → February 1)
   */
  setDay(day: number): DateTime {
    return new DateTime(
      this.year,
      this.month,
      day,
      this.hour,
      this.minute,
      this.second,
      this.millisecond,
    );
  }

  /** Return new instance with specified hour */
  setHour(hour: number): DateTime {
    return new DateTime(
      this.year,
      this.month,
      this.day,
      hour,
      this.minute,
      this.second,
      this.millisecond,
    );
  }

  /** Return new instance with specified minute */
  setMinute(minute: number): DateTime {
    return new DateTime(
      this.year,
      this.month,
      this.day,
      this.hour,
      minute,
      this.second,
      this.millisecond,
    );
  }

  /** Return new instance with specified second */
  setSecond(second: number): DateTime {
    return new DateTime(
      this.year,
      this.month,
      this.day,
      this.hour,
      this.minute,
      second,
      this.millisecond,
    );
  }

  /** Return new instance with specified millisecond */
  setMillisecond(millisecond: number): DateTime {
    return new DateTime(
      this.year,
      this.month,
      this.day,
      this.hour,
      this.minute,
      this.second,
      millisecond,
    );
  }

  //#endregion

  //#region Arithmetic methods (returns new instance)

  /** Return new instance with specified years added */
  addYears(years: number): DateTime {
    return this.setYear(this.year + years);
  }

  /** Return new instance with specified months added */
  addMonths(months: number): DateTime {
    return this.setMonth(this.month + months);
  }

  /** Return new instance with specified days added */
  addDays(days: number): DateTime {
    return new DateTime(this.tick + days * 24 * 60 * 60 * 1000);
  }

  /** Return new instance with specified hours added */
  addHours(hours: number): DateTime {
    return new DateTime(this.tick + hours * 60 * 60 * 1000);
  }

  /** Return new instance with specified minutes added */
  addMinutes(minutes: number): DateTime {
    return new DateTime(this.tick + minutes * 60 * 1000);
  }

  /** Return new instance with specified seconds added */
  addSeconds(seconds: number): DateTime {
    return new DateTime(this.tick + seconds * 1000);
  }

  /** Return new instance with specified milliseconds added */
  addMilliseconds(milliseconds: number): DateTime {
    return new DateTime(this.tick + milliseconds);
  }

  //#endregion

  //#region Formatting

  /**
   * Convert to string with specified format
   * @param format Format string
   * @see dtFormat for supported format strings
   */
  toFormatString(formatStr: string): string {
    return formatDate(formatStr, {
      year: this.year,
      month: this.month,
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      second: this.second,
      millisecond: this.millisecond,
      timezoneOffsetMinutes: this.timezoneOffsetMinutes,
    });
  }

  toString(): string {
    return this.toFormatString("yyyy-MM-ddTHH:mm:ss.fffzzz");
  }

  //#endregion
}
