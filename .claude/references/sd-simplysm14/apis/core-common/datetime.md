# @simplysm/core-common — 날짜·시간

날짜/시간 값을 다룰 때 함께 읽히는 묶음. 불변 클래스 `DateTime`/`DateOnly`/`Time` 와 포맷 문자열을 다루는 `dt` 네임스페이스. 세 클래스 모두 로컬 타임존 기준으로 동작하며, 변환/산술 메서드는 원본을 바꾸지 않고 새 인스턴스를 반환한다.

## DateTime

날짜+시간(밀리초 정밀도) 불변 클래스. 내부에 `readonly date: Date` 보유.

생성자:
- `new DateTime()` — 현재 시각.
- `new DateTime(year, month, day, hour?, minute?, second?, millisecond?)` — `month` 는 1~12(내부에서 0-base 로 변환). 생략한 시/분/초/밀리초는 0.
- `new DateTime(tick: number)` — epoch 밀리초.
- `new DateTime(date: Date)` — Date 복사(원본과 분리).

- `DateTime.parse(str): DateTime` — 문자열 파싱. 지원: ISO 8601, `yyyy-MM-dd HH:mm:ss(.fff)`, `yyyyMMddHHmmss`, `yyyy-MM-dd AM/PM HH:mm:ss`, 한국어 `오전/오후`. 실패 시 `ArgumentError` throw.

읽기 전용 getter:
- `year`/`month`(1~12)/`day`/`hour`/`minute`/`second`/`millisecond` — 각 구성요소.
- `tick: number` — epoch 밀리초. 두 시점 비교·차이 계산에 사용.
- `dayOfWeek: number` — 요일(일=0 ~ 토=6).
- `timezoneOffsetMinutes: number` — UTC 대비 오프셋 분(KST=+540). `Date.getTimezoneOffset()` 의 부호 반대.
- `isValid: boolean` — 유효한 날짜인지. 잘못된 tick 으로 만든 인스턴스 검증에 사용.

변환 메서드(새 인스턴스 반환):
- `setYear/setMonth/setHour/setMinute/setSecond/setMillisecond(n)` — 해당 구성요소만 교체. `setMonth` 는 범위 밖 월을 연도로 넘기고, 대상 월 일수 초과 시 말일로 보정(1/31 → setMonth(2) → 2/28·29).
- `setDay(n)` — 일 교체. 월 범위를 벗어나는 일은 JS Date 동작대로 다음/이전 월로 넘어감(1월 day=32 → 2/1).

산술 메서드(새 인스턴스 반환):
- `addYears/addMonths(n)` — `setYear/setMonth` 경유라 말일 보정 규칙을 따름.
- `addDays/addHours/addMinutes/addSeconds/addMilliseconds(n)` — 음수 가능. 시 이하는 tick 기반 가산이라 DST 경계를 그대로 통과.

포맷:
- `toFormatString(formatStr): string` — 포맷 문자열로 변환(아래 `dt.format` 토큰 참조).
- `toString(): string` — `yyyy-MM-ddTHH:mm:ss.fffzzz` 형식.

```typescript
const d = DateTime.parse("2025-01-15 10:30:00");
d.addDays(1).toFormatString("yyyy-MM-dd (ddd)"); // "2025-01-16 (목)"
```

## DateOnly

시간 제외 날짜만(`yyyy-MM-dd`) 불변 클래스. 주차(week) 계산 메서드 포함.

생성자: `new DateOnly()`(오늘) / `(year, month, day)` / `(tick)` / `(date)` — 모두 시간 부분을 버리고 자정으로 정규화.

- `DateOnly.parse(str): DateOnly` — `yyyy-MM-dd`/`yyyyMMdd`(타임존 무관, 문자열 직접 추출) 또는 ISO 8601(UTC 해석 후 로컬 변환). 서버·클라 타임존이 다르면 `yyyy-MM-dd` 권장. 실패 시 `ArgumentError`.

getter: `isValid`/`year`/`month`(1~12)/`day`/`tick`/`dayOfWeek`(일=0~토=6).

변환/산술: `setYear/setMonth/setDay`, `addYears/addMonths/addDays` — DateTime 과 동일한 말일·월 넘김 규칙.

