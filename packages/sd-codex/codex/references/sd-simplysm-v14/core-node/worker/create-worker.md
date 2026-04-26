# `createWorker`

> **읽어야 하는 상황**: 워커 파일에서 메인 스레드에 노출할 메서드를 정의하고, 메인 스레드로 이벤트를 보내야 할 때. 메인 스레드에서 워커를 호출하려면 [`Worker.create()`](./worker.md) 참조.

Worker thread 파일에서 메서드와 이벤트 전송 함수를 등록하는 팩토리 함수. 메인 스레드의 [`Worker.create()`](./worker.md)와 쌍으로 사용한다.

## When to use

- ✅ 워커 파일에서 메인 스레드에 노출할 메서드를 정의할 때
- ✅ 워커에서 메인 스레드로 타입 안전한 이벤트를 보낼 때
- ❌ 메인 스레드에서 워커 호출 → [`Worker.create()`](./worker.md) 사용

```typescript
export function createWorker<
  TMethods extends Record<string, (...args: any[]) => unknown>,
  TEvents extends Record<string, unknown> = Record<string, never>,
>(
  methods: TMethods,
): {
  send<TEventName extends keyof TEvents & string>(event: TEventName, data?: TEvents[TEventName]): void;
  __methods: TMethods;
  __events: TEvents;
}
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `methods` | `TMethods` | 워커가 노출할 메서드 객체. 동기/비동기 모두 지원 |

## Type Parameters

| Param | Constraint | Description |
|-------|-----------|-------------|
| `TMethods` | `Record<string, (...args: any[]) => unknown>` | 메서드 정의 타입 |
| `TEvents` | `Record<string, unknown>` | 이벤트 데이터 타입. 기본값: `Record<string, never>` |

## Returns

반환 객체:

| Field | Type | Description |
|-------|------|-------------|
| `send` | `<TEventName>(event, data?) => void` | 메인 스레드로 이벤트 전송 |
| `__methods` | `TMethods` | 등록된 메서드 (타입 추론용) |
| `__events` | `TEvents` | 이벤트 타입 정보 (타입 추론용) |

## stdout 처리

`createWorker()` 호출 시 `process.stdout.write`를 가로채서 워커의 로그 출력을 메인 스레드 stdout으로 전달한다.

## 실행 조건

`parentPort`가 `null`이면 (= 메인 스레드에서 실행) `SdError`를 throw한다. 반드시 worker thread에서 호출해야 한다.

## Usage

```typescript
// worker.ts (워커 파일)
import { createWorker } from "@simplysm/core-node";

// 이벤트가 없는 워커
export default createWorker({
  add: (a: number, b: number) => a + b,
  greet: (name: string) => `Hello, ${name}!`,
});

// 이벤트가 있는 워커
interface MyEvents {
  progress: number;
  done: { result: number };
}

const methods = {
  calc: async (x: number) => {
    sender.send("progress", 50);
    await new Promise((r) => setTimeout(r, 100));
    sender.send("progress", 100);
    sender.send("done", { result: x * 2 });
    return x * 2;
  },
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;
```
