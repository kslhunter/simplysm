import { ArgumentError } from "../errors/ArgumentError";
import { DateTimeFormatUtils } from "../utils/date-format";
import { DateTime } from "./DateTime";

/**
 * 시간 클래스 (날짜제외: HH:mm:ss.fff, 불변)
 */
export class Time {
  private readonly _tick: number;

  constructor();
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);
  constructor(arg1?: number | Date, arg2?: number, arg3?: number, arg4?: number) {
    if (arg1 === undefined) {
      const now = new Date();
      this._tick =
        (now.getMilliseconds() +
          now.getSeconds() * 1000 +
          now.getMinutes() * 60 * 1000 +
          now.getHours() * 60 * 60 * 1000) %
        (24 * 60 * 60 * 1000);
    } else if (arg2 !== undefined) {
      this._tick =
        ((arg4 ?? 0) +
          (arg3 ?? 0) * 1000 +
          arg2 * 60 * 1000 +
          (arg1 as number) * 60 * 60 * 1000) %
        (24 * 60 * 60 * 1000);
    } else if (arg1 instanceof Date) {
      this._tick =
        (arg1.getMilliseconds() +
          arg1.getSeconds() * 1000 +
          arg1.getMinutes() * 60 * 1000 +
          arg1.getHours() * 60 * 60 * 1000) %
        (24 * 60 * 60 * 1000);
    } else {
      this._tick = arg1 % (24 * 60 * 60 * 1000);
    }
  }

  static parse(str: string): Time {
    const match1 = /(오전|오후) ([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})(\.([0-9]{1,3}))?$/.exec(str);
    if (match1 != null) {
      return new Time(
        Number(match1[2]) + (match1[1] === "오후" ? 12 : 0),
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
    return new Time((this._tick + hours * 60 * 60 * 1000) % (24 * 60 * 60 * 1000));
  }

  addMinutes(minutes: number): Time {
    return new Time((this._tick + minutes * 60 * 1000) % (24 * 60 * 60 * 1000));
  }

  addSeconds(seconds: number): Time {
    return new Time((this._tick + seconds * 1000) % (24 * 60 * 60 * 1000));
  }

  addMilliseconds(milliseconds: number): Time {
    return new Time((this._tick + milliseconds) % (24 * 60 * 60 * 1000));
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
