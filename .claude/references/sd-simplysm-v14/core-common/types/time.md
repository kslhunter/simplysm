# Time

불변 시간 클래스 (날짜 제외: `HH:mm:ss.fff`). 날짜 정보 없이 시간만 저장하며 24시간을 초과하거나 음수인 값은 자동으로 정규화된다. 수정 및 산술 메서드는 새 인스턴스를 반환하며 모두 24시간 순환한다.

```typescript
export class Time {
  constructor();
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);

  static parse(str: string): Time;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `hour` | getter | `number` | 시 (0-23) |
| `minute` | getter | `number` | 분 (0-59) |
| `second` | getter | `number` | 초 (0-59) |
| `millisecond` | getter | `number` | 밀리초 (0-999) |
| `tick` | getter | `number` | 자정(00:00:00.000) 기준 밀리초 |
| `isValid` | getter | `boolean` | 시간이 올바르게 설정되었는지 여부 |
| `parse` | static | `(str: string) => Time` | 문자열을 파싱하여 Time 생성 |
| `setHour` | method | `(hour: number) => Time` | 지정된 시로 새 인스턴스 반환 |
| `setMinute` | method | `(minute: number) => Time` | 지정된 분으로 새 인스턴스 반환 |
| `setSecond` | method | `(second: number) => Time` | 지정된 초로 새 인스턴스 반환 |
| `setMillisecond` | method | `(millisecond: number) => Time` | 지정된 밀리초로 새 인스턴스 반환 |
| `addHours` | method | `(hours: number) => Time` | 지정된 시간을 더한 새 인스턴스 반환 (24시간 순환) |
| `addMinutes` | method | `(minutes: number) => Time` | 지정된 분을 더한 새 인스턴스 반환 (24시간 순환) |
| `addSeconds` | method | `(seconds: number) => Time` | 지정된 초를 더한 새 인스턴스 반환 (24시간 순환) |
| `addMilliseconds` | method | `(milliseconds: number) => Time` | 지정된 밀리초를 더한 새 인스턴스 반환 (24시간 순환) |
| `toFormatString` | method | `(formatStr: string) => string` | 지정된 형식 문자열로 변환 (형식 토큰은 [`DateTime`](./date-time.md) 참조, 날짜 관련 토큰 제외) |
| `toString` | method | `() => string` | `"HH:mm:ss.fff"` 형식 문자열 반환 |

## `parse` — 지원 형식

| 형식 | 예시 |
|------|------|
| `HH:mm:ss` | `"10:30:00"` |
| `HH:mm:ss.fff` | `"10:30:00.123"` |
| `AM/PM HH:mm:ss` | `"AM 10:30:00"`, `"PM 02:15:00"` |
| ISO 8601 | `"2025-01-15T10:30:00Z"` (시간 부분만 추출, 타임존 변환 적용) |

## Usage

```typescript
import { Time } from "@simplysm/core-common";

const now = new Time();
const specific = new Time(10, 30, 0);
const parsed = Time.parse("10:30:00");

// 불변 수정
const later = specific.addHours(2).addMinutes(30);
// 24시간 순환
const midnight = new Time(23, 0, 0).addHours(2); // 01:00:00

const formatted = specific.toFormatString("HH:mm:ss");
```