주차 계산 — 공통 인자 `weekStartDay`(주 시작 요일, 0=일~6=토, 기본 1=월)·`minDaysInFirstWeek`(첫 주로 인정할 최소 일수 1~7, 기본 4=ISO 8601 표준):
- `getBaseYearMonthSeqForWeekSeq(weekStartDay?, minDaysInFirstWeek?): { year, monthSeq }` — 이 날짜가 속한 주의 기준 연·월. 월 경계 주를 이전/다음 달 중 어디로 귀속할지 판정.
- `getWeekSeqStartDate(weekStartDay?, minDaysInFirstWeek?): DateOnly` — 이 날짜가 속한 주의 시작일.
- `getWeekSeqOfYear(weekStartDay?, minDaysInFirstWeek?): { year, weekSeq }` — 연 기준 주차 번호.
- `getWeekSeqOfMonth(weekStartDay?, minDaysInFirstWeek?): { year, monthSeq, weekSeq }` — 월 기준 주차 번호.
- `DateOnly.getDateByYearWeekSeq(arg, weekStartDay?, minDaysInFirstWeek?): DateOnly` — `arg: { year, month?, weekSeq }` 로 해당 주의 시작일 역산. `month` 생략 시 연 단위 주차.

포맷: `toFormatString(formatStr)`, `toString()` → `yyyy-MM-dd`.

```typescript
new DateOnly(2025, 1, 15).getWeekSeqOfMonth(); // { year: 2025, monthSeq: 1, weekSeq: 3 }
```

## Time

날짜 제외 시간만(`HH:mm:ss.fff`) 불변 클래스. 24시간을 넘거나 음수인 값은 자동으로 0~24시 범위로 순환 정규화됨.

생성자: `new Time()`(현재 시각의 시간부) / `(hour, minute, second?, millisecond?)` / `(tick)`(하루 내 밀리초) / `(date)`(Date 의 시간부만).

- `Time.parse(str): Time` — `HH:mm:ss(.fff)`, `AM/PM HH:mm:ss`, ISO 8601(시간부만 추출) 지원. 실패 시 `ArgumentError`.

getter: `hour`/`minute`/`second`/`millisecond`/`tick`(하루 내 밀리초)/`isValid`.

변환: `setHour/setMinute/setSecond/setMillisecond(n)`.
산술: `addHours/addMinutes/addSeconds/addMilliseconds(n)` — 24시간 순환(23:30 + 1h → 00:30).

포맷: `toFormatString(formatStr)`, `toString()` → `HH:mm:ss.fff`.

## dt (네임스페이스)

`import { dt } from "@simplysm/core-common"`. 위 세 클래스의 `toFormatString` 내부 구현이자, 직접 호출도 가능한 포맷터.

- `dt.format(formatString, args): string` — `args: { year?, month?, day?, hour?, minute?, second?, millisecond?, timezoneOffsetMinutes? }` 중 제공된 구성요소만 치환(미제공 토큰은 원문 유지). 요일(`ddd`)은 year·month·day 가 모두 있을 때만 계산.
- `dt.normalizeMonth(year, month, day): { year, month, day }` — 1~12 범위 밖 월을 연도로 넘기고 말일 보정.
- `dt.convert12To24(rawHour, isPM): number` — 12시간제(1~12)+오전/오후 → 24시간제(0~23). 12 AM=0, 12 PM=12.
- 타입 `dt.DtNormalizedMonth = { year, month, day }`.

포맷 토큰(C# 호환): `yyyy`(4자리 연)·`yy`(2자리), `MM`/`M`(0채움/일반 월), `ddd`(요일 한글 일~토), `dd`/`d`(일), `tt`(AM/PM), `hh`/`h`(12시간), `HH`/`H`(24시간), `mm`/`m`(분), `ss`/`s`(초), `fff`/`ff`/`f`(밀리초 3/2/1자리), `zzz`(±HH:mm)·`zz`(±HH)·`z`(±H) 타임존 오프셋.

```typescript
dt.format("yyyy-MM-dd tt h:mm", { year: 2024, month: 3, day: 15, hour: 14, minute: 30 });
// "2024-03-15 PM 2:30"
```
