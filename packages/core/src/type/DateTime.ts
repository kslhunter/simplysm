import {DateOnly} from "./DateOnly";
import {Time} from "./Time";
import {ArgumentError} from "../error/ArgumentError";

export class DateTime {
  public date: Date;

  public constructor();
  public constructor(tick: number);
  public constructor(year: number, month: number, date?: number, hour?: number, minute?: number, second?: number, millisecond?: number);
  public constructor(date: Date);
  public constructor(args1?: number | Date, args2?: number, args3?: number, args4?: number, args5?: number, args6?: number, args7?: number) {
    if (args1 === undefined) {
      this.date = new Date(new Date().getTime());
    }
    else if (typeof args1 === "number" && args2 === undefined) {
      this.date = new Date(args1);
    }
    else if (typeof args1 === "number" && args2 !== undefined) {
      this.date = new Date(args1, args2 - 1, args3, args4, args5, args6, args7);
    }
    else if (args1 instanceof Date) {
      this.date = new Date(args1.getTime());
    }
    else {
      throw new ArgumentError({args1, args2, args3, args4, args5, args6, args7});
    }
  }

  public static parse(value: string): DateTime {
    const parsedTick = Date.parse(value) as any;
    if (typeof parsedTick === "number") {
      return new DateTime(parsedTick);
    }

    /*if (/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}\+[0-9]{2}:[0-9]{2}/.test(value)) {
      const matches = value.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}\+[0-9]{2}:[0-9]{2}/);
      return new DateTime(
        Number(matches![1]),
        Number(matches![2]),
        Number(matches![3]),
        Number(matches![4]) + Number(matches![8]),
        Number(matches![5]) + Number(matches![9]),
        Number(matches![6]),
        Number(matches![7])
      );
    }*/

    throw new ArgumentError({value});
  }

  public get timezoneOffset(): number {
    return this.date.getTimezoneOffset();
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

  public get hour(): number {
    return this.date.getHours();
  }

  public set hour(hour: number) {
    this.date.setHours(hour);
  }

  public get minute(): number {
    return this.date.getMinutes();
  }

  public set minute(minute: number) {
    this.date.setMinutes(minute);
  }

  public get second(): number {
    return this.date.getSeconds();
  }

  public set second(second: number) {
    this.date.setSeconds(second);
  }

  public get millisecond(): number {
    return this.date.getMilliseconds();
  }

  public set millisecond(millisecond: number) {
    this.date.setMilliseconds(millisecond);
  }

  public get tick(): number {
    return this.date.getTime();
  }

  public set tick(tick: number) {
    this.date.setTime(tick);
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

  public toDateOnly(): DateOnly {
    return new DateOnly(this.date);
  }

  public toTime(): Time {
    return new Time(this.date);
  }

  public toFormatString(format: string): string {
    const year = this.year;
    const month = this.month;
    const day = this.day;
    const hour = this.hour;
    const minute = this.minute;
    const second = this.second;
    const millisecond = this.millisecond;
    const offsetHour = -Math.floor(this.timezoneOffset / 60);
    const offsetMinute = -this.timezoneOffset % 60;

    const weekString =
      this.week === 0 ? "일" :
        this.week === 1 ? "월" :
          this.week === 2 ? "화" :
            this.week === 3 ? "수" :
              this.week === 4 ? "목" :
                this.week === 5 ? "금" :
                  this.week === 6 ? "토" :
                    "";

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

    result = result.replace(/tt/g, hour < 12 ? "오전" : "오후");

    result = result.replace(/hh/g, (hour % 12).toString().padStart(2, "0"));
    result = result.replace(/h/g, (hour % 12).toString());

    result = result.replace(/HH/g, hour.toString().padStart(2, "0"));
    result = result.replace(/H/g, hour.toString());

    result = result.replace(/mm/g, minute.toString().padStart(2, "0"));
    result = result.replace(/m/g, minute.toString());

    result = result.replace(/ss/g, second.toString().padStart(2, "0"));
    result = result.replace(/s/g, second.toString());

    result = result.replace(/fff/g, millisecond.toString().padStart(3, "0"));
    result = result.replace(/ff/g, millisecond.toString().padStart(3, "0").substr(0, 2));
    result = result.replace(/f/g, millisecond.toString().padStart(3, "0").substr(0, 1));

    result = result.replace(/zzz/g, (offsetHour > 0 ? "+" : "-") + Math.abs(offsetHour).toString().padStart(2, "0") + ":" + Math.abs(offsetMinute).toString().padStart(2, "0"));
    result = result.replace(/zz/g, (offsetHour > 0 ? "+" : "-") + Math.abs(offsetHour).toString().padStart(2, "0"));
    result = result.replace(/z/g, (offsetHour > 0 ? "+" : "-") + Math.abs(offsetHour).toString());

    return result;
  }

  public toString(): string {
    return this.toFormatString("yyyy-MM-ddTHH:mm:ss.fffzzz");
  }
}