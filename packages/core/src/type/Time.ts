import {ArgumentError} from "../error/ArgumentError";

export class Time {
  private _tick: number;

  public constructor();
  public constructor(tick: number);
  public constructor(hour: number, minute: number, second?: number, millisecond?: number);
  public constructor(day: number, hour: number, minute: number, second: number, millisecond: number);
  public constructor(date: Date);
  public constructor(args1?: number | Date, args2?: number, args3?: number, args4?: number, args5?: number) {
    if (args1 === undefined) {
      const now = new Date();
      this._tick = now.getMilliseconds()    // ms
        + now.getSeconds() * 1000           // s
        + now.getMinutes() * 60 * 1000      // m
        + now.getHours() * 60 * 60 * 1000;  // h
    }
    else if (typeof args1 === "number" && args2 === undefined) {
      this._tick = args1;
    }
    else if (typeof args1 === "number" && args2 !== undefined && args5 === undefined) {
      this._tick = (args4 || 0)   // ms
        + (args3 || 0) * 1000     // s
        + args2 * 60 * 1000       // m
        + args1 * 60 * 60 * 1000; // h
    }
    else if (typeof args1 === "number" && args2 !== undefined && args3 !== undefined && args4 !== undefined && args5 !== undefined) {
      this._tick = args5                // ms
        + args4 * 1000                  // s
        + args3 * 60 * 1000             // m
        + args2 * 60 * 60 * 1000        // h
        + args1 * 24 * 60 * 60 * 1000;  // d
    }
    else if (args1 instanceof Date) {
      this._tick = args1.getMilliseconds()    // ms
        + args1.getSeconds() * 1000           // s
        + args1.getMinutes() * 60 * 1000      // m
        + args1.getHours() * 60 * 60 * 1000;  // h
    }
    else {
      throw new ArgumentError({args1, args2, args3, args4, args5});
    }
  }

  public static parse(value: string): Time {
    // 3, 03 => 3시간
    if (/^[0-9]{1,2}$/.test(value)) {
      const hour = Number(value);

      return new Time(
        hour * 60 * 60 * 1000
      );
    }
    // 103, 0103 => 1시간 3분
    else if (/^[0-9]{3,4}$/.test(value)) {
      const hour = Math.floor(Number(value) / 100);
      const minute = Number(value) % 100;

      return new Time(
        hour * 60 * 60 * 1000 +
        minute * 60 * 1000
      );
    }
    // 50103, 050103 => 5시간 1분 3초
    else if (/^[0-9]{5,6}$/.test(value)) {
      const hour = Math.floor(Number(value) / 10000);
      const minute = Math.floor((Number(value) % 10000) / 100);
      const second = Number(value) % 100;

      return new Time(
        hour * 60 * 60 * 1000 +
        minute * 60 * 1000 +
        second * 1000
      );
    }
    // 1050103, 01050103 => 1일 5시간 1분 3초
    else if (/^[0-9]{7,8}$/.test(value)) {
      const day = Math.floor(Number(value) / 1000000);
      const hour = Math.floor((Number(value) % 1000000) / 10000);
      const minute = Math.floor((Number(value) % 10000) / 100);
      const second = Number(value) % 100;

      return new Time(
        day * 24 * 60 * 60 * 1000 +
        hour * 60 * 60 * 1000 +
        minute * 60 * 1000 +
        second * 1000
      );
    }
    // 050103001 => 5시간 1분 3초 1밀리초
    else if (/^[0-9]{9}$/.test(value)) {
      const hour = Math.floor(Number(value) / 10000000);
      const minute = Math.floor((Number(value) % 10000000) / 100000);
      const second = Math.floor((Number(value) % 100000) / 1000);
      const millisecond = Number(value) % 1000;

      return new Time(
        hour * 60 * 60 * 1000 +
        minute * 60 * 1000 +
        second * 1000 +
        millisecond
      );
    }
    // 1050103001, 01050103001 => 1일 5시간 1분 3초 1밀리초
    else if (/^[0-9]{10,11}$/.test(value)) {
      const day = Math.floor(Number(value) / 1000000000);
      const hour = Math.floor((Number(value) % 1000000000) / 10000000);
      const minute = Math.floor((Number(value) % 10000000) / 100000);
      const second = Math.floor((Number(value) % 100000) / 1000);
      const millisecond = Number(value) % 1000;

      return new Time(
        day * 24 * 60 * 60 * 1000 +
        hour * 60 * 60 * 1000 +
        minute * 60 * 1000 +
        second * 1000 +
        millisecond
      );
    }
    else {
      const regex = /^([0-9]+\.)?([0-9]{1,2})(:[0-9]{1,2})?(:[0-9]{1,2})?(.[0-9]{3})?$/;
      const matches = value.match(regex);
      if (!matches) {
        throw new ArgumentError({value});
      }

      const day = Number((matches[1] || "0").replace(/[.:]/g, ""));
      const hour = Number((matches[2] || "0").replace(/[.:]/g, ""));
      const minute = Number((matches[3] || "0").replace(/[.:]/g, ""));
      const second = Number((matches[4] || "0").replace(/[.:]/g, ""));
      const millisecond = Number((matches[5] || "0").replace(/[.:]/g, ""));

      return new Time(
        day * 24 * 60 * 60 * 1000 +
        hour * 60 * 60 * 1000 +
        minute * 60 * 1000 +
        second * 1000 +
        millisecond
      );
    }
  }

