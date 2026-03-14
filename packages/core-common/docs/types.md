# 타입

## DateTime

불변(immutable) 날짜/시간 타입. 모든 변경 메서드는 새 인스턴스를 반환한다.

### 생성

```typescript
import { DateTime } from "@simplysm/core-common";

new DateTime();                                    // 현재 시각
new DateTime(2024, 1, 15);                         // 2024-01-15 00:00:00
new DateTime(2024, 1, 15, 14, 30, 0);              // 2024-01-15 14:30:00
new DateTime(2024, 1, 15, 14, 30, 0, 500);         // 밀리초 포함
new DateTime(tick);                                // tick(밀리초)으로 생성
new DateTime(new Date());                          // Date 객체에서 생성
```

### 파싱

```typescript
DateTime.parse("2024-01-15T14:30:00.000Z");        // ISO 8601
DateTime.parse("2024-01-15 14:30:00");              // yyyy-MM-dd HH:mm:ss
DateTime.parse("2024-01-15 14:30:00.123");          // yyyy-MM-dd HH:mm:ss.fff
DateTime.parse("20240115143000");                   // yyyyMMddHHmmss
DateTime.parse("2024-01-15 AM 10:30:00");           // yyyy-MM-dd AM/PM HH:mm:ss
DateTime.parse("2024-01-15 오전 10:30:00");          // yyyy-MM-dd 오전/오후 HH:mm:ss
```

### 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| `year` | `number` | 연도 |
| `month` | `number` | 월 (1~12) |
| `day` | `number` | 일 |
| `hour` | `number` | 시 (0~23) |
| `minute` | `number` | 분 |
| `second` | `number` | 초 |
| `millisecond` | `number` | 밀리초 |
| `tick` | `number` | epoch 밀리초 |
| `dayOfWeek` | `number` | 요일 (0=일요일) |
| `timezoneOffsetMinutes` | `number` | 타임존 오프셋(분) |
| `isValid` | `boolean` | 유효성 |
| `date` | `Date` | 내부 Date 객체 (readonly) |

### 변경 (새 인스턴스 반환)

```typescript
const dt = new DateTime(2024, 1, 15, 14, 30, 0);

dt.setYear(2025);          // 2025-01-15 14:30:00
dt.setMonth(6);            // 2024-06-15 14:30:00
dt.setDay(20);             // 2024-01-20 14:30:00
dt.setHour(10);            // 2024-01-15 10:30:00
dt.setMinute(45);          // 2024-01-15 14:45:00
dt.setSecond(30);          // 2024-01-15 14:30:30
dt.setMillisecond(500);    // 2024-01-15 14:30:00.500

dt.addYears(1);            // 2025-01-15 14:30:00
dt.addMonths(3);           // 2024-04-15 14:30:00
dt.addDays(10);            // 2024-01-25 14:30:00
dt.addHours(-2);           // 2024-01-15 12:30:00
dt.addMinutes(15);         // 2024-01-15 14:45:00
dt.addSeconds(30);         // 2024-01-15 14:30:30
dt.addMilliseconds(500);   // 2024-01-15 14:30:00.500
```

### 포맷

```typescript
dt.toFormatString("yyyy-MM-dd HH:mm:ss");   // "2024-01-15 14:30:00"
dt.toFormatString("yy/M/d tt h:mm");        // "24/1/15 PM 2:30"
dt.toString();                                // ISO 8601 형식 "2024-01-15T14:30:00.000+09:00"
```

포맷 패턴:

| 패턴 | 설명 | 예시 |
|------|------|------|
| `yyyy` | 4자리 연도 | 2024 |
| `yy` | 2자리 연도 | 24 |
| `MM` | 0패딩 월 | 01~12 |
| `M` | 월 | 1~12 |
| `ddd` | 요일 | 일, 월, 화, 수, 목, 금, 토 |
| `dd` | 0패딩 일 | 01~31 |
| `d` | 일 | 1~31 |
| `tt` | 오전/오후 | AM, PM |
| `hh` | 0패딩 12시간 | 01~12 |
| `h` | 12시간 | 1~12 |
| `HH` | 0패딩 24시간 | 00~23 |
| `H` | 24시간 | 0~23 |
| `mm` | 0패딩 분 | 00~59 |
| `m` | 분 | 0~59 |
| `ss` | 0패딩 초 | 00~59 |
| `s` | 초 | 0~59 |
| `fff` | 밀리초(3자리) | 000~999 |
| `ff` | 밀리초(2자리) | 00~99 |
| `f` | 밀리초(1자리) | 0~9 |
| `zzz` | 타임존(+-HH:mm) | +09:00 |
| `zz` | 타임존(+-HH) | +09 |
| `z` | 타임존(+-H) | +9 |

