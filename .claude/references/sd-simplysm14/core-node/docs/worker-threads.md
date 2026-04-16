# Worker Threads

## `Worker`

Worker thread 프록시를 생성하는 팩토리 객체.

```typescript
export const Worker: {
  create<TModule extends WorkerModule>(
    workerPath: string,
    options?: Omit<WorkerRawOptions, "stdout" | "stderr">,
  ): WorkerProxy<TModule>
}
```

### Static Method

#### `create`

워커 파일을 로드하고 타입 안전한 프록시를 생성한다.

```typescript
static create<TModule extends WorkerModule>(
  workerPath: string,
  options?: Omit<WorkerRawOptions, "stdout" | "stderr">,
): WorkerProxy<TModule>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `workerPath` | string | 워커 파일 경로 (.ts 또는 .js). 개발 환경에서는 .ts를 권장하며, 내부적으로 tsx를 통해 실행된다. |
| `options` | WorkerRawOptions (optional) | Worker thread 옵션. stdout/stderr는 자동으로 메인 프로세스로 파이프된다. |

**Return**: WorkerProxy<TModule> - 타입 안전한 워커 프록시

**Development vs Production**:
- **.ts 파일**: `lib/worker-dev-proxy.js`를 통해 tsx로 실행됨
- **.js 파일**: 직접 Worker로 로드됨

**Example**:
```typescript
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";

const worker = Worker.create<typeof MyWorker>("./worker.ts");

// 메서드 호출 (타입 안전)
const result = await worker.add(10, 20);

// 이벤트 수신 (타입 안전)
worker.on("progress", (value) => {
  console.log(`Progress: ${value}%`);
});

await worker.terminate();
```

---

## `createWorker`

워커 측에서 호출하여 메서드와 이벤트를 등록하는 팩토리 함수.

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
| `methods` | Record<string, function> | 워커가 제공할 메서드 객체 |

**Type Parameters**:
- `TMethods`: 메서드 타입
- `TEvents`: 이벤트 타입 (기본값: 빈 객체)

**Return**: sender 객체. `send()` 메서드로 이벤트를 발송하고, export default로 내보낸다.

**Example**:
```typescript
// worker.ts
import { createWorker } from "@simplysm/core-node";

interface MyEvents {
  progress: number;
}

const methods = {
  add: (a: number, b: number) => a + b,
  multiply: (a: number, b: number) => a * b,
};

const sender = createWorker<typeof methods, MyEvents>(methods);

export default sender;
```

---

## `WorkerProxy`

Worker.create()가 반환하는 프록시 타입.

Promise화된 메서드 + 이벤트 리스너 + 종료 메서드를 제공한다.

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
}
```

### Methods

| Name | Signature | Description |
|------|-----------|-------------|
| `[메서드명]` | `(...args): Promise<R>` | 워커의 메서드. 비동기로 Promise를 반환한다. |
| `on` | `<E extends EventName>(event, listener): void` | 워커 이벤트 리스너를 등록한다. |
| `off` | `<E extends EventName>(event, listener): void` | 워커 이벤트 리스너를 해제한다. |
| `terminate` | `(): Promise<void>` | 워커를 종료한다. |

**Example**:
```typescript
const worker = Worker.create<typeof MyWorker>("./worker.ts");

// 메서드 호출
const sum = await worker.add(10, 20); // 30
const product = await worker.multiply(5, 6); // 30

// 이벤트 리스너 등록
worker.on("progress", (value) => {
  console.log(`Progress: ${value}%`);
});

// 이벤트 리스너 제거
worker.off("progress", handler);

// 워커 종료
await worker.terminate();
```

---

## `PromisifyMethods`

메서드의 반환값을 Promise로 감싸는 매핑 타입.

```typescript
export type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
}
```

**Note**: 워커 메서드는 postMessage 기반으로 동작하여 항상 비동기이므로, 동기 메서드 타입도 `Promise<Awaited<R>>`로 변환된다.

**Example**:
```typescript
// 원본
interface Methods {
  add: (a: number, b: number) => number;
  process: (data: string) => Promise<Result>;
}

// PromisifyMethods 적용 후
type ProxiedMethods = {
  add: (a: number, b: number) => Promise<number>;
  process: (data: string) => Promise<Result>;
}
```

---

## `WorkerModule`

createWorker()가 반환하는 워커 모듈의 타입 구조.

```typescript
export interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}
```

**Usage**:
```typescript
import type * as MyWorker from "./worker";

const worker = Worker.create<typeof MyWorker>("./worker.ts");
```

---

## `WorkerRequest`

메인 프로세스에서 워커로 보내는 요청 메시지.

```typescript
export interface WorkerRequest {
  id: string;
  method: string;
  params: unknown[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | 요청의 고유 ID (응답과 매칭하는 데 사용) |
| `method` | string | 호출할 메서드명 |
| `params` | unknown[] | 메서드 인자 배열 |

---

## `WorkerResponse`

워커에서 메인 프로세스로 보내는 응답 메시지.

Discriminated union 타입으로, 다음 중 하나의 형태를 가진다:

```typescript
export type WorkerResponse =
  | {
      request: WorkerRequest;
      type: "return";
      body?: unknown;
    }
  | {
      request: WorkerRequest;
      type: "error";
      body: Error;
    }
  | {
      type: "event";
      event: string;
      body?: unknown;
    }
  | {
      type: "log";
      body: string;
    }
```

| Variant | Description |
|---------|-------------|
| `return` | 메서드 실행 성공 결과 |
| `error` | 메서드 실행 중 에러 발생 |
| `event` | 워커에서 발송한 이벤트 (request 없음, event 이름과 body 포함) |
| `log` | 워커의 stdout.write 출력 (string body) |

---

## Complete Example

### worker.ts (워커 파일)

```typescript
import { createWorker } from "@simplysm/core-node";

interface MyEvents {
  progress: number;
  done: { result: number };
}

const methods = {
  compute: async (n: number) => {
    const sender = createWorker<typeof methods, MyEvents>(methods);
    
    let result = 0;
    for (let i = 0; i <= n; i++) {
      result += i;
      // 진행률 보고
      sender.send("progress", (i / n) * 100);
    }
    
    sender.send("done", { result });
    return result;
  },
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;
```

### main.ts (메인 파일)

```typescript
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";

async function main() {
  const worker = Worker.create<typeof MyWorker>("./worker.ts");

  // 진행률 수신
  worker.on("progress", (value) => {
    console.log(`Progress: ${value.toFixed(1)}%`);
  });

  // 완료 신호 수신
  worker.on("done", ({ result }) => {
    console.log(`Done! Result: ${result}`);
  });

  // 메서드 호출
  const result = await worker.compute(100);
  console.log(`Final result: ${result}`);

  // 워커 종료
  await worker.terminate();
}

main().catch(console.error);
```
