# @simplysm/core-common — 날짜·시간

불변 날짜/시간 값 `DateTime`(날짜+시간)·`DateOnly`(날짜)·`Time`(시간)과 포맷 문자열을 처리하는 `dt` 네임스페이스. 세 클래스 모두 로컬 타임존 기준이며, 모든 set/add 메서드는 원본을 변경하지 않고 새 인스턴스를 반환한다. 파싱 실패 시 `ArgumentError` throw.

공통 포맷 토큰(`toFormatString` 인자): `yyyy`/`yy`(연), `MM`/`M`(월), `ddd`(요일 한글: 일~토)/`dd`/`d`(일), `tt`(AM/PM), `hh`/`h`(12시간), `HH`/`H`(24시간), `mm`/`m`(분), `ss`/`s`(초), `fff`/`ff`/`f`(밀리초), `zzz`/`zz`/`z`(타임존 오프셋, DateTime 만). 긴 토큰이 먼저 치환됨.

## DateTime

날짜+시간을 ms 정밀도로 담는 불변 클래스. 내부에 `readonly date: Date` 보유.

```typescript
class DateTime {
  constructor();                                   // 현재 시각
  constructor(year, month, day, hour?, minute?, second?, millisecond?); // month 는 1~12
  constructor(tick: number);                       // epoch ms
  constructor(date: Date);
  static parse(str: string): DateTime;

  readonly date: Date;
  get year/month/day/hour/minute/second/millisecond/tick: number;
  get dayOfWeek: number;             // 0(일)~6(토)
  get timezoneOffsetMinutes: number; // UTC 대비 분 (KST = +540)
  get isValid: boolean;

  setYear/setMonth/setDay/setHour/setMinute/setSecond/setMillisecond(v: number): DateTime;
  addYears/addMonths/addDays/addHours/addMinutes/addSeconds/addMilliseconds(n: number): DateTime;
  toFormatString(formatStr: string): string;
  toString(): string;                // "yyyy-MM-ddTHH:mm:ss.fffzzz"
}
```

- 생성자 `month` 인자는 1~12(내부에서 `month-1` 로 Date 에 전달). `tick`/`Date` 오버로드는 단일 숫자/Date 로 구분.
- `parse` 지원 형식: `yyyy-MM-dd HH:mm:ss[.fff]`, `yyyyMMddHHmmss`, `yyyy-MM-dd AM/PM HH:mm:ss`, 한국어 `yyyy-MM-dd 오전/오후 HH:mm:ss`, ISO 8601. 먼저 `Date.parse` 를 시도.
- `setMonth(month)` — 1~12 밖이면 연도로 흡수, 대상 월 일수보다 현재 일이 크면 말일로 보정(1/31 → setMonth(2) → 2/28). `setYear` 도 윤년 말일 보정.
- `addMonths`/`addDays` 는 각각 `setMonth`/`setDay` 기반이라 월말 보정/오버플로 규칙을 따름. `addHours` 이하는 tick 가산이라 타임존 전환 영향 없음.
- `isValid` — 내부 Date 가 NaN 이 아닌지. `parse` 가 아닌 잘못된 tick/Date 로 만든 경우 점검용.

```typescript
new DateTime(2025, 1, 31).setMonth(2).toFormatString("yyyy-MM-dd"); // "2025-02-28"
DateTime.parse("2025-01-15 오후 2:30:00").hour;                     // 14
```

## DateOnly

시간 정보 없이 날짜만 담는 불변 클래스(`readonly date: Date`, 자정 고정). 주차 계산 API 포함.

```typescript
class DateOnly {
  constructor();                       // 오늘
  constructor(year, month, day);        // month 1~12
  constructor(tick: number);
  constructor(date: Date);
  static parse(str: string): DateOnly;
  static getDateByYearWeekSeq(arg: { year: number; month?: number; weekSeq: number }, weekStartDay?: number, minDaysInFirstWeek?: number): DateOnly;

  readonly date: Date;
  get year/month/day/tick/dayOfWeek: number; // dayOfWeek 0(일)~6(토)
  get isValid: boolean;
  setYear/setMonth/setDay(v: number): DateOnly;
  addYears/addMonths/addDays(n: number): DateOnly;

  getBaseYearMonthSeqForWeekSeq(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; monthSeq: number };
  getWeekSeqStartDate(weekStartDay?: number, minDaysInFirstWeek?: number): DateOnly;
  getWeekSeqOfYear(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; weekSeq: number };
  getWeekSeqOfMonth(weekStartDay?: number, minDaysInFirstWeek?: number): { year: number; monthSeq: number; weekSeq: number };

  toFormatString(formatStr: string): string;
  toString(): string;                  // "yyyy-MM-dd"
}
```

