# @simplysm/core-common — 날짜·시간 값 타입

불변(immutable) 날짜/시간/식별자 값 타입 `DateTime`·`DateOnly`·`Time`·`Uuid`. 모두 set/add 계열이 **새 인스턴스를 반환**하며 로컬 타임존 기준으로 동작. ORM 컬럼·폼 입력·직렬화 전반에서 함께 다뤄짐.

## DateTime

밀리초 정밀도 날짜+시간. 내부에 `readonly date: Date` 보유.

생성자:
- `new DateTime()` — 현재 시각.
- `new DateTime(year, month, day, hour?, minute?, second?, millisecond?)` — month 는 1-12(내부에서 0-기준 변환). 시·분·초·밀리초 생략 시 0.
- `new DateTime(tick: number)` — epoch 밀리초.
- `new DateTime(date: Date)` — Date 복제.

`static parse(str): DateTime` — 다음 형식 인식, 실패 시 `ArgumentError`: `yyyy-MM-dd HH:mm:ss(.fff)`, `yyyyMMddHHmmss`, `yyyy-MM-dd AM/PM HH:mm:ss`, `yyyy-MM-dd 오전/오후 HH:mm:ss`, ISO 8601(`Date.parse` 경유).

게터(읽기 전용):
- `year/month/day/hour/minute/second/millisecond` — 각 구성요소(month 는 1-12).
- `tick` — epoch 밀리초.
- `dayOfWeek` — 요일(일=0 ~ 토=6).
- `timezoneOffsetMinutes` — 로컬 오프셋(분, KST=+540).
- `isValid` — 내부 Date 가 유효하면 true.

불변 변환(새 인스턴스):
- `setYear/setMonth/setDay/setHour/setMinute/setSecond/setMillisecond(n)` — 해당 구성요소만 교체. `setYear`/`setMonth` 는 대상 월 일수를 넘으면 말일로 보정, `setDay` 는 JS Date 규칙대로 월 넘김.
- `addYears/addMonths/addDays/addHours/addMinutes/addSeconds/addMilliseconds(n)` — 더하기(연/월/일은 set 경유 보정, 시 이하는 tick 가산).
- `toFormatString(formatStr)` — C# 스타일 토큰 포맷(`dt.format` 위임, 토큰 목록은 README dt 섹션 참조).
- `toString()` — `"yyyy-MM-ddTHH:mm:ss.fffzzz"`.

```ts
const dt = DateTime.parse("2025-01-15 10:30:00");
dt.addDays(1).toFormatString("yyyy-MM-dd"); // "2025-01-16"
```

## DateOnly

시간 없는 날짜(`yyyy-MM-dd`). `readonly date: Date`(시각 0).

생성자: `new DateOnly()`(오늘), `(year, month, day)`, `(tick)`, `(date)` — 모두 시각을 0 으로 정규화.

`static parse(str)` — `yyyy-MM-dd`·`yyyyMMdd` 는 타임존 무관하게 문자열에서 직접 추출, ISO 8601 은 UTC 해석 후 로컬로 변환(DST 지역은 대상 날짜 오프셋 사용). 실패 시 `ArgumentError`. 서버/클라이언트 타임존이 다르면 `yyyy-MM-dd` 권장.

게터: `isValid`, `year/month/day`, `tick`, `dayOfWeek`.

불변 변환: `setYear/setMonth/setDay`, `addYears/addMonths/addDays`(DateTime 과 동일 보정 규칙), `toFormatString`, `toString()`(`"yyyy-MM-dd"`).

주차 계산(ISO 8601 기본: 월요일 시작, 첫 주 최소 4일). 공통 옵션: `weekStartDay`(0=일~6=토, 기본 1), `minDaysInFirstWeek`(1-7, 기본 4):
- `getBaseYearMonthSeqForWeekSeq(weekStartDay?, minDaysInFirstWeek?): { year; monthSeq }` — 이 날짜가 속한 주의 기준 연·월.
- `getWeekSeqStartDate(weekStartDay?, minDaysInFirstWeek?): DateOnly` — 속한 주의 시작 날짜.
- `getWeekSeqOfYear(weekStartDay?, minDaysInFirstWeek?): { year; weekSeq }` — 연 기준 주차.
- `getWeekSeqOfMonth(weekStartDay?, minDaysInFirstWeek?): { year; monthSeq; weekSeq }` — 월 기준 주차.
- `static getDateByYearWeekSeq(arg: { year; month?; weekSeq }, weekStartDay?, minDaysInFirstWeek?): DateOnly` — 연(+선택 월)·주차로 그 주 시작 날짜 역산.

```ts
new DateOnly(2025, 1, 6).getWeekSeqOfYear();  // { year: 2025, weekSeq: 2 }
DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 }); // 2025-01-06
```

## Time

날짜 없는 시간(`HH:mm:ss.fff`). 내부 tick 은 0 이상 하루 미만으로 정규화(24h 순환, 음수는 양수로 보정).

생성자: `new Time()`(현재 시각의 시간부), `(hour, minute, second?, millisecond?)`, `(tick)`, `(date)`(Date 의 시간부만).

`static parse(str)` — `HH:mm:ss(.fff)`, `AM/PM HH:mm:ss`, ISO 8601 의 시간부. 실패 시 `ArgumentError`.

게터: `hour/minute/second/millisecond`, `tick`, `isValid`.

불변 변환: `setHour/setMinute/setSecond/setMillisecond`, `addHours/addMinutes/addSeconds/addMilliseconds`(모두 24시간 순환), `toFormatString`, `toString()`(`"HH:mm:ss.fff"`).

## Uuid

UUID v4 래퍼. 내부에 정규화된 문자열 보유. `crypto.getRandomValues` 기반 난수.

- `static generate(): Uuid` — 암호학적으로 안전한 새 v4.
- `static fromBytes(bytes: Bytes): Uuid` — 16바이트 배열에서 생성. 길이가 16 아니면 `ArgumentError`.
- `new Uuid(uuid: string)` — `8-4-4-4-12` 형식 검증, 불일치 시 `ArgumentError`.
- `toString(): string` — 표준 문자열.
- `toBytes(): Bytes` — 16바이트 `Uint8Array`.

```ts
const id = Uuid.generate();
id.toString(); // "550e8400-e29b-41d4-a716-446655440000" 형태
```

주의: 모든 값 타입은 불변이므로 `set/add` 결과를 변수에 다시 받아야 함. `obj.clone`/`obj.equal`/`json` 직렬화가 이들 타입을 인지해 tick/문자열 기준으로 복제·비교·복원함.
