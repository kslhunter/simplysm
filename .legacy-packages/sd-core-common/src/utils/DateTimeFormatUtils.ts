export class DateTimeFormatUtils {
  // 정규식 캐싱 (클래스 로드 시 1회만 생성)
  private static readonly _patterns = {
    yyyy: /yyyy/g,
    yy: /yy/g,
    MM: /MM/g,
    M: /M/g,
    ddd: /ddd/g,
    dd: /dd/g,
    d: /d/g,
    tt: /tt/g,
    hh: /hh/g,
    h: /h/g,
    HH: /HH/g,
    H: /H/g,
    mm: /mm/g,
    m: /m/g,
    ss: /ss/g,
    s: /s/g,
    fff: /fff/g,
    ff: /ff/g,
    f: /f/g,
    zzz: /zzz/g,
    zz: /zz/g,
    z: /z/g,
  };

  private static readonly _weekStrings = ["일", "월", "화", "수", "목", "금", "토"];

  static format(
    format: string,
    args: {
      year?: number;
      month?: number;
      day?: number;
      hour?: number;
      minute?: number;
      second?: number;
      millisecond?: number;
      timezoneOffsetMinutes?: number;
    },
  ): string {
    const { year, month, day, hour, minute, second, millisecond, timezoneOffsetMinutes } = args;

    const offsetHour =
      timezoneOffsetMinutes !== undefined ? Math.floor(timezoneOffsetMinutes / 60) : undefined;
    const offsetMinute =
      timezoneOffsetMinutes !== undefined ? timezoneOffsetMinutes % 60 : undefined;

    const week =
      year !== undefined && month !== undefined && day !== undefined
        ? new Date(year, month - 1, day).getDay()
        : undefined;

    let result = format;

    // 연도
    if (year !== undefined) {
      const yearStr = year.toString();
      result = result.replace(DateTimeFormatUtils._patterns.yyyy, yearStr);
      result = result.replace(DateTimeFormatUtils._patterns.yy, yearStr.substring(2, 4));
    }

    // 월
    if (month !== undefined) {
      const monthStr = month.toString();
      result = result.replace(DateTimeFormatUtils._patterns.MM, monthStr.padStart(2, "0"));
      result = result.replace(DateTimeFormatUtils._patterns.M, monthStr);
    }

    // 요일
    if (week !== undefined) {
      result = result.replace(
        DateTimeFormatUtils._patterns.ddd,
        DateTimeFormatUtils._weekStrings[week],
      );
    }

    // 일
    if (day !== undefined) {
      const dayStr = day.toString();
      result = result.replace(DateTimeFormatUtils._patterns.dd, dayStr.padStart(2, "0"));
      result = result.replace(DateTimeFormatUtils._patterns.d, dayStr);
    }

    // 시간
    if (hour !== undefined) {
      result = result.replace(DateTimeFormatUtils._patterns.tt, hour < 12 ? "오전" : "오후");

      const hour12 = hour % 12 || 12;
      const hour12Str = hour12.toString();
      result = result.replace(DateTimeFormatUtils._patterns.hh, hour12Str.padStart(2, "0"));
      result = result.replace(DateTimeFormatUtils._patterns.h, hour12Str);

      const hourStr = hour.toString();
      result = result.replace(DateTimeFormatUtils._patterns.HH, hourStr.padStart(2, "0"));
      result = result.replace(DateTimeFormatUtils._patterns.H, hourStr);
    }

    // 분
    if (minute !== undefined) {
      const minuteStr = minute.toString();
      result = result.replace(DateTimeFormatUtils._patterns.mm, minuteStr.padStart(2, "0"));
      result = result.replace(DateTimeFormatUtils._patterns.m, minuteStr);
    }

    // 초
    if (second !== undefined) {
      const secondStr = second.toString();
      result = result.replace(DateTimeFormatUtils._patterns.ss, secondStr.padStart(2, "0"));
      result = result.replace(DateTimeFormatUtils._patterns.s, secondStr);
    }

    // 밀리초
    if (millisecond !== undefined) {
      const msStr = millisecond.toString().padStart(3, "0");
      result = result.replace(DateTimeFormatUtils._patterns.fff, msStr);
      result = result.replace(DateTimeFormatUtils._patterns.ff, msStr.substring(0, 2));
      result = result.replace(DateTimeFormatUtils._patterns.f, msStr.substring(0, 1));
    }

    // 타임존
    if (offsetHour !== undefined && offsetMinute !== undefined) {
      const sign = offsetHour >= 0 ? "+" : "-";
      const absHour = Math.abs(offsetHour);
      const absMinute = Math.abs(offsetMinute);

      result = result.replace(
        DateTimeFormatUtils._patterns.zzz,
        `${sign}${absHour.toString().padStart(2, "0")}:${absMinute.toString().padStart(2, "0")}`,
      );
      result = result.replace(
        DateTimeFormatUtils._patterns.zz,
        `${sign}${absHour.toString().padStart(2, "0")}`,
      );
      result = result.replace(DateTimeFormatUtils._patterns.z, `${sign}${absHour}`);
    }

    return result;
  }
}
