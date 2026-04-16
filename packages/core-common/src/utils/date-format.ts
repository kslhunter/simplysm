/**
 * 월 설정 시 연/월/일 정규화 결과
 */
export interface DtNormalizedMonth {
  year: number;
  month: number;
  day: number;
}

/**
 * 월 설정 시 연/월/일 정규화
 * - 월이 1-12 범위를 벗어나면 연도 조정
 * - 현재 일이 대상 월의 일수보다 크면 해당 월의 마지막 일로 조정
 *
 * @param year 기준 연도
 * @param month 설정할 월 (1-12 범위 밖의 값 허용)
 * @param day 기준 일
 * @returns 정규화된 연도, 월, 일
 *
 * @example
 * normalizeMonth(2025, 13, 15) // { year: 2026, month: 1, day: 15 }
 * normalizeMonth(2025, 2, 31)  // { year: 2025, month: 2, day: 28 }
 */
export function normalizeMonth(year: number, month: number, day: number): DtNormalizedMonth {
  // 월 오버플로우/언더플로우 정규화
  // 월이 1-12 범위를 벗어나면 연도 조정
  const normalizedYear = year + Math.floor((month - 1) / 12);
  // JavaScript % 연산자는 음수에 대해 음수를 반환하므로 (% 12 + 12) % 12 패턴으로 0-11 범위를 보장한 후 1-12로 변환
  const normalizedMonth = ((((month - 1) % 12) + 12) % 12) + 1;

  // 대상 월의 마지막 일 조회
  const lastDay = new Date(normalizedYear, normalizedMonth, 0).getDate();
  const normalizedDay = Math.min(day, lastDay);

  return { year: normalizedYear, month: normalizedMonth, day: normalizedDay };
}

/**
 * 12시간 형식을 24시간 형식으로 변환
 * - 12:00 AM = 0:00, 12:00 PM = 12:00
 * - 1-11 AM = 1-11, 1-11 PM = 13-23
 *
 * @param rawHour 12시간 형식의 시 (1-12)
 * @param isPM 오후 여부
 * @returns 24시간 형식의 시 (0-23)
 */
export function convert12To24(rawHour: number, isPM: boolean): number {
  if (rawHour === 12) {
    return isPM ? 12 : 0;
  }
  return isPM ? rawHour + 12 : rawHour;
}

//#region 정규식 캐싱 (모듈 로드 시 한 번만 생성)

/**
 * 형식 패턴 정규식
 *
 * 순서가 중요함:
 * dtFormat() 함수에서 긴 패턴(yyyy, MM, dd 등)이 먼저 처리되어야
 * 짧은 패턴(y, M, d 등)이 부분적으로 매칭되는 것을 방지함.
 * 예: "yyyy"가 먼저 처리되지 않으면 "yy"가 두 번 매칭될 수 있음
 */
