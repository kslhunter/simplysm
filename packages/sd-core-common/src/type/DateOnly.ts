import {ArgumentError} from "../error/ArgumentError";
import {DateTimeFormatUtil} from "../util/DateTimeFormatUtil";

export class DateOnly {
  private readonly _date: Date;

  public constructor();
  public constructor(year: number, month: number, day: number);
  public constructor(tick: number);
  public constructor(arg1?: number, arg2?: number, arg3?: number) {
    if (arg1 === undefined) {
      const tick = Date.now();
      this._date = new Date(tick - (tick % (24 * 60 * 60 * 1000)));
    }
    else if (arg2 !== undefined && arg3 !== undefined) {
      this._date = new Date(arg1, arg2 - 1, arg3 ?? 0);
    }
    else {
      this._date = new Date(arg1 - (arg1 % (24 * 60 * 60 * 1000)));
    }
  }

  public static parse(str: string): DateOnly {
    const parsedTick = Date.parse(str);
    if (parsedTick && !Number.isNaN(parsedTick)) {
      return new DateOnly(parsedTick);
    }

    const match1 = str.match(/^[0-9]{8}$/);
    if (match1) {
      return new DateOnly(
        Number(str.substr(0, 4)),
        Number(str.substr(4, 2)),
        Number(str.substr(6, 2))
      );
    }

    throw new ArgumentError({str});
  }

  public get year(): number {
    return this._date.getFullYear();
  }

  public set year(value: number) {
    this._date.setFullYear(value);
  }

  public get month(): number {
    return this._date.getMonth() + 1;
  }

  public set month(value: number) {
    this._date.setMonth(value - 1);
  }

  public get day(): number {
    return this._date.getDate();
  }

  public set day(value: number) {
    this._date.setDate(value);
  }

  public get tick(): number {
    return this._date.getTime();
  }

  public set tick(tick: number) {
    this._date.setTime(tick - (tick % (24 * 60 * 60 * 1000)));
  }

  public get week(): number {
    return this._date.getDay();
  }

  public setYear(year: number): DateOnly {
    return new DateOnly(new Date(this.tick).setFullYear(year));
  }

  public setMonth(month: number): DateOnly {
    return new DateOnly(new Date(this.tick).setMonth(month - 1));
  }

  public setDay(day: number): DateOnly {
    return new DateOnly(new Date(this.tick).setDate(day));
  }

  public addYears(years: number): DateOnly {
    return this.setYear(this.year + years);
  }

  public addMonths(months: number): DateOnly {
    return this.setMonth(this.month + months);
  }

  public addDays(days: number): DateOnly {
    return this.setDay(this.day + days);
  }

  public toFormatString(format: string): string {
    return DateTimeFormatUtil.format(format, {
      year: this.year,
      month: this.month,
      day: this.day
    });
  }

  public toString(): string {
    return this.toFormatString("yyyy-MM-dd");
  }
}