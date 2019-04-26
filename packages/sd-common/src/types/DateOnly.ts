import { ArgumentError } from "../errors/ArgumentError";

export class DateOnly {
  public date: Date;

  public constructor();
  public constructor(tick: number);
  public constructor(year: number, month: number, date: number);
  public constructor(date: Date);
  public constructor(args1?: number | Date, args2?: number, args3?: number) {
    if (args1 === undefined) {
      const now = new Date();
      this.date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (typeof args1 === "number" && args2 === undefined) {
      const date = new Date(args1);
      this.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    } else if (typeof args1 === "number" && args2 !== undefined) {
      this.date = new Date(args1, args2 - 1, args3);
    } else if (args1 instanceof Date) {
      this.date = new Date(args1.getFullYear(), args1.getMonth(), args1.getDate());
    } else {
      throw new ArgumentError({ args1, args2, args3 });
    }
  }

  public static parse(value: string): DateOnly {
    const parsedTick = Date.parse(value) as any;
    if (parsedTick && typeof parsedTick === "number") {
      return new DateOnly(parsedTick);
    }

    if (/^[0-9]{8}$/.test(value)) {
      return new DateOnly(Number(value.substr(0, 4)), Number(value.substr(4, 2)), Number(value.substr(6, 2)));
    }

    throw new ArgumentError({ value });
  }

  public get year(): number {
    return this.date.getFullYear();
  }

  public set year(year: number) {
    this.date.setFullYear(year);
  }

  public get month(): number {
    return this.date.getMonth() + 1;
  }

  public set month(month: number) {
    this.date.setMonth(month - 1);
  }

  public get day(): number {
    return this.date.getDate();
  }

  public set day(day: number) {
    this.date.setDate(day);
  }

  public get week(): number {
    return this.date.getDay();
  }

  public get tick(): number {
    return this.date.getTime();
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
    const year = this.year;
    const month = this.month;
    const day = this.day;

    const weekString =
      this.week === 0
        ? "일"
        : this.week === 1
        ? "월"
        : this.week === 2
        ? "화"
        : this.week === 3
        ? "수"
        : this.week === 4
        ? "목"
        : this.week === 5
        ? "금"
        : this.week === 6
        ? "토"
        : "";

    let result = format;
    result = result.replace(/yyyyy/g, year.toString() + "년");
    result = result.replace(/yyyy/g, year.toString());
    result = result.replace(/yyy/g, year.toString().substr(1, 3));
    result = result.replace(/yy/g, year.toString().substr(2, 2));
    result = result.replace(/y/g, year.toString().substr(3, 1));

    result = result.replace(/MMM/g, month.toString().padStart(2, "0") + "월");
    result = result.replace(/MM/g, month.toString().padStart(2, "0"));
    result = result.replace(/M/g, month.toString());

    result = result.replace(/dddd/g, `${weekString}요일`);
    result = result.replace(/ddd/g, weekString);

    result = result.replace(/dd/g, day.toString().padStart(2, "0"));
    result = result.replace(/d/g, day.toString());

    return result;
  }

  public toString(): string {
    return this.date ? this.toFormatString("yyyy-MM-dd") : "";
  }
}
