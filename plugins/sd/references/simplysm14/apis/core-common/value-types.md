# @simplysm/core-common — value-types

날짜/시간/UUID 값 타입과 날짜 포맷 헬퍼 묶음. 파싱·포맷·불변 산술·주차 계산·원시 타입 매핑에서 함께 참조한다.

## DateTime

```ts
class DateTime {
  readonly date: Date;
  constructor();
  constructor(year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);
  static parse(str: string): DateTime;
}
```

- `date: Date` — 내부 Date 복제본이다. getter 는 이 Date 에서 로컬 타임존 기준 값을 읽는다.
- `constructor()` — 현재 시각으로 생성한다.
- `year: number` — 연도다.
- `month: number` — 1~12 기준 월이다. 생성 시 내부 Date 월은 `month - 1` 로 전달된다.
- `day: number` — 일이다. 생성자와 `setDay` 는 JS Date 의 일 오버플로/언더플로 정규화를 따른다.
- `hour?: number` / `minute?: number` / `second?: number` / `millisecond?: number` — 생략하면 0 으로 들어간다.
- `tick: number` — epoch 밀리초다.
- `date: Date` 생성 인자 — 원본 Date 의 `getTime()` 으로 복제한다.
- `parse(str)` — 먼저 `Date.parse(str)` 를 시도하고, 실패하면 `yyyy-MM-dd AM|PM HH:mm:ss[.fff]`, `yyyy-MM-dd 오전|오후 HH:mm:ss[.fff]`, `yyyyMMddHHmmss`, `yyyy-MM-dd HH:mm:ss[.fff]` 를 처리한다. 실패하면 `ArgumentError`.

읽기 전용 getter:

- `year`, `month`, `day`, `hour`, `minute`, `second`, `millisecond` — 로컬 Date 구성요소다.
- `tick` — `date.getTime()` 값이다.
- `dayOfWeek` — 0=일요일, 1=월요일, ..., 6=토요일이다.
- `timezoneOffsetMinutes` — `-date.getTimezoneOffset()` 이다.
- `isValid` — Date 인스턴스이고 `getTime()` 이 NaN 이 아니면 true 다.

불변 변환·산술:

- `setYear(year): DateTime` — 연도만 바꾼 새 인스턴스다. 대상 연월의 말일보다 현재 일이 크면 말일로 줄인다.
- `setMonth(month): DateTime` — 월만 바꾼 새 인스턴스다. 1~12 밖 월은 연도로 이월하고, 말일 초과 일은 말일로 줄인다.
- `setDay(day): DateTime` — 일을 바꾼 새 인스턴스다. JS Date 의 월 이월 규칙을 따른다.
- `setHour(hour)`, `setMinute(minute)`, `setSecond(second)`, `setMillisecond(millisecond)` — 해당 시간 구성요소만 바꾼 새 인스턴스다.
- `addYears(years)`, `addMonths(months)`, `addDays(days)` — `setYear`/`setMonth`/`setDay` 를 통해 달력 단위로 더한다.
- `addHours(hours)`, `addMinutes(minutes)`, `addSeconds(seconds)`, `addMilliseconds(milliseconds)` — tick 에 시간 단위 밀리초를 더한 새 인스턴스다.
- `toFormatString(formatStr: string): string` — `dt.format` 토큰으로 문자열화한다.
- `toString(): string` — `yyyy-MM-ddTHH:mm:ss.fffzzz` 형식 문자열을 반환한다.

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

- `date: Date` — 시간 정보를 자정으로 맞춘 내부 Date 다.
- `constructor()` — 오늘 날짜(로컬 연·월·일)로 생성한다.
- `year`, `month`, `day` 생성 인자 — month 는 1~12 기준이며 JS Date 정규화를 따른다.
- `tick: number` 생성 인자 — tick 으로 Date 를 만든 뒤 로컬 연·월·일만 보존한다.
- `date: Date` 생성 인자 — Date 의 로컬 연·월·일만 보존한다.
- `parse(str)` — `yyyy-MM-dd` 와 `yyyyMMdd` 는 문자열 숫자를 직접 추출한다. 그 외 Date.parse 가능 문자열은 UTC tick 을 로컬 날짜로 보정한다. 실패하면 `ArgumentError`.

읽기 전용 getter:

- `isValid` — 내부 Date 의 tick 이 NaN 이 아니면 true 다.
- `year`, `month`, `day`, `tick` — 로컬 날짜 구성요소와 epoch 밀리초다.
- `dayOfWeek` — 0=일요일, ..., 6=토요일이다.

불변 변환·산술:

- `setYear(year): DateOnly` — 연도만 바꾼 새 인스턴스다. 대상 월 말일보다 현재 일이 크면 말일로 줄인다.
- `setMonth(month): DateOnly` — 월만 바꾼 새 인스턴스다. 1~12 밖 월은 연도로 이월하고 말일 초과 일은 말일로 줄인다.
- `setDay(day): DateOnly` — 일을 바꾼 새 인스턴스다. JS Date 의 월 이월 규칙을 따른다.
- `addYears(years)`, `addMonths(months)`, `addDays(days)` — 각각 `setYear`/`setMonth`/`setDay` 기반 새 인스턴스를 반환한다.
- `toFormatString(formatStr: string): string` — 날짜 구성요소를 `dt.format` 으로 포맷한다.
- `toString(): string` — `yyyy-MM-dd` 문자열을 반환한다.

주차 계산:

