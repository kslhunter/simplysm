import { DateTime as LuxonDateTime } from "luxon";
import { ArgumentError } from "../../errors/ArgumentError";

/**
 * 날짜 클래스 (시간제외: yyyy-MM-dd)
 */
export class DateOnly {
  // [엔진 교체] Native Date 대신 Luxon 사용
  // readonly가 아니어야 setter 구현 가능
  private _dt: LuxonDateTime;

  constructor();
  constructor(year: number, month: number, day: number);
  constructor(tick: number);
  constructor(date: Date);
  constructor(dt: LuxonDateTime); // 내부 복제용
  constructor(arg1?: number | Date | LuxonDateTime, arg2?: number, arg3?: number) {
    if (arg1 === undefined) {
      this._dt = LuxonDateTime.local().startOf("day");
    } else if (arg1 instanceof LuxonDateTime) {
      this._dt = arg1.startOf("day");
    } else if (arg2 !== undefined && arg3 !== undefined) {
      this._dt = LuxonDateTime.local(arg1 as number, arg2, arg3).startOf("day");
    } else if (arg1 instanceof Date) {
      this._dt = LuxonDateTime.fromJSDate(arg1).startOf("day");
    } else {
      this._dt = LuxonDateTime.fromMillis(arg1).startOf("day");
    }
  }

  // [호환성] 기존 코드 지원
  get date(): Date {
    return this._dt.toJSDate();
  }

  static parse(str: string): DateOnly {
    // 1. ISO 포맷 등 Luxon 기본 파싱
    let dt = LuxonDateTime.fromISO(str);

    // 2. yyyyMMdd 포맷 지원
    if (!dt.isValid && /^[0-9]{8}$/.test(str)) {
      dt = LuxonDateTime.fromFormat(str, "yyyyMMdd");
    }

    // 3. 기존 Date.parse Fallback
    if (!dt.isValid) {
      const tick = Date.parse(str);
      if (!Number.isNaN(tick)) {
        dt = LuxonDateTime.fromMillis(tick);
      }
    }

    if (!dt.isValid) {
      throw new ArgumentError({ str });
    }

    return new DateOnly(dt);
  }

  /**
   * 기준 연도와 월을 주차 정보를 기반으로 반환
   * (Luxon 연산으로 리팩토링)
   */
  getBaseYearMonthSeqForWeekSeq(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    // this.week: 0(일)~6(토)
    // weekStartDay: 0(일)~6(토)
    const dayOfWeek = (this.week + 7 - weekStartDay) % 7; // 주차 시작 요일 기준 경과 일수
    const daysInWeek = 7 - dayOfWeek; // 주차 내 남은 일수 (이번 주가 끝날 때까지)

    if (daysInWeek < minDaysInFirstWeek) {
      // 기준 미달 -> 전 주차에 해당 (즉, 전주로 이동해서 연/월 확인)
      const prevDate = this.addDays(-7);
      return { year: prevDate.year, monthSeq: prevDate.month };
    } else {
      // 다음 달 1일 계산
      const nextMonthDate = this.addMonths(1).setDay(1);

      // 남은 일수 계산 (Luxon diff 사용)
      // (다음 달 1일 - 현재 날짜)의 일수 차이
      const remainedDays = nextMonthDate._dt.diff(this._dt, "days").days;

      // 이번 주에 포함된 '이번 달의 날짜' 개수
      const realDaysInWeek = Math.min(daysInWeek, remainedDays);

      if (realDaysInWeek < minDaysInFirstWeek) {
        // 기준 미달 -> 다음 주차에 해당 (즉, 다음주로 이동해서 연/월 확인)
        const nextDate = this.addDays(7);
        return { year: nextDate.year, monthSeq: nextDate.month };
      } else {
        // 이번 주차에 해당
        return { year: this.year, monthSeq: this.month };
      }
    }
  }

