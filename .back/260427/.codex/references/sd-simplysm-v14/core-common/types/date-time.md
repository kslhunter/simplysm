# `DateTime`

> **읽어야 하는 상황**: 날짜+시간을 불변 객체로 다뤄야 할 때 (파싱, 포맷, 산술 연산 포함). 시간 없이 날짜만 필요하면 [`DateOnly`](./date-only.md), 날짜 없이 시간만 필요하면 [`Time`](./time.md) 참조.

## When to use

- 날짜+시간을 불변 객체로 다뤄야 할 때 (밀리초 정밀도, 로컬 타임존)
- 다양한 형식의 날짜시간 문자열을 파싱해야 할 때
- 날짜시간 산술 연산(addMonths, addDays 등)이 필요할 때

불변 날짜시간 클래스 (밀리초 정밀도, 로컬 타임존). JavaScript `Date` 객체를 래핑하여 불변성과 편리한 API를 제공한다. 수정 메서드는 모두 새 인스턴스를 반환한다.

```typescript
export class DateTime {
  readonly date: Date;

  constructor();
  constructor(year: number, month: number, day: number, hour?: number, minute?: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);

  static parse(str: string): DateTime;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `date` | property | `Date` | 내부 Date 객체 |
| `year` | getter | `number` | 연도 |
| `month` | getter | `number` | 월 (1-12) |
| `day` | getter | `number` | 일 (1-31) |
| `hour` | getter | `number` | 시 (0-23) |
| `minute` | getter | `number` | 분 (0-59) |
| `second` | getter | `number` | 초 (0-59) |
| `millisecond` | getter | `number` | 밀리초 (0-999) |
| `tick` | getter | `number` | Unix 타임스탬프 (밀리초) |
| `dayOfWeek` | getter | `number` | 요일 (일요일=0 ~ 토요일=6) |
| `timezoneOffsetMinutes` | getter | `number` | 타임존 오프셋 (분) |
| `isValid` | getter | `boolean` | 날짜시간이 올바르게 설정되었는지 여부 |
| `parse` | static | `(str: string) => DateTime` | 문자열을 파싱하여 DateTime 생성 |
| `setYear` | method | `(year: number) => DateTime` | 지정된 연도로 새 인스턴스 반환 |
| `setMonth` | method | `(month: number) => DateTime` | 지정된 월로 새 인스턴스 반환. 현재 일이 대상 월의 일수보다 크면 마지막 일로 조정됨 |
| `setDay` | method | `(day: number) => DateTime` | 지정된 일로 새 인스턴스 반환 |
| `setHour` | method | `(hour: number) => DateTime` | 지정된 시로 새 인스턴스 반환 |
| `setMinute` | method | `(minute: number) => DateTime` | 지정된 분으로 새 인스턴스 반환 |
| `setSecond` | method | `(second: number) => DateTime` | 지정된 초로 새 인스턴스 반환 |
| `setMillisecond` | method | `(millisecond: number) => DateTime` | 지정된 밀리초로 새 인스턴스 반환 |
| `addYears` | method | `(years: number) => DateTime` | 지정된 연수를 더한 새 인스턴스 반환 |
| `addMonths` | method | `(months: number) => DateTime` | 지정된 월수를 더한 새 인스턴스 반환 |
| `addDays` | method | `(days: number) => DateTime` | 지정된 일수를 더한 새 인스턴스 반환 |
| `addHours` | method | `(hours: number) => DateTime` | 지정된 시간을 더한 새 인스턴스 반환 |
| `addMinutes` | method | `(minutes: number) => DateTime` | 지정된 분을 더한 새 인스턴스 반환 |
| `addSeconds` | method | `(seconds: number) => DateTime` | 지정된 초를 더한 새 인스턴스 반환 |
| `addMilliseconds` | method | `(milliseconds: number) => DateTime` | 지정된 밀리초를 더한 새 인스턴스 반환 |
| `toFormatString` | method | `(formatStr: string) => string` | 지정된 형식 문자열로 변환 |
| `toString` | method | `() => string` | ISO 형식 문자열 반환 (`yyyy-MM-ddTHH:mm:ss.fffzzz`) |

## `parse` — 지원 형식

| 형식 | 예시 |
|------|------|
| `yyyy-MM-dd HH:mm:ss` | `"2025-01-15 10:30:00"` |
| `yyyy-MM-dd HH:mm:ss.fff` | `"2025-01-15 10:30:00.123"` |
| `yyyyMMddHHmmss` | `"20250115103000"` |
| `yyyy-MM-dd AM/PM HH:mm:ss` | `"2025-01-15 AM 10:30:00"` |
| `yyyy-MM-dd 오전/오후 HH:mm:ss` | `"2025-01-15 오전 10:30:00"` |
| ISO 8601 | `"2025-01-15T10:30:00Z"` |

## `toFormatString` — 형식 문자열 토큰

| 토큰 | 설명 | 예시 |
|------|------|------|
| `yyyy` | 4자리 연도 | `2025` |
| `yy` | 2자리 연도 | `25` |
| `MM` | 0 채움 월 | `01`~`12` |
| `M` | 월 | `1`~`12` |
| `ddd` | 요일 | `일`, `월`, `화`, `수`, `목`, `금`, `토` |
| `dd` | 0 채움 일 | `01`~`31` |
| `d` | 일 | `1`~`31` |
| `tt` | 오전/오후 | `AM`, `PM` |
| `HH` | 0 채움 24시간 | `00`~`23` |
| `H` | 24시간 | `0`~`23` |
| `hh` | 0 채움 12시간 | `01`~`12` |
| `h` | 12시간 | `1`~`12` |
| `mm` | 0 채움 분 | `00`~`59` |
| `m` | 분 | `0`~`59` |
| `ss` | 0 채움 초 | `00`~`59` |
| `s` | 초 | `0`~`59` |
| `fff` | 밀리초 (3자리) | `000`~`999` |
| `ff` | 밀리초 (2자리) | `00`~`99` |
| `f` | 밀리초 (1자리) | `0`~`9` |
| `zzz` | 타임존 오프셋 (`±HH:mm`) | `+09:00` |
| `zz` | 타임존 오프셋 (`±HH`) | `+09` |
| `z` | 타임존 오프셋 (`±H`) | `+9` |

## Usage

```typescript
import { DateTime } from "@simplysm/core-common";

const now = new DateTime();
const specific = new DateTime(2025, 1, 15, 10, 30, 0);
const fromTick = new DateTime(Date.now());
const parsed = DateTime.parse("2025-01-15 10:30:00");

const formatted = now.toFormatString("yyyy-MM-dd HH:mm:ss");
const iso = now.toString(); // "2025-01-15T10:30:00.000+09:00"

// 불변 수정
const nextMonth = now.addMonths(1);
const endOfYear = now.setMonth(12).setDay(31);
```
