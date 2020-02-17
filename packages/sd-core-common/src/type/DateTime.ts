import {ArgumentError} from "../error/ArgumentError";
import {DateTimeFormatUtil} from "../util/DateTimeFormatUtil";

export class DateTime {
  public readonly date: Date;

  public constructor();
  public constructor(year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number);
  public constructor(tick: number);
  public constructor(date: Date);
  public constructor(arg1?: number | Date, arg2?: number, arg3?: number, arg4?: number, arg5?: number, arg6?: number, arg7?: number) {
    if (arg1 === undefined) {
      this.date = new Date();
    }
    else if (arg2 !== undefined && arg3 !== undefined) {
      this.date = new Date(arg1 as number, arg2 - 1, arg3 ?? 0, arg4 ?? 0, arg5 ?? 0, arg6 ?? 0, arg7 ?? 0);
    }
    else if (arg1 instanceof Date) {
      this.date = arg1;
    }
    else {
      this.date = new Date(arg1);
    }
  }

  public static parse(str: string): DateTime {
    const parsedTick = Date.parse(str);
    if (parsedTick && !Number.isNaN(parsedTick)) {
      return new DateTime(parsedTick);
    }

    const match1 = str.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2}) (오전|오후) ([0-9]{2}):([0-9]{2}):([0-9]{2})$/);
    if (match1) {
      return new DateTime(
        Number(match1[1]),
        Number(match1[2]),
        Number(match1[3]),
        Number(match1[5]) + (match1[4] === "오후" ? 12 : 0),
        Number(match1[6]),
        Number(match1[7])
      );
    }

    const match2 = str.match(/^[0-9]{14}$/);
    if (match2) {
      return new DateTime(
        Number(str.substr(0, 4)),
        Number(str.substr(4, 2)),
        Number(str.substr(6, 2)),
        Number(str.substr(8, 2)),
        Number(str.substr(10, 2)),
        Number(str.substr(12, 2))
      );
    }

    const match3 = str.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})(\.([0-9]{3}))?$/);
    if (match3) {
      return new DateTime(
        Number(match3[1]),
        Number(match3[2]),
        Number(match3[3]),
        Number(match3[4]),
        Number(match3[5]),
        Number(match3[6]),
        match3[7] ? Number(match3[8]) : undefined
      );
    }

    throw new ArgumentError({str});
  }

  public get year(): number {
    return this.date.getFullYear();
  }

  public set year(value: number) {
    this.date.setFullYear(value);
  }

  public get month(): number {
    return this.date.getMonth() + 1;
  }

  public set month(value: number) {
    this.date.setMonth(value - 1);
  }

  public get day(): number {
    return this.date.getDate();
  }

  public set day(value: number) {
    this.date.setDate(value);
  }

  public get hour(): number {
    return this.date.getHours();
  }

  public set hour(value: number) {
    this.date.setHours(value);
  }

  public get minute(): number {
    return this.date.getMinutes();
  }

  public set minute(value: number) {
    this.date.setMinutes(value);
  }

  public get second(): number {
    return this.date.getSeconds();
  }

  public set second(value: number) {
    this.date.setSeconds(value);
  }

  public get millisecond(): number {
    return this.date.getMilliseconds();
  }

  public set millisecond(value: number) {
    this.date.setMilliseconds(value);
  }

  public get tick(): number {
    return this.date.getTime();
  }

  public set tick(tick: number) {
    this.date.setTime(tick);
  }

  public get week(): number {
    return this.date.getDay();
  }

  public get timezoneOffsetMinutes(): number {
    return -this.date.getTimezoneOffset();
  }

  public setYear(year: number): DateTime {
    return new DateTime(new Date(this.tick).setFullYear(year));
  }

  public setMonth(month: number): DateTime {
    return new DateTime(new Date(this.tick).setMonth(month - 1));
  }

  public setDay(day: number): DateTime {
    return new DateTime(new Date(this.tick).setDate(day));
  }

  public setHour(hour: number): DateTime {
    return new DateTime(new Date(this.tick).setHours(hour));
  }

  public setMinute(minute: number): DateTime {
    return new DateTime(new Date(this.tick).setMinutes(minute));
  }

  public setSecond(second: number): DateTime {
    return new DateTime(new Date(this.tick).setSeconds(second));
  }

  public setMillisecond(millisecond: number): DateTime {
    return new DateTime(new Date(this.tick).setMilliseconds(millisecond));
  }

  public addYears(years: number): DateTime {
    return this.setYear(this.year + years);
  }

  public addMonths(months: number): DateTime {
    return this.setMonth(this.month + months);
  }

  public addDays(days: number): DateTime {
    return this.setDay(this.day + days);
  }

  public addHours(hours: number): DateTime {
    return this.setHour(this.hour + hours);
  }

  public addMinutes(minutes: number): DateTime {
    return this.setMinute(this.minute + minutes);
  }

  public addSeconds(seconds: number): DateTime {
    return this.setSecond(this.second + seconds);
  }

  public addMilliseconds(milliseconds: number): DateTime {
    return this.setMillisecond(this.millisecond + milliseconds);
  }

  public toFormatString(format: string): string {
    return DateTimeFormatUtil.format(format, {
      year: this.year,
      month: this.month,
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      second: this.second,
      millisecond: this.millisecond,
      timezoneOffsetMinutes: this.timezoneOffsetMinutes
    });
  }

  public toString(): string {
    return this.toFormatString("yyyy-MM-ddTHH:mm:ss.fffzzz");
  }
}