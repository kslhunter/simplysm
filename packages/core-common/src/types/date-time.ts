import { ArgumentError } from "../errors/argument-error";
import { convert12To24, format, normalizeMonth } from "../utils/date-format";

/**
 * DateTime 클래스 (불변)
 *
 * JavaScript Date 객체를 래핑하여 불변성과 편리한 API를 제공.
 * 밀리초 정밀도를 지원하고 로컬 타임존 기준으로 동작함.
 *
 * @example
 * const now = new DateTime();
 * const specific = new DateTime(2025, 1, 15, 10, 30, 0);
 * const parsed = DateTime.parse("2025-01-15 10:30:00");
 */
export class DateTime {
  readonly date: Date;

  /** 현재 시간으로 생성 */
  constructor();
  /** 년, 월, 일, 시, 분, 초, 밀리초로 생성 */
  constructor(
    year: number,
    month: number,
    day: number,
    hour?: number,
    minute?: number,
    second?: number,
    millisecond?: number,
  );
  /** tick (밀리초)으로 생성 */
  constructor(tick: number);
  /** Date 객체로 생성 */
  constructor(date: Date);
  constructor(
    arg1?: number | Date,
    arg2?: number,
    arg3?: number,
    arg4?: number,
    arg5?: number,
    arg6?: number,
    arg7?: number,
  ) {
    if (arg1 === undefined) {
      this.date = new Date();
    } else if (arg2 !== undefined && arg3 !== undefined) {
      this.date = new Date(
        arg1 as number,
        arg2 - 1,
        arg3,
        arg4 ?? 0,
        arg5 ?? 0,
        arg6 ?? 0,
        arg7 ?? 0,
      );
    } else if (arg1 instanceof Date) {
      this.date = new Date(arg1.getTime());
    } else {
      this.date = new Date(arg1);
    }
  }

  /**
   * 문자열을 파싱하여 DateTime 인스턴스 생성
   *
   * @param str DateTime 문자열
   * @returns 파싱된 DateTime 인스턴스
   * @throws ArgumentError 지원하지 않는 형식인 경우
   *
   * @example
   * DateTime.parse("2025-01-15 10:30:00")     // yyyy-MM-dd HH:mm:ss
   * DateTime.parse("2025-01-15 10:30:00.123") // yyyy-MM-dd HH:mm:ss.fff
   * DateTime.parse("20250115103000")          // yyyyMMddHHmmss
   * DateTime.parse("2025-01-15 AM 10:30:00")  // yyyy-MM-dd AM/PM HH:mm:ss
   * DateTime.parse("2025-01-15T10:30:00Z")    // ISO 8601
   */
  static parse(str: string): DateTime {
    const parsedTick = Date.parse(str);
    if (!Number.isNaN(parsedTick)) {
      return new DateTime(parsedTick);
    }

    const match1 =
      /^([0-9]{4})-([0-9]{2})-([0-9]{2}) (AM|PM) ([0-9]{1,2}):([0-9]{2}):([0-9]{2})(\.([0-9]{1,3}))?$/i.exec(
        str,
      );
    if (match1 != null) {
      const rawHour = Number(match1[5]);
      const isPM = match1[4].toUpperCase() === "PM";
      const hour = convert12To24(rawHour, isPM);
      return new DateTime(
        Number(match1[1]),
        Number(match1[2]),
        Number(match1[3]),
        hour,
        Number(match1[6]),
        Number(match1[7]),
        match1[9] ? Number(match1[9].padEnd(3, "0")) : undefined,
      );
    }

    // 한국어 오전/오후 형식
    const matchKorean =
      /^([0-9]{4})-([0-9]{2})-([0-9]{2}) (오전|오후) ([0-9]{1,2}):([0-9]{2}):([0-9]{2})(\.([0-9]{1,3}))?$/.exec(
        str,
      );
    if (matchKorean != null) {
      const rawHour = Number(matchKorean[5]);
      const isPM = matchKorean[4] === "오후";
      const hour = convert12To24(rawHour, isPM);
      return new DateTime(
        Number(matchKorean[1]),
        Number(matchKorean[2]),
        Number(matchKorean[3]),
        hour,
        Number(matchKorean[6]),
        Number(matchKorean[7]),
        matchKorean[9] ? Number(matchKorean[9].padEnd(3, "0")) : undefined,
      );
    }

    const match2 = /^[0-9]{14}$/.exec(str);
    if (match2 != null) {
      return new DateTime(
        Number(str.substring(0, 4)),
        Number(str.substring(4, 6)),
        Number(str.substring(6, 8)),
        Number(str.substring(8, 10)),
        Number(str.substring(10, 12)),
        Number(str.substring(12, 14)),
      );
    }

    const match3 =
      /^([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})(\.([0-9]{1,3}))?$/.exec(
        str,
      );
    if (match3 != null) {
      return new DateTime(
        Number(match3[1]),
        Number(match3[2]),
        Number(match3[3]),
        Number(match3[4]),
        Number(match3[5]),
        Number(match3[6]),
        match3[8] ? Number(match3[8].padEnd(3, "0")) : undefined,
      );
    }

    throw new ArgumentError(
      `날짜시간 형식 파싱 실패. 지원 형식: 'yyyy-MM-dd HH:mm:ss', 'yyyyMMddHHmmss', 'yyyy-MM-dd AM/PM HH:mm:ss', ISO 8601`,
      { input: str },
    );
  }

