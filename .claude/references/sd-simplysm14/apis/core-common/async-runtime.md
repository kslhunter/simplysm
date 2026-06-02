# @simplysm/core-common — 비동기 런타임

비동기 실행 흐름·이벤트·캐시·로깅을 다룰 때 함께 읽히는 묶음. `DebounceQueue`/`SerialQueue`(실행 큐)는 `EventEmitter` 를 상속해 `error` 이벤트를 발행하며, `LazyGcMap`(자동 만료 캐시)·`createLogger`(태그 로거)와 함께 쓰인다.

## EventEmitter

브라우저/Node 공통의 타입 안전 이벤트 이미터(내부적으로 `EventTarget` 사용).

```typescript
class EventEmitter<TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>> {
  on<K extends keyof TEvents & string>(type: K, listener: (data: TEvents[K]) => void): void;
  off<K extends keyof TEvents & string>(type: K, listener: (data: TEvents[K]) => void): void;
  emit<K extends keyof TEvents & string>(type: K, ...args: TEvents[K] extends void ? [] : [data: TEvents[K]]): void;
  listenerCount<K extends keyof TEvents & string>(type: K): number;
  dispose(): void;
}
```

- `TEvents` — 이벤트명→데이터 타입 맵. `void` 타입 이벤트는 `emit("done")` 처럼 인자 없이 발행.
- `on` — 같은 (type, listener) 조합 중복 등록은 무시. `off` — 해당 listener 제거.
- `emit` — 등록 리스너에 데이터 디스패치. `listenerCount(type)` — 현재 리스너 수(없으면 0). `dispose` — 전체 리스너 해제.

```typescript
interface MyEvents { data: string; done: void; }
class My extends EventEmitter<MyEvents> {}
const e = new My();
e.on("data", (s) => console.log(s));
e.emit("data", "hi");
```

## DebounceQueue

짧은 시간 내 여러 호출 중 **마지막만** 실행하는 디바운스 큐. `EventEmitter<{ error: SdError }>` 상속.

```typescript
class DebounceQueue extends EventEmitter<{ error: SdError }> {
  constructor(delay?: number);                 // 지연 ms (생략 시 다음 이벤트 루프에 즉시)
  run(fn: () => void | Promise<void>): void;   // 대기 작업 등록(기존 대기 작업 교체)
  override dispose(): void;                     // 타이머·대기 작업 정리
}
```

- `constructor(delay)` — 디바운스 지연. 생략하면 0(다음 틱 실행).
- `run(fn)` — 호출할 때마다 이전 대기 fn 을 교체. 지연 후 마지막 fn 만 실행. **실행 중**에 들어온 추가 요청은 지연 없이 현재 실행 직후 즉시 처리(의도적 설계 — 누락 방지).
- 에러 처리: fn 이 throw 하면 `SdError` 로 감싸, `error` 리스너가 있으면 `emit("error")`, 없으면 내부 로거로 출력. (문제 발생 = error 심각도)

```typescript
const q = new DebounceQueue(300);
q.on("error", (e) => console.error(e));
input.addEventListener("input", () => q.run(() => search(input.value)));
```

## SerialQueue

추가된 작업을 **순차** 실행하는 큐(이전 완료 후 다음 시작). 에러가 나도 후속 작업은 계속 진행. `EventEmitter<{ error: SdError }>` 상속.

```typescript
class SerialQueue extends EventEmitter<{ error: SdError }> {
  constructor(gap?: number);                   // 작업 사이 간격 ms (기본 0)
  run(fn: () => void | Promise<void>): void;   // 큐에 추가하고 실행 시작
  override dispose(): void;                     // 대기 큐 비움(실행 중 작업은 완료됨)
}
```

- `constructor(gap)` — 각 작업 사이 대기 간격(ms). 0 이면 연속 실행.
- `run(fn)` — FIFO 로 순차 실행. 한 작업이 throw 하면 `SdError` 로 감싸 `error` 이벤트 발행(리스너 없으면 로그) 후 다음 작업 진행 — 후속 작업을 막지 않으려는 의도.
- `dispose` — 아직 시작 안 한 대기분만 제거(실행 중인 건은 완료).

```typescript
const q = new SerialQueue();
q.run(async () => save(a)); // 순서 보장
q.run(async () => save(b));
```

## LazyGcMap

마지막 접근 이후 일정 시간이 지나면 항목을 자동 삭제하는 Map(LRU 접근 시간 갱신). 타이머를 쓰므로 사용 후 `dispose()` 필수.

```typescript
class LazyGcMap<TKey, TValue> {
  constructor(options: {
    gcInterval?: number;   // GC 주기 ms (기본: expireTime/10, 최소 1000)
    expireTime: number;    // 만료 시간 ms (마지막 접근 이후)
    onExpire?: (key: TKey, value: TValue) => void | Promise<void>;
  });
  get size: number;
  has(key): boolean;       // 접근 시간 갱신 안 함
  get(key): TValue | undefined; // 접근 시간 갱신(LRU)
  set(key, value): void;        // 저장 + GC 타이머 시작
  delete(key): boolean;         // 비면 타이머 중지
  getOrCreate(key, factory: () => TValue): TValue; // dispose 후 호출 시 throw
  clear(): void;                // 항목만 비움(재사용 가능)
  dispose(): void;              // 타이머 중지 + 비움(이후 set/get 무력화)
  values(): IterableIterator<TValue>;
  keys(): IterableIterator<TKey>;
  entries(): IterableIterator<[TKey, TValue]>;
}
```

- `expireTime` — 필수. 마지막 접근 후 이 시간이 지나면 만료. `gcInterval` — 만료 스캔 주기(미지정 시 `expireTime/10`, 최소 1000ms).
- `onExpire(key, value)` — 만료 직전 호출(비동기 가능). 콜백이 throw 해도 로그만 남기고 GC 계속. 콜백 도중 같은 key 가 재등록되면 새 항목은 삭제하지 않음.
- `get` 은 접근 시간을 갱신(LRU), `has` 는 갱신하지 않음. `set` 이 호출돼야 GC 타이머가 시작되고, 항목이 모두 비면 타이머가 자동 중지.
- `getOrCreate` 는 dispose 이후 호출하면 throw(silent 동작 금지). `dispose` 미호출 시 타이머가 계속 돌아 메모리 누수.

```typescript
const cache = new LazyGcMap<string, Session>({ expireTime: 60000 });
try {
  const s = cache.getOrCreate(id, () => loadSession(id));
} finally {
  cache.dispose();
}
```

## createLogger

`consola` 기반 태그 로거를 지연 생성하는 팩토리. 모듈 최상위에서 호출해도 안전(첫 메서드 접근 시점까지 `consola.withTag` 생성을 미뤄, 이후 `setupConsola()` 의 level/reporter 변경이 반영됨).

```typescript
createLogger(tag: string): ConsolaInstance;
```

- `tag` — 로그에 붙는 태그(클래스/모듈명 등). 반환값은 `consola` 인스턴스라 `.info`/`.warn`/`.error`/`.success` 등을 그대로 사용.
- 즉시 `consola.withTag()` 를 부르면 호출 시점 옵션이 고정되는 문제를 피하기 위한 Proxy 래퍼. 테스트의 `vi.spyOn` 과도 호환.

```typescript
const logger = createLogger("MyService");
logger.error("처리 실패", err);
```
