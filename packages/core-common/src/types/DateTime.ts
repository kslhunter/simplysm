import { ArgumentError } from "../errors/ArgumentError";
import { DateTimeFormatUtils } from "../utils/date-format";

/**
 * 날짜시간 클래스 (불변)
 */
export class DateTime {
  readonly date: Date;

  constructor();
  constructor(
    year: number,
    month: number,
    day: number,
    hour?: number,
    minute?: number,
    second?: number,
    millisecond?: number,
  );
  constructor(tick: number);
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

  static parse(str: string): DateTime {
    const parsedTick = Date.parse(str);
    if (!Number.isNaN(parsedTick)) {
      return new DateTime(parsedTick);
    }

    const match1 =
      /^([0-9]{4})-([0-9]{2})-([0-9]{2}) (오전|오후) ([0-9]{2}):([0-9]{2}):([0-9]{2})$/.exec(str);
    if (match1 != null) {
      return new DateTime(
        Number(match1[1]),
        Number(match1[2]),
        Number(match1[3]),
        Number(match1[5]) + (match1[4] === "오후" ? 12 : 0),
        Number(match1[6]),
        Number(match1[7]),
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
      /^([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})(\.([0-9]{3}))?$/.exec(
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
        match3[8] ? Number(match3[8]) : undefined,
      );
    }

    throw new ArgumentError(
      `날짜시간 형식을 파싱할 수 없습니다. 지원 형식: 'yyyy-MM-dd HH:mm:ss', 'yyyyMMddHHmmss', 'yyyy-MM-dd 오전/오후 HH:mm:ss', ISO 8601`,
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

  get week(): number {
    return this.date.getDay();
  }

  get timezoneOffsetMinutes(): number {
    return -this.date.getTimezoneOffset();
  }

  //#endregion

  //#region 불변 변환 메서드 (새 인스턴스 반환)

  setYear(year: number): DateTime {
    return new DateTime(
      year,
      this.month,
      this.day,
      this.hour,
      this.minute,
      this.second,
      this.millisecond,
    );
  }

  setMonth(month: number): DateTime {
    // 대상 월의 마지막 날 구하기
    const lastDay = new Date(this.year, month, 0).getDate();
    const currentDay = Math.min(this.day, lastDay);

    return new DateTime(
      this.year,
      month,
      currentDay,
      this.hour,
      this.minute,
      this.second,
      this.millisecond,
    );
  }

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

  addYears(years: number): DateTime {
    return this.setYear(this.year + years);
  }

  addMonths(months: number): DateTime {
    return this.setMonth(this.month + months);
  }

  addDays(days: number): DateTime {
    return new DateTime(this.tick + days * 24 * 60 * 60 * 1000);
  }

  addHours(hours: number): DateTime {
    return new DateTime(this.tick + hours * 60 * 60 * 1000);
  }

  addMinutes(minutes: number): DateTime {
    return new DateTime(this.tick + minutes * 60 * 1000);
  }

  addSeconds(seconds: number): DateTime {
    return new DateTime(this.tick + seconds * 1000);
  }

  addMilliseconds(milliseconds: number): DateTime {
    return new DateTime(this.tick + milliseconds);
  }

  //#endregion

  //#region 포맷팅

  toFormatString(format: string): string {
    return DateTimeFormatUtils.format(format, {
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
