import {ArgumentError} from "../errors/argument.error";
import {DateTimeFormatUtils} from "../utils/date-time-format.utils";

/**
 * 날짜 클래스 (시간제외: yyyy-MM-dd)
 */
export class DateOnly {
  /**
   * 기본 {@link Date}
   */
  public readonly date: Date;

  /**
   * 현재시간
   */
  public constructor();

  /**
   * 연월일로 초기화
   * @param year 연
   * @param month 월
   * @param day 일
   */
  public constructor(year: number, month: number, day: number);

  /**
   * {@link Date} 타입의 tick 으로 생성 (millisecond)
   * @param tick {@link Date.tick}
   */
  public constructor(tick: number);

  /**
   * {@link Date} 타입으로 생성
   * @param date {@link Date}
   */
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
      const date = arg1;
      this.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    else {
      const date = new Date(arg1);
      this.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
  }

  /**
   * 날짜 문자를 {@link DateOnly} 타입으로 변경
   *
   * * {@link Date} 타입의 parse 명령으로 가능한 모든 형식
   * * yyyyMMdd 형식
   *
   * @param str 파싱할 날짜 형식의 문자
   */
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

    throw new ArgumentError({str});
  }

  /**
   * `offsetWeek`요일을 기준으로 `month`월의 `weekSeq`주차를 구하고,
   * 해당 주차의 `startWeek`요일의 날짜를 가져오기
   *
   * @param month 월
   * @param weekSeq 가져올 주차 (1주차\~)
   * @param offsetWeek 주차구분 기준 요일 (일\~토: 0\~6)
   * @param startWeek 시작 요일 (일\~토: 0\~6)
   */
  private static _getByMonthWeekFirstDate(month: DateOnly, weekSeq: number, offsetWeek: number = 4, startWeek: number = 1): DateOnly {
    // 이달 1일
    const monthFirstDate = month.setDay(1);

    // 이달 1일의 요일
    const monthFirstDayWeek = monthFirstDate.week;

    // 이달의 주차가 시작되는 날짜
    const monthWeekNumStartDate = monthFirstDayWeek <= offsetWeek ? monthFirstDate : monthFirstDate.setDay(7 - monthFirstDayWeek + 1 + startWeek);
    return monthWeekNumStartDate.addDays(7 * (weekSeq > 0 ? weekSeq - 1 : weekSeq));
  }

  /**
   * 날짜 `date`가 몇주차인지 가져오기
   *
   * @param date 확인날짜
   * @param offsetWeek 주차구분 기준 요일 (일~토: 0~6)
   * @param startWeek 시작 요일 (일~토: 0~6)
   *
   * @returns 주차
   */
  public static getWeekSeqOfMonth(date: DateOnly, offsetWeek: number = 4, startWeek: number = 1): IWeekSeqOfMonth {
    // 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6

    // 이번달의 주차가 시작되는 날짜
    const monthWeekNumStartDate = DateOnly._getByMonthWeekFirstDate(date.setDay(1), 1, offsetWeek, startWeek);

    // 다음달의 주차가 시작되는 날짜
    const nextMonthWeekNumStartDate = DateOnly._getByMonthWeekFirstDate(date.setDay(1).addMonths(1), 1, offsetWeek, startWeek);

    // 이번달의 주차가 끝나는 날짜
    const monthWeekNumEndDate = nextMonthWeekNumStartDate.day !== 1
      ? date.addMonths(1).addDays(-1)
      : nextMonthWeekNumStartDate.addDays(-nextMonthWeekNumStartDate.week - 1 + startWeek);

    if (date.tick < monthWeekNumStartDate.tick) {
      return DateOnly.getWeekSeqOfMonth(date.setDay(1).addDays(-1), offsetWeek, startWeek);
    }
    else if (date.tick > monthWeekNumEndDate.tick) {
      return DateOnly.getWeekSeqOfMonth(date.addMonths(1).setDay(1), offsetWeek, startWeek);
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
        year: date.year,
        month: date.month,
        weekSeq: spanWeekFromWeekStartDate + 1
      };
    }
  }

  /**
   * 날짜 세팅이 제대로 되었는지 여부 (NaN등의 문제 확인)
   */
  public get isValidDate(): boolean {
    // noinspection SuspiciousTypeOfGuard
    return this.date instanceof Date && !isNaN(this.date as any);
  }

  /**
   * 연
   */
  public get year(): number {
    return this.date.getFullYear();
  }

  public set year(value: number) {
    this.date.setFullYear(value);
  }

  /**
   * 월
   */
  public get month(): number {
    return this.date.getMonth() + 1;
  }

  public set month(value: number) {
    this.date.setMonth(value - 1);
  }

  /**
   * 일
   */
  public get day(): number {
    return this.date.getDate();
  }

  public set day(value: number) {
    this.date.setDate(value);
  }

  /**
   * 전체 millisecond {@link Date.tick}
   */
  public get tick(): number {
    return this.date.getTime();
  }

  public set tick(tick: number) {
    this.date.setTime(tick - (tick % (24 * 60 * 60 * 1000)));
  }

  /**
   * 요일 (일\~토: 0\~6)
   */
  public get week(): number {
    return this.date.getDay();
  }

  /**
   * 연도 설정
   * @param year 연
   */
  public setYear(year: number): DateOnly {
    return new DateOnly(new Date(this.tick).setFullYear(year));
  }

  /**
   * 월 설정
   * @param month 월
   */
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

  /**
   * 일자를 변경 후 반환 (현재 객체의 일자는 변하지 않음)
   * @param day 일
   */
  public setDay(day: number): DateOnly {
    return new DateOnly(new Date(this.tick).setDate(day));
  }

  /**
   * `years`년후로 이동후 반환 (현재 객체의 일자는 변하지 않음)
   * @param years 연
   */
  public addYears(years: number): DateOnly {
    return this.setYear(this.year + years);
  }

  /**
   * `months`개월 후로 이동후 반환 (현재 객체의 일자는 변하지 않음)
   * @param months 월
   */
  public addMonths(months: number): DateOnly {
    return this.setMonth(this.month + months);
  }

  /**
   * `days`일 후로 이동후 반환 (현재 객체의 일자는 변하지 않음)
   * @param days 일
   */
  public addDays(days: number): DateOnly {
    return this.setDay(this.day + days);
  }

  /**
   * 포맷문자열을 활용하여, 문자열 형식으로 변환
   *
   * C#과 동일: [참조링크](https://docs.microsoft.com/ko-kr/dotnet/standard/base-types/custom-date-and-time-format-strings)
   *
   * @param format
   */
  public toFormatString(format: string): string {
    return DateTimeFormatUtils.format(format, {
      year: this.year,
      month: this.month,
      day: this.day
    });
  }

  /**
   * 문자열 형식으로 변환 (yyyy-MM-dd)
   */
  public toString(): string {
    return this.toFormatString("yyyy-MM-dd");
  }
}

interface IWeekSeqOfMonth {
  year: number;
  month: number;
  weekSeq: number;
}
