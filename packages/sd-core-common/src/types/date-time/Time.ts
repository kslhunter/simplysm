import { ArgumentError } from "../../errors/ArgumentError";
import { DateTimeFormatUtils } from "../../utils/DateTimeFormatUtils";
import { DateTime } from "./DateTime";

export class Time {
  #tick: number;

  constructor();
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);
  constructor(arg1?: number | Date, arg2?: number, arg3?: number, arg4?: number) {
    if (arg1 === undefined) {
      const now = new Date();
      this.#tick =
        (now.getMilliseconds() + // ms
          now.getSeconds() * 1000 + // s
          now.getMinutes() * 60 * 1000 + // m
          now.getHours() * 60 * 60 * 1000) % // h
        (24 * 60 * 60 * 1000);
    } else if (arg2 !== undefined) {
      this.#tick =
        ((arg4 ?? 0) + // ms
          (arg3 ?? 0) * 1000 + // s
          arg2 * 60 * 1000 + // m
          (arg1 as number) * 60 * 60 * 1000) % // h
        (24 * 60 * 60 * 1000);
    } else if (arg1 instanceof Date) {
      this.#tick =
        (arg1.getMilliseconds() + // ms
          arg1.getSeconds() * 1000 + // s
          arg1.getMinutes() * 60 * 1000 + // m
          arg1.getHours() * 60 * 60 * 1000) % // h
        (24 * 60 * 60 * 1000);
    } else {
      this.#tick = arg1 % (24 * 60 * 60 * 1000);
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
      throw new ArgumentError({ str });
    }
  }

  get hour(): number {
    return Math.floor(this.#tick / (60 * 60 * 1000));
  }

  set hour(value: number) {
    this.#tick = (this.#tick + (value - this.hour) * 60 * 60 * 1000) % (24 * 60 * 60 * 1000);
  }

  get minute(): number {
    return Math.floor(this.#tick / (60 * 1000)) % 60;
  }

  set minute(value: number) {
    this.#tick = (this.#tick + (value - this.minute) * 60 * 1000) % (24 * 60 * 60 * 1000);
  }

  get second(): number {
    return Math.floor(this.#tick / 1000) % 60;
  }

  set second(value: number) {
    this.#tick = (this.#tick + (value - this.second) * 1000) % (24 * 60 * 60 * 1000);
  }

  get millisecond(): number {
    return this.#tick % 1000;
  }

  set millisecond(value: number) {
    this.#tick = (this.#tick + (value - this.millisecond)) % (24 * 60 * 60 * 1000);
  }

  get tick(): number {
    return this.#tick;
  }

  set tick(tick: number) {
    this.#tick = tick % (24 * 60 * 60 * 1000);
  }

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

  addHours(hours: number): Time {
    return this.setHour(this.hour + hours);
  }

  addMinutes(minutes: number): Time {
    return this.setMinute(this.minute + minutes);
  }

  addSeconds(seconds: number): Time {
    return this.setSecond(this.second + seconds);
  }

  addMilliseconds(milliseconds: number): Time {
    return this.setMillisecond(this.millisecond + milliseconds);
  }

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
}
