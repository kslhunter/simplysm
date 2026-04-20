# Worker

타입 안전한 Worker thread 래퍼. 워커 측(`createWorker`)과 메인 측(`Worker.create`) 한 쌍으로 구성된다.

개발 환경(`.ts` 파일)에서는 `lib/worker-dev-proxy.js`를 통해 tsx로 TypeScript 워커를 실행한다. 프로덕션(`.js` 파일)에서는 직접 Worker를 생성한다.

---

## `WorkerModule`

`createWorker()`가 반환하는 워커 모듈의 타입 구조. `Worker.create<typeof import("./worker")>()`에서 타입 추론에 사용된다.

```typescript
export interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `default.__methods` | `Record<string, (...args: any[]) => unknown>` | 워커가 노출하는 메서드 맵 |
| `default.__events` | `Record<string, unknown>` | 워커가 emit할 수 있는 이벤트와 데이터 타입 맵 |

---

## `PromisifyMethods`

메서드 반환값을 Promise로 감싸는 매핑 타입. 워커 메서드는 postMessage 기반으로 동작하여 항상 비동기이므로, 동기 메서드 타입도 `Promise<Awaited<R>>`로 변환된다.

```typescript
export type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

---

## `WorkerProxy`

`Worker.create()`가 반환하는 프록시 타입. Promise화된 메서드 + `on()` + `off()` + `terminate()`를 제공한다.

```typescript
export type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<
  TModule["default"]["__methods"]
> & {
  on<TEventName extends keyof TModule["default"]["__events"] & string>(
    event: TEventName,
    listener: (data: TModule["default"]["__events"][TEventName]) => void,
  ): void;

  off<TEventName extends keyof TModule["default"]["__events"] & string>(
    event: TEventName,
    listener: (data: TModule["default"]["__events"][TEventName]) => void,
  ): void;

  terminate(): Promise<void>;
};
```

| Member | Description |
|--------|-------------|
| 메서드들 | 워커 메서드를 Promise화한 버전. 타입 안전하게 호출 가능 |
| `on(event, listener)` | 워커 이벤트 리스너를 등록한다 |
| `off(event, listener)` | 워커 이벤트 리스너를 해제한다 |
| `terminate()` | 워커를 종료한다 |

---

## `WorkerRequest`

내부 워커 요청 메시지. 메인 스레드 → 워커 방향.

```typescript
export interface WorkerRequest {
  id: string;
  method: string;
  params: unknown[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | 요청 식별자 (UUID) |
| `method` | `string` | 호출할 메서드 이름 |
| `params` | `unknown[]` | 메서드 인수 |

---

## `WorkerResponse`

내부 워커 응답 메시지. 워커 → 메인 스레드 방향. `type` 필드로 분기되는 discriminated union이다.

```typescript
export type WorkerResponse =
  | { request: WorkerRequest; type: "return"; body?: unknown }
  | { request: WorkerRequest; type: "error"; body: Error }
  | { type: "event"; event: string; body?: unknown }
  | { type: "log"; body: string };
```

| Variant (`type`) | Fields | Description |
|------------------|--------|-------------|
| `"return"` | `request`, `body?` | 메서드 정상 반환 |
| `"error"` | `request`, `body: Error` | 메서드 에러 반환 |
| `"event"` | `event: string`, `body?` | 워커 이벤트 발행 |
| `"log"` | `body: string` | 워커 stdout 로그 전달 |

---

## `Worker`

타입 안전한 Worker Proxy 생성 팩토리 객체.

```typescript
export const Worker: {
  create<TModule extends WorkerModule>(
    filePath: string,
    opt?: Omit<WorkerRawOptions, "stdout" | "stderr">,
  ): WorkerProxy<TModule>;
};
```

### `Worker.create`

타입 안전한 Worker Proxy를 생성한다.

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | 워커 파일 경로 (`file://` URL 또는 절대 경로) |
| `opt` | `Omit<WorkerRawOptions, "stdout" \| "stderr">` | 워커 옵션 (`stdout`/`stderr`는 항상 pipe) |

**반환**: `WorkerProxy<TModule>` — 메서드 직접 호출, `on()`, `off()`, `terminate()` 지원

```typescript
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";

const worker = Worker.create<typeof MyWorker>("./worker.ts");

worker.on("progress", (value) => { /* ... */ });
const result = await worker.add(10, 20); // 30
await worker.terminate();
```

---

## `createWorker`

Worker thread에서 사용하기 위한 워커 팩토리. 메서드와 이벤트를 등록하고, 메인 스레드로 이벤트를 전송하는 `send()` 함수를 포함하는 객체를 반환한다.

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

| Parameter | Type | Description |
|-----------|------|-------------|
| `methods` | `TMethods` | 메인 스레드에서 호출할 수 있는 메서드 맵 |

**반환 객체**:

| Member | Description |
|--------|-------------|
| `send(event, data?)` | 메인 스레드로 이벤트를 전송한다 |
| `__methods` | 등록된 메서드 맵 (타입 추론용) |
| `__events` | 이벤트 타입 맵 (타입 추론용) |

**Throws**: `parentPort`가 `null`이면 `SdError`를 던진다 (Worker thread 외부에서 호출 시).

```typescript
// worker.ts — 이벤트 없는 워커
import { createWorker } from "@simplysm/core-node";

export default createWorker({
  add: (a: number, b: number) => a + b,
});

// worker.ts — 이벤트가 있는 워커
import { createWorker } from "@simplysm/core-node";

interface MyEvents { progress: number; }

const methods = {
  calc: (x: number) => {
    sender.send("progress", 50);
    return x * 2;
  },
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;
```
