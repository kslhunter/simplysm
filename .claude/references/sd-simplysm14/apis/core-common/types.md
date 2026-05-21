# @simplysm/core-common — types

## Uuid

```ts
class Uuid {
  static generate(): Uuid                  // crypto.getRandomValues 기반 UUID v4
  static fromBytes(bytes: Bytes): Uuid     // 16바이트 Uint8Array → Uuid (길이≠16이면 ArgumentError)
  constructor(uuid: string)                // 형식 검증 (실패 시 ArgumentError)
  toString(): string
  toBytes(): Bytes
}
```
- 정규식 `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` 로 검증.
- v4 비트: byte[6]은 0x40 마스크, byte[8]은 0x80 마스크 적용.

## DateTime (불변, 로컬 타임존, ms 정밀도)

```ts
new DateTime()                              // 현재
new DateTime(year, month, day, h?, m?, s?, ms?)
new DateTime(tick: number)
new DateTime(date: Date)
static parse(str): DateTime                 // 'yyyy-MM-dd HH:mm:ss[.fff]', 'yyyyMMddHHmmss',
                                            // 'yyyy-MM-dd AM/PM HH:mm:ss', '오전/오후', ISO 8601
```
- 읽기 getter: `year`, `month` (1-12), `day`, `hour`, `minute`, `second`, `millisecond`, `tick`, `dayOfWeek` (0=일~6=토), `timezoneOffsetMinutes`, `isValid`, `date` (내부 Date 복사 X — readonly 참조).
- 변환: `setYear/Month/Day/Hour/Minute/Second/Millisecond(n)` → 새 인스턴스. `setMonth`는 일수 초과 시 해당 월 말일로 보정 (예: 1월 31일 → 2월 28/29일).
- 산술: `addYears/Months/Days` (캘린더 기반), `addHours/Minutes/Seconds/Milliseconds` (tick 가산).
- 포맷: `toFormatString(fmt)` — `dt.format` 형식 문자열. `toString()` = `"yyyy-MM-ddTHH:mm:ss.fffzzz"`.
- 파싱 실패 시 `ArgumentError`.

## DateOnly (불변, 시간 제외)

```ts
new DateOnly() | new DateOnly(y,m,d) | new DateOnly(tick) | new DateOnly(date)
static parse(str): DateOnly                 // 'yyyy-MM-dd', 'yyyyMMdd' (타임존 무관),
                                            // ISO 8601 (UTC→로컬 변환)
static getDateByYearWeekSeq(
  { year, month?, weekSeq },
  weekStartDay = 1, minDaysInFirstWeek = 4,
): DateOnly                                 // 지정 주차의 시작 날짜
```
- getter: `year`, `month`, `day`, `tick`, `dayOfWeek`, `isValid`.
- `setYear/Month/Day`, `addYears/Months/Days` 동일 패턴 (월 보정 동일).
- 주차 API (인스턴스):
  - `getBaseYearMonthSeqForWeekSeq(weekStartDay=1, minDaysInFirstWeek=4)`: 이 날짜가 속한 주의 기준 연/월.
  - `getWeekSeqStartDate(...)`: 이 날짜가 속한 주의 시작 날짜.
  - `getWeekSeqOfYear(...)`: `{ year, weekSeq }`.
  - `getWeekSeqOfMonth(...)`: `{ year, monthSeq, weekSeq }`.
- `weekStartDay`: 주 시작 요일 (0=일~6=토). 기본 1=월.
- `minDaysInFirstWeek`: 첫 주 최소 일수 (1~7). 4=ISO 8601, 1=미국식.
- `toFormatString(fmt)` / `toString()` = `"yyyy-MM-dd"`.

## Time (불변, 24시간 순환)

```ts
new Time() | new Time(h, m, s?, ms?) | new Time(tick) | new Time(date)
static parse(str): Time                     // 'HH:mm:ss[.fff]', 'AM/PM HH:mm:ss', ISO 8601
```
- 24시간을 초과/음수인 tick 입력은 자동으로 `% MS_PER_DAY` 정규화.
- getter: `hour`, `minute`, `second`, `millisecond`, `tick`, `isValid`.
- `setHour/Minute/Second/Millisecond`, `addHours/Minutes/Seconds/Milliseconds` (24시간 순환).
- `toFormatString(fmt)` / `toString()` = `"HH:mm:ss.fff"`.

## LazyGcMap<TKey, TValue>

LRU 접근 시간 갱신 + 주기 GC 로 자동 만료되는 `Map`.

```ts
new LazyGcMap({
  expireTime: number,                       // 만료 ms (필수). 마지막 접근부터 경과 시 삭제
  gcInterval?: number,                      // GC 주기 ms. 기본 = max(expireTime/10, 1000)
  onExpire?: (key, value) => void|Promise<void>,   // 만료 시 콜백. 비동기 가능, throw하면 로그만
})

has(key)       // 접근 시간 갱신 X
get(key)       // 접근 시간 갱신 O
set(key, val)  // GC 타이머 시작
delete(key)    // 비면 GC 중지
clear()        // 전체 삭제 + GC 중지 (인스턴스 재사용 가능)
dispose()      // 영구 정리 (이후 모든 작업 no-op, getOrCreate만 throw)
getOrCreate(key, factory)
size, keys(), values(), entries()
```
- **반드시 `dispose()` 호출 필요** — 안 하면 GC 타이머 leak.
- GC 중복 실행 방지(`_isGcRunning`). `onExpire` 실행 도중 같은 key로 `set()`되면 새 값은 보존(참조 동일성 비교).
- 비어있으면 자동 GC 중지 → 재 `set()` 시 자동 재시작.
