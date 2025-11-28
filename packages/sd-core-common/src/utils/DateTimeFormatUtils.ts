export class DateTimeFormatUtils {
  static format(format: string, args: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
    timezoneOffsetMinutes?: number;
  }): string {
    const year = args.year;
    const month = args.month;
    const day = args.day;
    const hour = args.hour;
    const minute = args.minute;
    const second = args.second;
    const millisecond = args.millisecond;
    const offsetHour = args.timezoneOffsetMinutes !== undefined
      ? Math.floor(args.timezoneOffsetMinutes / 60)
      : undefined;
    const offsetMinute = args.timezoneOffsetMinutes !== undefined
      ? args.timezoneOffsetMinutes % 60
      : undefined;
    const week = (year !== undefined && month !== undefined && day !== undefined)
      ? new Date(year, month - 1, day).getDay()
      : undefined;

    const weekString
      = week === 0 ? "일"
      : week === 1 ? "월"
        : week === 2 ? "화"
          : week === 3 ? "수"
            : week === 4 ? "목"
              : week === 5 ? "금"
                : week === 6 ? "토"
                  : undefined;

    let result = format;
    if (year !== undefined) {
      result = result.replace(/yyyy/g, year.toString());
      result = result.replace(/yy/g, year.toString().substring(2, 4));
    }

    if (month !== undefined) {
      result = result.replace(/MM/g, month.toString().padStart(2, "0"));
      result = result.replace(/M/g, month.toString());
    }

    if (weekString !== undefined) {
      result = result.replace(/ddd/g, weekString);
    }

    if (day !== undefined) {
      result = result.replace(/dd/g, day.toString().padStart(2, "0"));
      result = result.replace(/d/g, day.toString());
    }

    if (hour !== undefined) {
      result = result.replace(/tt/g, hour < 12 ? "오전" : "오후");

      if (hour === 12) {
        result = result.replace(/hh/g, "12");
        result = result.replace(/h/g, "12");
      }
      else {
        result = result.replace(/hh/g, (hour % 12).toString().padStart(2, "0"));
        result = result.replace(/h/g, (hour % 12).toString());
      }

      result = result.replace(/HH/g, hour.toString().padStart(2, "0"));
      result = result.replace(/H/g, hour.toString());
    }

    if (minute !== undefined) {
      result = result.replace(/mm/g, minute.toString().padStart(2, "0"));
      result = result.replace(/m/g, minute.toString());
    }

    if (second !== undefined) {
      result = result.replace(/ss/g, second.toString().padStart(2, "0"));
      result = result.replace(/s/g, second.toString());
    }

    if (millisecond !== undefined) {
      result = result.replace(/fff/g, millisecond.toString().padStart(3, "0"));
      result = result.replace(/ff/g, millisecond.toString().padStart(3, "0").substring(0, 2));
      result = result.replace(/f/g, millisecond.toString().padStart(3, "0").substring(0, 1));
    }

    if (offsetHour !== undefined && offsetMinute !== undefined) {
      result = result.replace(
        /zzz/g,
        (offsetHour > 0 ? "+" : "-")
        + Math.abs(offsetHour).toString().padStart(2, "0")
        + ":"
        + Math.abs(offsetMinute).toString().padStart(2, "0"),
      );
      result = result.replace(
        /zz/g,
        (offsetHour > 0 ? "+" : "-") + Math.abs(offsetHour).toString().padStart(2, "0"),
      );
      result = result.replace(/z/g, (offsetHour > 0 ? "+" : "-") + Math.abs(offsetHour).toString());
    }

    return result;
  }
}
