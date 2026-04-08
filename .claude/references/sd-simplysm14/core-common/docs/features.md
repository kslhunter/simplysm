# Features

## `EventEmitter<TEvents>`

EventTarget 기반의 타입 안전한 이벤트 이미터. 브라우저와 Node.js 모두에서 사용 가능하다.

```typescript
export class EventEmitter<
  TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>,
> {
  on<TEventName extends keyof TEvents & string>(
    type: TEventName,
    listener: (data: TEvents[TEventName]) => void,
  ): void;

  off<TEventName extends keyof TEvents & string>(
    type: TEventName,
    listener: (data: TEvents[TEventName]) => void,
  ): void;

  emit<TEventName extends keyof TEvents & string>(
    type: TEventName,
    ...args: TEvents[TEventName] extends void ? [] : [data: TEvents[TEventName]]
  ): void;

  listenerCount<TEventName extends keyof TEvents & string>(type: TEventName): number;

  dispose(): void;
  [Symbol.dispose](): void;
}
```

### 메서드

| Method | Description |
|--------|-------------|
| `on(type, listener)` | 이벤트 리스너 등록. 같은 리스너를 같은 이벤트에 중복 등록하면 무시됨 |
| `off(type, listener)` | 이벤트 리스너 제거 |
| `emit(type, data?)` | 이벤트 발행. `void` 타입 이벤트는 인자 없이 호출 |
| `listenerCount(type)` | 특정 이벤트의 등록된 리스너 수 반환 |
| `dispose()` | 모든 이벤트 리스너 제거 |
| `[Symbol.dispose]()` | `using` 문 지원 |

```typescript
interface MyEvents {
  data: string;
  error: Error;
  done: void;
}

class MyService extends EventEmitter<MyEvents> {}

const svc = new MyService();
svc.on("data", (data) => console.log(data)); // data: string
svc.emit("data", "hello");
svc.emit("done"); // void 타입은 인자 없이 호출
svc.dispose(); // 모든 리스너 정리
```

---

## `DebounceQueue`

짧은 시간 내에 여러 번 호출되면 마지막 요청만 실행하는 비동기 디바운스 큐.

`EventEmitter<{ error: SdError }>`를 상속한다. 에러 리스너가 없으면 `consola`로 로그 출력한다.

```typescript
export class DebounceQueue extends EventEmitter<{ error: SdError }> {
  constructor(delay?: number);

  run(fn: () => void | Promise<void>): void;

  override dispose(): void;
  override [Symbol.dispose](): void;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `delay` | `number \| undefined` | 디바운스 지연 시간 (ms). 생략 시 즉시 실행 (다음 이벤트 루프) |

실행 중에 추가된 요청은 디바운스 지연 없이 현재 실행 완료 직후 즉시 처리된다.

```typescript
const dq = new DebounceQueue(300);
dq.on("error", (err) => console.error(err));
dq.run(() => console.log("1")); // 무시됨
dq.run(() => console.log("2")); // 무시됨
dq.run(() => console.log("3")); // 300ms 후 실행

using dq2 = new DebounceQueue(100); // using 문으로 자원 정리
```

---

## `SerialQueue`

큐에 추가된 함수들을 순차적으로 실행하는 비동기 직렬 큐. 하나의 작업이 완료된 후에야 다음 작업이 시작된다. 에러가 발생해도 후속 작업은 계속 실행된다.

`EventEmitter<{ error: SdError }>`를 상속한다. 에러 리스너가 없으면 `consola`로 로그 출력한다.

```typescript
export class SerialQueue extends EventEmitter<{ error: SdError }> {
  constructor(gap?: number);

  run(fn: () => void | Promise<void>): void;

  override dispose(): void;
  override [Symbol.dispose](): void;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `gap` | `number` | 각 작업 사이의 간격 (ms). 기본값: 0 |

`dispose()`는 대기 중인 큐를 비운다 (현재 실행 중인 작업은 완료됨).

```typescript
const sq = new SerialQueue();
sq.on("error", (err) => console.error(err));
sq.run(async () => await fetch("/api/1"));
sq.run(async () => await fetch("/api/2")); // 1 완료 후 실행
sq.run(async () => await fetch("/api/3")); // 2 완료 후 실행

using sq2 = new SerialQueue(100); // 100ms 간격으로 실행
```
