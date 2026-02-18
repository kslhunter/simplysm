import { ArgumentError } from "../errors/argument-error";
import { formatDate, normalizeMonth } from "../utils/date-format";

/**
 * 날짜 클래스 (시간제외: yyyy-MM-dd, 불변)
 *
 * 시간 정보 없이 날짜만 저장하는 불변 클래스이다.
 * 로컬 타임존을 기준으로 동작한다.
 *
 * @example
 * const today = new DateOnly();
 * const specific = new DateOnly(2025, 1, 15);
 * const parsed = DateOnly.parse("2025-01-15");
 */
export class DateOnly {
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

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

  /**
   * 문자열을 DateOnly로 파싱
   * @param str 날짜 문자열
   * @returns DateOnly 인스턴스
   *
   * 지원 형식:
   * - `yyyy-MM-dd` (예: '2024-01-15') - 문자열에서 직접 추출, 타임존 영향 없음
   * - `yyyyMMdd` (예: '20240115') - 문자열에서 직접 추출, 타임존 영향 없음
   * - ISO 8601 (예: '2024-01-15T00:00:00Z') - UTC로 해석 후 로컬 타임존 변환
   *
   * @note 서버/클라이언트 타임존이 다른 경우 `yyyy-MM-dd` 형식 사용 권장
   * @note DST(일광절약시간) 지역에서 ISO 8601 형식 파싱 시, 파싱 대상 날짜의 오프셋을 사용합니다.
   */
  static parse(str: string): DateOnly {
    // yyyy-MM-dd 형식 (타임존 영향 없음)
    const matchYMD = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (matchYMD != null) {
      return new DateOnly(Number(matchYMD[1]), Number(matchYMD[2]), Number(matchYMD[3]));
    }

    // yyyyMMdd 형식 (타임존 영향 없음)
    const matchCompact = /^(\d{4})(\d{2})(\d{2})$/.exec(str);
    if (matchCompact != null) {
      return new DateOnly(
        Number(matchCompact[1]),
        Number(matchCompact[2]),
        Number(matchCompact[3]),
      );
    }

    // ISO 8601 등 기타 형식 (Date.parse 사용, 타임존 변환 적용)
    // Date.parse()는 'Z' 접미사가 있는 ISO 8601을 UTC tick으로 반환
    // getTimezoneOffset()은 "로컬에서 UTC로 변환할 때 더할 분"을 반환 (KST는 -540분 = UTC+9)
    // 여기서는 "UTC → 로컬" 변환이므로 부호를 반대로 적용 (뺄셈)
    // 파싱 대상 날짜의 오프셋을 사용하여 DST 지역에서도 정확한 변환
    const utcTick = Date.parse(str);
    if (!Number.isNaN(utcTick)) {
      const tempDate = new Date(utcTick);
      const offsetMinutes = tempDate.getTimezoneOffset();
      const localTick = utcTick - offsetMinutes * 60 * 1000;
      return new DateOnly(localTick);
    }

    throw new ArgumentError(
      `날짜 형식을 파싱할 수 없습니다. 지원 형식: 'yyyy-MM-dd', 'yyyyMMdd', ISO 8601 날짜`,
      {
        input: str,
      },
    );
  }

  //#region 주차 계산

  /**
   * 기준 연도와 월을 주차 정보를 기반으로 반환
   * @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
   * @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
   * @returns 해당 날짜가 속한 주차의 기준 연도와 월
   *
   * @example
   * // ISO 8601 표준 (월요일 시작, 첫 주 최소 4일)
   * new DateOnly(2024, 1, 1).getBaseYearMonthSeqForWeekSeq(1, 4)
   * // 미국식 (일요일 시작, 첫 주 최소 1일)
   * new DateOnly(2024, 1, 1).getBaseYearMonthSeqForWeekSeq(0, 1)
   */
  getBaseYearMonthSeqForWeekSeq(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    // 주의 시작 요일 기준으로 현재 날짜의 요일 인덱스 계산 (0 = 주 시작일)
    const dayOfWeek = (this.dayOfWeek + 7 - weekStartDay) % 7;
    // 현재 주의 남은 일수 (현재 날짜 포함)
    const daysInWeek = 7 - dayOfWeek;

    // 현재 주의 남은 일수가 첫 주 최소 일수 미만이면 이전 주로 간주
    if (daysInWeek < minDaysInFirstWeek) {
      const prevWeek = this.addDays(-7);
      return { year: prevWeek.year, monthSeq: prevWeek.month };
    } else {
      // 월 경계를 고려한 실제 주의 남은 일수 계산
      const nextMonthDate = this.addMonths(1).setDay(1);
      const remainedDays = (nextMonthDate.tick - this.tick) / DateOnly.MS_PER_DAY;

      // 월 경계까지의 실제 일수와 주의 남은 일수 중 작은 값
      const realDaysInWeek = Math.min(daysInWeek, remainedDays);
      // 월 경계 고려 시에도 첫 주 최소 일수 미만이면 다음 주로 간주
      if (realDaysInWeek < minDaysInFirstWeek) {
        const nextWeek = this.addDays(7);
        return { year: nextWeek.year, monthSeq: nextWeek.month };
      } else {
        return { year: this.year, monthSeq: this.month };
      }
    }
  }

