import { ArgumentError } from "../errors/ArgumentError";
import { DateTimeFormatUtils } from "../utils/DateTimeFormatUtils";
import { DateTime } from "./DateTime";

export class Time {
  private _tick: number;

  public constructor();
  public constructor(hour: number, minute: number, second?: number, millisecond?: number);
  public constructor(tick: number);
  public constructor(arg1?: number, arg2?: number, arg3?: number, arg4?: number) {
    if (arg1 === undefined) {
      const now = new Date();
      this._tick = (
        now.getMilliseconds() +               // ms
        (now.getSeconds() * 1000) +             // s
        (now.getMinutes() * 60 * 1000) +        // m
        (now.getHours() * 60 * 60 * 1000)       // h
      ) % (24 * 60 * 60 * 1000);
    }
    else if (arg2 !== undefined) {
      this._tick = (
        (arg4 ?? 0) +             // ms
        ((arg3 ?? 0) * 1000) +      // s
        (arg2 * 60 * 1000) +         // m
        (arg1 * 60 * 60 * 1000)      // h
      ) % (24 * 60 * 60 * 1000);
    }
    else {
      this._tick = arg1 % (24 * 60 * 60 * 1000);
    }
  }

  public static parse(str: string): Time {
    const match1 = (/(오전|오후) ([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})(\.([0-9]{1,3}))?$/).exec(str);
    if (match1 != null) {
      return new Time(
        Number(match1[2]) + (match1[1] === "오후" ? 12 : 0),
        Number(match1[3]),
        Number(match1[4]),
        Number(match1[6] !== undefined ? match1[6].padEnd(3, "0") : "0")
      );
    }

    const match2 = (/([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})(\.([0-9]{1,3}))?$/).exec(str);
    if (match2 != null) {
      return new Time(
        Number(match2[1]),
        Number(match2[2]),
        Number(match2[3]),
        Number(match2[5] !== undefined ? match2[5].padEnd(3, "0") : "0")
      );
    }

    try {
      const dt = DateTime.parse(str);
      return new Time(
        dt.hour,
        dt.minute,
        dt.second,
        dt.millisecond
      );
    }
    catch {
      throw new ArgumentError({ str });
    }
  }

  public get hour(): number {
    return Math.floor(this._tick / (60 * 60 * 1000));
  }

  public set hour(value: number) {
    this._tick = (this._tick + ((value - this.hour) * 60 * 60 * 1000)) % (24 * 60 * 60 * 1000);
  }

  public get minute(): number {
    return Math.floor(this._tick / (60 * 1000)) % 60;
  }

  public set minute(value: number) {
    this._tick = (this._tick + ((value - this.minute) * 60 * 1000)) % (24 * 60 * 60 * 1000);
  }

  public get second(): number {
    return Math.floor(this._tick / 1000) % 60;
  }

  public set second(value: number) {
    this._tick = (this._tick + ((value - this.second) * 1000)) % (24 * 60 * 60 * 1000);
  }

  public get millisecond(): number {
    return this._tick % 1000;
  }

  public set millisecond(value: number) {
    this._tick = (this._tick + (value - this.millisecond)) % (24 * 60 * 60 * 1000);
  }

  public get tick(): number {
    return this._tick;
  }

  public set tick(tick: number) {
    this._tick = tick % (24 * 60 * 60 * 1000);
  }

  public setHour(hour: number): Time {
    return new Time(hour, this.minute, this.second, this.millisecond);
  }

  public setMinute(minute: number): Time {
    return new Time(this.hour, minute, this.second, this.millisecond);
  }

  public setSecond(second: number): Time {
    return new Time(this.hour, this.minute, second, this.millisecond);
  }

  public setMillisecond(millisecond: number): Time {
    return new Time(this.hour, this.minute, this.second, millisecond);
  }

  public addHours(hours: number): Time {
    return this.setHour(this.hour + hours);
  }

  public addMinutes(minutes: number): Time {
    return this.setMinute(this.minute + minutes);
  }

  public addSeconds(seconds: number): Time {
    return this.setSecond(this.second + seconds);
  }

  public addMilliseconds(milliseconds: number): Time {
    return this.setMillisecond(this.millisecond + milliseconds);
  }

  public toFormatString(format: string): string {
    return DateTimeFormatUtils.format(format, {
      hour: this.hour,
      minute: this.minute,
      second: this.second,
      millisecond: this.millisecond
    });
  }

  public toString(): string {
    return this.toFormatString("HH:mm:ss.fff");
  }
}