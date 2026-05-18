# @simplysm/core-common — types

날짜·시간·UUID·만료 캐시 타입.

## DateTime (불변)

밀리초 정밀도, 로컬 타임존. 모든 변환/산술 메서드는 새 인스턴스 반환.

```typescript
new DateTime()                                    // 현재
new DateTime(year, month, day, h?, m?, s?, ms?)   // month 는 1-12
new DateTime(tick)                                // ms epoch
new DateTime(date)                                // Date 복사
DateTime.parse(str)                               // "yyyy-MM-dd HH:mm:ss" / "yyyyMMddHHmmss" /
                                                  //   "yyyy-MM-dd AM|PM HH:mm:ss" / "오전|오후" / ISO 8601
                                                  //   실패 시 ArgumentError
```

Getters: `year/month/day/hour/minute/second/millisecond/tick/dayOfWeek/timezoneOffsetMinutes/isValid` (month 는 1-12, dayOfWeek 는 0-6 일~토).

변환: `setYear/setMonth/setDay/setHour/setMinute/setSecond/setMillisecond` — 새 인스턴스. `setMonth` 는 대상 월 일수 초과 시 마지막 일로 클램프. `setDay` 는 JS Date 동작에 따라 월 경계 자동 조정.

산술: `addYears/addMonths/addDays/addHours/addMinutes/addSeconds/addMilliseconds`.

포맷: `toFormatString(formatStr)` ([date-format 토큰](#date-format-토큰)). `toString()` = `"yyyy-MM-ddTHH:mm:ss.fffzzz"`.

## DateOnly (불변)

날짜만(yyyy-MM-dd), 로컬 타임존.

```typescript
new DateOnly()                       // 오늘
new DateOnly(year, month, day)
new DateOnly(tick) / new DateOnly(date)
DateOnly.parse(str)                  // "yyyy-MM-dd" / "yyyyMMdd" (타임존 무관) /
                                     //   ISO 8601 (UTC → 로컬 변환). 실패 시 ArgumentError
```

Getters: `year/month/day/tick/dayOfWeek/isValid`.
변환·산술: `setYear/setMonth/setDay`, `addYears/addMonths/addDays`.
포맷: `toFormatString`, `toString()` = `"yyyy-MM-dd"`.

주차 API (ISO 8601 기본: 월요일 시작, 첫 주 최소 4일):

```typescript
d.getWeekSeqOfYear(weekStartDay=1, minDaysInFirstWeek=4)  // { year, weekSeq }
d.getWeekSeqOfMonth(...)                                  // { year, monthSeq, weekSeq }
d.getWeekSeqStartDate(...)                                // DateOnly
d.getBaseYearMonthSeqForWeekSeq(...)                      // { year, monthSeq }
DateOnly.getDateByYearWeekSeq({ year, month?, weekSeq }, ...) // 해당 주 시작일
```

## Time (불변)

시간만(HH:mm:ss.fff). 24h 순환 — 음수/24h+ 자동 정규화.

```typescript
new Time()                              // 현재 시각의 시간 부분
new Time(hour, minute, second?, ms?)
new Time(tick) / new Time(date)
Time.parse(str)                         // "HH:mm:ss[.fff]" / "AM|PM HH:mm:ss[.fff]" / ISO 8601 시간 부분
```

Getters/Setters/Add 메서드는 DateTime 시간부와 유사. `addHours/Minutes/Seconds/Milliseconds` 는 24h 순환.

## Uuid

UUID v4, `crypto.getRandomValues` 기반.

```typescript
Uuid.generate()                  // 새 v4
new Uuid("xxxxxxxx-...")         // 형식 검증, 실패 시 ArgumentError
Uuid.fromBytes(bytes16)          // 16바이트 → Uuid (길이 ≠ 16 시 ArgumentError)
u.toString()                     // "xxxxxxxx-xxxx-..."
u.toBytes()                      // 16바이트 Uint8Array
```

## LazyGcMap

LRU 자동 만료 Map. **사용 후 반드시 `dispose()` 호출** — 안 하면 GC 타이머가 살아 메모리 누수.

```typescript
const m = new LazyGcMap<K, V>({
  expireTime: 60_000,           // 마지막 접근 이후 ms
  gcInterval?: 6_000,           // 기본: expireTime/10, 최소 1000ms
  onExpire?: (k, v) => ... ,    // 비동기 가능, 에러는 로그
});

m.size; m.has(k); m.get(k); m.set(k, v); m.delete(k); m.clear(); m.dispose();
m.getOrCreate(k, factory);                 // dispose 후 호출 시 throw
m.keys() / m.values() / m.entries();       // Iterator
```

`get`/`getOrCreate` 만 접근시간 갱신(LRU). `has` 는 갱신 X. GC 실행 중 같은 key 재등록 시 새 항목 보존.

## date-format 토큰

`DateTime/DateOnly/Time#toFormatString(formatStr)` 에서 사용. C# 호환.

| 토큰 | 의미 | 예 |
|------|------|----|
| `yyyy`/`yy` | 연도 4/2자리 | 2024 / 24 |
| `MM`/`M` | 월 패딩/미패딩 | 01 / 1 |
| `ddd` | 한글 요일 | 일~토 |
| `dd`/`d` | 일 패딩/미패딩 | 01 / 1 |
| `tt` | AM/PM | AM |
| `hh`/`h` | 12시간 패딩/미패딩 | 01 / 1 |
| `HH`/`H` | 24시간 패딩/미패딩 | 14 / 14 |
| `mm`/`m` | 분 | 30 / 30 |
| `ss`/`s` | 초 | 45 / 45 |
| `fff`/`ff`/`f` | 밀리초 3/2/1자리 | 123 / 12 / 1 |
| `zzz`/`zz`/`z` | 타임존 ±HH:mm / ±HH / ±H | +09:00 |

긴 토큰이 먼저 매칭 → 부분 매칭 방지.
