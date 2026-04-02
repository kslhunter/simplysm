import { ArgumentError } from "../errors/argument-error";
import { format, normalizeMonth } from "../utils/date-format";

/**
 * 날짜 클래스 (시간 제외: yyyy-MM-dd, 불변)
 *
 * 시간 정보 없이 날짜만 저장하는 불변 클래스.
 * 로컬 타임존 기준으로 동작함.
 *
 * @example
 * const today = new DateOnly();
 * const specific = new DateOnly(2025, 1, 15);
 * const parsed = DateOnly.parse("2025-01-15");
 */
export class DateOnly {
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  readonly date: Date;

  /** 현재 시간 */
  constructor();
  /** 년, 월, 일로 초기화 */
  constructor(year: number, month: number, day: number);
  /** tick (밀리초)으로 생성 */
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

  /**
   * 문자열을 DateOnly로 파싱
   * @param str 날짜 문자열
   * @returns DateOnly 인스턴스
   *
   * 지원 형식:
   * - `yyyy-MM-dd` (예: '2024-01-15') - 문자열에서 직접 추출, 타임존 무관
   * - `yyyyMMdd` (예: '20240115') - 문자열에서 직접 추출, 타임존 무관
   * - ISO 8601 (예: '2024-01-15T00:00:00Z') - UTC로 해석 후 로컬 타임존으로 변환
   *
   * @note 서버/클라이언트 타임존이 다른 경우 `yyyy-MM-dd` 형식 권장
   * @note DST 지역에서 ISO 8601 형식 파싱 시 파싱 대상 날짜의 오프셋이 사용됨.
   */
  static parse(str: string): DateOnly {
    // yyyy-MM-dd 형식 (타임존 무관)
    const matchYMD = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (matchYMD != null) {
      return new DateOnly(Number(matchYMD[1]), Number(matchYMD[2]), Number(matchYMD[3]));
    }

    // yyyyMMdd 형식 (타임존 무관)
    const matchCompact = /^(\d{4})(\d{2})(\d{2})$/.exec(str);
    if (matchCompact != null) {
      return new DateOnly(
        Number(matchCompact[1]),
        Number(matchCompact[2]),
        Number(matchCompact[3]),
      );
    }

    // ISO 8601 및 기타 형식 (Date.parse 사용, 타임존 변환 적용)
    // Date.parse()는 'Z' 접미사가 있는 ISO 8601에 대해 UTC tick을 반환
    // getTimezoneOffset()은 "로컬에서 UTC로 변환할 때 더해야 하는 분"을 반환 (KST는 -540 = UTC+9)
    // 여기서는 "UTC → 로컬" 변환이므로 반대 부호 적용 (빼기)
    // DST 지역에서 정확한 변환을 위해 파싱 대상 날짜의 오프셋 사용
    const utcTick = Date.parse(str);
    if (!Number.isNaN(utcTick)) {
      const tempDate = new Date(utcTick);
      const offsetMinutes = tempDate.getTimezoneOffset();
      const localTick = utcTick - offsetMinutes * 60 * 1000;
      return new DateOnly(localTick);
    }

    throw new ArgumentError(
      `날짜 형식 파싱 실패. 지원 형식: 'yyyy-MM-dd', 'yyyyMMdd', ISO 8601 date`,
      {
        input: str,
      },
    );
  }

  //#region 주차 계산

  /**
   * 주차 정보 기반으로 기준 연도와 월 반환
   * @param weekStartDay 주 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
   * @param minDaysInFirstWeek 첫 번째 주로 간주되기 위한 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
   * @returns 이 날짜가 포함된 주의 기준 연도와 월
   *
   * @example
   * // ISO 8601 표준 (월요일 시작, 첫 주 최소 4일)
   * new DateOnly(2024, 1, 1).getBaseYearMonthSeqForWeekSeq(1, 4)
   * // 미국식 (일요일 시작, 첫 주 최소 1일)
   * new DateOnly(2024, 1, 1).getBaseYearMonthSeqForWeekSeq(0, 1)
   */
  getBaseYearMonthSeqForWeekSeq(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    // 주 시작 요일 기준 요일 인덱스 계산 (0 = 주 시작 요일)
    const dayOfWeek = (this.dayOfWeek + 7 - weekStartDay) % 7;
    // 현재 주의 남은 일수 (현재 날짜 포함)
    const daysInWeek = 7 - dayOfWeek;

    // 현재 주의 남은 일수가 최소 일수보다 적으면 이전 주로 간주
    if (daysInWeek < minDaysInFirstWeek) {
      const prevWeek = this.addDays(-7);
      return { year: prevWeek.year, monthSeq: prevWeek.month };
    } else {
      // 월 경계를 고려한 실제 남은 일수 계산
      const nextMonthDate = this.addMonths(1).setDay(1);
      const remainedDays = (nextMonthDate.tick - this.tick) / DateOnly.MS_PER_DAY;

      // 월 경계까지의 실제 일수와 주 남은 일수 중 작은 값 사용
      const realDaysInWeek = Math.min(daysInWeek, remainedDays);
      // 월 경계를 고려했을 때도 최소 일수보다 적으면 다음 주로 간주
      if (realDaysInWeek < minDaysInFirstWeek) {
        const nextWeek = this.addDays(7);
        return { year: nextWeek.year, monthSeq: nextWeek.month };
      } else {
        return { year: this.year, monthSeq: this.month };
      }
    }
  }

