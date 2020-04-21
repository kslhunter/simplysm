import {ArgumentError} from "../errors/ArgumentError";
import {DateTimeFormatUtils} from "../utils/DateTimeFormatUtils";

export class DateOnly {
  public readonly date: Date;

  public constructor();
  public constructor(year: number, month: number, day: number);
  public constructor(tick: number);
  public constructor(date: Date);
  public constructor(arg1?: number | Date, arg2?: number, arg3?: number) {
    if (arg1 === undefined) {
      const tick = Date.now();
      this.date = new Date(tick - (tick % (24 * 60 * 60 * 1000)));
    }
    else if (arg2 !== undefined && arg3 !== undefined) {
      this.date = new Date(arg1 as number, arg2 - 1, arg3);
    }
    else if (arg1 instanceof Date) {
      this.date = arg1;
    }
    else {
      this.date = new Date(arg1 - (arg1 % (24 * 60 * 60 * 1000)));
    }
  }

  public static parse(str: string): DateOnly {
    const parsedTick = Date.parse(str);
    if (!Number.isNaN(parsedTick)) {
      return new DateOnly(parsedTick);
    }

    const match1 = (/^[0-9]{8}$/).exec(str);
    if (match1 != undefined) {
      return new DateOnly(
        Number(str.substr(0, 4)),
        Number(str.substr(4, 2)),
        Number(str.substr(6, 2))
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

  public get tick(): number {
    return this.date.getTime();
  }

  public set tick(tick: number) {
    this.date.setTime(tick - (tick % (24 * 60 * 60 * 1000)));
  }

  public get week(): number {
    return this.date.getDay();
  }

  public setYear(year: number): DateOnly {
    return new DateOnly(new Date(this.tick).setFullYear(year));
  }

  public setMonth(month: number): DateOnly {
    const date = new Date(this.tick);
    date.setDate(1);
    date.setMonth(month);
    date.setDate(0);

    const lastDay = date.getDate();
    const currentDay = lastDay < this.day ? lastDay : this.day;
    date.setDate(currentDay);

    return new DateOnly(date);
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
    return DateTimeFormatUtils.format(format, {
      year: this.year,
      month: this.month,
      day: this.day
    });
  }

  public toString(): string {
    return this.toFormatString("yyyy-MM-dd");
  }
}