const patterns = {
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

const weekStrings = ["일", "월", "화", "수", "목", "금", "토"];

//#endregion

/**
 * 형식 문자열에 따라 날짜/시간을 문자열로 변환
 *
 * @param formatString 형식 문자열
 * @param args 날짜/시간 구성요소
 *
 * @remarks
 * C#과 동일한 형식 문자열을 지원:
 *
 * | 형식 | 설명 | 예시 |
 * |------|------|------|
 * | yyyy | 4자리 연도 | 2024 |
 * | yy | 2자리 연도 | 24 |
 * | MM | 0 채움 월 | 01~12 |
 * | M | 월 | 1~12 |
 * | ddd | 요일 | 일, 월, 화, 수, 목, 금, 토 |
 * | dd | 0 채움 일 | 01~31 |
 * | d | 일 | 1~31 |
 * | tt | 오전/오후 | AM, PM |
 * | hh | 0 채움 12시간 | 01~12 |
 * | h | 12시간 | 1~12 |
 * | HH | 0 채움 24시간 | 00~23 |
 * | H | 24시간 | 0~23 |
 * | mm | 0 채움 분 | 00~59 |
 * | m | 분 | 0~59 |
 * | ss | 0 채움 초 | 00~59 |
 * | s | 초 | 0~59 |
 * | fff | 밀리초 (3자리) | 000~999 |
 * | ff | 밀리초 (2자리) | 00~99 |
 * | f | 밀리초 (1자리) | 0~9 |
 * | zzz | 타임존 오프셋 (±HH:mm) | +09:00 |
 * | zz | 타임존 오프셋 (±HH) | +09 |
 * | z | 타임존 오프셋 (±H) | +9 |
 *
 * @example
 * ```typescript
 * formatDate("yyyy-MM-dd", { year: 2024, month: 3, day: 15 });
 * // "2024-03-15"
 *
 * formatDate("yyyy-M-d (ddd)", { year: 2024, month: 3, day: 15 });
 * // "2024-3-15 (Fri)"
 *
 * formatDate("tt h:mm:ss", { hour: 14, minute: 30, second: 45 });
 * // "PM 2:30:45"
 * ```
 */
export function format(
  formatString: string,
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

  const absOffsetMinutes =
    timezoneOffsetMinutes != null ? Math.abs(timezoneOffsetMinutes) : undefined;
  const offsetHour = absOffsetMinutes != null ? Math.floor(absOffsetMinutes / 60) : undefined;
  const offsetMinute = absOffsetMinutes != null ? absOffsetMinutes % 60 : undefined;
  const offsetSign =
    timezoneOffsetMinutes != null ? (timezoneOffsetMinutes >= 0 ? "+" : "-") : undefined;

  const week =
    year != null && month != null && day != null
      ? new Date(year, month - 1, day).getDay()
      : undefined;

  let result = formatString;

  // 연도
  if (year != null) {
    const yearStr = year.toString();
    result = result.replace(patterns.yyyy, yearStr);
    result = result.replace(patterns.yy, yearStr.substring(2, 4));
  }

  // 월
  if (month != null) {
    const monthStr = month.toString();
    result = result.replace(patterns.MM, monthStr.padStart(2, "0"));
    result = result.replace(patterns.M, monthStr);
  }

  // 요일
  if (week != null) {
    result = result.replace(patterns.ddd, weekStrings[week]);
  }

  // 일
  if (day != null) {
    const dayStr = day.toString();
    result = result.replace(patterns.dd, dayStr.padStart(2, "0"));
    result = result.replace(patterns.d, dayStr);
  }

  // 시
  if (hour != null) {
    result = result.replace(patterns.tt, hour < 12 ? "AM" : "PM");

    const hour12 = hour % 12 || 12;
    const hour12Str = hour12.toString();
    result = result.replace(patterns.hh, hour12Str.padStart(2, "0"));
    result = result.replace(patterns.h, hour12Str);

    const hourStr = hour.toString();
    result = result.replace(patterns.HH, hourStr.padStart(2, "0"));
    result = result.replace(patterns.H, hourStr);
  }

  // 분
  if (minute != null) {
    const minuteStr = minute.toString();
    result = result.replace(patterns.mm, minuteStr.padStart(2, "0"));
    result = result.replace(patterns.m, minuteStr);
  }

  // 초
  if (second != null) {
    const secondStr = second.toString();
    result = result.replace(patterns.ss, secondStr.padStart(2, "0"));
    result = result.replace(patterns.s, secondStr);
  }

  // 밀리초
  if (millisecond != null) {
    const msStr = millisecond.toString().padStart(3, "0");
    result = result.replace(patterns.fff, msStr);
    result = result.replace(patterns.ff, msStr.substring(0, 2));
    result = result.replace(patterns.f, msStr.substring(0, 1));
  }

  // 타임존
  if (offsetSign != null && offsetHour != null && offsetMinute != null) {
    result = result.replace(
      patterns.zzz,
      `${offsetSign}${offsetHour.toString().padStart(2, "0")}:${offsetMinute.toString().padStart(2, "0")}`,
    );
    result = result.replace(patterns.zz, `${offsetSign}${offsetHour.toString().padStart(2, "0")}`);
    result = result.replace(patterns.z, `${offsetSign}${offsetHour}`);
  }

  return result;
}
