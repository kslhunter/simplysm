# @simplysm/core-common — value-types

불변(immutable) 날짜/시간/식별자 값 타입 `DateTime`·`DateOnly`·`Time`·`Uuid`. set/add 계열은 모두 **새 인스턴스를 반환**하고, 날짜/시간은 로컬 타임존 기준으로 동작. ORM 컬럼·폼 입력·직렬화 전반에서 함께 다뤄짐. `import { DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common"`.

값을 문자열로 변환하는 C# 스타일 포맷 토큰(`toFormatString`/`dt.format` 공용)은 맨 아래 표 참조.

## DateTime

JavaScript `Date` 래핑. 밀리초 정밀도, 로컬 타임존. 내부 `date: Date` 를 읽기전용으로 보유.

생성자:

- `new DateTime()` — 현재 시각.
- `new DateTime(year, month, day, hour?, minute?, second?, millisecond?)` — month 는 1-12(내부에서 0-11 로 변환). 시/분/초/밀리초 생략 시 0.
- `new DateTime(tick: number)` — epoch 밀리초.
- `new DateTime(date: Date)` — Date 복제.
- `static parse(str): DateTime` — 문자열 파싱. `Date.parse` 가 먼저 시도되고(ISO 8601 등), 실패 시 `yyyy-MM-dd HH:mm:ss[.fff]`, `yyyy-MM-dd AM|PM ...`, `yyyy-MM-dd 오전|오후 ...`, `yyyyMMddHHmmss` 순으로 매칭. 모두 실패하면 `ArgumentError`.

게터(읽기전용): `year`, `month`(1-12), `day`, `hour`, `minute`, `second`, `millisecond`, `tick`(epoch ms), `dayOfWeek`(0=일~6=토), `timezoneOffsetMinutes`(UTC 대비 분, KST 는 +540), `isValid`(유효 Date 여부).

불변 변환(새 인스턴스): `setYear/setMonth/setDay/setHour/setMinute/setSecond/setMillisecond`. `setYear`/`setMonth` 는 대상 월 일수를 넘는 일을 말일로 보정(1/31→2/28). `setMonth` 는 1-12 범위 밖 월을 연도로 이월. `setDay` 는 범위 밖 일을 JS Date 규칙대로 다음/이전 월로 이월.

산술(새 인스턴스): `addYears/addMonths/addDays`(달력 기준, `setYear`/`setMonth`/`setDay` 경유라 말일 보정 적용), `addHours/addMinutes/addSeconds/addMilliseconds`(tick 기준 절대 가산).

포맷: `toFormatString(formatStr): string`(아래 토큰 표), `toString()`=`yyyy-MM-ddTHH:mm:ss.fffzzz`.

```ts
const dt = DateTime.parse("2025-01-15 10:30:00");
dt.addDays(1).toFormatString("yyyy-MM-dd"); // "2025-01-16"
```

## DateOnly

시간 없는 날짜(`yyyy-MM-dd`). 내부 `date: Date` 는 자정으로 정규화.

생성자: `new DateOnly()`(오늘), `(year, month, day)`, `(tick)`, `(date)` — 모두 날짜 부분만 추출.

- `static parse(str): DateOnly` — `yyyy-MM-dd`/`yyyyMMdd` 는 타임존 무관하게 문자열에서 직접 추출. 그 외(ISO 8601 등)는 `Date.parse` 후 로컬 타임존 변환 적용. 실패 시 `ArgumentError`. 서버/클라이언트 타임존이 다르면 `yyyy-MM-dd` 형식 권장.

게터: `isValid`, `year`, `month`(1-12), `day`, `tick`, `dayOfWeek`.

불변 변환/산술: `setYear/setMonth/setDay`, `addYears/addMonths/addDays`(DateTime 과 동일 말일·이월 규칙).

주차 계산 — 모두 `weekStartDay`(0=일~6=토, 기본 1=월요일)와 `minDaysInFirstWeek`(1~7, 기본 4=ISO 8601) 인자를 받음:

- `getBaseYearMonthSeqForWeekSeq(weekStartDay?, minDaysInFirstWeek?): { year; monthSeq }` — 이 날짜가 속한 주의 기준 연·월(월 경계 처리 포함).
- `getWeekSeqStartDate(weekStartDay?, minDaysInFirstWeek?): DateOnly` — 이 날짜가 속한 주의 시작 날짜.
- `getWeekSeqOfYear(weekStartDay?, minDaysInFirstWeek?): { year; weekSeq }` — 연 기준 몇째 주.
- `getWeekSeqOfMonth(weekStartDay?, minDaysInFirstWeek?): { year; monthSeq; weekSeq }` — 월 기준 몇째 주.
- `static getDateByYearWeekSeq(arg: { year; month?; weekSeq }, weekStartDay?, minDaysInFirstWeek?): DateOnly` — 연(+선택 월)·주차로 해당 주 시작 날짜 역산.

