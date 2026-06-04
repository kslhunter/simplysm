# @simplysm/core-common — 비동기 런타임

디바운스/직렬 실행, 타입 안전 이벤트, 조건 대기, 자동 만료 Map 이 필요할 때 함께 읽히는 묶음. 큐 클래스들은 `EventEmitter` 를 상속해 `"error"` 이벤트를 발행함.

## EventEmitter<TEvents>

`EventTarget` 기반 타입 안전 이벤트 이미터(브라우저·Node 공용). 보통 상속해서 사용. `TEvents` 는 `{ 이벤트명: 데이터타입 }` 맵.

- `on(type, listener)`: → void — 리스너 등록. 같은 (type, listener) 중복 등록은 무시.
- `off(type, listener)`: → void — 리스너 제거.
- `emit(type, data)`: → void — 발행. 데이터 타입이 `void` 인 이벤트는 인자 없이 `emit(type)`.
- `listenerCount(type)`: → number — 해당 이벤트 리스너 수.
- `dispose()`: → void — 모든 리스너 제거.

```ts
import { EventEmitter } from "@simplysm/core-common";
interface MyEvents { data: string; done: void; }
class MyEmitter extends EventEmitter<MyEvents> {}
const e = new MyEmitter();
e.on("data", (d) => console.log(d)); // d: string
e.emit("data", "hello");
e.emit("done");
```

## DebounceQueue

짧은 시간 내 여러 호출 중 **마지막 요청만** 실행. 입력 자동완성·연속 상태 변경 일괄 처리에. `EventEmitter<{ error: SdError }>` 상속.

- `new DebounceQueue(delay?)` — delay: number(ms). 생략 시 즉시(다음 이벤트 루프).
- `run(fn)`: → void — `fn: () => void | Promise<void>` 등록. 이전 대기 fn 은 교체됨. delay 후 실행. 실행 중 들어온 요청은 delay 없이 현재 실행 직후 즉시 처리(요청 누락 방지).
- `dispose()`: → void — 대기 작업·타이머 정리(+ 리스너 제거).
- fn 에서 throw 시 `"error"` 리스너가 있으면 SdError 로 emit, 없으면 내부 logger.error.

```ts
import { DebounceQueue } from "@simplysm/core-common";
const q = new DebounceQueue(300);
q.on("error", (err) => console.error(err));
q.run(() => save(value)); // 300ms 안에 다시 run 하면 이전 건 취소
```

## SerialQueue

큐에 넣은 작업을 **순차** 실행(앞 작업 완료 후 다음). 에러가 나도 후속 작업은 계속. `EventEmitter<{ error: SdError }>` 상속.

- `new SerialQueue(gap?)` — gap: number(ms, 기본 0). 각 작업 사이 대기 간격.
- `run(fn)`: → void — `fn: () => void | Promise<void>` 추가 후 처리 시작.
- `dispose()`: → void — 대기 큐 비움(실행 중 작업은 완료됨)(+ 리스너 제거).
- fn throw 시 처리: DebounceQueue 와 동일(`"error"` emit 또는 logger.error).

## wait 네임스페이스

- `wait.until(forwarder, milliseconds?, maxCount?)`: → `Promise<void>` — `forwarder()`(boolean | Promise<boolean>) 가 true 될 때까지 대기. 첫 호출에서 true 면 즉시 반환. milliseconds=확인 간격(기본 100). maxCount=최대 시도 횟수(미지정 무제한). 초과 시 **TimeoutError throw**.
- `wait.time(millisecond)`: → `Promise<void>` — 지정 시간만큼 sleep.

```ts
import { wait } from "@simplysm/core-common";
await wait.until(() => isReady, 100, 50); // 100ms 간격 최대 50회, 초과 시 TimeoutError
await wait.time(500);
```

## LazyGcMap<TKey, TValue>

마지막 접근 이후 일정 시간 지나면 항목을 자동 삭제하는 Map(LRU 접근 시간 갱신). GC 는 항목이 있을 때만 타이머로 동작. 사용 후 **반드시 `dispose()`** — 안 하면 타이머가 남아 메모리 누수.

- `new LazyGcMap({ expireTime, gcInterval?, onExpire? })`
  - expireTime: number(ms) — 마지막 접근 후 이 시간 지나면 만료. (필수)
  - gcInterval?: number(ms) — GC 점검 주기. 기본 `max(expireTime/10, 1000)`.
  - onExpire?: `(key, value) => void | Promise<void>` — 만료 시 콜백(비동기 가능). 콜백 throw 는 logger.error 후 계속 진행. 만료 항목 정리·리소스 해제에.
- `get(key)`: → `V | undefined` — 조회(접근 시간 갱신=만료 연장).
- `has(key)`: → boolean — 존재 확인(접근 시간 갱신 안 함).
- `set(key, value)`: → void — 저장(GC 타이머 시작).
- `getOrCreate(key, factory)`: → V — 없으면 factory()로 생성·저장 후 반환(있으면 접근 시간 갱신). dispose 후 호출 시 throw.
- `delete(key)`: → boolean / `clear()`: → void(인스턴스 재사용 가능) / `dispose()`: → void(타이머 중지+정리, 이후 사용 불가).
- `values()` / `keys()` / `entries()`: → Iterator — 순회.
- `size`: → number — 항목 수.

```ts
import { LazyGcMap } from "@simplysm/core-common";
const cache = new LazyGcMap<string, Conn>({ expireTime: 60000, onExpire: (k, c) => c.close() });
try {
  const conn = cache.getOrCreate(key, () => createConn());
} finally {
  // 앱/모듈 종료 시
  cache.dispose();
}
```