  public get day(): number {
    return Math.floor(this._tick / (24 * 60 * 60 * 1000));
  }

  public set day(day: number) {
    this._tick = this._tick + ((day - this.day) * 24 * 60 * 60 * 1000);
  }

  public get hour(): number {
    return Math.floor(this._tick / (60 * 60 * 1000)) % 24;
  }

  public set hour(hour: number) {
    this._tick = this._tick + ((hour - this.hour) * 60 * 60 * 1000);
  }

  public get minute(): number {
    return Math.floor(this._tick / (60 * 1000)) % 60;
  }

  public set minute(minute: number) {
    this._tick = this._tick + ((minute - this.minute) * 60 * 1000);
  }

  public get second(): number {
    return Math.floor(this._tick / 1000) % 60;
  }

  public set second(second: number) {
    this._tick = this._tick + ((second - this.second) * 1000);
  }

  public get millisecond(): number {
    return this._tick % 1000;
  }

  public set millisecond(millisecond: number) {
    this._tick = this._tick + (millisecond - this.millisecond);
  }

  public get tick(): number {
    return this._tick;
  }

  public set tick(tick: number) {
    this._tick = tick;
  }

  public setDay(day: number): Time {
    return new Time(day, this.hour, this.minute, this.second, this.millisecond);
  }

  public setHour(hour: number): Time {
    return new Time(this.day, hour, this.minute, this.second, this.millisecond);
  }

  public setMinute(minute: number): Time {
    return new Time(this.day, this.hour, minute, this.second, this.millisecond);
  }

  public setSecond(second: number): Time {
    return new Time(this.day, this.hour, this.minute, second, this.millisecond);
  }

  public setMillisecond(millisecond: number): Time {
    return new Time(this.day, this.hour, this.minute, this.second, millisecond);
  }

  public addDays(days: number): Time {
    return this.setDay(this.day + days);
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
    const day = this.day;
    const hour = this.hour;
    const minute = this.minute;
    const second = this.second;
    const millisecond = this.millisecond;

    let result = format;
    result = result.replace(/dd/g, day.toString().padStart(2, "0"));
    result = result.replace(/d/g, day.toString());

    result = result.replace(/tt/g, hour < 12 ? "오전" : "오후");

    result = result.replace(/hh/g, (hour % 12).toString().padStart(2, "0"));
    result = result.replace(/h/g, (hour % 12).toString());

    result = result.replace(/HH/g, hour.toString().padStart(2, "0"));
    result = result.replace(/H/g, hour.toString());

    result = result.replace(/mm/g, minute.toString().padStart(2, "0"));
    result = result.replace(/m/g, minute.toString());

    result = result.replace(/ss/g, second.toString().padStart(2, "0"));
    result = result.replace(/s/g, second.toString());

    result = result.replace(/fff/g, millisecond.toString().padStart(3, "0"));
    result = result.replace(/ff/g, millisecond.toString().padStart(3, "0").substr(0, 2));
    result = result.replace(/f/g, millisecond.toString().padStart(3, "0").substr(0, 1));

    return result;
  }

  public toString(): string {
    return this.toFormatString("d.HH:mm:ss.fff");
  }
}