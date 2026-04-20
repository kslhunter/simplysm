# Types (Value Objects)

## `DateTime`

불변 날짜시간 클래스. 밀리초 정밀도를 지원하고 로컬 타임존 기준으로 동작한다.

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

### 지원 파싱 형식

- `yyyy-MM-dd HH:mm:ss`
- `yyyy-MM-dd HH:mm:ss.fff`
- `yyyyMMddHHmmss`
- `yyyy-MM-dd AM/PM HH:mm:ss`
- `yyyy-MM-dd 오전/오후 HH:mm:ss`
- ISO 8601

### Getters (읽기 전용)

| Property | Type | Description |
|----------|------|-------------|
| `year` | `number` | 연도 |
| `month` | `number` | 월 (1-12) |
| `day` | `number` | 일 |
| `hour` | `number` | 시 |
| `minute` | `number` | 분 |
| `second` | `number` | 초 |
| `millisecond` | `number` | 밀리초 |
| `tick` | `number` | Unix 타임스탬프 (ms) |
| `dayOfWeek` | `number` | 요일 (0=일요일 ~ 6=토요일) |
| `timezoneOffsetMinutes` | `number` | 타임존 오프셋 (분) |
| `isValid` | `boolean` | 유효한 날짜시간 여부 |

### 불변 변환 메서드 (새 인스턴스 반환)

`setYear(year)`, `setMonth(month)`, `setDay(day)`, `setHour(hour)`, `setMinute(minute)`, `setSecond(second)`, `setMillisecond(millisecond)`

`addYears(years)`, `addMonths(months)`, `addDays(days)`, `addHours(hours)`, `addMinutes(minutes)`, `addSeconds(seconds)`, `addMilliseconds(milliseconds)`

### 포맷 메서드

| Method | Description |
|--------|-------------|
| `toFormatString(formatStr)` | 형식 문자열로 변환. 형식 패턴은 `dt.format()` 참조 |
| `toString()` | `"yyyy-MM-ddTHH:mm:ss.fffzzz"` 형식으로 변환 |

---

## `DateOnly`

시간 정보 없이 날짜만 저장하는 불변 클래스.

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

### Getters (읽기 전용)

| Property | Type | Description |
|----------|------|-------------|
| `year` | `number` | 연도 |
| `month` | `number` | 월 (1-12) |
| `day` | `number` | 일 |
| `tick` | `number` | Unix 타임스탬프 (ms) |
| `dayOfWeek` | `number` | 요일 (0=일요일 ~ 6=토요일) |
| `isValid` | `boolean` | 유효한 날짜 여부 |

### 불변 변환 메서드 (새 인스턴스 반환)

`setYear(year)`, `setMonth(month)`, `setDay(day)`

`addYears(years)`, `addMonths(months)`, `addDays(days)`

### 주차 계산 메서드

| Method | Description |
|--------|-------------|
| `getBaseYearMonthSeqForWeekSeq(weekStartDay?, minDaysInFirstWeek?)` | 주차 기준 연도와 월 반환 |
| `getWeekSeqStartDate(weekStartDay?, minDaysInFirstWeek?)` | 해당 주의 시작 날짜 반환 |
| `getWeekSeqOfYear(weekStartDay?, minDaysInFirstWeek?)` | 연도 내 주차 번호 반환 (`{ year, weekSeq }`) |
| `getWeekSeqOfMonth(weekStartDay?, minDaysInFirstWeek?)` | 월 내 주차 번호 반환 (`{ year, monthSeq, weekSeq }`) |

`weekStartDay` 기본값: 1(월요일). `minDaysInFirstWeek` 기본값: 4 (ISO 8601).

### 포맷 메서드

| Method | Description |
|--------|-------------|
| `toFormatString(formatStr)` | 형식 문자열로 변환 |
| `toString()` | `"yyyy-MM-dd"` 형식으로 변환 |

---

## `Time`

날짜 정보 없이 시간만 저장하는 불변 클래스. 24시간을 초과하거나 음수인 값은 자동으로 정규화된다.

```typescript
export class Time {
  constructor();
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);

  static parse(str: string): Time;
}
```

