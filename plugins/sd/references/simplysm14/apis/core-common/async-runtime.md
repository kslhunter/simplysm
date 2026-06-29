# @simplysm/core-common — async-runtime

타입 안전 이벤트, 디바운스/직렬 큐, 자동 만료 Map, 대기 유틸 묶음. 비동기 작업 순서·재시도·수명 정리가 필요할 때 함께 본다.

## EventEmitter

```ts
class EventEmitter<TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>> {
  on<TEventName extends keyof TEvents & string>(type: TEventName, listener: (data: TEvents[TEventName]) => void): void;
  off<TEventName extends keyof TEvents & string>(type: TEventName, listener: (data: TEvents[TEventName]) => void): void;
  emit<TEventName extends keyof TEvents & string>(type: TEventName, ...args: TEvents[TEventName] extends void ? [] : [data: TEvents[TEventName]]): void;
  listenerCount<TEventName extends keyof TEvents & string>(type: TEventName): number;
  dispose(): void;
}
```

- `TEvents` — 이벤트 이름을 key, 이벤트 payload 타입을 value 로 갖는 타입 맵이다.
- `type` — 이벤트 이름 문자열이다. 내부 `EventTarget` event type 으로 사용된다.
- `listener` — payload 를 받는 함수다. 같은 이벤트에 같은 함수가 이미 등록되어 있으면 `on` 은 무시한다.
- `emit` data 인자 — 이벤트 payload 타입이 `void` 이면 생략하고, 아니면 payload 1개를 전달한다. 내부적으로 `CustomEvent.detail` 에 넣는다.
- `listenerCount(type)` — 해당 이벤트에 등록된 원본 listener 개수를 반환한다.
- `dispose()` — 모든 이벤트 타입의 wrapped listener 를 제거하고 내부 map 을 비운다.

## DebounceQueue

```ts
class DebounceQueue extends EventEmitter<{ error: SdError }> {
  constructor(delay?: number);
  run(fn: () => void | Promise<void>): void;
  dispose(): void;
}
```

- `delay?: number` — 디바운스 지연 시간(ms)이다. 생략하면 `setTimeout` 에 undefined 가 전달되어 다음 이벤트 루프에 실행된다.
- `run(fn)` — 대기 중인 함수를 새 함수로 교체한다. 실행 중이 아니면 타이머를 잡아 마지막 함수만 실행한다.
- 실행 중 추가 요청 — 현재 실행이 끝난 뒤 디바운스 지연 없이 while 루프에서 즉시 처리된다.
- `fn` 오류 — Error 가 아니면 `String(err)` 로 Error 를 만든 뒤 `SdError(error, "작업 실행 중 오류 발생")` 로 감싼다.
- `error` 이벤트 — listener 가 있으면 `SdError` 를 emit 하고, 없으면 내부 logger 로 error 로그를 출력한다.
- `dispose()` — disposed flag 를 켜고 타이머·대기 함수를 비운 뒤 EventEmitter listener 를 제거한다. dispose 뒤 `run` 은 무시된다.

## SerialQueue

```ts
class SerialQueue extends EventEmitter<{ error: SdError }> {
  constructor(gap?: number);
  run(fn: () => void | Promise<void>): void;
  dispose(): void;
}
```

- `gap?: number` — 작업 사이 대기 시간(ms)이다. 기본값은 0 이다.
- `run(fn)` — 내부 FIFO 배열에 함수를 추가하고 처리 루프를 시작한다.
- 실행 순서 — 이미 처리 중이면 새 처리 루프를 만들지 않고 기존 루프가 순서대로 shift 하며 실행한다.
- `fn` 오류 — `SdError(error, "큐 작업 실행 중 오류 발생")` 로 감싸고 후속 작업은 계속 실행한다.
- `error` 이벤트 — listener 가 있으면 emit, 없으면 내부 logger 로 error 로그를 출력한다.
- `gap` 동작 — `gap > 0` 이고 대기 중인 작업이 남아 있으면 다음 작업 전 `wait.time(gap)` 으로 쉰다.
- `dispose()` — 대기 큐를 비우고 EventEmitter listener 를 제거한다. 현재 실행 중인 함수는 중단하지 않는다.

