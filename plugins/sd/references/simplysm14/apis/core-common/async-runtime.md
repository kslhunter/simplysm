# @simplysm/core-common — async-runtime

타입 안전 이벤트, 디바운스/직렬 큐, 자동 만료 Map, 비동기 대기 유틸 묶음. 비동기 작업 순서·재시도·수명 정리가 필요할 때 함께 본다. `DebounceQueue`/`SerialQueue` 는 `EventEmitter` 를 상속한다.

## EventEmitter

```ts
class EventEmitter<TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>> {
  on<K extends keyof TEvents & string>(type: K, listener: (data: TEvents[K]) => void): void;
  off<K extends keyof TEvents & string>(type: K, listener: (data: TEvents[K]) => void): void;
  emit<K extends keyof TEvents & string>(
    type: K,
    ...args: TEvents[K] extends void ? [] : [data: TEvents[K]]
  ): void;
  listenerCount<K extends keyof TEvents & string>(type: K): number;
  dispose(): void;
}
```

브라우저·Node 공용 타입 안전 이미터(내부적으로 `EventTarget` 사용).

- `TEvents` — 이벤트 이름을 key, payload 타입을 value 로 갖는 타입 맵.
- `on(type, listener)` — 리스너 등록. 같은 이벤트에 같은 함수가 이미 있으면 무시(중복 등록 방지).
- `off(type, listener)` — 리스너 제거. 해당 이벤트의 리스너가 모두 빠지면 내부 맵 정리.
- `emit(type, data?)` — payload 타입이 `void` 면 data 생략, 아니면 payload 1개 전달(내부 `CustomEvent.detail`).
- `listenerCount(type): number` — 해당 이벤트에 등록된 원본 리스너 수.
- `dispose()` — 모든 이벤트의 wrapped 리스너를 제거하고 내부 맵을 비운다.

## DebounceQueue

```ts
class DebounceQueue extends EventEmitter<{ error: SdError }> {
  constructor(delay?: number);
  run(fn: () => void | Promise<void>): void;
  override dispose(): void;
}
```

짧은 시간 내 여러 호출 중 마지막만 실행(입력 자동완성, 연속 상태 변경 일괄 처리 등).

- `constructor(delay?)` — 디바운스 지연(ms). 생략 시 `setTimeout` 에 undefined 가 전달되어 다음 이벤트 루프에 실행.
- `run(fn)` — 대기 중 함수를 새 함수로 교체한다. 실행 중이 아니면 타이머를 잡아 마지막 함수만 실행. dispose 뒤에는 무시.
- 실행 중 추가 요청 — 현재 실행이 끝난 직후 디바운스 지연 없이 즉시 처리(요청 누락 방지 설계).
- `fn` 오류 — Error 가 아니면 `String(err)` 로 Error 화한 뒤 `SdError(error, "작업 실행 중 오류 발생")` 로 감싼다. `error` 리스너가 있으면 emit, 없으면 내부 logger 로 출력.
- `dispose()` — disposed flag 를 켜고 타이머·대기 함수를 비운 뒤 부모 `dispose()` 로 리스너 제거.

## SerialQueue

```ts
class SerialQueue extends EventEmitter<{ error: SdError }> {
  constructor(gap?: number);
  run(fn: () => void | Promise<void>): void;
  override dispose(): void;
}
```

큐에 추가된 함수를 순차 실행(이전 작업 완료 후 다음 시작). 에러가 나도 후속 작업은 계속.

- `constructor(gap = 0)` — 각 작업 사이 간격(ms). 기본 0.
- `run(fn)` — 내부 FIFO 배열에 추가하고 처리 루프를 시작한다. 이미 처리 중이면 새 루프를 만들지 않고 기존 루프가 순서대로 실행.
- `fn` 오류 — `SdError(error, "큐 작업 실행 중 오류 발생")` 로 감싸고 후속 작업은 계속 실행. `error` 리스너가 있으면 emit, 없으면 내부 logger 로 출력.
- `gap` 동작 — `gap > 0` 이고 대기 작업이 남아 있으면 다음 작업 전 `wait.time(gap)` 으로 쉰다.
- `dispose()` — 대기 큐를 비우고 부모 `dispose()` 로 리스너 제거. **현재 실행 중인 함수는 중단하지 않는다.**

## LazyGcMap

```ts
class LazyGcMap<TKey, TValue> {
  constructor(options: {
    gcInterval?: number;
    expireTime: number;
    onExpire?: (key: TKey, value: TValue) => void | Promise<void>;
  });
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

LRU 방식 자동 만료 Map. 마지막 접근 후 `expireTime` 이 지나면 GC 타이머가 삭제한다. **사용 후 반드시 `dispose()` 호출**(안 하면 GC 타이머가 계속 돌아 메모리 누수).

- `options.expireTime: number` — 마지막 접근 후 만료까지 시간(ms).
- `options.gcInterval?: number` — GC 실행 주기(ms). 생략 시 `Math.max(expireTime / 10, 1000)`.
- `options.onExpire?: (key, value) => void | Promise<void>` — 만료 항목 삭제 **전** 호출. 비동기 가능, throw 하면 내부 logger 기록 후 계속 진행.
- `size` — 현재 내부 Map 크기.
- `has(key)` — 존재 여부만 확인(접근 시간 미갱신). dispose 뒤 false.
- `get(key)` — 값이 있으면 `lastAccess` 를 갱신(LRU)하고 반환. 없거나 dispose 뒤 undefined.
- `set(key, value)` — 저장 후 접근 시간 설정, GC 타이머 시작. dispose 뒤 무시.
- `delete(key)` — 삭제. 비면 GC 타이머 정지. dispose 뒤 false.
- `clear()` — 모든 항목 삭제, GC 타이머 정지. dispose 뒤 무시(인스턴스는 계속 사용 가능).
- `dispose()` — destroyed flag 를 켜고 Map 을 비운 뒤 GC 타이머 정지. 중복 호출 무시.
- `getOrCreate(key, factory)` — 값이 없으면 `factory()` 결과를 set·반환, 있으면 접근 시간 갱신. dispose 뒤 호출하면 Error throw.
- `values()` / `keys()` / `entries()` — dispose 안 된 경우 내부 Map 순서대로 순회(값만 노출).
- 만료 처리 — GC 실행 중이면 중복 실행 건너뜀. `onExpire` 중 같은 key 가 새로 set 되면(참조가 바뀌면) 새 항목은 삭제하지 않는다.

## wait

`import { wait } from "@simplysm/core-common"` 네임스페이스.

```ts
wait.until(forwarder: () => boolean | Promise<boolean>, milliseconds?: number, maxCount?: number): Promise<void>
wait.time(millisecond: number): Promise<void>
wait.immediate(): Promise<void>
```

- `until(forwarder, milliseconds = 100, maxCount?)` — `forwarder` 가 true 를 반환할 때까지 반복한다. 첫 검사에서 true 면 즉시 반환. `milliseconds` 는 false 후 다음 검사까지 대기(ms). `maxCount` 는 false 허용 최대 횟수로, 도달하면 `TimeoutError(count)` throw(undefined 면 무제한).
- `time(millisecond)` — `setTimeout` 으로 지정 ms 만큼 대기한다.
- `immediate()` — `globalThis.setImmediate` 가 있으면 그것으로 이벤트 루프에 한 번 양보, 없으면 `setTimeout(0)` 폴백.
