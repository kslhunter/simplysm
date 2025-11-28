import { DateTime as LuxonDateTime } from "luxon";
import { ArgumentError } from "../../errors/ArgumentError";
import { DateTime } from "./DateTime";

export class Time {
  // [엔진 교체] 날짜는 무시하고 시간만 다루기 위해 1970-01-01로 고정된 Luxon 객체 사용
  private _dt: LuxonDateTime;

  constructor();
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);
  constructor(arg1?: number | Date, arg2?: number, arg3?: number, arg4?: number) {
    // 기준일: 1970-01-01 (UTC가 아닌 Local 기준이어야 Time 계산이 직관적)
    const baseDate = LuxonDateTime.fromMillis(0).setZone("system");

    if (arg1 === undefined) {
      // 현재 시간
      const now = LuxonDateTime.local();
      this._dt = baseDate.set({
        hour: now.hour,
        minute: now.minute,
        second: now.second,
        millisecond: now.millisecond,
      });
    } else if (arg2 !== undefined) {
      this._dt = baseDate.set({
        hour: arg1 as number,
        minute: arg2,
        second: arg3 ?? 0,
        millisecond: arg4 ?? 0,
      });
    } else if (arg1 instanceof Date) {
      const dt = LuxonDateTime.fromJSDate(arg1);
      this._dt = baseDate.set({
        hour: dt.hour,
        minute: dt.minute,
        second: dt.second,
        millisecond: dt.millisecond,
      });
    } else {
      // Tick (ms from midnight)
      const ms = (arg1) % (24 * 60 * 60 * 1000);
      this._dt = baseDate.plus({ milliseconds: ms });
    }
  }

  static parse(str: string): Time {
    // 1. "오전/오후" 포함 포맷 (Luxon: 'a h:mm:ss')
    let dt = LuxonDateTime.fromFormat(str, "a h:mm:ss", { locale: "ko" });
    if (!dt.isValid) dt = LuxonDateTime.fromFormat(str, "a h:mm:ss.u", { locale: "ko" });

    // 2. "HH:mm:ss" 포맷
    if (!dt.isValid) dt = LuxonDateTime.fromFormat(str, "HH:mm:ss");
    if (!dt.isValid) dt = LuxonDateTime.fromFormat(str, "HH:mm:ss.u");

    // 3. DateTime.parse 위임
    if (!dt.isValid) {
      try {
        const date = DateTime.parse(str);
        return new Time(date.hour, date.minute, date.second, date.millisecond);
      } catch {
        // ignore
      }
    }

    if (!dt.isValid) throw new ArgumentError({ str });

    return new Time(dt.hour, dt.minute, dt.second, dt.millisecond);
  }

  get hour(): number {
    return this._dt.hour;
  }
  set hour(v: number) {
    this._dt = this._dt.set({ hour: v });
  }

  get minute(): number {
    return this._dt.minute;
  }
  set minute(v: number) {
    this._dt = this._dt.set({ minute: v });
  }

  get second(): number {
    return this._dt.second;
  }
  set second(v: number) {
    this._dt = this._dt.set({ second: v });
  }

  get millisecond(): number {
    return this._dt.millisecond;
  }
  set millisecond(v: number) {
    this._dt = this._dt.set({ millisecond: v });
  }

  get tick(): number {
    // 자정으로부터 흐른 시간 계산
    return this._dt.diff(this._dt.startOf("day")).as("milliseconds");
  }
  set tick(v: number) {
    const ms = v % (24 * 60 * 60 * 1000);
    this._dt = this._dt.startOf("day").plus({ milliseconds: ms });
  }

  setHour(hour: number): Time {
    return new Time(this._dt.set({ hour }).toJSDate());
  }
  setMinute(minute: number): Time {
    return new Time(this._dt.set({ minute }).toJSDate());
  }
  setSecond(second: number): Time {
    return new Time(this._dt.set({ second }).toJSDate());
  }
  setMillisecond(millisecond: number): Time {
    return new Time(this._dt.set({ millisecond }).toJSDate());
  }

  addHours(hours: number): Time {
    return new Time(this._dt.plus({ hours }).toJSDate());
  }
  addMinutes(minutes: number): Time {
    return new Time(this._dt.plus({ minutes }).toJSDate());
  }
  addSeconds(seconds: number): Time {
    return new Time(this._dt.plus({ seconds }).toJSDate());
  }
  addMilliseconds(milliseconds: number): Time {
    return new Time(this._dt.plus({ milliseconds }).toJSDate());
  }

  toFormatString(format: string): string {
    return this._dt.toFormat(format);
  }

  toString(): string {
    return this._dt.toFormat("HH:mm:ss.SSS");
  }
}