  /**
   * 주차 정보를 기반으로 해당 주의 시작 날짜 계산
   * @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
   * @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
   * @returns 해당 날짜가 속한 주의 시작 날짜
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
   * 연도 및 주차 순서 정보를 반환
   * @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
   * @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
   * @returns 연도와 해당 연도 기준 주차 번호
   *
   * @example
   * // ISO 8601 표준 (월요일 시작, 첫 주 4일 이상)
   * new DateOnly(2025, 1, 6).getWeekSeqOfYear(); // { year: 2025, weekSeq: 2 }
   *
   * // 미국식 (일요일 시작, 첫 주 1일 이상)
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
   * 해당 날짜의 연도, 월 및 주차(weekSeq) 정보를 반환
   * @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
   * @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
   * @returns 연도, 월 및 해당 월 기준 주차 번호
   *
   * @example
   * // ISO 8601 표준 (월요일 시작, 첫 주 4일 이상)
   * new DateOnly(2025, 1, 15).getWeekSeqOfMonth(); // { year: 2025, monthSeq: 1, weekSeq: 3 }
   *
   * // 미국식 (일요일 시작, 첫 주 1일 이상)
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
   * 주차 정보를 기반으로 해당 주의 시작 날짜 가져오기
   * @param arg 연도, 선택적 월, 주차 번호
   * @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
   * @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
   * @returns 해당 주차의 시작 날짜
   *
   * @example
   * // 2025년 2주차의 시작일 (ISO 8601 표준)
   * DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 }); // 2025-01-06 (월요일)
   *
   * // 2025년 1월 3주차의 시작일
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

  /** 날짜 세팅이 제대로 되었는지 여부 */
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

  /** 요일 (일~토: 0~6) */
  get dayOfWeek(): number {
    return this.date.getDay();
  }

  //#endregion

  //#region 불변 변환 메서드 (새 인스턴스 반환)

  /** 지정된 연도로 새 인스턴스 반환 */
  setYear(year: number): DateOnly {
    return new DateOnly(year, this.month, this.day);
  }

  /**
   * 지정된 월로 새 DateOnly 인스턴스를 반환
   * @param month 설정할 월 (1-12, 범위 외 값은 연도 조정)
   * @note 대상 월의 일수보다 현재 일자가 크면 해당 월의 마지막 날로 조정됨
   *       (예: 1월 31일에서 setMonth(2) → 2월 28일 또는 29일)
   */
  setMonth(month: number): DateOnly {
    const normalized = normalizeMonth(this.year, month, this.day);
    return new DateOnly(normalized.year, normalized.month, normalized.day);
  }

  /**
   * 지정된 일자로 새 DateOnly 인스턴스를 반환
   * @param day 설정할 일자
   * @note 해당 월의 유효 범위를 벗어나는 일자는 JavaScript Date 기본 동작에 따라
   *       자동으로 다음/이전 달로 조정됨 (예: 1월에 day=32 → 2월 1일)
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
    return new DateOnly(this.tick + days * DateOnly.MS_PER_DAY);
  }

  //#endregion

  //#region 포맷팅

  /**
   * 지정된 포맷으로 문자열 변환
   * @param format 포맷 문자열
   * @see dtFormat 지원 포맷 문자열 참조
   */
  toFormatString(formatStr: string): string {
    return formatDate(formatStr, {
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
