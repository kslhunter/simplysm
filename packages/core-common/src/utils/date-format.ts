/**
 * 월 설정 시 연도/월/일 정규화 결과
 */
export interface DtNormalizedMonth {
  year: number;
  month: number;
  day: number;
}

/**
 * 월 설정 시 연도/월/일을 정규화
 * - 월이 1-12 범위를 벗어나면 연도를 조정
 * - 대상 월의 일수보다 현재 일자가 크면 해당 월의 마지막 날로 조정
 *
 * @param year 기준 연도
 * @param month 설정할 월 (1-12 범위 외의 값도 허용)
 * @param day 기준 일자
 * @returns 정규화된 연도, 월, 일
 *
 * @example
 * normalizeMonth(2025, 13, 15) // { year: 2026, month: 1, day: 15 }
 * normalizeMonth(2025, 2, 31)  // { year: 2025, month: 2, day: 28 }
 */
export function normalizeMonth(year: number, month: number, day: number): DtNormalizedMonth {
  // 월 오버플로우/언더플로우 정규화
  // month가 1-12 범위를 벗어나면 연도를 조정
  const normalizedYear = year + Math.floor((month - 1) / 12);
  // JavaScript % 연산자는 음수에서 음수를 반환하므로 (% 12 + 12) % 12 패턴으로 0-11 범위를 보장 후 1-12로 변환
  const normalizedMonth = ((((month - 1) % 12) + 12) % 12) + 1;

  // 대상 월의 마지막 날 구하기
  const lastDay = new Date(normalizedYear, normalizedMonth, 0).getDate();
  const normalizedDay = Math.min(day, lastDay);

  return { year: normalizedYear, month: normalizedMonth, day: normalizedDay };
}

/**
 * 12시간제를 24시간제로 변환
 * - 오전 12시 = 0시, 오후 12시 = 12시
 * - 오전 1-11시 = 1-11시, 오후 1-11시 = 13-23시
 *
 * @param rawHour 12시간제 시 (1-12)
 * @param isPM 오후 여부
 * @returns 24시간제 시 (0-23)
 */
export function convert12To24(rawHour: number, isPM: boolean): number {
  if (rawHour === 12) {
    return isPM ? 12 : 0;
  }
  return isPM ? rawHour + 12 : rawHour;
}

//#region 정규식 캐싱 (모듈 로드 시 1회만 생성)

/**
 * 포맷 패턴 정규식
 *
 * 순서 중요:
 * dtFormat() 함수에서 긴 패턴(yyyy, MM, dd 등)을 먼저 처리해야
 * 짧은 패턴(y, M, d 등)이 부분 매칭되는 것을 방지합니다.
 * 예: "yyyy"를 먼저 처리하지 않으면 "yy"가 두 번 매칭될 수 있음
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
 * 포맷 문자열에 따라 날짜/시간을 문자열로 변환한다
 *
 * @param formatString 포맷 문자열
 * @param args 날짜/시간 구성 요소
 *
 * @remarks
 * C#과 동일한 포맷 문자열을 지원한다:
 *
 * | 포맷 | 설명 | 예시 |
 * |------|------|------|
 * | yyyy | 4자리 연도 | 2024 |
 * | yy | 2자리 연도 | 24 |
 * | MM | 0으로 패딩된 월 | 01~12 |
 * | M | 월 | 1~12 |
 * | ddd | 요일 (한글) | 일, 월, 화, 수, 목, 금, 토 |
 * | dd | 0으로 패딩된 일 | 01~31 |
 * | d | 일 | 1~31 |
 * | tt | 오전/오후 | 오전, 오후 |
 * | hh | 0으로 패딩된 12시간 | 01~12 |
 * | h | 12시간 | 1~12 |
 * | HH | 0으로 패딩된 24시간 | 00~23 |
 * | H | 24시간 | 0~23 |
 * | mm | 0으로 패딩된 분 | 00~59 |
 * | m | 분 | 0~59 |
 * | ss | 0으로 패딩된 초 | 00~59 |
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
 * formatDate("yyyy년 M월 d일 (ddd)", { year: 2024, month: 3, day: 15 });
 * // "2024년 3월 15일 (금)"
 *
 * formatDate("tt h:mm:ss", { hour: 14, minute: 30, second: 45 });
 * // "오후 2:30:45"
 * ```
 */
export function formatDate(
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
    timezoneOffsetMinutes !== undefined ? Math.abs(timezoneOffsetMinutes) : undefined;
  const offsetHour = absOffsetMinutes !== undefined ? Math.floor(absOffsetMinutes / 60) : undefined;
  const offsetMinute = absOffsetMinutes !== undefined ? absOffsetMinutes % 60 : undefined;
  const offsetSign =
    timezoneOffsetMinutes !== undefined ? (timezoneOffsetMinutes >= 0 ? "+" : "-") : undefined;

  const week =
    year !== undefined && month !== undefined && day !== undefined
      ? new Date(year, month - 1, day).getDay()
      : undefined;

  let result = formatString;

  // 연도
  if (year !== undefined) {
    const yearStr = year.toString();
    result = result.replace(patterns.yyyy, yearStr);
    result = result.replace(patterns.yy, yearStr.substring(2, 4));
  }

  // 월
  if (month !== undefined) {
    const monthStr = month.toString();
    result = result.replace(patterns.MM, monthStr.padStart(2, "0"));
    result = result.replace(patterns.M, monthStr);
  }

  // 요일
  if (week !== undefined) {
    result = result.replace(patterns.ddd, weekStrings[week]);
  }

  // 일
  if (day !== undefined) {
    const dayStr = day.toString();
    result = result.replace(patterns.dd, dayStr.padStart(2, "0"));
    result = result.replace(patterns.d, dayStr);
  }

  // 시간
  if (hour !== undefined) {
    result = result.replace(patterns.tt, hour < 12 ? "오전" : "오후");

    const hour12 = hour % 12 || 12;
    const hour12Str = hour12.toString();
    result = result.replace(patterns.hh, hour12Str.padStart(2, "0"));
    result = result.replace(patterns.h, hour12Str);

    const hourStr = hour.toString();
    result = result.replace(patterns.HH, hourStr.padStart(2, "0"));
    result = result.replace(patterns.H, hourStr);
  }

  // 분
  if (minute !== undefined) {
    const minuteStr = minute.toString();
    result = result.replace(patterns.mm, minuteStr.padStart(2, "0"));
    result = result.replace(patterns.m, minuteStr);
  }

  // 초
  if (second !== undefined) {
    const secondStr = second.toString();
    result = result.replace(patterns.ss, secondStr.padStart(2, "0"));
    result = result.replace(patterns.s, secondStr);
  }

  // 밀리초
  if (millisecond !== undefined) {
    const msStr = millisecond.toString().padStart(3, "0");
    result = result.replace(patterns.fff, msStr);
    result = result.replace(patterns.ff, msStr.substring(0, 2));
    result = result.replace(patterns.f, msStr.substring(0, 1));
  }

  // 타임존
  if (offsetSign !== undefined && offsetHour !== undefined && offsetMinute !== undefined) {
    result = result.replace(
      patterns.zzz,
      `${offsetSign}${offsetHour.toString().padStart(2, "0")}:${offsetMinute.toString().padStart(2, "0")}`,
    );
    result = result.replace(patterns.zz, `${offsetSign}${offsetHour.toString().padStart(2, "0")}`);
    result = result.replace(patterns.z, `${offsetSign}${offsetHour}`);
  }

  return result;
}