포맷: `toFormatString(formatStr)`, `toString()`=`yyyy-MM-dd`.

```ts
new DateOnly(2025, 1, 6).getWeekSeqOfYear(); // { year: 2025, weekSeq: 2 }
```

## Time

날짜 없는 시간(`HH:mm:ss.fff`). 내부 tick(ms)으로 24시간(`86400000ms`) 모듈로 보관 → 24시간 초과/음수는 자동 정규화.

생성자: `new Time()`(현재 시각의 시간 부분), `(hour, minute, second?, millisecond?)`, `(tick)`, `(date)`(시간 부분만).

- `static parse(str): Time` — `HH:mm:ss[.fff]`, `AM|PM HH:mm:ss[.fff]`, ISO 8601(`...T...` 의 시간 부분) 매칭. 실패 시 `ArgumentError`.

게터: `hour`, `minute`, `second`, `millisecond`, `tick`, `isValid`.

불변 변환: `setHour/setMinute/setSecond/setMillisecond`.

산술(24시간 순환): `addHours/addMinutes/addSeconds/addMilliseconds` — 결과 tick 을 24시간으로 모듈로(음수면 +24h).

포맷: `toFormatString(formatStr)`, `toString()`=`HH:mm:ss.fff`.

```ts
Time.parse("23:30:00").addHours(2).toString(); // "01:30:00.000"
```

## Uuid

UUID v4 값 객체. 내부 문자열을 정규식(`8-4-4-4-12` hex)으로 검증.

- `static generate(): Uuid` — `crypto.getRandomValues` 기반 암호학적 안전 UUID v4 생성.
- `static fromBytes(bytes: Bytes): Uuid` — 16바이트 배열로 생성. 길이 ≠ 16 이면 `ArgumentError`.
- `new Uuid(uuid: string)` — 문자열로 생성. 형식 불일치 시 `ArgumentError`.
- `toString(): string` — UUID 문자열.
- `toBytes(): Bytes` — 16바이트 `Uint8Array`.

```ts
const id = Uuid.generate();
id.toString(); // "550e8400-e29b-41d4-a716-446655440000"
```

## 포맷 토큰 (toFormatString / dt.format 공용)

`DateTime`/`DateOnly`/`Time` 의 `toFormatString` 은 내부적으로 `dt.format(formatString, args)` 를 호출한다(`import { dt } from "@simplysm/core-common"` 로 직접도 사용 가능). 전달되지 않은 구성요소의 토큰은 치환되지 않고 그대로 남음. C# 스타일 토큰:

| 토큰 | 의미 | 예 |
| ---- | ---- | -- |
| `yyyy` / `yy` | 4자리 / 2자리 연도 | 2024 / 24 |
| `MM` / `M` | 0채움 월 / 월 | 01~12 / 1~12 |
| `ddd` | 요일(한글) | 일·월·화·수·목·금·토 |
| `dd` / `d` | 0채움 일 / 일 | 01~31 / 1~31 |
| `tt` | 오전/오후 | AM / PM |
| `hh` / `h` | 0채움 12시간 / 12시간 | 01~12 / 1~12 |
| `HH` / `H` | 0채움 24시간 / 24시간 | 00~23 / 0~23 |
| `mm` / `m` | 0채움 분 / 분 | 00~59 / 0~59 |
| `ss` / `s` | 0채움 초 / 초 | 00~59 / 0~59 |
| `fff` / `ff` / `f` | 밀리초 3/2/1자리 | 000~999 |
| `zzz` / `zz` / `z` | 타임존 오프셋 ±HH:mm / ±HH / ±H | +09:00 / +09 / +9 |

`dt` 네임스페이스의 보조 함수:

- `dt.normalizeMonth(year, month, day): { year; month; day }` — 1-12 범위 밖 월을 연도로 이월하고, 대상 월 일수를 넘는 일은 말일로 보정. `DtNormalizedMonth` 가 반환 타입.
- `dt.convert12To24(rawHour: number, isPM: boolean): number` — 12시간제(1-12)+오전/오후를 24시간제(0-23)로(12 AM→0, 12 PM→12).