## LazyGcMap

```ts
class LazyGcMap<TKey, TValue> {
  constructor(options: { gcInterval?: number; expireTime: number; onExpire?: (key: TKey, value: TValue) => void | Promise<void> });
  get size(): number;
  has(key: TKey): boolean;
  get(key: TKey): TValue | undefined;
  set(key: TKey, value: TValue): void;
  delete(key: TKey): boolean;
  clear(): void;
  dispose(): void;
  getOrCreate(key: TKey, factory: () => TValue): TValue;
  values(): IterableIterator<TValue>;
  keys(): IterableIterator<TKey>;
  entries(): IterableIterator<[TKey, TValue]>;
}
```

- `expireTime: number` — 마지막 접근 이후 만료까지의 시간(ms)이다.
- `gcInterval?: number` — GC 실행 주기(ms)다. 생략하면 `Math.max(expireTime / 10, 1000)` 이다.
- `onExpire?: (key, value) => void | Promise<void>` — 만료 항목 삭제 전에 호출된다. throw 하면 내부 logger 에 기록하고 계속 진행한다.
- `size` — 현재 내부 Map 크기다.
- `has(key)` — key 존재 여부만 확인한다. 접근 시간은 갱신하지 않는다. dispose 뒤에는 false.
- `get(key)` — 값이 있으면 `lastAccess = Date.now()` 로 갱신하고 값을 반환한다. 없거나 dispose 뒤에는 undefined.
- `set(key, value)` — 값을 저장하고 접근 시간을 현재 시각으로 설정한 뒤 GC 타이머를 시작한다. dispose 뒤에는 무시된다.
- `delete(key)` — 항목을 삭제한다. 비어 있으면 GC 타이머를 멈춘다. dispose 뒤에는 false.
- `clear()` — 모든 항목을 삭제하고 GC 타이머를 멈춘다. dispose 뒤에는 무시된다.
- `dispose()` — destroyed flag 를 켜고 내부 Map 을 비운 뒤 GC 타이머를 멈춘다. 여러 번 호출해도 무시된다.
- `getOrCreate(key, factory)` — 값이 없으면 `factory()` 결과를 set 하고 반환한다. 값이 있으면 접근 시간을 갱신한다. dispose 뒤에는 Error 를 throw 한다.
- `values()` / `keys()` / `entries()` — dispose 되지 않은 경우 내부 Map 순서대로 순회한다. values/entries 는 저장된 value 만 노출한다.
- 만료 처리 — GC 실행 중이면 중복 실행을 건너뛰고, `onExpire` 중 같은 key 가 새로 set 되면 예전 항목만 삭제하지 않는다.

## wait

`import { wait } from "@simplysm/core-common"` 네임스페이스.

```ts
wait.until(forwarder: () => boolean | Promise<boolean>, milliseconds?: number, maxCount?: number): Promise<void>
wait.time(millisecond: number): Promise<void>
wait.immediate(): Promise<void>
```

- `until(forwarder, milliseconds?, maxCount?)` — `forwarder` 가 true 를 반환할 때까지 반복한다. 첫 검사에서 true 면 즉시 반환한다.
- `forwarder` — 동기 boolean 또는 Promise<boolean> 조건 함수다.
- `milliseconds?: number` — false 후 다음 검사까지 대기 시간(ms)이다. 기본값은 100.
- `maxCount?: number` — false 허용 최대 횟수다. count 가 maxCount 이상이면 `TimeoutError(count)` 를 throw 한다. undefined 면 제한이 없다.
- `time(millisecond)` — `setTimeout(resolve, millisecond)` 로 지정 ms 만큼 대기한다.
- `immediate()` — `globalThis.setImmediate` 가 있으면 그것으로 한 번 양보하고, 없으면 `setTimeout(0)` 으로 폴백한다.
