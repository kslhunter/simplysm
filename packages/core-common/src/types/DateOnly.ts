import { ArgumentError } from "../errors/ArgumentError.js";
import { DateTimeFormatUtils } from "../utils/date-format.js";

/**
 * 날짜 클래스 (시간제외: yyyy-MM-dd, 불변)
 */
export class DateOnly {
  readonly date: Date;

  /** 현재시간 */
  constructor();
  /** 연월일로 초기화 */
  constructor(year: number, month: number, day: number);
  /** tick (millisecond)으로 생성 */
  constructor(tick: number);
  /** Date 타입으로 생성 */
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

  static parse(str: string): DateOnly {
    const offsetMinutes = new Date().getTimezoneOffset();
    const parsedTick = Date.parse(str) - offsetMinutes * 60 * 1000;
    if (!Number.isNaN(parsedTick)) {
      return new DateOnly(parsedTick);
    }

    const match1 = /^[0-9]{8}$/.exec(str);
    if (match1 != null) {
      return new DateOnly(
        Number(str.substring(0, 4)),
        Number(str.substring(4, 6)),
        Number(str.substring(6, 8)),
      );
    }

    throw new ArgumentError(
      `날짜 형식을 파싱할 수 없습니다. 지원 형식: 'yyyy-MM-dd', 'yyyyMMdd', ISO 8601 날짜`,
      { input: str },
    );
  }

  //#region 주차 계산

  /**
   * 기준 연도와 월을 주차 정보를 기반으로 반환
   */
  getBaseYearMonthSeqForWeekSeq(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    const dayOfWeek = (this.week + 7 - weekStartDay) % 7;
    const daysInWeek = 7 - dayOfWeek;

    if (daysInWeek < minDaysInFirstWeek) {
      return { year: this.addDays(-7).year, monthSeq: this.addDays(-7).month };
    } else {
      const nextMonthDate = this.addMonths(1).setDay(1);
      const remainedDays = (nextMonthDate.tick - this.tick) / (24 * 60 * 60 * 1000);

      const realDaysInWeek = Math.min(daysInWeek, remainedDays);
      if (realDaysInWeek < minDaysInFirstWeek) {
        return { year: this.addDays(7).year, monthSeq: this.addDays(7).month };
      } else {
        return { year: this.year, monthSeq: this.month };
      }
    }
  }

  /**
   * 주차 정보를 기반으로 해당 주의 시작 날짜 계산
   */
  getWeekSeqStartDate(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    const dayOfWeek = (this.week + 7 - weekStartDay) % 7;
    const daysInFirstWeek = 7 - dayOfWeek;

    if (daysInFirstWeek < minDaysInFirstWeek) {
      return this.addDays(-dayOfWeek + 7);
    } else {
      return this.addDays(-dayOfWeek);
    }
  }

  /**
   * 연도 및 주차 순서 정보를 반환
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

    const diffDays = (this.tick - firstWeekStart.tick) / (24 * 60 * 60 * 1000);
    return {
      year: base.year,
      weekSeq: Math.floor(diffDays / 7) + 1,
    };
  }

  /**
   * 해당 날짜의 연도 및 주차(weekSeq) 정보를 반환
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

    const diffDays = (this.tick - firstWeekStart.tick) / (24 * 60 * 60 * 1000);
    return {
      year: base.year,
      monthSeq: base.monthSeq,
      weekSeq: Math.floor(diffDays / 7) + 1,
    };
  }

  /**
   * 주차 정보를 기반으로 해당 주의 시작 날짜 가져오기
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

  //#region Getters (읽기 전용)

  /** 날짜 세팅이 제대로 되었는지 여부 */
  get isValidDate(): boolean {
    return this.date instanceof Date && !isNaN(this.date as unknown as number);
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

  /** 요일 (일~토: 0~6) */
  get week(): number {
    return this.date.getDay();
  }

  //#endregion

  //#region 불변 변환 메서드 (새 인스턴스 반환)

  setYear(year: number): DateOnly {
    return new DateOnly(year, this.month, this.day);
  }

  setMonth(month: number): DateOnly {
    // 대상 월의 마지막 날 구하기
    const lastDay = new Date(this.year, month, 0).getDate();
    const currentDay = Math.min(this.day, lastDay);
    return new DateOnly(this.year, month, currentDay);
  }

  setDay(day: number): DateOnly {
    return new DateOnly(this.year, this.month, day);
  }

  //#endregion

  //#region 산술 메서드 (새 인스턴스 반환)

  addYears(years: number): DateOnly {
    return this.setYear(this.year + years);
  }

  addMonths(months: number): DateOnly {
    return this.setMonth(this.month + months);
  }

  addDays(days: number): DateOnly {
    return new DateOnly(this.tick + days * 24 * 60 * 60 * 1000);
  }

  //#endregion

  //#region 포맷팅

  toFormatString(format: string): string {
    return DateTimeFormatUtils.format(format, {
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
