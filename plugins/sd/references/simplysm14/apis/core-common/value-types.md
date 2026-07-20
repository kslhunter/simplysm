# @simplysm/core-common — value-types

날짜/시간/UUID 불변 값 타입과 날짜 포맷 헬퍼 묶음입니다. 파싱, 포맷, 불변 산술, 주차 계산에서 함께 참조합니다.
`DateTime`/`DateOnly`/`Time` 은 로컬 타임존 기준이며 모든 변환, 산술 메서드는 새 인스턴스를 반환합니다.

## DateTime

```ts
class DateTime {
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
  static parse(str: string): DateTime;
}
```

- `date: Date` — 내부 Date 복제본입니다. getter 는 이 Date 에서 로컬 타임존 기준 값을 읽습니다.
- `constructor()` — 현재 시각으로 생성합니다.
- `year, month, day, hour?, minute?, second?, millisecond?` 생성 인자 — `month` 는 1-12 기준(내부 Date 에는 `month - 1` 전달). 시, 분, 초, 밀리초 생략 시 0 입니다.
- `constructor(tick)` — epoch 밀리초로 생성합니다.
- `constructor(date)` — 원본 Date 의 `getTime()` 으로 복제합니다.
- `static parse(str)` — 먼저 `Date.parse(str)` 를 시도하고, 실패하면 아래 순으로 처리합니다. 전부 실패하면 `ArgumentError`.
  - 순서: `yyyy-MM-dd AM|PM HH:mm:ss[.fff]`, `yyyy-MM-dd 오전|오후 HH:mm:ss[.fff]`, `yyyyMMddHHmmss`, `yyyy-MM-dd HH:mm:ss[.fff]`.

읽기 전용 getter:

- `year, month(1-12), day, hour, minute, second, millisecond` — 로컬 Date 구성요소입니다.
- `tick: number` — `date.getTime()`(epoch 밀리초).
- `dayOfWeek: number` — 요일. 0=일요일 … 6=토요일.
- `timezoneOffsetMinutes: number` — `-date.getTimezoneOffset()`. KST 는 +540.
- `isValid: boolean` — Date 인스턴스이고 `getTime()` 이 NaN 이 아니면 true 입니다.

불변 변환, 산술(모두 새 DateTime 반환):

- `setYear(year)` — 연도만 변경합니다. 대상 연, 월 말일보다 현재 일이 크면 말일로 줄입니다.
- `setMonth(month)` — 월만 변경합니다. 1-12 밖 월은 연도로 이월하고, 말일 초과 일은 말일로 줄입니다(`dt.normalizeMonth` 사용).
- `setDay(day)` — 일만 변경합니다. JS Date 의 월 이월 규칙을 따릅니다(예: 1월 32일 → 2월 1일).
- `setHour(hour)`, `setMinute(minute)`, `setSecond(second)`, `setMillisecond(millisecond)` — 해당 구성요소만 변경합니다.
- `addYears(years)`, `addMonths(months)`, `addDays(days)` — `setYear`/`setMonth`/`setDay` 기반 달력 단위 덧셈입니다.
- `addHours(hours)`, `addMinutes(minutes)`, `addSeconds(seconds)`, `addMilliseconds(milliseconds)` — tick 에 밀리초를 더합니다.
- `toFormatString(formatStr: string): string` — `dt.format` 토큰으로 문자열화합니다.
- `toString(): string` — `yyyy-MM-ddTHH:mm:ss.fffzzz` 형식.

## DateOnly

```ts
class DateOnly {
  readonly date: Date;
  constructor();
  constructor(year: number, month: number, day: number);
  constructor(tick: number);
  constructor(date: Date);
  static parse(str: string): DateOnly;
}
```

