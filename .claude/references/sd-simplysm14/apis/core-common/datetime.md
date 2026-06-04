# @simplysm/core-common — 날짜·시간 값 타입

날짜·시간을 **불변(immutable)** 값으로 다룰 때 함께 읽히는 묶음. JS `Date` 대신 사용. `set*`·`add*` 메서드는 모두 새 인스턴스를 반환하고 원본을 바꾸지 않음. 모두 로컬 타임존 기준으로 동작. ORM 컬럼 타입(`DateTime`/`DateOnly`/`Time`)·JSON/Worker 직렬화에서 1급 지원됨.

세 클래스 공통:
- `parse(str)` 정적 메서드로 문자열 파싱(미지원 형식이면 ArgumentError).
- `tick` getter — 내부 밀리초 값. `equal`·정렬·복제의 동등성 기준.
- `isValid` getter — 유효 값 여부.
- `toFormatString(formatStr)` / `toString()` — 포맷 문자열 변환(아래 `dt` 네임스페이스의 포맷 토큰 사용).

## DateTime

날짜+시간(밀리초 정밀도) 불변 클래스.

생성자 오버로드:
- `new DateTime()` — 현재 시각.
- `new DateTime(year, month, day, hour?, minute?, second?, millisecond?)` — month 는 1~12(내부에서 0-base 변환). 시·분·초·밀리초 생략 시 0.
- `new DateTime(tick)` — 밀리초 tick.
- `new DateTime(date)` — JS Date 복제.

- `DateTime.parse(str)`: → DateTime — 지원 형식: `yyyy-MM-dd HH:mm:ss[.fff]`, `yyyyMMddHHmmss`, `yyyy-MM-dd AM/PM HH:mm:ss`, 한국어 `yyyy-MM-dd 오전/오후 HH:mm:ss`, ISO 8601.

getter: `year`·`month`(1~12)·`day`·`hour`·`minute`·`second`·`millisecond`·`tick`·`dayOfWeek`(일~토=0~6)·`timezoneOffsetMinutes`(UTC 대비 분, KST=+540)·`isValid`·`date`(내부 Date, 읽기 전용).

불변 변환(새 인스턴스): `setYear`·`setMonth`·`setDay`·`setHour`·`setMinute`·`setSecond`·`setMillisecond`. 산술(새 인스턴스): `addYears`·`addMonths`·`addDays`·`addHours`·`addMinutes`·`addSeconds`·`addMilliseconds`.

- `setMonth(month)` / `addMonths` — 대상 월의 일수가 현재 일보다 적으면 그 달 마지막 일로 보정(1/31 → setMonth(2) → 2/28|29). 범위 밖 월은 연도로 캐리.
- `setDay(day)` — 범위 밖 일은 JS Date 규칙대로 다음/이전 월로 넘어감.

```ts
import { DateTime } from "@simplysm/core-common";
const at = DateTime.parse("2025-01-15 10:30:00");
at.addDays(3).toFormatString("yyyy-MM-dd HH:mm"); // "2025-01-18 10:30"
```

## DateOnly

시간 없는 날짜(yyyy-MM-dd) 불변 클래스.

생성자: `new DateOnly()`(오늘) / `(year, month, day)` / `(tick)` / `(date)`.

- `DateOnly.parse(str)`: → DateOnly — `yyyy-MM-dd`·`yyyyMMdd`(타임존 무관, 문자열에서 직접 추출)·ISO 8601(UTC 해석 후 로컬 변환). 서버/클라 타임존이 다르면 `yyyy-MM-dd` 형식 권장.

getter: `year`·`month`·`day`·`tick`·`dayOfWeek`·`isValid`·`date`. 불변 변환: `setYear`·`setMonth`·`setDay`(DateTime 과 동일한 월말/캐리 보정). 산술: `addYears`·`addMonths`·`addDays`.