### 지원 파싱 형식

- `HH:mm:ss`
- `HH:mm:ss.fff`
- `AM/PM HH:mm:ss`
- ISO 8601 (시간 부분만 추출)

### Getters (읽기 전용)

| Property | Type | Description |
|----------|------|-------------|
| `hour` | `number` | 시 |
| `minute` | `number` | 분 |
| `second` | `number` | 초 |
| `millisecond` | `number` | 밀리초 |
| `tick` | `number` | 자정 이후 경과 밀리초 |
| `isValid` | `boolean` | 유효한 시간 여부 |

### 불변 변환 메서드 (새 인스턴스 반환)

`setHour(hour)`, `setMinute(minute)`, `setSecond(second)`, `setMillisecond(millisecond)`

`addHours(hours)`, `addMinutes(minutes)`, `addSeconds(seconds)`, `addMilliseconds(milliseconds)` — 모두 24시간 순환

### 포맷 메서드

| Method | Description |
|--------|-------------|
| `toFormatString(formatStr)` | 형식 문자열로 변환 |
| `toString()` | `"HH:mm:ss.fff"` 형식으로 변환 |

---

## `Uuid`

UUID v4 클래스. `crypto.getRandomValues` 기반으로 암호학적으로 안전한 UUID를 생성한다.

```typescript
export class Uuid {
  constructor(uuid: string);

  static generate(): Uuid;
  static fromBytes(bytes: Bytes): Uuid;

  toString(): string;
  toBytes(): Bytes;
}
```

| Method/Property | Description |
|-----------------|-------------|
| `constructor(uuid)` | UUID 문자열로 생성. 형식이 유효하지 않으면 `ArgumentError` 발생 |
| `Uuid.generate()` | 새 UUID v4 인스턴스 생성 |
| `Uuid.fromBytes(bytes)` | 16바이트 Uint8Array로 UUID 생성 |
| `toString()` | UUID 문자열 반환 (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) |
| `toBytes()` | 16바이트 Uint8Array로 변환 |

---

## `LazyGcMap<TKey, TValue>`

LRU 방식으로 접근 시간을 갱신하고, 지정된 시간 동안 접근하지 않으면 자동 삭제하는 Map.

반드시 `try-finally` 블록에서 `dispose()`를 호출해야 GC 타이머가 정리된다.

```typescript
export class LazyGcMap<TKey, TValue> {
  constructor(options: {
    gcInterval?: number;
    expireTime: number;
    onExpire?: (key: TKey, value: TValue) => void | Promise<void>;
  });
}
```

### 생성자 옵션

| Field | Type | Description |
|-------|------|-------------|
| `gcInterval` | `number \| undefined` | GC 간격 (ms). 기본값: `expireTime / 10` (최소 1000ms) |
| `expireTime` | `number` | 만료 시간 (ms). 마지막 접근 이후 이 시간이 지나면 삭제됨 |
| `onExpire` | `(key, value) => void \| Promise<void>` | 만료 시 호출되는 콜백 |

### 메서드

| Method | Description |
|--------|-------------|
| `get size` | 저장된 항목 수 |
| `has(key)` | key 존재 여부 확인 (접근 시간 갱신하지 않음) |
| `get(key)` | 값 조회 (접근 시간 갱신) |
| `set(key, value)` | 값 저장 및 GC 타이머 시작 |
| `delete(key)` | 항목 삭제 |
| `clear()` | 모든 항목 삭제 (인스턴스 재사용 가능) |
| `getOrCreate(key, factory)` | key가 없으면 팩토리로 생성 후 저장 |
| `values()` | 값만 순회 |
| `keys()` | key만 순회 |
| `entries()` | `[key, value]` 순회 |
| `dispose()` | GC 타이머 중지 및 데이터 삭제 |

```typescript
const cache = new LazyGcMap<string, Data>({
  expireTime: 60_000,
  onExpire: async (key, value) => { await value.cleanup(); },
});
try {
  cache.set("key", data);
  const val = cache.get("key"); // 접근 시간 갱신
  const val2 = cache.getOrCreate("key2", () => new Data());
} finally {
  cache.dispose();
}
```