- `date: Date` — 시간 부분을 자정으로 맞춘 내부 Date 입니다.
- `constructor()` — 오늘 날짜(로컬 연, 월, 일)로 생성합니다.
- `year, month, day` 생성 인자 — `month` 는 1-12 기준이며 JS Date 정규화를 따릅니다.
- `constructor(tick)` / `constructor(date)` — tick/Date 로 만든 뒤 로컬 연, 월, 일만 보존합니다(시각 버림).
- `static parse(str)` — 형식에 따라 아래로 처리하고, 실패하면 `ArgumentError`.
  - `yyyy-MM-dd`, `yyyyMMdd` — 문자열 숫자를 직접 추출합니다(타임존 무관).
  - 그 외 `Date.parse` 가능 문자열 — UTC tick 을 파싱 대상 날짜의 오프셋만큼 보정해 로컬 날짜로 변환합니다.
  - 서버/클라이언트 타임존이 다르면 `yyyy-MM-dd` 를 쓰세요.

읽기 전용 getter:

- `isValid` — 내부 Date 의 tick 이 NaN 이 아니면 true 입니다.
- `year, month(1-12), day, tick` — 로컬 날짜 구성요소와 epoch 밀리초입니다.
- `dayOfWeek` — 0=일요일 … 6=토요일.

불변 변환, 산술(새 DateOnly 반환):

- `setYear(year)` — 연도만 변경합니다. 대상 월 말일 초과 일은 말일로 줄입니다.
- `setMonth(month)` — 월만 변경합니다. 1-12 밖 월은 연도로 이월하고, 말일 초과 일은 말일로 줄입니다.
- `setDay(day)` — 일만 변경합니다. JS Date 월 이월 규칙을 따릅니다.
- `addYears(years)`, `addMonths(months)`, `addDays(days)` — 각각 `setYear`/`setMonth`/`setDay` 기반입니다.
- `toFormatString(formatStr)` — `dt.format` 으로 포맷합니다.
- `toString()` — `yyyy-MM-dd`.

주차 계산:

- 공통 인자
  - `weekStartDay` — 주 시작 요일. 0=일 … 6=토, 기본 1=월요일.
  - `minDaysInFirstWeek` — 첫 주로 인정할 최소 일수. 기본 4=ISO 8601.
- `getBaseYearMonthSeqForWeekSeq(weekStartDay = 1, minDaysInFirstWeek = 4): { year: number; monthSeq: number }`
  — 이 날짜가 속한 주의 기준 연도, 월입니다.
- `getWeekSeqStartDate(weekStartDay = 1, minDaysInFirstWeek = 4): DateOnly` — 이 날짜가 속한 주의 시작 날짜입니다.
- `getWeekSeqOfYear(weekStartDay = 1, minDaysInFirstWeek = 4): { year: number; weekSeq: number }` — 연도 기준 주차 번호입니다.
- `getWeekSeqOfMonth(weekStartDay = 1, minDaysInFirstWeek = 4): { year: number; monthSeq: number; weekSeq: number }`
  — 월 기준 주차 번호입니다.
- `static getDateByYearWeekSeq(arg: { year: number; month?: number; weekSeq: number }, weekStartDay = 1, minDaysInFirstWeek = 4): DateOnly`
  — 지정 연도, 선택 월, 주차에서 해당 주 시작 날짜를 만듭니다. `arg.month` 생략 시 1월 기준입니다.

## Time

```ts
class Time {
  constructor();
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);
  static parse(str: string): Time;
}
```

날짜 없이 시각만 저장합니다.
내부 tick 은 하루 밀리초(`24*60*60*1000`)로 나눈 나머지이며, 24시간 초과, 음수 값은 하루 범위로 정규화됩니다(음수는 하루를 더함).

- `constructor()` — 현재 시각의 시간 부분으로 생성합니다.
- `hour, minute, second?, millisecond?` 생성 인자 — 초, 밀리초 생략 시 0 입니다. 24시간 밖 값도 정규화됩니다.
- `constructor(tick)` — 하루 범위로 정규화된 밀리초입니다.
- `constructor(date)` — Date 의 시, 분, 초, 밀리초만 추출합니다.
- `static parse(str)` — `AM|PM HH:mm:ss[.fff]`, `HH:mm:ss[.fff]`, ISO 8601 `yyyy-MM-ddT...` 형태를 처리합니다(ISO 는 로컬 시각으로 변환). 실패하면 `ArgumentError`.

