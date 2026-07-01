# @simplysm/core-common API 문서

## 개요

`@simplysm/core-common`은 대부분의 `@simplysm/*` 패키지가 의존하는 핵심 유틸리티 라이브러리입니다. 자료형(Date, Time, UUID 등), 에러 처리, 이벤트 에미터, 비동기 큐, Array/Set/Map 확장 메서드, 객체/문자열/숫자/바이트 변환 유틸 등을 포함합니다.

## 테이블 오브 콘텐츠

- [에러 클래스](#에러-클래스)
- [자료형](#자료형)
- [기능 클래스](#기능-클래스)
- [Array 확장 메서드](#array-확장-메서드)
- [Set/Map 확장 메서드](#setmap-확장-메서드)
- [유틸 네임스페이스](#유틸-네임스페이스)
- [환경 및 전역](#환경-및-전역)

---

## 에러 클래스

### SdError

트리 구조 조합을 지원하는 기본 에러 클래스로, ES2024 `cause` 속성을 활용합니다.

```typescript
export class SdError extends Error {
  cause?: Error;
  constructor(cause: Error, ...messages: string[]);
  constructor(...messages: string[]);
}
```

**특징:**
- 원인 에러를 감싸서 메시지를 역순으로 결합 (상위 → 하위 → 원인)
- 원인 체인의 스택을 현재 스택에 추가
- 메시지만으로도 생성 가능

**사용 예:**
```typescript
try {
  // ...
} catch (err) {
  throw new SdError(err as Error, "상위 메시지", "중간 메시지");
  // → "중간 메시지 => 상위 메시지 => 원본 에러 메시지"
}
```

### ArgumentError

유효하지 않은 인자를 전달받았을 때 발생하는 에러입니다. 디버깅을 위해 인자 객체를 YAML 형식으로 메시지에 포함합니다.

```typescript
export class ArgumentError extends SdError {
  constructor(argObj: Record<string, unknown>);
  constructor(message: string, argObj: Record<string, unknown>);
}
```

**특징:**
- 기본 메시지: "잘못된 인자입니다."
- 인자 객체를 YAML 형식으로 표시하여 디버깅 용이
- 커스텀 메시지 지정 가능

### NotImplementedError

아직 구현되지 않은 기능이 호출되었을 때 발생하는 에러입니다.

```typescript
export class NotImplementedError extends SdError {
  constructor(message?: string);
}
```

**특징:**
- 기본 메시지: "미구현"
- 추가 설명 메시지 옵션

### TimeoutError

대기 시간이 초과되었을 때 발생하는 에러입니다. `wait.until()` 같은 비동기 대기 함수에서 자동으로 발생합니다.

```typescript
export class TimeoutError extends SdError {
  constructor(count?: number, message?: string);
}
```

**특징:**
- 시도 횟수 및 추가 메시지 포함
- 메시지 예: "대기 시간 초과(10회 시도): 추가 정보"

---

## 자료형

### Uuid

UUID v4 클래스로 `crypto.getRandomValues` 기반 암호학적으로 안전한 UUID를 생성합니다. (Chrome 79+, Node.js 호환)

```typescript
export class Uuid {
  static generate(): Uuid;
  static fromBytes(bytes: Bytes): Uuid;
  constructor(uuid: string);
  toString(): string;
  toBytes(): Bytes;
}
```

**메서드:**
- `generate()` — 새 UUID v4 생성
- `fromBytes(bytes)` — 16바이트 배열에서 생성 (길이 검증)
- `toString()` — 문자열로 변환 (형식: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- `toBytes()` — 16바이트 Uint8Array로 변환

**사용 예:**
```typescript
const uuid1 = Uuid.generate();
const uuid2 = new Uuid("550e8400-e29b-41d4-a716-446655440000");
const bytes = uuid1.toBytes();
```

### DateTime

JavaScript Date 객체를 래핑하여 불변성과 편리한 API를 제공하는 클래스입니다. 밀리초 정밀도, 로컬 타임존 기준 동작.

```typescript
export class DateTime {
  readonly date: Date;
  constructor();
  constructor(year: number, month: number, day: number, 
              hour?: number, minute?: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);
  static parse(str: string): DateTime;
  
  get year(): number;
  get month(): number;
  get day(): number;
  get hour(): number;
  get minute(): number;
  get second(): number;
  get millisecond(): number;
  get tick(): number;
  get dayOfWeek(): number; // 0=일, 6=토
  get timezoneOffsetMinutes(): number;
  get isValid(): boolean;
  
  setYear(year: number): DateTime;
  setMonth(month: number): DateTime; // 1-12, 범위 밖 자동 조정
  setDay(day: number): DateTime;
  setHour(hour: number): DateTime;
  setMinute(minute: number): DateTime;
  setSecond(second: number): DateTime;
  setMillisecond(millisecond: number): DateTime;
  
  addYears(years: number): DateTime;
  addMonths(months: number): DateTime;
  addDays(days: number): DateTime;
  addHours(hours: number): DateTime;
  addMinutes(minutes: number): DateTime;
  addSeconds(seconds: number): DateTime;
  addMilliseconds(milliseconds: number): DateTime;
  
  toFormatString(formatStr: string): string;
  toString(): string;
}
```

**특징:**
- 불변 API (모든 메서드가 새 인스턴스 반환)
- 파싱 지원: ISO 8601, "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd AM/PM H:mm:ss"

### DateOnly

시간 정보 없이 날짜만 저장하는 불변 클래스 (형식: yyyy-MM-dd).

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
    weekStartDay?: number, // 0=일, 1=월(기본)
    minDaysInFirstWeek?: number // 기본 4 (ISO 8601)
  ): DateOnly;
  
  get year(): number;
  get month(): number;
  get day(): number;
  get tick(): number;
  get dayOfWeek(): number; // 0=일, 6=토
  get isValid(): boolean;
  
  setYear(year: number): DateOnly;
  setMonth(month: number): DateOnly;
  setDay(day: number): DateOnly;
  
  addYears(years: number): DateOnly;
  addMonths(months: number): DateOnly;
  addDays(days: number): DateOnly;
  
  getWeekSeqOfYear(weekStartDay?: number, minDaysInFirstWeek?: number): 
    { year: number; weekSeq: number };
  getWeekSeqOfMonth(weekStartDay?: number, minDaysInFirstWeek?: number):
    { year: number; monthSeq: number; weekSeq: number };
  getWeekSeqStartDate(weekStartDay?: number, minDaysInFirstWeek?: number): DateOnly;
  getBaseYearMonthSeqForWeekSeq(weekStartDay?: number, minDaysInFirstWeek?: number):
    { year: number; monthSeq: number };
  
  toFormatString(formatStr: string): string;
  toString(): string;
}
```

**특징:**
- 파싱 지원: "yyyy-MM-dd", "yyyyMMdd", ISO 8601
- 주차(Week) 계산 지원 (ISO 8601 표준 기본값)

### Time

날짜 정보 없이 시간만 저장하는 불변 클래스 (형식: HH:mm:ss.fff). 24시간을 초과하거나 음수인 값은 자동 정규화됩니다.

```typescript
export class Time {
  constructor();
  constructor(hour: number, minute: number, second?: number, millisecond?: number);
  constructor(tick: number);
  constructor(date: Date);
  static parse(str: string): Time;
  
  get hour(): number;
  get minute(): number;
  get second(): number;
  get millisecond(): number;
  get tick(): number;
  get isValid(): boolean;
  
  setHour(hour: number): Time;
  setMinute(minute: number): Time;
  setSecond(second: number): Time;
  setMillisecond(millisecond: number): Time;
  
  addHours(hours: number): Time; // 24시간 순환
  addMinutes(minutes: number): Time;
  addSeconds(seconds: number): Time;
  addMilliseconds(milliseconds: number): Time;
  
  toFormatString(formatStr: string): string;
  toString(): string;
}
```

**특징:**
- 불변 API
- 시간 추가 시 24시간 자동 순환

### LazyGcMap

자동 만료 기능이 있는 Map으로, LRU 방식으로 접근 시간을 갱신하고 지정된 시간 동안 접근하지 않으면 자동 삭제됩니다.

```typescript
export class LazyGcMap<TKey, TValue> {
  constructor(options: {
    gcInterval?: number; // GC 간격 (ms), 기본: expireTime/10 (최소 1000ms)
    expireTime: number; // 만료 시간 (ms)
    onExpire?: (key: TKey, value: TValue) => void | Promise<void>;
  });
  
  get size(): number;
  has(key: TKey): boolean;
  get(key: TKey): TValue | undefined;
  set(key: TKey, value: TValue): void;
  delete(key: TKey): boolean;
  clear(): void;
  dispose(): void; // GC 타이머 중지 및 데이터 삭제 (필수!)
  
  getOrCreate(key: TKey, factory: () => TValue): TValue;
  values(): IterableIterator<TValue>;
  keys(): IterableIterator<TKey>;
  entries(): IterableIterator<[TKey, TValue]>;
}
```

**특징:**
- 사용 후 **반드시 `dispose()` 호출** (메모리 누수 방지)
- LRU: 접근할 때마다 만료 시간 갱신
- 비동기 만료 콜백 지원

---

## 기능 클래스

### EventEmitter

브라우저와 Node.js 모두에서 사용 가능한 타입 안전한 이벤트 에미터입니다. 내부적으로 EventTarget을 사용하여 구현됩니다.

```typescript
export class EventEmitter<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  on<TEventName extends keyof TEvents & string>(
    type: TEventName, 
    listener: (data: TEvents[TEventName]) => void
  ): void;
  
  off<TEventName extends keyof TEvents & string>(
    type: TEventName, 
    listener: (data: TEvents[TEventName]) => void
  ): void;
  
  emit<TEventName extends keyof TEvents & string>(
    type: TEventName,
    ...args: TEvents[TEventName] extends void ? [] : [data: TEvents[TEventName]]
  ): void;
  
  listenerCount<TEventName extends keyof TEvents & string>(type: TEventName): number;
  dispose(): void;
}
```

**특징:**
- 제네릭 TEvents로 타입 안전성 보장
- 중복 리스너 자동 무시
- void 타입 이벤트는 인자 생략 가능

**사용 예:**
```typescript
interface MyEvents {
  "data-changed": { id: number; value: string };
  "error": Error;
  "disposed": void;
}

const emitter = new EventEmitter<MyEvents>();
emitter.on("data-changed", ({ id, value }) => {
  console.log(id, value);
});
emitter.emit("data-changed", { id: 1, value: "test" });
emitter.emit("disposed"); // void이므로 인자 없음
```

### SerialQueue

비동기 직렬 큐로, 큐에 추가된 함수들을 순차적으로 실행합니다. 에러 발생 시에도 후속 작업은 계속 실행됩니다.

```typescript
export class SerialQueue extends EventEmitter<{ error: SdError }> {
  constructor(gap?: number); // 각 작업 사이 간격 (ms)
  run(fn: () => void | Promise<void>): void;
  dispose(): void; // 대기 중 큐 비우기
}
```

**특징:**
- 하나의 작업이 완료된 후에야 다음 작업 시작
- 에러 발생 시 "error" 이벤트 발행 (EventEmitter 확장)
- 간격(gap) 옵션으로 작업 사이 지연 추가 가능

**사용 예:**
```typescript
const queue = new SerialQueue(500); // 작업 사이 500ms 간격
queue.on("error", (err) => console.error(err.message));
queue.run(() => console.log("작업 1"));
queue.run(async () => { await fetch(...); });
queue.run(() => console.log("작업 3")); // 1 → 3 → 2 순서로 실행
```

### DebounceQueue

비동기 디바운스 큐로, 짧은 시간 내 여러 번 호출되면 마지막 요청만 실행하고 이전 요청은 무시합니다.

```typescript
export class DebounceQueue extends EventEmitter<{ error: SdError }> {
  constructor(delay?: number | undefined); // 디바운스 지연 (ms), 생략 시 즉시 (다음 이벤트 루프)
  run(fn: () => void | Promise<void>): void;
  dispose(): void;
}
```

**특징:**
- 짧은 시간 내 추가된 요청은 무시되고 마지막만 실행
- 실행 중 추가된 요청은 디바운스 지연 없이 직후 처리
- 입력 필드 자동완성, 연속 상태 변경 일괄 처리에 유용

**사용 예:**
```typescript
const queue = new DebounceQueue(300);
const onSearch = (query: string) => {
  queue.run(() => fetchSearchResults(query));
};
// 빠르게 "h", "he", "hel", "hell", "hello" 입력
// → 300ms 후 "hello"만 요청
```

### createLogger

모듈 레벨에서 사용해도 안전한 lazy logger 함수입니다. `setupConsola()` 변경이 나중에 반영됩니다.

```typescript
export function createLogger(tag: string): ConsolaInstance;
```

**특징:**
- consola 기반 (tag 지원)
- 첫 메서드 접근 시점까지 생성 지연
- vi.spyOn 호환 (테스트 환경)

---

## Array 확장 메서드

Array 프로토타입에 다음 메서드들이 추가됩니다. `ReadonlyArrayExt`는 읽기 전용, `MutableArrayExt`는 원본 수정입니다.

### 조회 메서드

```typescript
// 조건에 맞는 단일 요소 (2개 이상이면 ArgumentError)
single(predicate?: (item: T, index: number) => boolean): T | undefined;

// 첫 번째 요소
first(predicate?: (item: T, index: number) => boolean): T | undefined;

// 마지막 요소
last(predicate?: (item: T, index: number) => boolean): T | undefined;

// 최소/최대값 (정렬/비교 가능한 타입)
min(): T | undefined;
max(): T | undefined;
min<TProp>(selector: (item: T, index: number) => TProp): TProp | undefined;
max<TProp>(selector: (item: T, index: number) => TProp): TProp | undefined;
```

### 필터링/변환

```typescript
// null/undefined 제거
filterExists(): NonNullable<T>[];

// 특정 타입만 필터 (instanceof 또는 PrimitiveTypeStr)
ofType<TKey extends PrimitiveTypeStr>(type: TKey): Extract<T, PrimitiveTypeMap[TKey]>[];
ofType<TNarrow extends T>(type: Type<TNarrow>): TNarrow[];

// 비동기 필터/매핑 (순차 실행)
filterAsync(predicate: (item: T, index: number) => Promise<boolean>): Promise<T[]>;
mapAsync<TResult>(selector: (item: T, index: number) => Promise<TResult>): Promise<TResult[]>;

// 평탄화
mapMany(): T extends readonly (infer U)[] ? U[] : T;
mapMany<TResult>(selector: (item: T, index: number) => TResult[]): TResult[];
mapManyAsync<TResult>(selector: (item: T, index: number) => Promise<TResult[]>): Promise<TResult[]>;

// 병렬 비동기 (Promise.all)
parallelAsync<TResult>(fn: (item: T, index: number) => Promise<TResult>): Promise<TResult[]>;
```

### 그룹화/매핑

```typescript
// key 기준 그룹화 (O(n²) 복잡도)
groupBy<TKey>(keySelector: (item: T, index: number) => TKey): 
  { key: TKey; values: T[] }[];
groupBy<TKey, TValue>(
  keySelector: (item: T, index: number) => TKey,
  valueSelector: (item: T, index: number) => TValue
): { key: TKey; values: TValue[] }[];

// Map으로 변환
toMap<TKey>(keySelector: (item: T, index: number) => TKey): Map<TKey, T>;
toMap<TKey, TValue>(
  keySelector: (item: T, index: number) => TKey,
  valueSelector: (item: T, index: number) => TValue
): Map<TKey, TValue>;

// 비동기 Map 변환
toMapAsync<TKey>(keySelector: (item: T, index: number) => Promise<TKey>): 
  Promise<Map<TKey, T>>;

// Array 그룹화된 Map (toArrayMap, toSetMap)
toArrayMap<TKey>(keySelector: (item: T, index: number) => TKey): Map<TKey, T[]>;
toSetMap<TKey>(keySelector: (item: T, index: number) => TKey): Map<TKey, Set<T>>;

// 값 계산 후 Map
toMapValues<TKey, TValue>(
  keySelector: (item: T, index: number) => TKey,
  valueSelector: (items: T[]) => TValue
): Map<TKey, TValue>;

// Object로 변환
toObject(keySelector: (item: T, index: number) => string): Record<string, T>;
toObject<TValue>(
  keySelector: (item: T, index: number) => string,
  valueSelector: (item: T, index: number) => TValue
): Record<string, TValue>;

// 트리 구조로 변환
toTree<K extends keyof T, P extends keyof T>(
  keyProp: K, // 각 항목의 고유 key 속성명
  parentKey: P // 부모 key를 참조하는 속성명
): TreeArray<T>[]; // children 속성 추가됨
```

### 정렬/중복 제거

```typescript
// 오름차순 정렬
orderBy(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

// 내림차순 정렬
orderByDesc(selector?: (item: T) => string | number | DateOnly | DateTime | Time | undefined): T[];

// 중복 제거 (O(n²) 또는 O(n), keyFn 지정 시 성능 향상)
distinct(options?: boolean | {
  matchAddress?: boolean; // true면 Set 사용 (주소 비교)
  keyFn?: (item: T) => string | number;
}): T[];
```

### 비교/병합

```typescript
// 두 array 비교 (INSERT/UPDATE/DELETE 감지)
diffs<TOther>(target: TOther[]): ArrayDiffsResult<T, TOther>[];
diffs<TOther>(
  target: TOther[],
  options: { 
    keys: string[]; // 비교할 key
    excludes?: string[]; // 제외할 key
  }
): ArrayDiffsResult<T, TOther>[];

// 단방향 비교 (기존 vs 변경)
oneWayDiffs<TKey extends keyof T>(
  orgItems: T[] | Map<T[TKey], T>,
  keyPropNameOrGetValFn: TKey | ((item: T) => string | number | undefined),
  options?: {
    includeSame?: boolean;
    excludes?: string[];
    includes?: string[];
  }
): ArrayOneWayDiffResult<T>[]; // create | update | same

// 두 array 병합
merge<TOther>(target: TOther[]): (T | TOther | (T & TOther))[];
merge<TOther>(
  target: TOther[],
  options: { 
    keys: string[];
    excludes?: string[];
  }
): (T | TOther | (T & TOther))[];
```

### 집계

```typescript
// 합계
sum(selector?: (item: T, index: number) => number): number;

// 순서 섞기
shuffle(): T[];
```

### 원본 수정 메서드 (Array에만 존재)

```typescript
@mutates
distinctThis(options?: boolean | { matchAddress?: boolean; keyFn?: ... }): T[];

@mutates
orderByThis(selector?: ...): T[];

@mutates
orderByDescThis(selector?: ...): T[];

@mutates
insert(index: number, ...items: T[]): this;

@mutates
remove(item: T): this;
remove(selector: (item: T, index: number) => boolean): this;

@mutates
toggle(item: T): this; // 있으면 제거, 없으면 추가

@mutates
clear(): this;
```

---

## Set/Map 확장 메서드

### Set 확장

```typescript
interface Set<T> {
  // 여러 값 한 번에 추가
  adds(...values: T[]): this;
  
  // 값 토글 (있으면 제거, 없으면 추가)
  toggle(value: T, addOrDel?: "add" | "del"): this;
}
```

**사용 예:**
```typescript
const set = new Set<string>();
set.adds("a", "b", "c");
set.toggle("a"); // 제거
set.toggle("d", "add"); // 강제 추가
```

### Map 확장

```typescript
interface Map<K, V> {
  // key가 없으면 새 값 설정 후 반환 (또는 팩토리 함수)
  getOrCreate(key: K, newValue: V): V;
  getOrCreate(key: K, newValueFn: () => V): V;
  
  // 함수로 key의 값 업데이트 (key 없으면 undefined)
  update(key: K, updateFn: (v: V | undefined) => V): void;
}
```

**사용 예:**
```typescript
const map = new Map<string, number>();
const count = map.getOrCreate("a", 0); // 0
map.update("a", (v) => (v ?? 0) + 1); // 1
map.update("b", (v) => (v ?? 0) + 1); // 1

// 함수를 값으로 저장하려면 팩토리로 감싸기
const fnMap = new Map<string, () => void>();
fnMap.getOrCreate("key", () => () => console.log("wrapped"));
```

---

## 유틸 네임스페이스

### obj (객체 유틸)

```typescript
// 깊은 복사 (순환 참조 지원, DateTime/DateOnly/Time/Uuid/Uint8Array 지원)
clone<T>(source: T): T;

// 깊은 동등성 비교
equal(
  source: unknown, 
  target: unknown, 
  options?: {
    topLevelIncludes?: string[]; // 비교할 key
    topLevelExcludes?: string[]; // 제외할 key
    ignoreArrayIndex?: boolean; // array 순서 무시 (O(n²))
    shallow?: boolean; // 얕은 비교
  }
): boolean;

// 깊은 병합
merge<T1, T2>(
  source: T1, 
  target: T2,
  opt?: {
    arrayProcess?: "replace" | "concat"; // "replace": target으로 교체, "concat": 병합
    useDelTargetNull?: boolean; // target이 null이면 해당 key 삭제
  }
): T1 & T2;

// 3-way 병합 (source, origin, target)
merge3<S, O, T>(
  source: S,
  origin: O,
  target: T,
  optionsObj?: Record<string, {
    keys?: string[];
    excludes?: string[];
    ignoreArrayIndex?: boolean;
  }>
): { conflict: boolean; result: O & S & T };

// key 제외/선택
omit<T, K extends keyof T>(item: T, omitKeys: K[]): Omit<T, K>;
pick<T, K extends keyof T>(item: T, pickKeys: K[]): Pick<T, K>;

// 체인 경로로 값 조회/설정/삭제
getChainValue(obj: unknown, chain: string, optional?: false): unknown;
getChainValue(obj: unknown, chain: string, optional: true): unknown | undefined;
setChainValue(obj: unknown, chain: string, value: unknown): void;
deleteChainValue(obj: unknown, chain: string): void;

// undefined 제거/null→undefined 변환
clearUndefined<T extends object>(obj: T): T;
nullToUndefined<T>(obj: T): T | undefined;

// 객체 비우기
clear<T>(obj: T): Record<string, never>;

// 평탄화 객체를 중첩 객체로 변환
unflatten(flatObj: Record<string, unknown>): Record<string, unknown>;

// 타입 안전한 keys/entries/fromEntries
keys<T extends object>(obj: T): (keyof T)[];
entries<T extends object>(obj: T): [keyof T, T[keyof T]][];
fromEntries<T extends [string, unknown]>(entryPairs: T[]): Record<T[0], T[1]>;

// 엔트리 변환
map<T extends object, K extends string, V>(
  obj: T,
  fn: (key: keyof T, value: T[keyof T]) => [K | null, V]
): Record<K, V>;

// 타입 유틸
type UndefToOptional<T>; // undefined를 가진 속성을 optional로
type OptionalToUndef<T>; // optional 속성을 필수 + undefined로
```

### str (문자열 유틸)

```typescript
// 한국어 조사 자동 선택 (받침 기반)
getKoreanSuffix(
  text: string,
  type: "을" | "은" | "이" | "와" | "랑" | "로" | "라"
): string;

// 전각 → 반각 변환
replaceFullWidth(str: string): string;

// 케이싱 변환
toPascalCase(str: string): string; // camelCase → CamelCase
toCamelCase(str: string): string;
toKebabCase(str: string): string;
toSnakeCase(str: string): string;

// 빈 문자열 검사 (타입 가드)
isNullOrEmpty(str: string | undefined): str is "" | undefined;

// 특정 위치에 문자열 삽입
insert(str: string, index: number, insertString: string): string;
```

### num (숫자 유틸)

```typescript
// 문자열 → 정수 (비숫자 제거, 선행 하이픈만 음수 유지)
parseInt(text: unknown): number | undefined;

// 문자열 → 정수 (반올림)
parseRoundedInt(text: unknown): number | undefined;

// 문자열 → float
parseFloat(text: unknown): number | undefined;

// undefined/null/0 검사 (타입 가드)
isNullOrEmpty(val: number | undefined): val is 0 | undefined;

// 천 단위 구분자 포맷
format(
  val: number,
  digit?: { max?: number; min?: number }
): string;
format(
  val: number | undefined,
  digit?: { max?: number; min?: number }
): string | undefined;
```

### bytes (바이트 유틸)

```typescript
// Uint8Array 결합
concat(arrays: Bytes[]): Bytes;

// hex 변환
toHex(bytes: Bytes): string;
fromHex(hex: string): Bytes;

// base64 변환
toBase64(bytes: Bytes): string;
fromBase64(base64: string): Bytes;
```

### path (경로 유틸, POSIX 스타일만)

```typescript
// 경로 결합 (/)
join(...segments: string[]): string;

// 파일명 추출
basename(filePath: string, ext?: string): string;

// 확장자 추출 (숨김 파일은 "")
extname(filePath: string): string;
```

### json (JSON 변환)

```typescript
// 객체 → JSON (DateTime/DateOnly/Time/Uuid/Set/Map/Error/Uint8Array 지원)
stringify(
  obj: unknown,
  options?: {
    space?: string | number;
    replacer?: (key: string | undefined, value: unknown) => unknown;
    redactBytes?: boolean; // Uint8Array를 "__hidden__"으로 대체
  }
): string;

// JSON → 객체 (커스텀 타입 복원)
parse<TResult = unknown>(json: string): TResult;
```

**특징:**
- 순환 참조는 TypeError 발생
- 개발 모드: 에러 메시지에 전체 JSON 포함
- 운영 모드: 에러 메시지에 JSON 길이만 포함
- 모든 JSON null은 undefined로 변환 (simplysm null-free 규칙)

### xml (XML 변환)

```typescript
// XML → 객체 파싱
parse(
  str: string,
  options?: { stripTagPrefix?: boolean }
): unknown;
// 구조: 속성 ($), 텍스트 (_), 자식 (array)

// 객체 → XML 직렬화
stringify(obj: unknown, options?: XmlBuilderOptions): string;
```

### wait (대기 유틸)

```typescript
// 조건이 true가 될 때까지 대기
until(
  forwarder: () => boolean | Promise<boolean>,
  milliseconds?: number, // 확인 간격, 기본 100ms
  maxCount?: number // 최대 시도 횟수, undefined면 무제한
): Promise<void>;

// 지정 시간만큼 대기
time(millisecond: number): Promise<void>;

// 이벤트 루프에 한 번 양보
immediate(): Promise<void>; // Node: setImmediate, 브라우저: setTimeout(0)
```

### transfer (Worker 전송용)

```typescript
// Simplysm 타입을 일반 객체로 변환 (Worker 전송 가능)
encode(obj: unknown): {
  result: unknown;
  transferList: Transferable[];
};

// 직렬화된 객체를 Simplysm 타입으로 복원
decode(obj: unknown): unknown;
```

**지원 타입:** Date, DateTime, DateOnly, Time, Uuid, RegExp, Error (cause/code/detail 포함), Uint8Array, Array, Map, Set, 일반 객체

### err (에러 유틸)

```typescript
// unknown 에러에서 메시지 추출
message(err: unknown): string;

// unknown 에러에서 스택 추출 (stack 없으면 message)
stack(err: unknown): string;

// Error 속성 객체 → Error 인스턴스 복원
fromObject(obj: Record<string, unknown>): Error;
```

### dt (날짜 포맷 유틸)

```typescript
// 월 설정 시 연/월/일 정규화
normalizeMonth(year: number, month: number, day: number): 
  { year: number; month: number; day: number };

// 12시간 → 24시간 변환
convert12To24(rawHour: number, isPM: boolean): number;

// 형식 문자열로 날짜 포맷
format(
  formatString: string,
  args: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
    timezoneOffsetMinutes?: number;
  }
): string;
```

**지원 형식:**
- `yyyy` 4자리 연도, `yy` 2자리
- `MM` 0 채움 월, `M` 월
- `dd` 0 채움 일, `d` 일
- `ddd` 요일 (일, 월, 화, ...)
- `HH` 0 채움 24시간, `H` 24시간
- `hh` 0 채움 12시간, `h` 12시간
- `mm` 0 채움 분, `m` 분
- `ss` 0 채움 초, `s` 초
- `fff` 밀리초 (3자리), `ff`, `f`
- `tt` 오전/오후 (AM/PM), `T` (대문자 여부)
- `zzz` 타임존 오프셋 (±HH:mm), `zz`, `z`

### primitive (원시 타입 유틸)

```typescript
// 값의 PrimitiveTypeStr 추론
typeStr(value: PrimitiveTypeMap[PrimitiveTypeStr]): PrimitiveTypeStr;
```

### 직접 내보내기

#### template-strings (템플릿 태그, IDE 코드 하이라이팅용)

```typescript
js(strings: TemplateStringsArray, ...values: unknown[]): string;
ts(strings: TemplateStringsArray, ...values: unknown[]): string;
html(strings: TemplateStringsArray, ...values: unknown[]): string;
tsql(strings: TemplateStringsArray, ...values: unknown[]): string;
mysql(strings: TemplateStringsArray, ...values: unknown[]): string;
pgsql(strings: TemplateStringsArray, ...values: unknown[]): string;
```

**특징:** 문자열 결합 + 들여쓰기 정규화

#### zip (ZIP 아카이브)

```typescript
export class ZipArchive {
  constructor(data?: Blob | Bytes);
  
  // 모든 파일 추출
  extractAll(
    progressCallback?: (progress: {
      fileName: string;
      totalSize: number;
      extractedSize: number;
    }) => void
  ): Promise<Map<string, Bytes | undefined>>;
  
  // 특정 파일 추출
  get(fileName: string): Promise<Bytes | undefined>;
  
  // 파일 존재 여부 확인
  exists(fileName: string): Promise<boolean>;
  
  // 파일 쓰기 (캐시에만 저장, compress() 후 ZIP에 반영)
  write(fileName: string, bytes: Bytes): void;
  
  // 캐시된 파일을 ZIP으로 압축
  compress(): Promise<Bytes>;
  
  // 리더 닫기 및 캐시 비우기
  close(): Promise<void>;
}
```

---

## 환경 및 전역

### env (환경변수 함수)

```typescript
// 환경변수 값 읽기 (process.env 우선, fallback import.meta.env)
env(key: string): string | undefined;

// 환경변수 값 쓰기 (process.env에 저장)
env(key: string, value: string): void;

// 환경변수를 boolean으로 파싱
parseBoolEnv(value: unknown): boolean;
// "true", "1", "yes", "on" → true, 그 외 → false
```

### 전역 변수

```typescript
declare global {
  const __DEV__: boolean; // 빌드 시 치환
}
```

**특징:**
- 라이브러리 빌드: 치환 안 됨 (그대로)
- 클라이언트/서버 빌드: `define: { '__DEV__': 'true/false' }`로 치환

---

## 타입 정의

### 공통 타입

```typescript
// 바이너리 타입 (Buffer 대신)
type Bytes = Uint8Array;

// 원시 타입 매핑
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

type PrimitiveTypeStr = keyof PrimitiveTypeMap; // "string" | "number" | ...
type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;

// Deep Partial 타입 (재귀적 optional)
type DeepPartial<T> = ...;

// 생성자 타입
interface Type<TInstance> extends Function {
  new (...args: unknown[]): TInstance;
}
```

---

## 사용 시나리오 및 주의사항

### LazyGcMap 사용 시 주의

```typescript
const map = new LazyGcMap({ expireTime: 60000 });
// ...사용...
map.dispose(); // 필수! 그렇지 않으면 GC 타이머 메모리 누수
```

### 에러 체인 처리

```typescript
try {
  await someAsyncOperation();
} catch (err) {
  // SdError로 감싸서 컨텍스트 추가
  throw new SdError(err as Error, "사용자 정보 로드 실패", "데이터 동기화");
}
// 메시지: "데이터 동기화 => 사용자 정보 로드 실패 => 원본 에러 메시지"
```

### Array 메서드 성능 고려

- `groupBy()` / `diffs()` / `distinct()` (keyFn 없이): O(n²) 복잡도
- 대량 데이터는 `keyFn` 지정 또는 다른 방법 고려
- `ignoreArrayIndex: true`: array 순서 무시하지만 O(n²)

### JSON 직렬화 제약

```typescript
// OK: 순환 참조 없음
const obj = { date: new DateTime(), uuid: Uuid.generate() };
json.stringify(obj);

// NG: 순환 참조 → TypeError
const circular: any = { a: 1 };
circular.self = circular;
json.stringify(circular); // Error
```

### EventEmitter 타입 안전성

```typescript
// 타입 정의 필수
interface MyEvents {
  "update": { id: number };
  "error": Error;
}

const emitter = new EventEmitter<MyEvents>();
emitter.on("update", (data) => {
  // data는 { id: number } 타입 보장
});

// 컴파일 타임에 오타 검사
emitter.emit("typo"); // 컴파일 에러
```

### 문자열 케이싱 변환

```typescript
str.toCamelCase("hello-world"); // "helloWorld"
str.toKebabCase("helloWorld"); // "hello-world"
str.toPascalCase("hello-world"); // "HelloWorld"
str.toSnakeCase("helloWorld"); // "hello_world"
```

### 한국어 조사 사용

```typescript
const name = "나";
console.log(`${name}${str.getKoreanSuffix(name, "을")} 선택했습니다.`);
// → "나를 선택했습니다."

const item = "사과";
console.log(`${item}${str.getKoreanSuffix(item, "이")} 있습니다.`);
// → "사과가 있습니다."
```

---

## 패키지 정보

- **버전:** v14 (또는 위 참조)
- **주요 의존성:** consola, yaml, fast-xml-parser, @zip.js/zip.js
- **Node.js:** 호환성 있음
- **브라우저:** Chrome 79+, 최신 브라우저 지원
- **Worker 지원:** 가능 (structuredClone 제약 극복)

---

**최종 업데이트:** 2026-07-02

