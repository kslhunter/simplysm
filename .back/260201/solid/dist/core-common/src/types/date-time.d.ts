/**
 * 날짜시간 클래스 (불변)
 *
 * JavaScript Date 객체를 래핑하여 불변성과 편리한 API를 제공한다.
 * 밀리초 단위까지 지원하며, 로컬 타임존을 기준으로 동작한다.
 *
 * @example
 * const now = new DateTime();
 * const specific = new DateTime(2025, 1, 15, 10, 30, 0);
 * const parsed = DateTime.parse("2025-01-15 10:30:00");
 */
export declare class DateTime {
  readonly date: Date;
  /** 현재 시간으로 생성 */
  constructor();
  /** 연월일시분초밀리초로 생성 */
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
  /**
   * 문자열을 파싱하여 DateTime 인스턴스를 생성
   *
   * @param str 날짜시간 문자열
   * @returns 파싱된 DateTime 인스턴스
   * @throws ArgumentError 지원하지 않는 형식인 경우
   *
   * @example
   * DateTime.parse("2025-01-15 10:30:00")     // yyyy-MM-dd HH:mm:ss
   * DateTime.parse("2025-01-15 10:30:00.123") // yyyy-MM-dd HH:mm:ss.fff
   * DateTime.parse("20250115103000")          // yyyyMMddHHmmss
   * DateTime.parse("2025-01-15 오전 10:30:00") // yyyy-MM-dd 오전/오후 HH:mm:ss
   * DateTime.parse("2025-01-15T10:30:00Z")    // ISO 8601
   */
  static parse(str: string): DateTime;
  get year(): number;
  get month(): number;
  get day(): number;
  get hour(): number;
  get minute(): number;
  get second(): number;
  get millisecond(): number;
  get tick(): number;
  /** 요일 (일~토: 0~6) */
  get dayOfWeek(): number;
  get timezoneOffsetMinutes(): number;
  /** 날짜시간 세팅이 제대로 되었는지 여부 */
  get isValid(): boolean;
  /** 지정된 연도로 새 인스턴스 반환 */
  setYear(year: number): DateTime;
  /**
   * 지정된 월로 새 DateTime 인스턴스를 반환
   * @param month 설정할 월 (1-12, 범위 외 값은 연도 조정)
   * @note 대상 월의 일수보다 현재 일자가 크면 해당 월의 마지막 날로 조정됨
   *       (예: 1월 31일에서 setMonth(2) → 2월 28일 또는 29일)
   */
  setMonth(month: number): DateTime;
  /**
   * 지정된 일자로 새 DateTime 인스턴스를 반환
   * @param day 설정할 일자
   * @note 해당 월의 유효 범위를 벗어나는 일자는 JavaScript Date 기본 동작에 따라
   *       자동으로 다음/이전 달로 조정됨 (예: 1월에 day=32 → 2월 1일)
   */
  setDay(day: number): DateTime;
  /** 지정된 시로 새 인스턴스 반환 */
  setHour(hour: number): DateTime;
  /** 지정된 분으로 새 인스턴스 반환 */
  setMinute(minute: number): DateTime;
  /** 지정된 초로 새 인스턴스 반환 */
  setSecond(second: number): DateTime;
  /** 지정된 밀리초로 새 인스턴스 반환 */
  setMillisecond(millisecond: number): DateTime;
  /** 지정된 연수를 더한 새 인스턴스 반환 */
  addYears(years: number): DateTime;
  /** 지정된 월수를 더한 새 인스턴스 반환 */
  addMonths(months: number): DateTime;
  /** 지정된 일수를 더한 새 인스턴스 반환 */
  addDays(days: number): DateTime;
  /** 지정된 시간을 더한 새 인스턴스 반환 */
  addHours(hours: number): DateTime;
  /** 지정된 분을 더한 새 인스턴스 반환 */
  addMinutes(minutes: number): DateTime;
  /** 지정된 초를 더한 새 인스턴스 반환 */
  addSeconds(seconds: number): DateTime;
  /** 지정된 밀리초를 더한 새 인스턴스 반환 */
  addMilliseconds(milliseconds: number): DateTime;
  /**
   * 지정된 포맷으로 문자열 변환
   * @param format 포맷 문자열
   * @see dtFormat 지원 포맷 문자열 참조
   */
  toFormatString(formatStr: string): string;
  toString(): string;
}
//# sourceMappingURL=date-time.d.ts.map
