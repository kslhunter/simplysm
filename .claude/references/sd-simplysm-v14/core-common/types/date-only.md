# DateOnly

불변 날짜 클래스 (시간 제외: `yyyy-MM-dd`). 시간 정보 없이 날짜만 저장하며 로컬 타임존 기준으로 동작한다. 주차 계산을 지원한다. 수정 메서드는 모두 새 인스턴스를 반환한다.

```typescript
export class DateOnly {
  readonly date: Date;

  constructor();
  constructor(year: number, month: number, day: number);
  constructor(tick: number);
  constructor(date: Date);

  static parse(str: string): DateOnly;
  static getDateByYearWeekSeq(
    arg: { year: number; month?: number; weekSeq: number },
    weekStartDay?: number,
    minDaysInFirstWeek?: number,
  ): DateOnly;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `date` | property | `Date` | 내부 Date 객체 (시간 부분은 항상 00:00:00) |
| `year` | getter | `number` | 연도 |
| `month` | getter | `number` | 월 (1-12) |
| `day` | getter | `number` | 일 (1-31) |
| `tick` | getter | `number` | Unix 타임스탬프 (밀리초) |
| `dayOfWeek` | getter | `number` | 요일 (일요일=0 ~ 토요일=6) |
| `isValid` | getter | `boolean` | 날짜가 올바르게 설정되었는지 여부 |
| `parse` | static | `(str: string) => DateOnly` | 문자열을 파싱하여 DateOnly 생성 |
| `getDateByYearWeekSeq` | static | `(arg, weekStartDay?, minDaysInFirstWeek?) => DateOnly` | 연도·(월)·주차로 해당 주의 시작 날짜 반환 |
| `setYear` | method | `(year: number) => DateOnly` | 지정된 연도로 새 인스턴스 반환 |
| `setMonth` | method | `(month: number) => DateOnly` | 지정된 월로 새 인스턴스 반환. 현재 일이 대상 월의 일수보다 크면 마지막 일로 조정됨 |
| `setDay` | method | `(day: number) => DateOnly` | 지정된 일로 새 인스턴스 반환 |
| `addYears` | method | `(years: number) => DateOnly` | 지정된 연수를 더한 새 인스턴스 반환 |
| `addMonths` | method | `(months: number) => DateOnly` | 지정된 월수를 더한 새 인스턴스 반환 |
| `addDays` | method | `(days: number) => DateOnly` | 지정된 일수를 더한 새 인스턴스 반환 |
| `getBaseYearMonthSeqForWeekSeq` | method | `(weekStartDay?, minDaysInFirstWeek?) => { year: number; monthSeq: number }` | 이 날짜가 포함된 주의 기준 연도와 월 반환 |
| `getWeekSeqStartDate` | method | `(weekStartDay?, minDaysInFirstWeek?) => DateOnly` | 이 날짜가 포함된 주의 시작 날짜 반환 |
| `getWeekSeqOfYear` | method | `(weekStartDay?, minDaysInFirstWeek?) => { year: number; weekSeq: number }` | 연도와 주차 번호 반환 |
| `getWeekSeqOfMonth` | method | `(weekStartDay?, minDaysInFirstWeek?) => { year: number; monthSeq: number; weekSeq: number }` | 연도, 월, 해당 월 내의 주차 번호 반환 |
| `toFormatString` | method | `(formatStr: string) => string` | 지정된 형식 문자열로 변환 (형식 토큰은 [`DateTime`](./date-time.md) 참조) |
| `toString` | method | `() => string` | `"yyyy-MM-dd"` 형식 문자열 반환 |

## `parse` — 지원 형식

| 형식 | 예시 | 타임존 |
|------|------|--------|
| `yyyy-MM-dd` | `"2025-01-15"` | 타임존 무관 (직접 추출) |
| `yyyyMMdd` | `"20250115"` | 타임존 무관 (직접 추출) |
| ISO 8601 | `"2025-01-15T00:00:00Z"` | UTC로 해석 후 로컬 타임존 변환 |

서버/클라이언트 타임존이 다른 경우 `yyyy-MM-dd` 형식 권장.

## 주차 계산 파라미터

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `weekStartDay` | `1` (월요일) | 주 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일) |
| `minDaysInFirstWeek` | `4` | 첫 번째 주로 간주되기 위한 최소 일수 (ISO 8601 표준) |

## Usage

```typescript
import { DateOnly } from "@simplysm/core-common";

const today = new DateOnly();
const specific = new DateOnly(2025, 1, 15);
const parsed = DateOnly.parse("2025-01-15");

// 불변 수정
const nextWeek = today.addDays(7);
const firstDayOfMonth = today.setDay(1);

// 주차 계산 (ISO 8601 기본값: 월요일 시작, 첫 주 최소 4일)
const { year, weekSeq } = new DateOnly(2025, 1, 6).getWeekSeqOfYear();
// { year: 2025, weekSeq: 2 }

// 주차로 날짜 계산
const weekStart = DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 });
// 2025-01-06 (월요일)
```