  /**
   * 주차 정보 기반으로 해당 주의 시작 날짜 계산
   * @param weekStartDay 주 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
   * @param minDaysInFirstWeek 첫 번째 주로 간주되기 위한 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
   * @returns 이 날짜가 포함된 주의 시작 날짜
   */
  getWeekSeqStartDate(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    const dayOfWeek = (this.dayOfWeek + 7 - weekStartDay) % 7;
    const daysInFirstWeek = 7 - dayOfWeek;

    if (daysInFirstWeek < minDaysInFirstWeek) {
      return this.addDays(-dayOfWeek + 7);
    } else {
      return this.addDays(-dayOfWeek);
    }
  }

  /**
   * 연도와 주차 정보 반환
   * @param weekStartDay 주 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
   * @param minDaysInFirstWeek 첫 번째 주로 간주되기 위한 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
   * @returns 해당 연도와 그 연도 내의 주차 번호
   *
   * @example
   * // ISO 8601 표준 (월요일 시작, 첫 주 최소 4일)
   * new DateOnly(2025, 1, 6).getWeekSeqOfYear(); // { year: 2025, weekSeq: 2 }
   *
   * // 미국식 (일요일 시작, 첫 주 최소 1일)
   * new DateOnly(2025, 1, 1).getWeekSeqOfYear(0, 1); // { year: 2025, weekSeq: 1 }
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

    const diffDays = (this.tick - firstWeekStart.tick) / DateOnly.MS_PER_DAY;
    return {
      year: base.year,
      weekSeq: Math.floor(diffDays / 7) + 1,
    };
  }

  /**
   * 해당 날짜의 연도, 월, 주차 정보 반환
   * @param weekStartDay 주 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
   * @param minDaysInFirstWeek 첫 번째 주로 간주되기 위한 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
   * @returns 연도, 월, 해당 월 내의 주차 번호
   *
   * @example
   * // ISO 8601 표준 (월요일 시작, 첫 주 최소 4일)
   * new DateOnly(2025, 1, 15).getWeekSeqOfMonth(); // { year: 2025, monthSeq: 1, weekSeq: 3 }
   *
   * // 미국식 (일요일 시작, 첫 주 최소 1일)
   * new DateOnly(2025, 1, 15).getWeekSeqOfMonth(0, 1); // { year: 2025, monthSeq: 1, weekSeq: 3 }
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

    const diffDays = (this.tick - firstWeekStart.tick) / DateOnly.MS_PER_DAY;
    return {
      year: base.year,
      monthSeq: base.monthSeq,
      weekSeq: Math.floor(diffDays / 7) + 1,
    };
  }

  /**
   * 주차 정보 기반으로 해당 주의 시작 날짜 반환
   * @param arg 연도, 선택적 월, 주차 번호
   * @param weekStartDay 주 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
   * @param minDaysInFirstWeek 첫 번째 주로 간주되기 위한 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
   * @returns 지정된 주의 시작 날짜
   *
   * @example
   * // 2025년 2주차 시작 날짜 (ISO 8601 표준)
   * DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 }); // 2025-01-06 (월요일)
   *
   * // 2025년 1월 3주차 시작 날짜
   * DateOnly.getDateByYearWeekSeq({ year: 2025, month: 1, weekSeq: 3 }); // 2025-01-13 (월요일)
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

  /** 날짜가 올바르게 설정되었는지 여부 */
  get isValid(): boolean {
    return this.date instanceof Date && !Number.isNaN(this.date.getTime());
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

  /** 요일 (일요일~토요일: 0~6) */
  get dayOfWeek(): number {
    return this.date.getDay();
  }

  //#endregion

  //#region 불변 변환 메서드 (새 인스턴스 반환)

  /** 지정된 연도로 새 인스턴스 반환 */
  setYear(year: number): DateOnly {
    const lastDay = new Date(year, this.month, 0).getDate();
    return new DateOnly(year, this.month, Math.min(this.day, lastDay));
  }

  /**
   * 지정된 월로 새 DateOnly 인스턴스 반환
   * @param month 설정할 월 (1-12, 범위 밖의 값은 연도에서 조정됨)
   * @note 현재 일이 대상 월의 일수보다 크면 해당 월의 마지막 일로 조정됨
   *       (예: 1월 31일에서 setMonth(2) → 2월 28일 또는 29일)
   */
  setMonth(month: number): DateOnly {
    const normalized = normalizeMonth(this.year, month, this.day);
    return new DateOnly(normalized.year, normalized.month, normalized.day);
  }

  /**
   * 지정된 일로 새 DateOnly 인스턴스 반환
   * @param day 설정할 일
   * @note 유효한 월 범위를 벗어나는 일은 JavaScript Date 동작에 따라 자동으로 다음/이전 월로 조정됨
   *       (예: 1월에 day=32 → 2월 1일)
   */
  setDay(day: number): DateOnly {
    return new DateOnly(this.year, this.month, day);
  }

  //#endregion

  //#region 산술 메서드 (새 인스턴스 반환)

  /** 지정된 연수를 더한 새 인스턴스 반환 */
  addYears(years: number): DateOnly {
    return this.setYear(this.year + years);
  }

  /** 지정된 월수를 더한 새 인스턴스 반환 */
  addMonths(months: number): DateOnly {
    return this.setMonth(this.month + months);
  }

  /** 지정된 일수를 더한 새 인스턴스 반환 */
  addDays(days: number): DateOnly {
    return this.setDay(this.day + days);
  }

  //#endregion

  //#region Formatting

  /**
   * 지정된 형식으로 문자열 변환
   * @param format 형식 문자열
   * @see dtFormat 지원되는 형식 문자열 참조
   */
  toFormatString(formatStr: string): string {
    return format(formatStr, {
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