주차 계산(ISO 8601 기본: weekStartDay=1 월요일, minDaysInFirstWeek=4):
- `getWeekSeqOfYear(weekStartDay?, minDaysInFirstWeek?)`: → `{ year, weekSeq }` — 해당 연도 내 주차 번호.
- `getWeekSeqOfMonth(weekStartDay?, minDaysInFirstWeek?)`: → `{ year, monthSeq, weekSeq }` — 해당 월 내 주차 번호.
- `getWeekSeqStartDate(weekStartDay?, minDaysInFirstWeek?)`: → DateOnly — 이 날짜가 속한 주의 시작일.
- `getBaseYearMonthSeqForWeekSeq(weekStartDay?, minDaysInFirstWeek?)`: → `{ year, monthSeq }` — 주차 귀속 기준 연·월(주가 걸친 경우 어느 달로 셈할지).
- `DateOnly.getDateByYearWeekSeq(arg, weekStartDay?, minDaysInFirstWeek?)`: → DateOnly — `arg = { year, month?, weekSeq }` 로 그 주의 시작일을 역산.

옵션 풀이:
- weekStartDay: 0~6 — 주 시작 요일. 0=일요일(미국식), 1=월요일(ISO, 기본). 달력 표시 기준에 맞춤.
- minDaysInFirstWeek: 1~7 — 첫 주로 인정할 최소 일수. 4=ISO(주의 과반), 1=시작일 포함 즉시 1주차(미국식).

```ts
import { DateOnly } from "@simplysm/core-common";
new DateOnly(2025, 1, 6).getWeekSeqOfYear(); // { year: 2025, weekSeq: 2 }
```

## Time

날짜 없는 시간(HH:mm:ss.fff) 불변 클래스. 24시간 초과·음수 tick 은 자동으로 0~24h 범위로 순환 정규화됨.

생성자: `new Time()`(현재 시각) / `(hour, minute, second?, millisecond?)` / `(tick)` / `(date)`(Date 의 시간부만).

- `Time.parse(str)`: → Time — `HH:mm:ss[.fff]`·`AM/PM HH:mm:ss`·ISO 8601(시간부만 추출).

getter: `hour`·`minute`·`second`·`millisecond`·`tick`·`isValid`. 불변 변환: `setHour`·`setMinute`·`setSecond`·`setMillisecond`. 산술: `addHours`·`addMinutes`·`addSeconds`·`addMilliseconds` (모두 24시간 순환 — 23:30 에 +1h → 00:30).

## dt 네임스페이스 (날짜/시간 포맷)

`toFormatString` 이 내부적으로 쓰는 포맷 토큰 정의. 직접 호출도 가능.

- `dt.format(formatString, args)`: → string — `args = { year?, month?, day?, hour?, minute?, second?, millisecond?, timezoneOffsetMinutes? }` 중 주어진 구성요소만 치환. C# 스타일 토큰 사용.
- `dt.normalizeMonth(year, month, day)`: → `{ year, month, day }` — 범위 밖 월을 연도로 캐리하고 일을 월말로 보정. `set*Month` 구현 기반.
- `dt.convert12To24(rawHour, isPM)`: → number — 12시간제(1~12)+오전/오후 → 24시간제(0~23). 12 AM=0, 12 PM=12.
- 타입 `dt.DtNormalizedMonth` = `{ year; month; day }`.

포맷 토큰: `yyyy`/`yy`(연), `MM`/`M`(월), `ddd`(요일 일~토)/`dd`/`d`(일), `tt`(AM/PM), `hh`/`h`(12시간), `HH`/`H`(24시간), `mm`/`m`(분), `ss`/`s`(초), `fff`/`ff`/`f`(밀리초), `zzz`(±HH:mm)/`zz`(±HH)/`z`(±H, 타임존 오프셋).

```ts
import { dt } from "@simplysm/core-common";
dt.format("yyyy-MM-dd (ddd)", { year: 2024, month: 3, day: 15 }); // "2024-03-15 (금)"
```
