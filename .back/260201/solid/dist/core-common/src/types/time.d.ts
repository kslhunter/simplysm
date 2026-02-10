/**
 * 시간 클래스 (날짜제외: HH:mm:ss.fff, 불변)
 *
 * 날짜 정보 없이 시간만 저장하는 불변 클래스이다.
 * 24시간을 초과하거나 음수인 경우 자동으로 정규화된다.
 *
 * @example
 * const now = new Time();
 * const specific = new Time(10, 30, 0);
 * const parsed = Time.parse("10:30:00");
 */
export declare class Time {
  private static readonly MS_PER_DAY;
  private readonly _tick;
  /** 현재 시간으로 생성 */
  constructor();
  /** 시분초밀리초로 생성 */
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  /** tick (밀리초)으로 생성 */
  constructor(tick: number);
  /** Date 객체에서 시간 부분만 추출하여 생성 */
  constructor(date: Date);
  /**
   * 문자열을 파싱하여 Time 인스턴스를 생성
   *
   * @param str 시간 문자열
   * @returns 파싱된 Time 인스턴스
   * @throws ArgumentError 지원하지 않는 형식인 경우
   *
   * @example
   * Time.parse("10:30:00")           // HH:mm:ss
   * Time.parse("10:30:00.123")       // HH:mm:ss.fff
   * Time.parse("오전 10:30:00")       // 오전/오후 HH:mm:ss
   * Time.parse("2025-01-15T10:30:00") // ISO 8601 (시간 부분만 추출)
   */
  static parse(str: string): Time;
  get hour(): number;
  get minute(): number;
  get second(): number;
  get millisecond(): number;
  get tick(): number;
  /** 시간 세팅이 제대로 되었는지 여부 */
  get isValid(): boolean;
  /** 지정된 시로 새 인스턴스 반환 */
  setHour(hour: number): Time;
  /** 지정된 분으로 새 인스턴스 반환 */
  setMinute(minute: number): Time;
  /** 지정된 초로 새 인스턴스 반환 */
  setSecond(second: number): Time;
  /** 지정된 밀리초로 새 인스턴스 반환 */
  setMillisecond(millisecond: number): Time;
  /** 지정된 시간을 더한 새 인스턴스 반환 (24시간 순환) */
  addHours(hours: number): Time;
  /** 지정된 분을 더한 새 인스턴스 반환 (24시간 순환) */
  addMinutes(minutes: number): Time;
  /** 지정된 초를 더한 새 인스턴스 반환 (24시간 순환) */
  addSeconds(seconds: number): Time;
  /** 지정된 밀리초를 더한 새 인스턴스 반환 (24시간 순환) */
  addMilliseconds(milliseconds: number): Time;
  /**
   * 지정된 포맷으로 문자열 변환
   * @param format 포맷 문자열
   * @see dtFormat 지원 포맷 문자열 참조
   */
  toFormatString(formatStr: string): string;
  toString(): string;
}
//# sourceMappingURL=time.d.ts.map
