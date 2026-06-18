# @simplysm/core-common — async-runtime

호출 흐름 제어(디바운스/직렬 큐), 타입 안전 이벤트(`EventEmitter`), 대기 헬퍼(`wait`), 자동 만료 Map(`LazyGcMap`). 큐와 `EventEmitter`/`LazyGcMap` 은 `dispose()`(또는 LazyGcMap 은 `dispose`)로 타이머·리스너 자원을 정리해야 함. `import { DebounceQueue, SerialQueue, EventEmitter, LazyGcMap, wait } from "@simplysm/core-common"`.

큐 실행 중 발생한 에러는 `"error"` 이벤트로 발행되며, 리스너가 없으면 `createLogger` 로 로그 출력된다.

## EventEmitter

```ts
class EventEmitter<TEvents extends Record<keyof TEvents, unknown> = Record<string, unknown>>
```

`EventTarget` 기반 타입 안전 이벤트 이미터(브라우저·Node 공용). `TEvents` 는 이벤트명→데이터 타입 맵.

- `on(type, listener: (data) => void): void` — 리스너 등록. 같은 이벤트에 같은 리스너 중복 등록은 무시.
- `off(type, listener): void` — 리스너 제거.
- `emit(type, ...args): void` — 발행. 데이터 타입이 `void` 면 인자 생략, 아니면 데이터 1개 전달.
- `listenerCount(type): number` — 해당 이벤트의 등록 리스너 수.
- `dispose(): void` — 모든 리스너 제거.

```ts
interface MyEvents { data: string; done: void; }
class MyEmitter extends EventEmitter<MyEvents> {}
const em = new MyEmitter();
em.on("data", (d) => console.log(d)); // d: string
em.emit("data", "hello");
em.emit("done");                       // void 는 인자 없이
```

## DebounceQueue

```ts
class DebounceQueue extends EventEmitter<{ error: SdError }>
constructor(delay?: number)
```

짧은 시간 내 여러 호출 중 **마지막 요청만** 실행, 이전 요청은 무시.

- `new DebounceQueue(delay?)` — `delay`(ms) 생략 시 다음 이벤트 루프에 즉시 실행.
- `run(fn: () => void | Promise<void>): void` — 큐에 함수 등록(이전 대기 함수는 교체). 실행 중에 들어온 요청은 디바운스 지연 없이 현재 실행 직후 즉시 처리(의도적 설계 — 실행 중 도착 요청 누락 방지).
- `dispose(): void` — 대기 함수·타이머 정리 후 상위 `EventEmitter.dispose` 호출.
- `"error"` 이벤트(`SdError`) — `run` 으로 실행한 함수가 throw 하면 발행. 리스너 없으면 로그.

```ts
const q = new DebounceQueue(300);
q.on("error", (e) => console.error(e));
input.addEventListener("input", () => q.run(() => search(input.value)));
```

## SerialQueue

```ts
class SerialQueue extends EventEmitter<{ error: SdError }>
constructor(gap?: number)
```

등록된 함수를 **순차** 실행(앞 작업 완료 후 다음 시작). 한 작업이 throw 해도 후속 작업은 계속 실행.

- `new SerialQueue(gap?)` — `gap`(ms, 기본 0) 은 각 작업 사이 간격(`wait.time` 으로 대기).
- `run(fn: () => void | Promise<void>): void` — 큐에 추가하고 처리 시작.
- `dispose(): void` — 대기 큐 비움(실행 중 작업은 완료됨) 후 상위 `EventEmitter.dispose`.
- `"error"` 이벤트(`SdError`) — 작업 throw 시 발행. 리스너 없으면 로그.

```ts
const q = new SerialQueue();
q.run(async () => { await save(1); });
q.run(async () => { await save(2); }); // 1 완료 후 실행
```

## LazyGcMap

```ts
class LazyGcMap<TKey, TValue>
constructor(options: {
  gcInterval?: number;
  expireTime: number;
  onExpire?: (key: TKey, value: TValue) => void | Promise<void>;
})
```

LRU 방식 자동 만료 Map. 접근 시 마지막 접근 시간을 갱신하고, `expireTime`(ms) 동안 접근 없으면 자동 삭제. **사용 후 반드시 `dispose()` 호출**(안 하면 GC 타이머가 계속 돌아 메모리 누수).

옵션:

- `expireTime: number` — 만료 시간(ms). 마지막 접근 후 이 시간 경과 시 삭제.
- `gcInterval?: number` — GC 주기(ms). 기본값 `max(expireTime / 10, 1000)`.
- `onExpire?: (key, value) => void | Promise<void>` — 만료 시 콜백. 비동기 가능, 콜백이 throw 하면 로그 후 계속.

메서드:

- `size` — 항목 수.
- `has(key)` — 존재 여부(접근 시간 갱신 안 함).
- `get(key): TValue | undefined` — 조회(접근 시간 갱신, LRU).
- `set(key, value): void` — 저장(GC 타이머 시작).
- `delete(key): boolean` — 삭제(비면 타이머 중지).
- `getOrCreate(key, factory): TValue` — 없으면 `factory()` 로 생성·저장. dispose 후 호출하면 `Error`.
- `clear(): void` — 전부 삭제(인스턴스는 재사용 가능).
- `dispose(): void` — 타이머 중지 + 데이터 삭제(인스턴스 사용 종료).
- `values()/keys()/entries()` — Iterator.

```ts
const cache = new LazyGcMap<string, Session>({ expireTime: 60000 });
try {
  cache.set("sid", session);
  cache.getOrCreate("sid2", () => createSession());
} finally {
  cache.dispose();
}
```

## wait

`import { wait } from "@simplysm/core-common"` 네임스페이스.

- `wait.until(forwarder: () => boolean | Promise<boolean>, milliseconds?, maxCount?): Promise<void>` — 조건이 true 가 될 때까지 대기. `milliseconds`(기본 100) 간격으로 재확인. 첫 호출에서 true 면 즉시 반환. `maxCount` 지정 시 그 횟수 초과하면 `TimeoutError(count)` throw(미지정이면 무제한).
- `wait.time(millisecond: number): Promise<void>` — 지정 시간(ms) 대기(`setTimeout` 래퍼).

```ts
await wait.until(() => isReady, 100, 50); // 100ms 간격, 최대 50회
await wait.time(500);
```