---

## DateOnly

불변 날짜 전용 타입 (시간 정보 없음).

### 생성/파싱

```typescript
import { DateOnly } from "@simplysm/core-common";

new DateOnly();                        // 오늘
new DateOnly(2024, 1, 15);             // 2024-01-15
new DateOnly(tick);                    // tick(밀리초)으로 생성
new DateOnly(new Date());             // Date 객체에서 생성
DateOnly.parse("2024-01-15");          // yyyy-MM-dd
DateOnly.parse("20240115");            // yyyyMMdd
DateOnly.parse("2024-01-15T00:00:00Z"); // ISO 8601 (UTC -> 로컬 변환)
```

### 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| `year` | `number` | 연도 |
| `month` | `number` | 월 (1~12) |
| `day` | `number` | 일 |
| `tick` | `number` | epoch 밀리초 |
| `dayOfWeek` | `number` | 요일 (0=일요일) |
| `isValid` | `boolean` | 유효성 |
| `date` | `Date` | 내부 Date 객체 (readonly) |

### 주차 계산

모든 주차 메서드는 `weekStartDay`(주 시작 요일, 기본값 1=월요일)와 `minDaysInFirstWeek`(첫 주 최소 일수, 기본값 4=ISO 8601) 옵션을 지원한다.

```typescript
const date = new DateOnly(2024, 1, 15);

// 연간 주차
date.getWeekSeqOfYear();
// { year: 2024, weekSeq: 3 }

// 월간 주차
date.getWeekSeqOfMonth();
// { year: 2024, monthSeq: 1, weekSeq: 3 }

// 해당 주의 시작일
date.getWeekSeqStartDate();

// 주차 기준 기본 연/월
date.getBaseYearMonthSeqForWeekSeq();
// { year: 2024, monthSeq: 1 }

// 연/주차로 날짜 계산
DateOnly.getDateByYearWeekSeq({ year: 2024, weekSeq: 3 });
// 2024년 3주차 시작일 (월요일)

// 월/주차로 날짜 계산
DateOnly.getDateByYearWeekSeq({ year: 2025, month: 1, weekSeq: 3 });
// 2025년 1월 3주차 시작일

// US 스타일 (일요일 시작, 첫 주 최소 1일)
date.getWeekSeqOfYear(0, 1);
```

### 변경/포맷

```typescript
// 변경 메서드 (새 인스턴스 반환)
date.setYear(2025);     date.setMonth(6);     date.setDay(20);
date.addYears(1);       date.addMonths(3);    date.addDays(10);

// 포맷
date.toFormatString("yyyy-MM-dd");   // "2024-01-15"
date.toString();                      // "2024-01-15"
```

---

## Time

불변 시간 전용 타입 (24시간 래핑).

### 생성/파싱

```typescript
import { Time } from "@simplysm/core-common";

new Time();                            // 현재 시각
new Time(14, 30);                      // 14:30:00
new Time(14, 30, 15, 500);             // 14:30:15.500
new Time(tick);                        // tick(밀리초)으로 생성
new Time(new Date());                  // Date 객체에서 시간 부분만 추출
Time.parse("14:30:00");               // HH:mm:ss
Time.parse("14:30:00.123");           // HH:mm:ss.fff
Time.parse("AM 10:30:00");            // AM/PM HH:mm:ss
Time.parse("2025-01-15T10:30:00Z");   // ISO 8601 (시간 부분만 추출)
```

### 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| `hour` | `number` | 시 (0~23) |
| `minute` | `number` | 분 |
| `second` | `number` | 초 |
| `millisecond` | `number` | 밀리초 |
| `tick` | `number` | 하루 기준 밀리초 |
| `isValid` | `boolean` | 유효성 |

### 24시간 래핑

```typescript
const time = new Time(23, 0);
time.addHours(3);                      // 02:00:00 (다음날로 넘어감)

const time2 = new Time(1, 0);
time2.addHours(-3);                    // 22:00:00 (이전날로 넘어감)
```