  //#region Getters (읽기 전용)

  get year(): number {
    return this.date.getFullYear();
  }

  get month(): number {
    return this.date.getMonth() + 1;
  }

  get day(): number {
    return this.date.getDate();
  }

  get hour(): number {
    return this.date.getHours();
  }

  get minute(): number {
    return this.date.getMinutes();
  }

  get second(): number {
    return this.date.getSeconds();
  }

  get millisecond(): number {
    return this.date.getMilliseconds();
  }

  get tick(): number {
    return this.date.getTime();
  }

  /** 요일 (일요일~토요일: 0~6) */
  get dayOfWeek(): number {
    return this.date.getDay();
  }

  get timezoneOffsetMinutes(): number {
    return -this.date.getTimezoneOffset();
  }

  /** 날짜시간이 올바르게 설정되었는지 여부 */
  get isValid(): boolean {
    return this.date instanceof Date && !Number.isNaN(this.date.getTime());
  }

  //#endregion

  //#region 불변 변환 메서드 (새 인스턴스 반환)

  /** 지정된 연도로 새 인스턴스 반환 */
  setYear(year: number): DateTime {
    const lastDay = new Date(year, this.month, 0).getDate();
    return new DateTime(
      year,
      this.month,
      Math.min(this.day, lastDay),
      this.hour,
      this.minute,
      this.second,
      this.millisecond,
    );
  }

  /**
   * 지정된 월로 새 DateTime 인스턴스 반환
   * @param month 설정할 월 (1-12, 범위 밖의 값은 연도에서 조정됨)
   * @note 현재 일이 대상 월의 일수보다 크면 해당 월의 마지막 일로 조정됨
   *       (예: 1월 31일에서 setMonth(2) → 2월 28일 또는 29일)
   */
  setMonth(month: number): DateTime {
    const normalized = normalizeMonth(this.year, month, this.day);
    return new DateTime(
      normalized.year,
      normalized.month,
      normalized.day,
      this.hour,
      this.minute,
      this.second,
      this.millisecond,
    );
  }

  /**
   * 지정된 일로 새 DateTime 인스턴스 반환
   * @param day 설정할 일
   * @note 유효한 월 범위를 벗어나는 일은 JavaScript Date 동작에 따라 자동으로 다음/이전 월로 조정됨
   *       (예: 1월에 day=32 → 2월 1일)
   */
  setDay(day: number): DateTime {
    return new DateTime(
      this.year,
      this.month,
      day,
      this.hour,
      this.minute,
      this.second,
      this.millisecond,
    );
  }

  /** 지정된 시로 새 인스턴스 반환 */
  setHour(hour: number): DateTime {
    return new DateTime(
      this.year,
      this.month,
      this.day,
      hour,
      this.minute,
      this.second,
      this.millisecond,
    );
  }

  /** 지정된 분으로 새 인스턴스 반환 */
  setMinute(minute: number): DateTime {
    return new DateTime(
      this.year,
      this.month,
      this.day,
      this.hour,
      minute,
      this.second,
      this.millisecond,
    );
  }

  /** 지정된 초로 새 인스턴스 반환 */
  setSecond(second: number): DateTime {
    return new DateTime(
      this.year,
      this.month,
      this.day,
      this.hour,
      this.minute,
      second,
      this.millisecond,
    );
  }

  /** 지정된 밀리초로 새 인스턴스 반환 */
  setMillisecond(millisecond: number): DateTime {
    return new DateTime(
      this.year,
      this.month,
      this.day,
      this.hour,
      this.minute,
      this.second,
      millisecond,
    );
  }

  //#endregion

  //#region 산술 메서드 (새 인스턴스 반환)

  /** 지정된 연수를 더한 새 인스턴스 반환 */
  addYears(years: number): DateTime {
    return this.setYear(this.year + years);
  }

  /** 지정된 월수를 더한 새 인스턴스 반환 */
  addMonths(months: number): DateTime {
    return this.setMonth(this.month + months);
  }

  /** 지정된 일수를 더한 새 인스턴스 반환 */
  addDays(days: number): DateTime {
    return this.setDay(this.day + days);
  }

  /** 지정된 시간을 더한 새 인스턴스 반환 */
  addHours(hours: number): DateTime {
    return new DateTime(this.tick + hours * 60 * 60 * 1000);
  }

  /** 지정된 분을 더한 새 인스턴스 반환 */
  addMinutes(minutes: number): DateTime {
    return new DateTime(this.tick + minutes * 60 * 1000);
  }

  /** 지정된 초를 더한 새 인스턴스 반환 */
  addSeconds(seconds: number): DateTime {
    return new DateTime(this.tick + seconds * 1000);
  }

  /** 지정된 밀리초를 더한 새 인스턴스 반환 */
  addMilliseconds(milliseconds: number): DateTime {
    return new DateTime(this.tick + milliseconds);
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
      hour: this.hour,
      minute: this.minute,
      second: this.second,
      millisecond: this.millisecond,
      timezoneOffsetMinutes: this.timezoneOffsetMinutes,
    });
  }

  toString(): string {
    return this.toFormatString("yyyy-MM-ddTHH:mm:ss.fffzzz");
  }

  //#endregion
}