  /**
   * 주차 정보를 기반으로 해당 주의 시작 날짜 계산
   * (Luxon 연산으로 리팩토링)
   */
  getWeekSeqStartDate(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    const dayOfWeek = (this.week + 7 - weekStartDay) % 7;
    const daysInFirstWeek = 7 - dayOfWeek;

    // 만약 현재 날짜가 포함된 주가 '최소 일수'를 채우지 못하면,
    // 그 주는 '전 주'나 '다음 주'의 일부로 취급될 수 있음.
    // 기존 로직: daysInFirstWeek < minDaysInFirstWeek 이면 다음 주 시작일로 계산?
    // -> 원본 코드를 보면 addDays(-dayOfWeek + 7)을 하고 있음. 이는 "다음 주 시작일"을 의미함.

    if (daysInFirstWeek < minDaysInFirstWeek) {
      return this.addDays(-dayOfWeek + 7);
    } else {
      return this.addDays(-dayOfWeek);
    }
  }

  getWeekSeqOfYear(
    weekStartDay: number = 1,
    minDaysInFirstWeek: number = 4,
  ): { year: number; weekSeq: number } {
    const base = this.getBaseYearMonthSeqForWeekSeq(weekStartDay, minDaysInFirstWeek);

    const firstWeekStart = new DateOnly(base.year, 1, 1).getWeekSeqStartDate(
      weekStartDay,
      minDaysInFirstWeek,
    );

    // 날짜 차이 계산 (Luxon diff)
    const diffDays = this._dt.diff(firstWeekStart._dt, "days").days;
    return {
      year: base.year,
      weekSeq: Math.floor(diffDays / 7) + 1,
    };
  }

  getWeekSeqOfMonth(
    weekStartDay: number = 1,
    minDaysInFirstWeek: number = 4,
  ): { year: number; monthSeq: number; weekSeq: number } {
    const base = this.getBaseYearMonthSeqForWeekSeq(weekStartDay, minDaysInFirstWeek);

    const firstWeekStart = new DateOnly(base.year, base.monthSeq, 1).getWeekSeqStartDate(
      weekStartDay,
      minDaysInFirstWeek,
    );

    const diffDays = this._dt.diff(firstWeekStart._dt, "days").days;
    return {
      year: base.year,
      monthSeq: base.monthSeq,
      weekSeq: Math.floor(diffDays / 7) + 1,
    };
  }

  static getDateByYearWeekSeq(
    arg: { year: number; month?: number; weekSeq: number },
    weekStartDay: number = 1,
    minDaysInFirstWeek: number = 4,
  ) {
    // Luxon 기반 인스턴스 생성 후 계산 위임
    return new DateOnly(arg.year, arg.month ?? 1, (arg.weekSeq - 1) * 7 + 1).getWeekSeqStartDate(
      weekStartDay,
      minDaysInFirstWeek,
    );
  }

  get isValidDate(): boolean {
    return this._dt.isValid;
  }

  get year(): number {
    return this._dt.year;
  }
  set year(value: number) {
    this._dt = this._dt.set({ year: value });
  }

  get month(): number {
    return this._dt.month;
  }
  set month(value: number) {
    this._dt = this._dt.set({ month: value });
  }

  get day(): number {
    return this._dt.day;
  }
  set day(value: number) {
    this._dt = this._dt.set({ day: value });
  }

  get tick(): number {
    return this._dt.toMillis();
  }
  set tick(tick: number) {
    this._dt = LuxonDateTime.fromMillis(tick).startOf("day");
  }

  /**
   * 요일 (일:0 ~ 토:6)
   * Luxon은 1(월)~7(일)이므로 변환 필요
   */
  get week(): number {
    return this._dt.weekday === 7 ? 0 : this._dt.weekday;
  }

  // [불변성 유지] 새로운 객체 반환
  setYear(year: number): DateOnly {
    return new DateOnly(this._dt.set({ year }));
  }

  setMonth(month: number): DateOnly {
    // Luxon은 월 변경 시 말일 자동 보정 (예: 1월 31일 -> 2월 변경 시 2월 28/29일)
    return new DateOnly(this._dt.set({ month }));
  }

  setDay(day: number): DateOnly {
    return new DateOnly(this._dt.set({ day }));
  }

  addYears(years: number): DateOnly {
    return new DateOnly(this._dt.plus({ years }));
  }

  addMonths(months: number): DateOnly {
    return new DateOnly(this._dt.plus({ months }));
  }

  addDays(days: number): DateOnly {
    return new DateOnly(this._dt.plus({ days }));
  }

  toFormatString(format: string): string {
    // Luxon 포맷 사용
    return this._dt.toFormat(format);
  }

  toString(): string {
    return this.toFormatString("yyyy-MM-dd");
  }
}
