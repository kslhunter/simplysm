# Worker

타입 안전한 Worker thread 프록시를 생성하는 팩토리 객체. `Worker.create()`로 워커 파일의 메서드를 메인 스레드에서 직접 호출할 수 있다.

```typescript
export const Worker: {
  create<TModule extends WorkerModule>(
    filePath: string,
    opt?: Omit<WorkerRawOptions, "stdout" | "stderr">,
  ): WorkerProxy<TModule>
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `create` | static method | `<TModule extends WorkerModule>(filePath: string, opt?: ...) => WorkerProxy<TModule>` | 타입 안전한 Worker Proxy 생성 |

## `create` Parameters

| Param | Type | Description |
|-------|------|-------------|
| `filePath` | `string` | 워커 파일 경로. `file://` URL 또는 절대 경로 |
| `opt` | `Omit<WorkerRawOptions, "stdout" \| "stderr">` (optional) | Node.js Worker thread 옵션. `stdout`/`stderr`는 내부에서 자동 처리 |

## 환경별 동작

- **개발 환경(`.ts` 파일)**: `lib/worker-dev-proxy.js`를 통해 tsx로 TypeScript 워커 파일을 실행
- **프로덕션(`.js` 파일)**: Worker를 직접 생성

## Related Types

### `WorkerProxy<TModule>`

`Worker.create()`가 반환하는 프록시 타입. 워커 메서드를 Promise 버전으로 제공하고, `on()`/`off()`/`terminate()`를 추가로 지원한다.

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

| Member | Description |
|--------|-------------|
| 워커 메서드들 | 동기 메서드도 항상 `Promise<Awaited<R>>`로 변환됨 |
| `on(event, listener)` | 워커 이벤트 리스너 등록 |
| `off(event, listener)` | 워커 이벤트 리스너 해제 |
| `terminate()` | 워커 종료. 대기 중인 모든 요청을 즉시 거부 |

### `WorkerModule`

```typescript
export interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}
```

`createWorker()`가 반환하는 워커 모듈의 타입 구조. `Worker.create<typeof import("./worker")>()`에서 타입 추론에 사용된다.

### `PromisifyMethods<TMethods>`

```typescript
export type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

메서드 반환값을 `Promise`로 감싸는 매핑 타입. 워커 메서드는 postMessage 기반으로 동작하여 항상 비동기다.

### `WorkerRequest`

```typescript
export interface WorkerRequest {
  id: string;
  method: string;
  params: unknown[];
}
```

내부 워커 요청 메시지. `Worker.create()`와 `createWorker()` 사이의 통신 프로토콜.

### `WorkerResponse`

```typescript
export type WorkerResponse =
  | { request: WorkerRequest; type: "return"; body?: unknown }
  | { request: WorkerRequest; type: "error"; body: Error }
  | { type: "event"; event: string; body?: unknown }
  | { type: "log"; body: string };
```

내부 워커 응답 메시지.

| Variant | `type` | Description |
|---------|--------|-------------|
| 반환 | `"return"` | 메서드 정상 반환값 |
| 오류 | `"error"` | 메서드 실행 오류 |
| 이벤트 | `"event"` | 워커에서 메인 스레드로 보내는 이벤트 |
| 로그 | `"log"` | 워커 stdout 내용 (메인 스레드 stdout으로 전달) |

## Usage

```typescript
// main.ts
import { Worker } from "@simplysm/core-node";
import type * as MyWorkerModule from "./worker";

const worker = Worker.create<typeof MyWorkerModule>("./worker.ts");

// 타입 안전한 메서드 호출
const result = await worker.add(10, 20); // 30

// 이벤트 리스너
worker.on("progress", (value) => {
  // value 타입이 자동 추론됨
});

// 종료
await worker.terminate();
```
