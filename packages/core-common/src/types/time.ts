import { ArgumentError } from "../errors/argument-error";
import { convert12To24, formatDate } from "../utils/date-format";

/**
 * Time class (without date: HH:mm:ss.fff, immutable)
 *
 * An immutable class that stores only time without date information.
 * Values exceeding 24 hours or negative values are automatically normalized.
 *
 * @example
 * const now = new Time();
 * const specific = new Time(10, 30, 0);
 * const parsed = Time.parse("10:30:00");
 */
export class Time {
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  private readonly _tick: number;

  /** Create with current time */
  constructor();
  /** Create with hour, minute, second, millisecond */
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  /** Create from tick (millisecond) */
  constructor(tick: number);
  /** Create by extracting time part only from Date object */
  constructor(date: Date);
  constructor(arg1?: number | Date, arg2?: number, arg3?: number, arg4?: number) {
    if (arg1 === undefined) {
      const now = new Date();
      this._tick =
        (now.getMilliseconds() +
          now.getSeconds() * 1000 +
          now.getMinutes() * 60 * 1000 +
          now.getHours() * 60 * 60 * 1000) %
        Time.MS_PER_DAY;
    } else if (arg2 !== undefined) {
      let tick =
        ((arg4 ?? 0) + (arg3 ?? 0) * 1000 + arg2 * 60 * 1000 + (arg1 as number) * 60 * 60 * 1000) %
        Time.MS_PER_DAY;
      if (tick < 0) tick += Time.MS_PER_DAY;
      this._tick = tick;
    } else if (arg1 instanceof Date) {
      this._tick =
        (arg1.getMilliseconds() +
          arg1.getSeconds() * 1000 +
          arg1.getMinutes() * 60 * 1000 +
          arg1.getHours() * 60 * 60 * 1000) %
        Time.MS_PER_DAY;
    } else {
      let tick = arg1 % Time.MS_PER_DAY;
      if (tick < 0) tick += Time.MS_PER_DAY;
      this._tick = tick;
    }
  }

  /**
   * Parse a string to create Time instance
   *
   * @param str Time string
   * @returns Parsed Time instance
   * @throws ArgumentError If unsupported format
   *
   * @example
   * Time.parse("10:30:00")           // HH:mm:ss
   * Time.parse("10:30:00.123")       // HH:mm:ss.fff
   * Time.parse("오전 10:30:00")       // AM/PM HH:mm:ss
   * Time.parse("2025-01-15T10:30:00") // ISO 8601 (extract time part only)
   */
  static parse(str: string): Time {
    const match1 = /(오전|오후) ([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})(\.([0-9]{1,3}))?$/.exec(str);
    if (match1 != null) {
      const rawHour = Number(match1[2]);
      const isPM = match1[1] === "오후"; // "오후" = PM
      const hour = convert12To24(rawHour, isPM);
      return new Time(
        hour,
        Number(match1[3]),
        Number(match1[4]),
        Number(match1[6] ? match1[6].padEnd(3, "0") : "0"),
      );
    }

    const match2 = /([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})(\.([0-9]{1,3}))?$/.exec(str);
    if (match2 != null) {
      return new Time(
        Number(match2[1]),
        Number(match2[2]),
        Number(match2[3]),
        Number(match2[5] ? match2[5].padEnd(3, "0") : "0"),
      );
    }

    // ISO 8601 format (e.g., 2025-01-15T10:30:00.123Z, 2025-01-15T10:30:00+09:00)
    // Use Date object to handle timezone conversion
    const isoMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.exec(str);
    if (isoMatch != null) {
      const date = new Date(str);
      if (!Number.isNaN(date.getTime())) {
        return new Time(
          date.getHours(),
          date.getMinutes(),
          date.getSeconds(),
          date.getMilliseconds(),
        );
      }
    }

    throw new ArgumentError(
      `Failed to parse time format. Supported formats: 'HH:mm:ss', 'HH:mm:ss.fff', 'AM/PM HH:mm:ss', ISO 8601`,
      { input: str },
    );
  }

  //#region Getters (read-only)

  get hour(): number {
    return Math.floor(this._tick / (60 * 60 * 1000));
  }

  get minute(): number {
    return Math.floor(this._tick / (60 * 1000)) % 60;
  }

  get second(): number {
    return Math.floor(this._tick / 1000) % 60;
  }

  get millisecond(): number {
    return this._tick % 1000;
  }

  get tick(): number {
    return this._tick;
  }

  /** Whether time is set correctly */
  get isValid(): boolean {
    return !Number.isNaN(this._tick);
  }

  //#endregion

  //#region Immutable transformation methods (returns new instance)

  /** Return new instance with specified hour */
  setHour(hour: number): Time {
    return new Time(hour, this.minute, this.second, this.millisecond);
  }

  /** Return new instance with specified minute */
  setMinute(minute: number): Time {
    return new Time(this.hour, minute, this.second, this.millisecond);
  }

  /** Return new instance with specified second */
  setSecond(second: number): Time {
    return new Time(this.hour, this.minute, second, this.millisecond);
  }

  /** Return new instance with specified millisecond */
  setMillisecond(millisecond: number): Time {
    return new Time(this.hour, this.minute, this.second, millisecond);
  }

  //#endregion

  //#region Arithmetic methods (returns new instance)

  /** Return new instance with specified hours added (24-hour wraparound) */
  addHours(hours: number): Time {
    let newTick = (this._tick + hours * 60 * 60 * 1000) % Time.MS_PER_DAY;
    if (newTick < 0) newTick += Time.MS_PER_DAY;
    return new Time(newTick);
  }

  /** Return new instance with specified minutes added (24-hour wraparound) */
  addMinutes(minutes: number): Time {
    let newTick = (this._tick + minutes * 60 * 1000) % Time.MS_PER_DAY;
    if (newTick < 0) newTick += Time.MS_PER_DAY;
    return new Time(newTick);
  }

  /** Return new instance with specified seconds added (24-hour wraparound) */
  addSeconds(seconds: number): Time {
    let newTick = (this._tick + seconds * 1000) % Time.MS_PER_DAY;
    if (newTick < 0) newTick += Time.MS_PER_DAY;
    return new Time(newTick);
  }

  /** Return new instance with specified milliseconds added (24-hour wraparound) */
  addMilliseconds(milliseconds: number): Time {
    let newTick = (this._tick + milliseconds) % Time.MS_PER_DAY;
    if (newTick < 0) newTick += Time.MS_PER_DAY;
    return new Time(newTick);
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
      hour: this.hour,
      minute: this.minute,
      second: this.second,
      millisecond: this.millisecond,
    });
  }

  toString(): string {
    return this.toFormatString("HH:mm:ss.fff");
  }

  //#endregion
}