- `weekStartDay: number` — 주 시작 요일이다. 0=일요일, 1=월요일, ..., 6=토요일. 기본값은 1.
- `minDaysInFirstWeek: number` — 첫 주로 인정할 최소 일수다. 기본값은 4.
- `getBaseYearMonthSeqForWeekSeq(weekStartDay = 1, minDaysInFirstWeek = 4): { year: number; monthSeq: number }` — 현재 날짜가 속한 주의 기준 연도와 월을 반환한다.
- `getWeekSeqStartDate(weekStartDay = 1, minDaysInFirstWeek = 4): DateOnly` — 현재 날짜가 속한 주의 시작 날짜를 반환한다.
- `getWeekSeqOfYear(weekStartDay = 1, minDaysInFirstWeek = 4): { year: number; weekSeq: number }` — 연도 기준 주차를 반환한다.
- `getWeekSeqOfMonth(weekStartDay = 1, minDaysInFirstWeek = 4): { year: number; monthSeq: number; weekSeq: number }` — 월 기준 주차를 반환한다.
- `static getDateByYearWeekSeq(arg: { year: number; month?: number; weekSeq: number }, weekStartDay = 1, minDaysInFirstWeek = 4): DateOnly` — 지정 연도·선택 월·주차에서 해당 주 시작 날짜를 만든다. `arg.month` 생략 시 1월 기준이다.

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

- 내부 tick — 하루 밀리초(`24 * 60 * 60 * 1000`)로 나눈 나머지를 저장한다. 음수는 하루를 더해 0 이상으로 만든다.
- `constructor()` — 현재 시각의 시간 부분으로 생성한다.
- `hour`, `minute`, `second?`, `millisecond?` — 시간 구성요소다. 초·밀리초 생략 시 0 이며 24시간 밖 값도 하루 범위로 정규화된다.
- `tick: number` 생성 인자 — 하루 범위로 정규화된 밀리초다.
- `date: Date` 생성 인자 — Date 의 시·분·초·밀리초만 추출한다.
- `parse(str)` — `AM|PM HH:mm:ss[.fff]`, `HH:mm:ss[.fff]`, ISO 8601 `yyyy-MM-ddT...` 형태를 처리한다. 실패하면 `ArgumentError`.

읽기 전용 getter:

- `hour`, `minute`, `second`, `millisecond` — 내부 tick 에서 계산한 시간 구성요소다.
- `tick` — 0 이상 하루 미만 밀리초다.
- `isValid` — 내부 tick 이 NaN 이 아니면 true 다.

불변 변환·산술:

- `setHour(hour)`, `setMinute(minute)`, `setSecond(second)`, `setMillisecond(millisecond)` — 해당 구성요소만 바꾼 새 Time 이며 하루 범위로 정규화된다.
- `addHours(hours)`, `addMinutes(minutes)`, `addSeconds(seconds)`, `addMilliseconds(milliseconds)` — 24시간 순환 규칙으로 더한 새 Time 을 반환한다.
- `toFormatString(formatStr: string): string` — 시간 구성요소를 `dt.format` 으로 포맷한다.
- `toString(): string` — `HH:mm:ss.fff` 문자열을 반환한다.

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

- `generate()` — `crypto.getRandomValues` 로 16바이트를 만들고 UUID v4 비트를 설정한다.
- `fromBytes(bytes: Bytes)` — 16바이트 Uint8Array 를 UUID 문자열로 바꾼다. 길이가 16이 아니면 `ArgumentError`.
- `uuid: string` 생성 인자 — `8-4-4-4-12` hex 문자열 형식이어야 한다. 불일치하면 `ArgumentError`.
- `toString()` — 내부 UUID 문자열을 반환한다.
- `toBytes()` — 하이픈을 제외한 hex 쌍을 16바이트 Uint8Array 로 변환한다.

## dt

`import { dt } from "@simplysm/core-common"` 네임스페이스.

- `DtNormalizedMonth` — `normalizeMonth` 결과 타입이다. `year` 는 정규화된 연도, `month` 는 1~12 월, `day` 는 대상 월 말일을 넘지 않게 조정된 일이다.
- `normalizeMonth(year: number, month: number, day: number): DtNormalizedMonth` — 1~12 밖 월을 연도로 이월하고, `day` 를 대상 월 마지막 일 이하로 줄인다.
- `convert12To24(rawHour: number, isPM: boolean): number` — 12시간제 시를 24시간제로 바꾼다. `rawHour === 12` 이면 PM 은 12, AM 은 0; 그 외 PM 은 +12, AM 은 그대로다.
- `format(formatString: string, args: { year?: number; month?: number; day?: number; hour?: number; minute?: number; second?: number; millisecond?: number; timezoneOffsetMinutes?: number }): string` — 전달된 구성요소에 해당하는 토큰만 치환한다. `timezoneOffsetMinutes` 는 `zzz`/`zz`/`z` 토큰의 부호와 시·분을 만든다.

포맷 토큰:

| 토큰 | 치환 값 |
| --- | --- |
| `yyyy` / `yy` | 4자리/2자리 연도 |
| `MM` / `M` | 0채움 월 / 월 |
| `ddd` | `일`·`월`·`화`·`수`·`목`·`금`·`토` |
| `dd` / `d` | 0채움 일 / 일 |
| `tt` | `AM` 또는 `PM` |
| `hh` / `h` | 0채움 12시간 / 12시간 |
| `HH` / `H` | 0채움 24시간 / 24시간 |
| `mm` / `m` | 0채움 분 / 분 |
| `ss` / `s` | 0채움 초 / 초 |
| `fff` / `ff` / `f` | 밀리초 3자리 / 앞 2자리 / 앞 1자리 |
| `zzz` / `zz` / `z` | 타임존 오프셋 `±HH:mm` / `±HH` / `±H` |
