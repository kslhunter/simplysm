import { DateTime as LuxonDateTime } from "luxon";
import { ArgumentError } from "../../errors/ArgumentError";

export class DateOnly {
  // [엔진 교체]
  private _dt: LuxonDateTime;

  constructor();
  constructor(year: number, month: number, day: number);
  constructor(tick: number);
  constructor(date: Date);
  constructor(dt: LuxonDateTime); // 내부용
  constructor(arg1?: number | Date | LuxonDateTime, arg2?: number, arg3?: number) {
    if (arg1 === undefined) {
      this._dt = LuxonDateTime.local().startOf("day");
    } else if (arg1 instanceof LuxonDateTime) {
      this._dt = arg1.startOf("day");
    } else if (arg2 !== undefined && arg3 !== undefined) {
      this._dt = LuxonDateTime.local(arg1 as number, arg2, arg3).startOf("day");
    } else if (arg1 instanceof Date) {
      this._dt = LuxonDateTime.fromJSDate(arg1).startOf("day");
    } else {
      this._dt = LuxonDateTime.fromMillis(arg1).startOf("day");
    }
  }

  get date(): Date {
    return this._dt.toJSDate();
  }

  static parse(str: string): DateOnly {
    let dt = LuxonDateTime.fromISO(str);
    if (!dt.isValid) {
      // yyyyMMdd
      if (/^[0-9]{8}$/.test(str)) {
        dt = LuxonDateTime.fromFormat(str, "yyyyMMdd");
      }
    }

    if (!dt.isValid) {
      // Date.parse fallback
      const tick = Date.parse(str);
      if (!Number.isNaN(tick)) {
        dt = LuxonDateTime.fromMillis(tick);
      }
    }

    if (!dt.isValid) throw new ArgumentError({ str });
    return new DateOnly(dt);
  }

  // [주차 계산 로직 유지] Luxon에도 weekNumber가 있지만, 기존 로직이 특수할 수 있으므로
  // 로직은 유지하되 연산만 Luxon으로 변경
  getBaseYearMonthSeqForWeekSeq(weekStartDay: number = 1, minDaysInFirstWeek: number = 4) {
    // Luxon은 월요일=1, 일요일=7. 기존 코드(일=0)와 매핑 필요
    const luxonWeekDay = this._dt.weekday === 7 ? 0 : this._dt.weekday;
    const dayOfWeek = (luxonWeekDay + 7 - weekStartDay) % 7;
    const daysInWeek = 7 - dayOfWeek;

    if (daysInWeek < minDaysInFirstWeek) {
      const prev = this.addDays(-7);
      return { year: prev.year, monthSeq: prev.month };
    } else {
      const nextMonth = this.addMonths(1).setDay(1);
      // Diff 계산
      const remainedDays = nextMonth._dt.diff(this._dt, "days").days;

      const realDaysInWeek = Math.min(daysInWeek, remainedDays);
      if (realDaysInWeek < minDaysInFirstWeek) {
        const next = this.addDays(7);
        return { year: next.year, monthSeq: next.month };
      } else {
        return { year: this.year, monthSeq: this.month };
      }
    }
  }

  // ... (getWeekSeqStartDate 등 나머지 주차 메서드들도 위와 동일하게 Luxon 연산으로 변경 가능)
  // ... (기존 로직이 복잡하면 일단 this._dt 기반으로 Getter/Setter만 교체해도 충분함)

  get isValidDate(): boolean {
    return this._dt.isValid;
  }

  get year(): number {
    return this._dt.year;
  }
  set year(v: number) {
    this._dt = this._dt.set({ year: v });
  }

  get month(): number {
    return this._dt.month;
  }
  set month(v: number) {
    this._dt = this._dt.set({ month: v });
  }

  get day(): number {
    return this._dt.day;
  }
  set day(v: number) {
    this._dt = this._dt.set({ day: v });
  }

  get tick(): number {
    return this._dt.toMillis();
  }
  set tick(v: number) {
    this._dt = LuxonDateTime.fromMillis(v).startOf("day");
  }

  get week(): number {
    return this._dt.weekday === 7 ? 0 : this._dt.weekday;
  }

  setYear(year: number): DateOnly {
    return new DateOnly(this._dt.set({ year }));
  }
  setMonth(month: number): DateOnly {
    return new DateOnly(this._dt.set({ month }));
  }
  setDay(day: number): DateOnly {
    return new DateOnly(this._dt.set({ day }));
  }

  addYears(years: number): DateOnly {
    return new DateOnly(this._dt.plus({ years }));
  }
  addMonths(months: number): DateOnly {
    return new DateOnly(this._dt.plus({ months }));
  }
  addDays(days: number): DateOnly {
    return new DateOnly(this._dt.plus({ days }));
  }

  toFormatString(format: string): string {
    return this._dt.toFormat(format);
  }

  toString(): string {
    return this._dt.toFormat("yyyy-MM-dd");
  }
}
