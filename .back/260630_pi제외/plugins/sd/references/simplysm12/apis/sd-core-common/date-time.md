# @simplysm/sd-core-common — 날짜/시간 타입 (DateOnly / DateTime / Time)

C# DateTime 스타일의 날짜·시간 값 객체. `set*`/`add*` 메서드는 모두 **새 인스턴스 반환**(원본 불변). getter/setter 프로퍼티(year/month/...)는 내부 Date 를 직접 변형한다(가변). 비교는 `.tick` 으로(배열 정렬·`ObjectUtils.equal` 이 활용). 포맷은 `DateTimeFormatUtils` 토큰(README 참조).

## DateOnly (yyyy-MM-dd, 시간 없음)

생성자 오버로드:
- `new DateOnly()` — 오늘(로컬 기준, 시분초 0).
- `new DateOnly(year, month, day)` — month 는 1-12.
- `new DateOnly(tick: number)` / `new DateOnly(date: Date)` — tick/Date 의 날짜부분만.
- `DateOnly.parse(str): DateOnly` — `yyyy-MM-dd`/`yyyyMMdd`/`Date.parse` 가능 형식. 실패 시 `ArgumentError`. (timezone offset 보정 적용.)

프로퍼티:
- `date: Date`(readonly) — 내부 Date. `tick: number` — getTime(set 시 일 단위로 절삭). `year`/`month`(1-12)/`day` — get/set(set 은 내부 Date 변형). `week: number`(readonly) — 요일 0~6(일~토). `isValidDate: boolean` — NaN 등 유효성.

메서드(새 인스턴스 반환):
- `setYear(y)` / `setMonth(m)` / `setDay(d)` — 해당 단위 설정. `setMonth` 는 1-12 벗어나면 연도 정규화, 대상 월 말일 초과 시 말일로 보정(1/31 → setMonth(2) = 2/28·29).
- `addYears(n)` / `addMonths(n)` / `addDays(n)` — 증감.
- `toFormatString(format): string` — C# 토큰 포맷. `toString(): string` — `yyyy-MM-dd`.

주차 계산(ISO-유사, `weekStartDay`=주 시작요일 0~6 기본 1, `minDaysInFirstWeek`=첫 주 최소 일수 기본 4):
- `getWeekSeqOfYear(weekStartDay?, minDaysInFirstWeek?): { year, weekSeq }` — 연도 기준 주차(1부터).
- `getWeekSeqOfMonth(weekStartDay?, minDaysInFirstWeek?): { year, monthSeq, weekSeq }` — 월 기준 주차.
- `getBaseYearMonthSeqForWeekSeq(weekStartDay?, minDaysInFirstWeek?): { year, monthSeq }` — 이 날짜가 속한 기준 연·월(주차 규칙상 전/다음 달로 넘어갈 수 있음).
- `getWeekSeqStartDate(weekStartDay?, minDaysInFirstWeek?): DateOnly` — 이 날짜가 속한 주의 시작일.
- `DateOnly.getDateByYearWeekSeq({ year, month?, weekSeq }, weekStartDay?, minDaysInFirstWeek?): DateOnly` — 연(+월)+주차 → 해당 주 시작일.

## DateTime (날짜+시간, 기본 ISO 8601+TZ)

생성자 오버로드:
- `new DateTime()` — 현재.
- `new DateTime(year, month, day, hour?, minute?, second?, millisecond?)` — month 1-12, 생략 인자는 0.
- `new DateTime(tick)` / `new DateTime(date)`.
- `DateTime.parse(str): DateTime` — 지원: `yyyy-MM-dd HH:mm:ss(.fff)?`, `yyyyMMddHHmmss`, `yyyy-MM-dd 오전/오후 HH:mm:ss`, `Date.parse` ISO. 실패 시 `ArgumentError`.

프로퍼티: `date`(readonly Date), `year`/`month`(1-12)/`day`/`hour`/`minute`/`second`/`millisecond`(각 get/set), `tick`(get/set), `week`(readonly 0~6), `timezoneOffsetMinutes`(readonly, 분 단위, 동→양수).

메서드(새 인스턴스 반환): `setYear/Month/Day/Hour/Minute/Second/Millisecond(n)`(`setMonth` 정규화·말일보정 동일), `addYears/Months/Days/Hours/Minutes/Seconds/Milliseconds(n)`, `toFormatString(format)`, `toString()` — `yyyy-MM-ddTHH:mm:ss.fffzzz`.

## Time (24시간 내 시각, 기본 HH:mm:ss.fff)

내부값은 0 ~ 24h 미만의 ms(`_tick`). 모든 연산은 `% 24h` 로 순환.

생성자 오버로드:
- `new Time()` — 현재 시각의 시분초ms(날짜 무시).
- `new Time(hour, minute, second?, millisecond?)`.
- `new Time(tick)` / `new Time(date)`.
- `Time.parse(str): Time` — `HH:mm:ss(.fff)?`, `오전/오후 HH:mm:ss(.fff)?`, 실패 시 `DateTime.parse` 시도. 모두 실패 시 `ArgumentError`.

프로퍼티: `hour`/`minute`/`second`/`millisecond`(get/set, set 은 24h 순환), `tick`(get/set, `% 24h`).

메서드(새 인스턴스 반환): `setHour/Minute/Second/Millisecond(n)`, `addHours/Minutes/Seconds/Milliseconds(n)`(24시간 자동 wrap), `toFormatString(format)`, `toString()` — `HH:mm:ss.fff`.
