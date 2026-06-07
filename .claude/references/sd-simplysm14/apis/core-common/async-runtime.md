# @simplysm/core-common — 비동기 런타임 (큐·이벤트·대기·LazyGcMap)

호출 흐름 제어(디바운스/직렬 큐), 타입 안전 이벤트(EventEmitter), 대기 헬퍼(wait), 자동 만료 Map(LazyGcMap). 비동기 작업 조율·이벤트 배선·타이머 자원 정리가 필요할 때 함께 참조. 큐와 EventEmitter 는 `dispose()` 로 자원을 정리해야 함.

## EventEmitter

```ts
class EventEmitter<TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>> {}
```

`EventTarget` 기반 타입 안전 이벤트 이미터(브라우저·Node 공용). `TEvents` 는 이벤트명→데이터 타입 맵.

- `on(type, listener: (data: TEvents[type]) => void): void` — 리스너 등록(같은 리스너 중복 등록은 무시).
- `off(type, listener): void` — 리스너 제거.
- `emit(type, ...args): void` — 발행. 데이터 타입이 `void` 면 인자 없이 호출.
- `listenerCount(type): number` — 해당 이벤트의 리스너 수.
- `dispose(): void` — 모든 리스너 제거.

```ts
interface MyEvents { data: string; done: void; }
class MyEmitter extends EventEmitter<MyEvents> {}
const em = new MyEmitter();
em.on("data", (d) => console.log(d)); // d: string
em.emit("data", "hello");
em.emit("done"); // void 는 인자 없이
```

## DebounceQueue

```ts
class DebounceQueue extends EventEmitter<{ error: SdError }> {
  constructor(delay?: number);
}
```

연속 호출 시 **마지막 요청만** 실행하는 디바운스 큐. 입력 자동완성·연속 상태 변경 일괄 처리에.

- `constructor(delay?)` — `delay`(ms) 생략 시 다음 이벤트 루프에 즉시 실행.
- `run(fn: () => void | Promise<void>): void` — 큐에 등록. 대기 중 함수가 있으면 교체. 실행 중에 도착한 요청은 디바운스 없이 현재 실행 직후 즉시 처리(누락 방지 의도).
- `dispose(): void` — 대기 함수·타이머 정리(EventEmitter dispose 포함).
- 작업 throw 시 `"error"` 리스너가 있으면 `SdError` 로 emit, 없으면 내부 로거로 출력.

## SerialQueue

```ts
class SerialQueue extends EventEmitter<{ error: SdError }> {
  constructor(gap?: number);
}
```

큐에 등록된 함수를 **순차 실행**(이전 완료 후 다음). 에러가 나도 후속 작업은 계속.

- `constructor(gap = 0)` — 각 작업 사이 간격(ms).
- `run(fn: () => void | Promise<void>): void` — 큐에 추가하고 실행 시작.
- `dispose(): void` — 대기 큐 비움(실행 중 작업은 완료됨, EventEmitter dispose 포함).
- 작업 throw 시 `"error"` 리스너가 있으면 `SdError` emit, 없으면 내부 로거 출력.

```ts
const q = new SerialQueue();
q.run(async () => { await save(a); });
q.run(async () => { await save(b); }); // a 완료 후 실행
```

## wait (`import { wait } from "@simplysm/core-common"`)

- `until(forwarder: () => boolean | Promise<boolean>, milliseconds = 100, maxCount?): Promise<void>` — 조건이 true 가 될 때까지 `milliseconds` 간격으로 폴링. 첫 평가에서 true 면 즉시 반환. `maxCount` 지정 시 초과하면 `TimeoutError` throw(미지정이면 무제한).
- `time(millisecond: number): Promise<void>` — 지정 시간만큼 대기(`setTimeout` Promise 화).

```ts
import { wait } from "@simplysm/core-common";
await wait.until(() => isReady, 100, 50); // 100ms 간격, 50회 초과 시 TimeoutError
await wait.time(300);
```

## LazyGcMap

```ts
class LazyGcMap<TKey, TValue> {
  constructor(options: {
    gcInterval?: number;
    expireTime: number;
    onExpire?: (key: TKey, value: TValue) => void | Promise<void>;
  });
}
```

LRU 접근 시간 기반 자동 만료 Map. 지정 시간 동안 접근 없으면 GC 타이머가 삭제. 캐시·세션 보관에. **사용 후 `dispose()` 필수**(아니면 GC 타이머가 계속 돌아 메모리 누수).

생성자 옵션:
- `expireTime: number` — 마지막 접근 후 이 ms 가 지나면 만료(필수).
- `gcInterval?: number` — GC 주기(ms). 생략 시 `expireTime/10`(최소 1000).
- `onExpire?: (key, value) => void | Promise<void>` — 만료 시 콜백(비동기 가능). 콜백 throw 시 로그 출력 후 계속 진행.

메서드:
- `get(key)` — 조회 + 접근 시간 갱신(LRU). `has(key)` — 존재 확인(시간 갱신 안 함).
- `set(key, value)` — 저장 + 접근 시간 설정, GC 타이머 시작.
- `getOrCreate(key, factory)` — 없으면 `factory()` 로 생성·저장. dispose 후 호출 시 throw.
- `delete(key)` — 삭제(비면 GC 중지). `clear()` — 전체 삭제(인스턴스 재사용 가능). `dispose()` — 정리 후 사용 불가.
- `size` — 항목 수. `values()/keys()/entries()` — 이터레이터.
- GC 는 중복 실행 방지(이전 GC 가 끝나야 다음). 만료 콜백 중 같은 key 로 `set` 되면 재등록 항목은 삭제하지 않음(항목 참조 동일성으로 판정).

```ts
const cache = new LazyGcMap<string, Session>({ expireTime: 60000 });
try {
  cache.set("u1", session);
  const s = cache.getOrCreate("u2", () => loadSession("u2"));
} finally {
  cache.dispose();
}
```
