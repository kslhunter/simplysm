import { ArgumentError } from "../errors/ArgumentError";
import { DateTimeFormatUtil } from "../utils/DateTimeFormatUtil";

export class DateOnly {
  public readonly date: Date;

  public constructor();
  public constructor(year: number, month: number, day: number);
  public constructor(tick: number);
  public constructor(date: Date);
  public constructor(arg1?: number | Date, arg2?: number, arg3?: number) {
    if (arg1 === undefined) {
      const tick = Date.now();
      const date = new Date(tick);
      this.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    else if (arg2 !== undefined && arg3 !== undefined) {
      this.date = new Date(arg1 as number, arg2 - 1, arg3);
    }
    else if (arg1 instanceof Date) {
      this.date = arg1;
    }
    else {
      const date = new Date(arg1);
      this.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
  }

  public static parse(str: string): DateOnly {
    const offsetMinutes = new Date().getTimezoneOffset();
    const parsedTick = Date.parse(str) - (offsetMinutes * 60 * 1000);
    if (!Number.isNaN(parsedTick)) {
      return new DateOnly(parsedTick);
    }

    const match1 = (/^[0-9]{8}$/).exec(str);
    if (match1 != null) {
      return new DateOnly(
        Number(str.substring(0, 4)),
        Number(str.substring(4, 6)),
        Number(str.substring(6, 8))
      );
    }

    throw new ArgumentError({ str });
  }

  public static getByMonthWeekFirstDate(month: DateOnly, week: number, offsetWeek: number = 4, startWeek: number = 1): DateOnly {
    // 이달 1일
    const monthFirstDate = month.setDay(1);

    // 이달 1일의 요일
    const monthFirstDayWeek = monthFirstDate.week;

    // 이달의 주차가 시작되는 날짜
    const monthWeekNumStartDate = monthFirstDayWeek <= offsetWeek ? monthFirstDate : monthFirstDate.setDay(7 - monthFirstDayWeek + 1 + startWeek);
    return monthWeekNumStartDate.addDays(7 * (week > 0 ? week - 1 : week));
  }

  /**
   * 특정 날짜의 월별주차 가져오기
   * - 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6
   * @param {DateOnly} date 확인날짜
   * @param {number} offsetWeek 이 요일이 포함된 월의 주차로 인식됨 (기본값: 4=목요일)
   * @param {number} startWeek 이 요일을 시작요일로 봄 (기본값: 1=월요일)
   * @returns {{month: DateOnly; week: number}}
   */
  public static getWeekOfMonth(date: DateOnly, offsetWeek: number = 4, startWeek: number = 1): IWeekOfMonth {
    // 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6

    // 이번달의 주차가 시작되는 날짜
    const monthWeekNumStartDate = DateOnly.getByMonthWeekFirstDate(date.setDay(1), 1, offsetWeek, startWeek);

    // 다음달의 주차가 시작되는 날짜
    const nextMonthWeekNumStartDate = DateOnly.getByMonthWeekFirstDate(date.setDay(1).addMonths(1), 1, offsetWeek, startWeek);

    // 이번달의 주차가 끝나는 날짜
    const monthWeekNumEndDate = nextMonthWeekNumStartDate.day !== 1
      ? date.addMonths(1).addDays(-1)
      : nextMonthWeekNumStartDate.addDays(-nextMonthWeekNumStartDate.week - 1 + startWeek);

    if (date.tick < monthWeekNumStartDate.tick) {
      return DateOnly.getWeekOfMonth(date.setDay(1).addDays(-1), offsetWeek, startWeek);
    }
    else if (date.tick > monthWeekNumEndDate.tick) {
      return DateOnly.getWeekOfMonth(date.addMonths(1).setDay(1), offsetWeek, startWeek);
    }
    else {
      // 1주차의 첫날짜 (전달일 수 있음)
      const firstWeekNumFirstDate = monthWeekNumStartDate.addDays(-monthWeekNumStartDate.week + 1);

      // 1주차 첫날짜에서 지난 날수
      const spanDayFromWeekStartDate = Math.floor(
        ((date.tick - firstWeekNumFirstDate.tick) / (24 * 60 * 60 * 1000))
      );

      // 1주차 첫날짜에서 지난 주차수
      const spanWeekFromWeekStartDate = Math.floor(spanDayFromWeekStartDate / 7);
      return {
        month: date.setDay(1),
        weekNum: spanWeekFromWeekStartDate + 1,
        startDate: date.addDays(-date.week + startWeek),
        endDate: date.addDays(-date.week + startWeek + 6)
      };
    }
  }

  public get isValidDate(): boolean {
    // noinspection SuspiciousTypeOfGuard
    return this.date instanceof Date && !isNaN(this.date as any);
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

export interface IWeekOfMonth {
  month: DateOnly;
  weekNum: number;
  startDate: DateOnly;
  endDate: DateOnly;
}
