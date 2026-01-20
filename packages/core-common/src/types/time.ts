import { ArgumentError } from "../errors/argument-error";
import { DateTimeFormatUtils } from "../utils/date-format";
import { DateTime } from "./date-time";

/**
 * 시간 클래스 (날짜제외: HH:mm:ss.fff, 불변)
 *
 * 날짜 정보 없이 시간만 저장하는 불변 클래스입니다.
 * 24시간을 초과하거나 음수인 경우 자동으로 정규화됩니다.
 *
 * @example
 * const now = new Time();
 * const specific = new Time(10, 30, 0);
 * const parsed = Time.parse("10:30:00");
 */
export class Time {
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  private readonly _tick: number;

  /** 현재 시간으로 생성 */
  constructor();
  /** 시분초밀리초로 생성 */
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  /** tick (밀리초)으로 생성 */
  constructor(tick: number);
  /** Date 객체에서 시간 부분만 추출하여 생성 */
  constructor(date: Date);
  constructor(arg1?: number | Date, arg2?: number, arg3?: number, arg4?: number) {
    if (arg1 === undefined) {
      const now = new Date();
      this._tick =
        (now.getMilliseconds() +
          now.getSeconds() * 1000 +
          now.getMinutes() * 60 * 1000 +
          now.getHours() * 60 * 60 * 1000) %
        Time.MS_PER_DAY;
    } else if (arg2 !== undefined) {
      this._tick =
        ((arg4 ?? 0) +
          (arg3 ?? 0) * 1000 +
          arg2 * 60 * 1000 +
          (arg1 as number) * 60 * 60 * 1000) %
        Time.MS_PER_DAY;
    } else if (arg1 instanceof Date) {
      this._tick =
        (arg1.getMilliseconds() +
          arg1.getSeconds() * 1000 +
          arg1.getMinutes() * 60 * 1000 +
          arg1.getHours() * 60 * 60 * 1000) %
        Time.MS_PER_DAY;
    } else {
      let tick = arg1 % Time.MS_PER_DAY;
      if (tick < 0) tick += Time.MS_PER_DAY;
      this._tick = tick;
    }
  }

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
  static parse(str: string): Time {
    const match1 = /(오전|오후) ([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})(\.([0-9]{1,3}))?$/.exec(str);
    if (match1 != null) {
      const rawHour = Number(match1[2]);
      const isPM = match1[1] === "오후";
      // 12시간제 → 24시간제 변환
      // 오전 12시 = 0시, 오후 12시 = 12시
      // 오전 1-11시 = 1-11시, 오후 1-11시 = 13-23시
      let hour: number;
      if (rawHour === 12) {
        hour = isPM ? 12 : 0;
      } else {
        hour = isPM ? rawHour + 12 : rawHour;
      }
      return new Time(
        hour,
        Number(match1[3]),
        Number(match1[4]),
        Number(match1[6] ? match1[6].padEnd(3, "0") : "0"),
      );
    }

    const match2 = /([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})(\.([0-9]{1,3}))?$/.exec(str);
    if (match2 != null) {
      return new Time(
        Number(match2[1]),
        Number(match2[2]),
        Number(match2[3]),
        Number(match2[5] ? match2[5].padEnd(3, "0") : "0"),
      );
    }

    try {
      const dt = DateTime.parse(str);
      return new Time(dt.hour, dt.minute, dt.second, dt.millisecond);
    } catch {
      throw new ArgumentError(
        `시간 형식을 파싱할 수 없습니다. 지원 형식: 'HH:mm:ss', 'HH:mm:ss.fff', '오전/오후 HH:mm:ss'`,
        { input: str },
      );
    }
  }

  //#region Getters (읽기 전용)

  get hour(): number {
    return Math.floor(this._tick / (60 * 60 * 1000));
  }

  get minute(): number {
    return Math.floor(this._tick / (60 * 1000)) % 60;
  }

  get second(): number {
    return Math.floor(this._tick / 1000) % 60;
  }

  get millisecond(): number {
    return this._tick % 1000;
  }

  get tick(): number {
    return this._tick;
  }

  /** 시간 세팅이 제대로 되었는지 여부 */
  get isValid(): boolean {
    return !Number.isNaN(this._tick);
  }

  //#endregion

  //#region 불변 변환 메서드 (새 인스턴스 반환)

  setHour(hour: number): Time {
    return new Time(hour, this.minute, this.second, this.millisecond);
  }

  setMinute(minute: number): Time {
    return new Time(this.hour, minute, this.second, this.millisecond);
  }

  setSecond(second: number): Time {
    return new Time(this.hour, this.minute, second, this.millisecond);
  }

  setMillisecond(millisecond: number): Time {
    return new Time(this.hour, this.minute, this.second, millisecond);
  }

  //#endregion

  //#region 산술 메서드 (새 인스턴스 반환)

  addHours(hours: number): Time {
    let newTick = (this._tick + hours * 60 * 60 * 1000) % Time.MS_PER_DAY;
    if (newTick < 0) newTick += Time.MS_PER_DAY;
    return new Time(newTick);
  }

  addMinutes(minutes: number): Time {
    let newTick = (this._tick + minutes * 60 * 1000) % Time.MS_PER_DAY;
    if (newTick < 0) newTick += Time.MS_PER_DAY;
    return new Time(newTick);
  }

  addSeconds(seconds: number): Time {
    let newTick = (this._tick + seconds * 1000) % Time.MS_PER_DAY;
    if (newTick < 0) newTick += Time.MS_PER_DAY;
    return new Time(newTick);
  }

  addMilliseconds(milliseconds: number): Time {
    let newTick = (this._tick + milliseconds) % Time.MS_PER_DAY;
    if (newTick < 0) newTick += Time.MS_PER_DAY;
    return new Time(newTick);
  }

  //#endregion

  //#region 포맷팅

  toFormatString(format: string): string {
    return DateTimeFormatUtils.format(format, {
      hour: this.hour,
      minute: this.minute,
      second: this.second,
      millisecond: this.millisecond,
    });
  }

  toString(): string {
    return this.toFormatString("HH:mm:ss.fff");
  }

  //#endregion
}
