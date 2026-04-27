# `EventEmitter`

> **읽어야 하는 상황**: 타입 안전한 이벤트 기반 통신이 필요할 때. `events`/`eventemitter3` 대신 사용. 디바운스가 필요하면 [`DebounceQueue`](./debounce-queue.md), 순차 실행이 필요하면 [`SerialQueue`](./serial-queue.md) 참조.

타입 안전 EventEmitter. 내부적으로 `EventTarget`을 사용하며 브라우저와 Node.js 모두에서 사용 가능하다. `events`/`eventemitter3` 대신 이 클래스를 사용한다.

```typescript
export class EventEmitter<
  TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>,
> {
  on<TEventName extends keyof TEvents & string>(type: TEventName, listener: (data: TEvents[TEventName]) => void): void;
  off<TEventName extends keyof TEvents & string>(type: TEventName, listener: (data: TEvents[TEventName]) => void): void;
  emit<TEventName extends keyof TEvents & string>(type: TEventName, ...args: TEvents[TEventName] extends void ? [] : [data: TEvents[TEventName]]): void;
  listenerCount<TEventName extends keyof TEvents & string>(type: TEventName): number;
  dispose(): void;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `on` | method | `(type, listener) => void` | 이벤트 리스너 등록. 같은 리스너를 같은 이벤트에 중복 등록하면 무시됨 |
| `off` | method | `(type, listener) => void` | 이벤트 리스너 제거 |
| `emit` | method | `(type, ...args) => void` | 이벤트 발행. `void` 타입 이벤트는 인자 없이 호출 |
| `listenerCount` | method | `(type) => number` | 특정 이벤트의 등록된 리스너 수 반환 |
| `dispose` | method | `() => void` | 모든 이벤트 리스너 제거 |

## Usage

```typescript
import { EventEmitter } from "@simplysm/core-common";

// 이벤트 타입 정의
interface MyEvents {
  data: string;
  error: Error;
  done: void;
}

// EventEmitter를 상속하여 사용
class MyService extends EventEmitter<MyEvents> {
  async load() {
    this.emit("data", "Loading...");
    this.emit("done"); // void 타입은 인자 없이 호출
  }
}

const svc = new MyService();
svc.on("data", (data) => { /* data: string */ });
svc.on("done", () => { /* ... */ });
await svc.load();
svc.dispose(); // 모든 리스너 정리
```
