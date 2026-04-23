# dt

날짜 포맷 유틸리티 네임스페이스. `DateTime`, `DateOnly`, `Time` 클래스 내부에서 사용되는 저수준 포맷/변환 함수를 제공한다.

```typescript
import { dt } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `format` | `(formatString, args) => string` | 형식 문자열에 따라 날짜/시간을 문자열로 변환 |
| `normalizeMonth` | `(year, month, day) => DtNormalizedMonth` | 월 설정 시 연/월/일 정규화 (범위 벗어난 월 처리, 마지막 일 초과 처리) |
| `convert12To24` | `(rawHour, isPM) => number` | 12시간 형식을 24시간 형식으로 변환 |

## `format` — args

| Field | Type | Description |
|-------|------|-------------|
| `year` | `number` | 연도 |
| `month` | `number` | 월 |
| `day` | `number` | 일 |
| `hour` | `number` | 시 |
| `minute` | `number` | 분 |
| `second` | `number` | 초 |
| `millisecond` | `number` | 밀리초 |
| `timezoneOffsetMinutes` | `number` | 타임존 오프셋 (분) |

형식 문자열 토큰은 [`DateTime.toFormatString`](../types/date-time.md)과 동일하다.

## Related Types

### `DtNormalizedMonth`

`normalizeMonth()` 결과 타입:

| Field | Type | Description |
|-------|------|-------------|
| `year` | `number` | 정규화된 연도 |
| `month` | `number` | 정규화된 월 (1-12) |
| `day` | `number` | 정규화된 일 |

## Usage

```typescript
import { dt } from "@simplysm/core-common";

// 포맷
dt.format("yyyy-MM-dd", { year: 2025, month: 1, day: 15 }); // "2025-01-15"

// 월 정규화
dt.normalizeMonth(2025, 13, 15);  // { year: 2026, month: 1, day: 15 }
dt.normalizeMonth(2025, 2, 31);   // { year: 2025, month: 2, day: 28 }

// 12시간 → 24시간
dt.convert12To24(12, false); // 0  (12:00 AM = 0:00)
dt.convert12To24(12, true);  // 12 (12:00 PM = 12:00)
dt.convert12To24(3, true);   // 15 (3:00 PM = 15:00)
```
