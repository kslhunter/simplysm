import { ArgumentError } from "../errors/argument-error";
import { formatDate, normalizeMonth } from "../utils/date-format";

/**
 * Date class (without time: yyyy-MM-dd, immutable)
 *
 * An immutable class that stores only the date without time information.
 * Operates based on local timezone.
 *
 * @example
 * const today = new DateOnly();
 * const specific = new DateOnly(2025, 1, 15);
 * const parsed = DateOnly.parse("2025-01-15");
 */
export class DateOnly {
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  readonly date: Date;

  /** Current time */
  constructor();
  /** Initialize with year, month, day */
  constructor(year: number, month: number, day: number);
  /** Create from tick (millisecond) */
  constructor(tick: number);
  /** Create from Date type */
  constructor(date: Date);
  constructor(arg1?: number | Date, arg2?: number, arg3?: number) {
    if (arg1 === undefined) {
      const tick = Date.now();
      const date = new Date(tick);
      this.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    } else if (arg2 !== undefined && arg3 !== undefined) {
      this.date = new Date(arg1 as number, arg2 - 1, arg3);
    } else if (arg1 instanceof Date) {
      const date = arg1;
      this.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    } else {
      const date = new Date(arg1);
      this.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
  }

  /**
   * Parse a string into DateOnly
   * @param str Date string
   * @returns DateOnly instance
   *
   * Supported formats:
   * - `yyyy-MM-dd` (e.g., '2024-01-15') - Extracted directly from string, timezone-independent
   * - `yyyyMMdd` (e.g., '20240115') - Extracted directly from string, timezone-independent
   * - ISO 8601 (e.g., '2024-01-15T00:00:00Z') - Interpreted as UTC, then converted to local timezone
   *
   * @note For different server/client timezones, `yyyy-MM-dd` format is recommended
   * @note For DST regions when parsing ISO 8601 format, the offset of the parsing target date is used.
   */
  static parse(str: string): DateOnly {
    // yyyy-MM-dd format (timezone-independent)
    const matchYMD = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (matchYMD != null) {
      return new DateOnly(Number(matchYMD[1]), Number(matchYMD[2]), Number(matchYMD[3]));
    }

    // yyyyMMdd format (timezone-independent)
    const matchCompact = /^(\d{4})(\d{2})(\d{2})$/.exec(str);
    if (matchCompact != null) {
      return new DateOnly(
        Number(matchCompact[1]),
        Number(matchCompact[2]),
        Number(matchCompact[3]),
      );
    }

    // ISO 8601 and other formats (using Date.parse, timezone conversion applied)
    // Date.parse() returns UTC tick for ISO 8601 with 'Z' suffix
    // getTimezoneOffset() returns "minutes to add when converting from local to UTC" (KST is -540 = UTC+9)
    // Here we do "UTC → local" conversion, so apply opposite sign (subtraction)
    // Use the offset of the parsing target date for accurate conversion in DST regions
    const utcTick = Date.parse(str);
    if (!Number.isNaN(utcTick)) {
      const tempDate = new Date(utcTick);
      const offsetMinutes = tempDate.getTimezoneOffset();
      const localTick = utcTick - offsetMinutes * 60 * 1000;
      return new DateOnly(localTick);
    }

    throw new ArgumentError(
      `Failed to parse date format. Supported formats: 'yyyy-MM-dd', 'yyyyMMdd', ISO 8601 date`,
      {
        input: str,
      },
    );
  }

  //#region Week calculation

  /**
   * Return the base year and month based on week information
   * @param weekStartDay Week start day (0=Sunday, 1=Monday, ..., 6=Saturday). Default: 1(Monday)
   * @param minDaysInFirstWeek Minimum days to be considered the first week (1~7). Default: 4 (ISO 8601 standard)
   * @returns Base year and month of the week containing this date
   *
   * @example
   * // ISO 8601 standard (Monday start, first week minimum 4 days)
   * new DateOnly(2024, 1, 1).getBaseYearMonthSeqForWeekSeq(1, 4)
   * // US style (Sunday start, first week minimum 1 day)
   * new DateOnly(2024, 1, 1).getBaseYearMonthSeqForWeekSeq(0, 1)
   */
  getBaseYearMonthSeqForWeekSeq(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    // Calculate day of week index based on week start day (0 = week start day)
    const dayOfWeek = (this.dayOfWeek + 7 - weekStartDay) % 7;
    // Remaining days in the current week (including current date)
    const daysInWeek = 7 - dayOfWeek;

    // If remaining days in current week is less than minimum, consider as previous week
    if (daysInWeek < minDaysInFirstWeek) {
      const prevWeek = this.addDays(-7);
      return { year: prevWeek.year, monthSeq: prevWeek.month };
    } else {
      // Calculate actual remaining days of the week considering month boundary
      const nextMonthDate = this.addMonths(1).setDay(1);
      const remainedDays = (nextMonthDate.tick - this.tick) / DateOnly.MS_PER_DAY;

      // Take the smaller of actual days to month boundary and week remaining days
      const realDaysInWeek = Math.min(daysInWeek, remainedDays);
      // If still less than minimum when considering month boundary, consider as next week
      if (realDaysInWeek < minDaysInFirstWeek) {
        const nextWeek = this.addDays(7);
        return { year: nextWeek.year, monthSeq: nextWeek.month };
      } else {
        return { year: this.year, monthSeq: this.month };
      }
    }
  }

  /**
   * Calculate the start date of the week based on week information
   * @param weekStartDay Week start day (0=Sunday, 1=Monday, ..., 6=Saturday). Default: 1(Monday)
   * @param minDaysInFirstWeek Minimum days to be considered the first week (1~7). Default: 4 (ISO 8601 standard)
   * @returns Start date of the week containing this date
   */
  getWeekSeqStartDate(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    const dayOfWeek = (this.dayOfWeek + 7 - weekStartDay) % 7;
    const daysInFirstWeek = 7 - dayOfWeek;

    if (daysInFirstWeek < minDaysInFirstWeek) {
      return this.addDays(-dayOfWeek + 7);
    } else {
      return this.addDays(-dayOfWeek);
    }
  }

  /**
   * Return year and week sequence information
   * @param weekStartDay Week start day (0=Sunday, 1=Monday, ..., 6=Saturday). Default: 1(Monday)
   * @param minDaysInFirstWeek Minimum days to be considered the first week (1~7). Default: 4 (ISO 8601 standard)
   * @returns Year and week number within that year
   *
   * @example
   * // ISO 8601 standard (Monday start, first week minimum 4 days)
   * new DateOnly(2025, 1, 6).getWeekSeqOfYear(); // { year: 2025, weekSeq: 2 }
   *
   * // US style (Sunday start, first week minimum 1 day)
   * new DateOnly(2025, 1, 1).getWeekSeqOfYear(0, 1); // { year: 2025, weekSeq: 1 }
   */
  getWeekSeqOfYear(
    weekStartDay: number = 1,
    minDaysInFirstWeek: number = 4,
  ): { year: number; weekSeq: number } {
    const base = this.getBaseYearMonthSeqForWeekSeq(weekStartDay, minDaysInFirstWeek);

    const firstWeekStart = new DateOnly(base.year, 1, 1).getWeekSeqStartDate(
      weekStartDay,
      minDaysInFirstWeek,
    );

    const diffDays = (this.tick - firstWeekStart.tick) / DateOnly.MS_PER_DAY;
    return {
      year: base.year,
      weekSeq: Math.floor(diffDays / 7) + 1,
    };
  }

  /**
   * Return year, month and week sequence information for the given date
   * @param weekStartDay Week start day (0=Sunday, 1=Monday, ..., 6=Saturday). Default: 1(Monday)
   * @param minDaysInFirstWeek Minimum days to be considered the first week (1~7). Default: 4 (ISO 8601 standard)
   * @returns Year, month and week number within that month
   *
   * @example
   * // ISO 8601 standard (Monday start, first week minimum 4 days)
   * new DateOnly(2025, 1, 15).getWeekSeqOfMonth(); // { year: 2025, monthSeq: 1, weekSeq: 3 }
   *
   * // US style (Sunday start, first week minimum 1 day)
   * new DateOnly(2025, 1, 15).getWeekSeqOfMonth(0, 1); // { year: 2025, monthSeq: 1, weekSeq: 3 }
   */
  getWeekSeqOfMonth(
    weekStartDay: number = 1,
    minDaysInFirstWeek: number = 4,
  ): { year: number; monthSeq: number; weekSeq: number } {
    const base = this.getBaseYearMonthSeqForWeekSeq(weekStartDay, minDaysInFirstWeek);

    const firstWeekStart = new DateOnly(base.year, base.monthSeq, 1).getWeekSeqStartDate(
      weekStartDay,
      minDaysInFirstWeek,
    );

    const diffDays = (this.tick - firstWeekStart.tick) / DateOnly.MS_PER_DAY;
    return {
      year: base.year,
      monthSeq: base.monthSeq,
      weekSeq: Math.floor(diffDays / 7) + 1,
    };
  }

  /**
   * Get the start date of a week based on week information
   * @param arg Year, optional month, and week number
   * @param weekStartDay Week start day (0=Sunday, 1=Monday, ..., 6=Saturday). Default: 1(Monday)
   * @param minDaysInFirstWeek Minimum days to be considered the first week (1~7). Default: 4 (ISO 8601 standard)
   * @returns Start date of the specified week
   *
   * @example
   * // Start date of week 2 in 2025 (ISO 8601 standard)
   * DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 }); // 2025-01-06 (Monday)
   *
   * // Start date of week 3 in January 2025
   * DateOnly.getDateByYearWeekSeq({ year: 2025, month: 1, weekSeq: 3 }); // 2025-01-13 (Monday)
   */
  static getDateByYearWeekSeq(
    arg: { year: number; month?: number; weekSeq: number },
    weekStartDay: number = 1,
    minDaysInFirstWeek: number = 4,
  ) {
    return new DateOnly(arg.year, arg.month ?? 1, (arg.weekSeq - 1) * 7 + 1).getWeekSeqStartDate(
      weekStartDay,
      minDaysInFirstWeek,
    );
  }

  //#endregion

  //#region Getters (read-only)

  /** Whether the date is set correctly */
  get isValid(): boolean {
    return this.date instanceof Date && !Number.isNaN(this.date.getTime());
  }

  get year(): number {
    return this.date.getFullYear();
  }

  get month(): number {
    return this.date.getMonth() + 1;
  }

  get day(): number {
    return this.date.getDate();
  }

  get tick(): number {
    return this.date.getTime();
  }

  /** Day of week (Sunday~Saturday: 0~6) */
  get dayOfWeek(): number {
    return this.date.getDay();
  }

  //#endregion

  //#region Immutable transformation methods (returns new instance)

  /** Return new instance with specified year */
  setYear(year: number): DateOnly {
    return new DateOnly(year, this.month, this.day);
  }

  /**
   * Return new DateOnly instance with specified month
   * @param month Month to set (1-12, out-of-range values are adjusted in year)
   * @note If current day is greater than target month's day count, it will be adjusted to last day of month
   *       (e.g., setMonth(2) on Jan 31 → Feb 28 or 29)
   */
  setMonth(month: number): DateOnly {
    const normalized = normalizeMonth(this.year, month, this.day);
    return new DateOnly(normalized.year, normalized.month, normalized.day);
  }

  /**
   * Return new DateOnly instance with specified day
   * @param day Day to set
   * @note Days outside valid month range are automatically adjusted to next/previous month per JavaScript Date behavior
   *       (e.g., day=32 in January → February 1)
   */
  setDay(day: number): DateOnly {
    return new DateOnly(this.year, this.month, day);
  }

  //#endregion

  //#region Arithmetic methods (returns new instance)

  /** Return new instance with specified years added */
  addYears(years: number): DateOnly {
    return this.setYear(this.year + years);
  }

  /** Return new instance with specified months added */
  addMonths(months: number): DateOnly {
    return this.setMonth(this.month + months);
  }

  /** Return new instance with specified days added */
  addDays(days: number): DateOnly {
    return new DateOnly(this.tick + days * DateOnly.MS_PER_DAY);
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
    });
  }

  toString(): string {
    return this.toFormatString("yyyy-MM-dd");
  }

  //#endregion
}