읽기 전용 getter:

- `hour, minute, second, millisecond` — 내부 tick 에서 계산한 구성요소입니다.
- `tick` — 0 이상 하루 미만 밀리초입니다.
- `isValid` — 내부 tick 이 NaN 이 아니면 true 입니다.

불변 변환, 산술(새 Time 반환, 24시간 순환):

- `setHour(hour)`, `setMinute(minute)`, `setSecond(second)`, `setMillisecond(millisecond)` — 해당 구성요소만 변경합니다.
- `addHours(hours)`, `addMinutes(minutes)`, `addSeconds(seconds)`, `addMilliseconds(milliseconds)` — 24시간 순환으로 더합니다(음수도 순환).
- `toFormatString(formatStr)` — `dt.format` 으로 포맷합니다.
- `toString()` — `HH:mm:ss.fff`.

## Uuid

```ts
class Uuid {
  static generate(): Uuid;
  static fromBytes(bytes: Bytes): Uuid;
  constructor(uuid: string);
  toString(): string;
  toBytes(): Bytes;
}
```

- `static generate()` — `crypto.getRandomValues` 로 16바이트를 만들고 v4 비트를 설정합니다(암호학적 난수).
- `static fromBytes(bytes)` — 16바이트 Uint8Array 를 UUID 문자열로 변환합니다. 길이가 16이 아니면 `ArgumentError`.
- `constructor(uuid)` — `8-4-4-4-12` hex 문자열 형식이어야 합니다. 형식이 안 맞으면 `ArgumentError`.
- `toString()` — 내부 UUID 문자열을 반환합니다.
- `toBytes()` — 하이픈 제외 hex 쌍을 16바이트 Uint8Array 로 변환합니다.

## dt

`import { dt } from "@simplysm/core-common"` 네임스페이스입니다.
값 타입의 `toFormatString`/`parse` 가 내부적으로 쓰는 저수준 포맷, 정규화 함수입니다.

- `format(formatString: string, args: { year?: number; month?: number; day?: number; hour?: number; minute?: number; second?: number; millisecond?: number; timezoneOffsetMinutes?: number }): string`
  — 전달된 구성요소에 해당하는 토큰만 치환합니다(C# 호환 토큰).
  - 미전달 구성요소의 토큰은 그대로 남습니다.
  - `timezoneOffsetMinutes` 는 `zzz`/`zz`/`z` 토큰의 부호, 시, 분을 만듭니다.
- `normalizeMonth(year: number, month: number, day: number): DtNormalizedMonth`
  — 1-12 밖 월을 연도로 이월하고(음수 월도 처리), `day` 를 대상 월 마지막 일 이하로 줄입니다.
- `convert12To24(rawHour: number, isPM: boolean): number` — 12시간제 시(1-12)를 24시간제(0-23)로 변환합니다.
  - `rawHour === 12` 이면 PM=12, AM=0. 그 외에는 PM=+12, AM 은 그대로입니다.
- `DtNormalizedMonth` — `normalizeMonth` 결과 타입입니다. `year`(정규화 연도), `month`(1-12), `day`(말일 이하로 조정된 일).

포맷 토큰(`format` / 값 타입의 `toFormatString`):

- `yyyy` / `yy` — 4자리 / 2자리 연도.
- `MM` / `M` — 0채움 월 / 월.
- `ddd` — 요일 `일`, `월`, `화`, `수`, `목`, `금`, `토`.
- `dd` / `d` — 0채움 일 / 일.
- `tt` — `AM` 또는 `PM`(시 < 12 면 AM).
- `hh` / `h` — 0채움 12시간 / 12시간.
- `HH` / `H` — 0채움 24시간 / 24시간.
- `mm` / `m` — 0채움 분 / 분.
- `ss` / `s` — 0채움 초 / 초.
- `fff` / `ff` / `f` — 밀리초 3자리 / 앞 2자리 / 앞 1자리.
- `zzz` / `zz` / `z` — 타임존 오프셋 `±HH:mm` / `±HH` / `±H`.
