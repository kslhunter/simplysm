# `DebounceQueue`

> **읽어야 하는 상황**: 짧은 시간 내 다수 호출을 마지막 하나로 축약해야 할 때 (입력 필드 자동완성, 연속 상태 변경 일괄 처리 등). 순차 실행이 필요하면 [`SerialQueue`](./serial-queue.md) 참조.

비동기 디바운스 큐. 짧은 시간 내에 여러 번 호출되면 마지막 요청만 실행하고 이전 요청은 무시한다. 입력 필드 자동완성, 연속적인 상태 변경 일괄 처리 등에 유용하다. [`EventEmitter`](./event-emitter.md)를 상속한다.

```typescript
export class DebounceQueue extends EventEmitter<{ error: SdError }> {
  /**
   * @param _delay 디바운스 지연 시간 (밀리초). 생략 시 즉시 실행 (다음 이벤트 루프)
   */
  constructor(_delay?: number);

  run(fn: () => void | Promise<void>): void;
  override dispose(): void;
}
```

에러 발생 시 `"error"` 이벤트로 전파되며, 리스너가 없으면 `consola`로 로그 출력된다.

실행 중에 추가된 요청은 디바운스 지연 없이 현재 실행이 완료된 직후 즉시 처리된다. 이는 실행 완료 전에 도착한 요청을 놓치지 않기 위한 의도적인 설계다.

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `run` | method | `(fn: () => void \| Promise<void>) => void` | 큐에 함수 추가. 이전에 추가된 함수가 있으면 교체됨 |
| `dispose` | method | `() => void` | 대기 중인 작업과 타이머 정리 후 부모 `dispose()` 호출 |

## Usage

```typescript
import { DebounceQueue } from "@simplysm/core-common";

const queue = new DebounceQueue(300); // 300ms 지연

// 에러 처리
queue.on("error", (err) => console.error(err));

queue.run(() => console.log("1")); // 무시됨
queue.run(() => console.log("2")); // 무시됨
queue.run(() => console.log("3")); // 300ms 후 실행

// 자원 정리
try {
  queue.run(() => saveData());
} finally {
  queue.dispose();
}
```