### 변경/포맷

```typescript
// 변경 메서드 (새 인스턴스 반환, 24시간 래핑)
time.setHour(10);        time.setMinute(45);
time.setSecond(30);      time.setMillisecond(500);
time.addHours(2);        time.addMinutes(30);
time.addSeconds(30);     time.addMilliseconds(500);

// 포맷
time.toFormatString("HH:mm:ss");    // "14:30:00"
time.toString();                      // "14:30:00.000"
```

---

## Uuid

UUID v4 생성/변환. `crypto.getRandomValues` 기반.

```typescript
import { Uuid } from "@simplysm/core-common";

const id = Uuid.generate();                        // 새 UUID 생성
const fromStr = new Uuid("550e8400-e29b-41d4-a716-446655440000");
const fromBytes = Uuid.fromBytes(bytes);           // 16바이트 배열에서 생성 (길이가 16이 아니면 ArgumentError)
id.toString();                                     // "xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx"
id.toBytes();                                      // Uint8Array (16 bytes)
```

---

## LazyGcMap

자동 만료 기능이 있는 LRU 캐시. GC 타이머를 사용하므로 반드시 `dispose()` 또는 `using` 문으로 정리해야 한다.

```typescript
import { LazyGcMap } from "@simplysm/core-common";

const cache = new LazyGcMap<string, object>({
  expireTime: 60_000,                   // 60초 만료 (필수)
  gcInterval: 10_000,                   // 10초마다 GC (기본값: expireTime/10, 최소 1000ms)
  onExpire: (key, value) => { /* 정리 로직, async 가능 */ },
});

cache.set("key", value);                // 값 저장 (GC 타이머 시작)
cache.get("key");                       // 값 조회 (접근 시 만료 시간 갱신)
cache.getOrCreate("key", () => createValue()); // 없으면 생성
cache.has("key");                       // 존재 여부 (접근 시간 갱신 안 함)
cache.delete("key");                    // 삭제
cache.clear();                          // 전체 삭제 (인스턴스는 재사용 가능)
cache.size;                             // 저장된 항목 수

// 이터레이터
for (const value of cache.values()) { /* ... */ }
for (const key of cache.keys()) { /* ... */ }
for (const [key, value] of cache.entries()) { /* ... */ }

// 정리 (Disposable 지원)
cache.dispose();
// 또는
using cache2 = new LazyGcMap({ expireTime: 30_000 });
```

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `get` | `get(key: TKey): TValue \| undefined` | 값 조회 (만료 갱신) |
| `set` | `set(key: TKey, value: TValue): void` | 값 설정 |
| `getOrCreate` | `getOrCreate(key: TKey, factory: () => TValue): TValue` | 없으면 생성 |
| `has` | `has(key: TKey): boolean` | 존재 여부 (만료 갱신 안 함) |
| `delete` | `delete(key: TKey): boolean` | 삭제 |
| `clear` | `clear(): void` | 전체 삭제 |
| `size` | `number` (getter) | 저장된 항목 수 |
| `values` | `values(): IterableIterator<TValue>` | 값 이터레이터 |
| `keys` | `keys(): IterableIterator<TKey>` | 키 이터레이터 |
| `entries` | `entries(): IterableIterator<[TKey, TValue]>` | 엔트리 이터레이터 |
| `dispose` | `dispose(): void` | GC 타이머 정리 및 데이터 삭제 |

---

## Bytes

`Uint8Array`의 타입 별칭. `Buffer` 대신 사용한다.

```typescript
import type { Bytes } from "@simplysm/core-common";
```

---

## 공통 타입

```typescript
// 프리미티브 타입 맵
type PrimitiveTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  DateTime: DateTime;
  DateOnly: DateOnly;
  Time: Time;
  Uuid: Uuid;
  Bytes: Bytes;
};

type PrimitiveTypeStr = keyof PrimitiveTypeMap;
type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;

// 재귀 Partial
type DeepPartial<T> = Partial<{
  [K in keyof T]: T[K] extends PrimitiveType ? T[K] : DeepPartial<T[K]>;
}>;

// 생성자 타입 (DI용)
interface Type<T> extends Function { new (...args: unknown[]): T; }
```
