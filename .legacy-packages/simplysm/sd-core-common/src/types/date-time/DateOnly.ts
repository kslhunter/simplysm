import { ArgumentError } from "../../errors/ArgumentError";
import { DateTimeFormatUtils } from "../../utils/DateTimeFormatUtils";

/**
 * 날짜 클래스 (시간제외: yyyy-MM-dd)
 */
export class DateOnly {
  /**
   * 기본 {@link Date}
   */
  readonly date: Date;

  /**
   * 현재시간
   */
  constructor();

  /**
   * 연월일로 초기화
   * @param year 연
   * @param month 월
   * @param day 일
   */
  constructor(year: number, month: number, day: number);

  /**
   * {@link Date} 타입의 tick 으로 생성 (millisecond)
   * @param tick {@link Date.tick}
   */
  constructor(tick: number);

  /**
   * {@link Date} 타입으로 생성
   * @param date {@link Date}
   */
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

  /**
   * 날짜 문자를 {@link DateOnly} 타입으로 변경
   *
   * * {@link Date} 타입의 parse 명령으로 가능한 모든 형식
   * * yyyyMMdd 형식
   *
   * @param str 파싱할 날짜 형식의 문자
   */
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
      {
        input: str,
      },
    );
  }

  /**
   * 기준 연도와 월을 주차 정보를 기반으로 반환
   *
   * 주의 기준 시작 요일(`weekStartDay`)와 특정 연도의 최소 첫 번째 주의 일수(`minDaysInFirstWeek`)를 참고하여,
   * 현재 날짜가 속하는 기준의 연도와 월을 반환합니다.
   *
   * 주차 계산 규칙:
   * 1. 현재 주의 남은 날짜(`daysInWeek`)가 최소 첫 번째 주의 일수보다 적다면, 이전 주에 속합니다.
   * 2. 만약 다음 달의 날짜가 포함되어 실제 남은 기간(`realDaysInWeek`)이 최소 일수보다 작다면, 다음 주에 속합니다.
   * 3. 그 외의 경우, 해당 날짜는 이번 주에 속합니다.
   *
   * @param weekStartDay - 주 시작 요일 (0~6: 일~토)
   * @param minDaysInFirstWeek - 첫 번째 주를 정의하는 최소 일수
   * @returns `{ year: number; month: number }` 기준 연도와 월
   */
  getBaseYearMonthSeqForWeekSeq(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    const dayOfWeek = (this.week + 7 - weekStartDay) % 7; // 주차시작요일 기준, 몇번째 일자인가?
    const daysInWeek = 7 - dayOfWeek; // 주차내 해당일 및 그 이후의 일수 (다음달 포함)

    if (daysInWeek < minDaysInFirstWeek) {
      // 전주의 주차임
      return { year: this.addDays(-7).year, monthSeq: this.addDays(-7).month };
    } else {
      const nextMonthDate = this.addMonths(1).setDay(1);
      const remainedDays = (nextMonthDate.tick - this.tick) / (24 * 60 * 60 * 1000);

      const realDaysInWeek = Math.min(daysInWeek, remainedDays); // 주차내 해당일 이후의 일수 (다음달 미포함)
      if (realDaysInWeek < minDaysInFirstWeek) {
        // 다음주의 주차임
        return { year: this.addDays(7).year, monthSeq: this.addDays(7).month };
      } else {
        // 이번주의 주차임
        return { year: this.year, monthSeq: this.month };
      }
    }
  }

  /**
   * 주차 정보를 기반으로 해당 주의 시작 날짜 계산
   *
   * 주차가 시작하는 요일(`weekStartDay`)과 특정 연도의 최소 첫 번째 주 기준(`minDaysInFirstWeek`)에 따라,
   * 현재 날짜로부터 해당 주의 시작 날짜를 반환합니다.
   *
   * @param weekStartDay - 주 시작 요일 (0~6: 일~토)
   * @param minDaysInFirstWeek - 첫 번째 주를 정의하는 최소 일수
   * @returns `{ year: number; month: number }` 주차 기준 연도와 월
   */
  getWeekSeqStartDate(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    const dayOfWeek = (this.week + 7 - weekStartDay) % 7; // 주차시작요일 기준, 몇번째 일자인가?
    const daysInFirstWeek = 7 - dayOfWeek; // 주차내 해당일 이후의 일수 (다음달 포함)

    if (daysInFirstWeek < minDaysInFirstWeek) {
      return this.addDays(-dayOfWeek + 7);
    } else {
      return this.addDays(-dayOfWeek);
    }
  }

  /**
   * 연도 및 주차 순서 정보를 반환
   *
   * @param weekStartDay - 각 주의 시작 요일 (0~6: 일~토)
   * @param minDaysInFirstWeek - 첫 번째 주로 간주되기 위한 최소 일수
   * @returns 해당 날짜의 연도 및 주차 정보를 담은 객체:
   *    - `year`: 해당 날짜가 속하는 연도
   *    - `weekSeq`: 연도 기준 주차 순서 (1부터 시작)
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
   *
   * @param weekStartDay - 주가 시작되는 요일 (0~6: 일~토)
   * @param minDaysInFirstWeek - 첫 번째 주로 간주되기 위한 최소 일수
   * @returns 연도 및 주차 순서를 포함한 객체:
   *    - `year`: 연도
   *    - `weekSeq`: 해당 연도 기준 주차 순서 (1부터 시작)
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
   *
   * @param arg - 대상 연도, 선택적 월, 주차 순서를 포함한 객체:
   *    - `year`: 대상 연도.
   *    - `month`: (선택 사항) 대상 월. 지정하지 않으면 연도 기준으로 계산됩니다.
   *    - `weekSeq`: 1부터 시작하는 주차 순서.
   *
   * @param weekStartDay - 한 주가 시작되는 요일을 지정합니다. (달력 표시상 첫 요일) (0~6: 일~토)   *
   * @param minDaysInFirstWeek - 첫 번째 주로 간주되기 위한 최소 일수 (주에 포함되어있어야할 일수)
   * @returns 계산된 주차의 시작 날짜를 나타내는 `DateOnly` 객체.
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

  /**
   * 날짜 세팅이 제대로 되었는지 여부 (NaN등의 문제 확인)
   */
  get isValidDate(): boolean {
    // noinspection SuspiciousTypeOfGuard
    return this.date instanceof Date && !isNaN(this.date as any);
  }

  /**
   * 연
   */
  get year(): number {
    return this.date.getFullYear();
  }

  set year(value: number) {
    this.date.setFullYear(value);
  }

  /**
   * 월
   */
  get month(): number {
    return this.date.getMonth() + 1;
  }

  set month(value: number) {
    this.date.setMonth(value - 1);
  }

  /**
   * 일
   */
  get day(): number {
    return this.date.getDate();
  }

  set day(value: number) {
    this.date.setDate(value);
  }

  /**
   * 전체 millisecond {@link Date.tick}
   */
  get tick(): number {
    return this.date.getTime();
  }

  set tick(tick: number) {
    this.date.setTime(tick - (tick % (24 * 60 * 60 * 1000)));
  }

  /**
   * 요일 (일\~토: 0\~6)
   */
  get week(): number {
    return this.date.getDay();
  }

  /**
   * 연도 설정
   * @param year 연
   */
  setYear(year: number): DateOnly {
    return new DateOnly(new Date(this.tick).setFullYear(year));
  }

  /**
   * 월 설정
   * @param month 월
   */
  setMonth(month: number): DateOnly {
    // 대상 월의 마지막 날 구하기
    const lastDay = new Date(this.year, month, 0).getDate();

    const currentDay = Math.min(this.day, lastDay);

    const date = new Date(this.year, month - 1, currentDay);
    return new DateOnly(date);
  }

  /**
   * 일자를 변경 후 반환 (현재 객체의 일자는 변하지 않음)
   * @param day 일
   */
  setDay(day: number): DateOnly {
    return new DateOnly(new Date(this.tick).setDate(day));
  }

  /**
   * `years`년후로 이동후 반환 (현재 객체의 일자는 변하지 않음)
   * @param years 연
   */
  addYears(years: number): DateOnly {
    return this.setYear(this.year + years);
  }

  /**
   * `months`개월 후로 이동후 반환 (현재 객체의 일자는 변하지 않음)
   * @param months 월
   */
  addMonths(months: number): DateOnly {
    return this.setMonth(this.month + months);
  }

  /**
   * `days`일 후로 이동후 반환 (현재 객체의 일자는 변하지 않음)
   * @param days 일
   */
  addDays(days: number): DateOnly {
    return this.setDay(this.day + days);
  }

  /**
   * 포맷문자열을 활용하여, 문자열 형식으로 변환
   *
   * C#과 동일: [참조링크](https://docs.microsoft.com/ko-kr/dotnet/standard/base-types/custom-date-and-time-format-strings)
   *
   * @param format
   */
  toFormatString(format: string): string {
    return DateTimeFormatUtils.format(format, {
      year: this.year,
      month: this.month,
      day: this.day,
    });
  }

  /**
   * 문자열 형식으로 변환 (yyyy-MM-dd)
   */
  toString(): string {
    return this.toFormatString("yyyy-MM-dd");
  }
}