- `parse` 형식: `yyyy-MM-dd`·`yyyyMMdd`(둘 다 타임존 무관, 문자열에서 직접 추출), ISO 8601(UTC 해석 후 로컬 변환). 서버/클라 타임존이 다르면 `yyyy-MM-dd` 권장.
- 주차 계산 공통 인자: `weekStartDay` 주 시작 요일(0=일~6=토, 기본 1=월), `minDaysInFirstWeek` 첫 주로 인정할 최소 일수(1~7, 기본 4=ISO 8601). 미국식은 `(0, 1)`.
- `getWeekSeqOfYear` — 연 기준 몇 째 주인지. `getWeekSeqOfMonth` — 월 기준 주차(+기준 연·월). `getWeekSeqStartDate` — 이 날짜가 속한 주의 시작일. `getBaseYearMonthSeqForWeekSeq` — 주차 귀속 기준 연·월(월 경계 조정).
- `getDateByYearWeekSeq(arg, ...)` — 정적. `{ year, weekSeq }`(연 주차) 또는 `{ year, month, weekSeq }`(월 주차)로 해당 주 시작일 역산.

```typescript
new DateOnly(2025, 1, 6).getWeekSeqOfYear();           // { year: 2025, weekSeq: 2 }
DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 }); // 2025-01-06 (월)
```

## Time

날짜 없이 시각(HH:mm:ss.fff)만 담는 불변 클래스. 24시간을 넘거나 음수인 tick 은 24시간 순환으로 정규화된다.

```typescript
class Time {
  constructor();                                  // 현재 시각의 시간 부분
  constructor(hour, minute, second?, millisecond?);
  constructor(tick: number);                       // 자정 기준 ms
  constructor(date: Date);                          // Date 의 시간 부분만
  static parse(str: string): Time;

  get hour/minute/second/millisecond/tick: number;
  get isValid: boolean;
  setHour/setMinute/setSecond/setMillisecond(v: number): Time;
  addHours/addMinutes/addSeconds/addMilliseconds(n: number): Time; // 24시간 순환
  toFormatString(formatStr: string): string;
  toString(): string;                              // "HH:mm:ss.fff"
}
```

- 생성자 다중 인자(`hour, minute, ...`)와 단일 `tick`/`Date` 오버로드. 결과 tick 은 항상 `[0, 24h)` 범위로 wrap.
- `parse` 형식: `HH:mm:ss[.fff]`, `AM/PM HH:mm:ss[.fff]`, ISO 8601(시간 부분만 추출, 타임존 변환은 Date 위임).
- `addHours` 등 산술은 24시간을 넘으면 다시 0시부터(`23:00` + 2h → `01:00`). 날짜 개념이 없으므로 일자 carry 는 버려짐.

```typescript
Time.parse("AM 10:30:00").addHours(15).toString(); // "01:30:00.000"
```

## dt 네임스페이스

`import { dt } from "@simplysm/core-common"`. 위 클래스들이 내부에서 쓰는 포맷/정규화 함수를 직접 노출.

```typescript
dt.format(formatString: string, args: { year?; month?; day?; hour?; minute?; second?; millisecond?; timezoneOffsetMinutes?: number }): string;
dt.normalizeMonth(year: number, month: number, day: number): { year: number; month: number; day: number };
dt.convert12To24(rawHour: number, isPM: boolean): number;
interface DtNormalizedMonth { year: number; month: number; day: number; }
```

- `dt.format(fmt, args)` — 위 공통 토큰 표를 따르는 저수준 포맷터. 누락한 구성요소(예: `hour` 만)는 해당 토큰만 치환하고 나머지는 원문 유지. `DateTime`/`DateOnly`/`Time` 의 `toFormatString` 이 이 함수를 호출.
- `dt.normalizeMonth(year, month, day)` — 월이 1~12 밖이면 연도로 흡수, 일이 대상 월 일수 초과면 말일로 보정한 `{year, month, day}`. `setMonth` 의 보정 규칙 그대로.
- `dt.convert12To24(rawHour, isPM)` — 12시간(1~12)+AM/PM 을 0~23 으로. `12 AM`→0, `12 PM`→12.

```typescript
dt.format("yyyy-MM-dd (ddd)", { year: 2024, month: 3, day: 15 }); // "2024-03-15 (금)"
dt.normalizeMonth(2025, 13, 15);                                  // { year: 2026, month: 1, day: 15 }
```
