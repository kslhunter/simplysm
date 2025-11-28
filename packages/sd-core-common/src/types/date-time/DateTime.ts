import { DateTime as LuxonDateTime } from "luxon";
import { ArgumentError } from "../../errors/ArgumentError";

export class DateTime {
  private _dt: LuxonDateTime;

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
  // [추가] 내부 복제용 생성자
  constructor(dt: LuxonDateTime);
  constructor(
    arg1?: number | Date | LuxonDateTime,
    arg2?: number,
    arg3?: number,
    arg4?: number,
    arg5?: number,
    arg6?: number,
    arg7?: number,
  ) {
    if (arg1 === undefined) {
      this._dt = LuxonDateTime.local();
    } else if (arg1 instanceof LuxonDateTime) {
      this._dt = arg1;
    } else if (arg2 !== undefined && arg3 !== undefined) {
      this._dt = LuxonDateTime.local(
        arg1 as number,
        arg2,
        arg3,
        arg4 ?? 0,
        arg5 ?? 0,
        arg6 ?? 0,
        arg7 ?? 0,
      );
    } else if (arg1 instanceof Date) {
      this._dt = LuxonDateTime.fromJSDate(arg1);
    } else {
      this._dt = LuxonDateTime.fromMillis(arg1);
    }
  }

  // [호환성] 기존 코드가 .date 속성을 직접 쓰던 것을 지원하기 위한 Getter
  get date(): Date {
    return this._dt.toJSDate();
  }

  static parse(str: string): DateTime {
    // 1. ISO 포맷 우선 시도 (가장 빠름)
    let dt = LuxonDateTime.fromISO(str);

    // 2. ISO가 아니면 커스텀 포맷 시도
    if (!dt.isValid) {
      // 기존 정규식 로직 대신 Luxon 포맷 사용
      // 예: "2023-11-28 오전 03:00:00" 대응 (a = 오전/오후, hh = 12시간제)
      // 한국어 로케일 강제 (서버 환경 영향 받지 않도록)
      dt = LuxonDateTime.fromFormat(str, "yyyy-MM-dd a hh:mm:ss", { locale: "ko" });
    }

    // 3. 그래도 안되면 yyyyMMddHHmmss 등 숫자만 있는 포맷 시도
    if (!dt.isValid) {
      const numMatch = /^[0-9]+$/.test(str);
      if (numMatch) {
        if (str.length === 14) {
          dt = LuxonDateTime.fromFormat(str, "yyyyMMddHHmmss");
        }
      }
    }

    // 4. 실패 시 Date.parse (Legacy Fallback)
    if (!dt.isValid) {
      const legacyTick = Date.parse(str);
      if (!Number.isNaN(legacyTick)) {
        dt = LuxonDateTime.fromMillis(legacyTick);
      }
    }

    if (!dt.isValid) {
      throw new ArgumentError({ str });
    }

    return new DateTime(dt);
  }

  get year(): number {
    return this._dt.year;
  }
  set year(value: number) {
    this._dt = this._dt.set({ year: value });
  }

  get month(): number {
    return this._dt.month;
  }
  set month(value: number) {
    this._dt = this._dt.set({ month: value });
  }

  get day(): number {
    return this._dt.day;
  }
  set day(value: number) {
    this._dt = this._dt.set({ day: value });
  }

  get hour(): number {
    return this._dt.hour;
  }
  set hour(value: number) {
    this._dt = this._dt.set({ hour: value });
  }

  get minute(): number {
    return this._dt.minute;
  }
  set minute(value: number) {
    this._dt = this._dt.set({ minute: value });
  }

  get second(): number {
    return this._dt.second;
  }
  set second(value: number) {
    this._dt = this._dt.set({ second: value });
  }

  get millisecond(): number {
    return this._dt.millisecond;
  }
  set millisecond(value: number) {
    this._dt = this._dt.set({ millisecond: value });
  }

  get tick(): number {
    return this._dt.toMillis();
  }
  set tick(tick: number) {
    this._dt = LuxonDateTime.fromMillis(tick);
  }

  get week(): number {
    // JS Date: 0(일)~6(토)
    // Luxon: 1(월)~7(일) -> 변환 필요
    return this._dt.weekday === 7 ? 0 : this._dt.weekday;
  }

  get timezoneOffsetMinutes(): number {
    return this._dt.offset;
  }

  // [메서드 체이닝] 불변성 유지 (새 인스턴스 반환)
  setYear(year: number): DateTime {
    return new DateTime(this._dt.set({ year }));
  }

  setMonth(month: number): DateTime {
    // 기존 로직: 월을 바꿨을 때 날짜가 넘치면 마지막 날로 조정 (Luxon은 자동 처리됨)
    return new DateTime(this._dt.set({ month }));
  }

  setDay(day: number): DateTime {
    return new DateTime(this._dt.set({ day }));
  }

  setHour(hour: number): DateTime {
    return new DateTime(this._dt.set({ hour }));
  }

  setMinute(minute: number): DateTime {
    return new DateTime(this._dt.set({ minute }));
  }

  setSecond(second: number): DateTime {
    return new DateTime(this._dt.set({ second }));
  }

  setMillisecond(millisecond: number): DateTime {
    return new DateTime(this._dt.set({ millisecond }));
  }

  addYears(years: number): DateTime {
    return new DateTime(this._dt.plus({ years }));
  }

  addMonths(months: number): DateTime {
    return new DateTime(this._dt.plus({ months }));
  }

  addDays(days: number): DateTime {
    return new DateTime(this._dt.plus({ days }));
  }

  addHours(hours: number): DateTime {
    return new DateTime(this._dt.plus({ hours }));
  }

  addMinutes(minutes: number): DateTime {
    return new DateTime(this._dt.plus({ minutes }));
  }

  addSeconds(seconds: number): DateTime {
    return new DateTime(this._dt.plus({ seconds }));
  }

  addMilliseconds(milliseconds: number): DateTime {
    return new DateTime(this._dt.plus({ milliseconds }));
  }

  toFormatString(format: string): string {
    // Luxon 포맷 문자로 변환 필요 (기존 포맷이 C# 스타일이라면 변환 필요하지만,
    // DateTimeFormatUtils가 있다면 그대로 위임하거나 Luxon 포맷 사용)
    // 여기서는 일단 Luxon 자체 포맷터 사용 (기존과 포맷 문자가 다를 수 있음 주의)
    // -> 기존 DateTimeFormatUtils를 쓰고 싶다면 그대로 유지해도 됩니다.
    // -> 하지만 엔진 교체가 목적이므로 Luxon toFormat 사용을 권장.
    // (단, C# 포맷 문자열과 Luxon은 'yyyy' 등은 같지만 'fff' 등 미세한 차이가 있을 수 있음)
    return this._dt.toFormat(format);
  }

  toString(): string {
    // yyyy-MM-ddTHH:mm:ss.SSSZZ (Luxon 기본 ISO와 유사)
    return this._dt.toISO() ?? "";
  }
}
