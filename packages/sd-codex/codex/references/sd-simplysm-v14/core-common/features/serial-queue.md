# `SerialQueue`

> **읽어야 하는 상황**: 비동기 작업의 순차 실행을 보장해야 할 때 (하나 완료 후 다음 시작). 디바운스가 필요하면 [`DebounceQueue`](./debounce-queue.md) 참조.

비동기 직렬 큐. 큐에 추가된 함수들은 순차적으로 실행된다. 하나의 작업이 완료된 후에야 다음 작업이 시작된다. 에러가 발생해도 후속 작업은 계속 실행된다. [`EventEmitter`](./event-emitter.md)를 상속한다.

```typescript
export class SerialQueue extends EventEmitter<{ error: SdError }> {
  /**
   * @param _gap 각 작업 사이의 간격 (ms). 기본값: 0
   */
  constructor(_gap?: number);

  run(fn: () => void | Promise<void>): void;
  override dispose(): void;
}
```

에러 발생 시 `"error"` 이벤트로 전파되며, 리스너가 없으면 `consola`로 로그 출력된다.

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `run` | method | `(fn: () => void \| Promise<void>) => void` | 큐에 함수 추가하고 실행 예약 |
| `dispose` | method | `() => void` | 대기 중인 큐 비우기 (현재 실행 중인 작업은 완료됨) |

## Usage

```typescript
import { SerialQueue } from "@simplysm/core-common";

const queue = new SerialQueue();

// 에러 처리
queue.on("error", (err) => console.error(err));

queue.run(async () => { await fetch("/api/1"); });
queue.run(async () => { await fetch("/api/2"); }); // 1 완료 후 실행
queue.run(async () => { await fetch("/api/3"); }); // 2 완료 후 실행

// 간격 있는 큐
const gapQueue = new SerialQueue(100); // 각 작업 사이 100ms 간격
gapQueue.run(() => step1());
gapQueue.run(() => step2()); // step1 완료 후 100ms 뒤에 실행
```
