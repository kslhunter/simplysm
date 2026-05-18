## @simplysm/core-node — Worker

`worker_threads` 위의 타입 안전 RPC. 워커 측에서 `createWorker(methods)` 로 default export 하면, 메인 측에서 `Worker.create<typeof import("./worker")>(path)` 로 메서드 직접 호출 + 이벤트 수신 가능한 Proxy 를 얻는다. 메시지 인코딩은 `@simplysm/core-common` 의 `transfer.encode/decode` 사용 (Uint8Array 등 transferable 자동 처리).

### 타입

```ts
interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}

type PromisifyMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};

type WorkerProxy<TModule extends WorkerModule> =
  PromisifyMethods<TModule["default"]["__methods"]> & {
    on<E extends keyof TModule["default"]["__events"] & string>(
      event: E, listener: (data: TModule["default"]["__events"][E]) => void,
    ): void;
    off<E extends keyof TModule["default"]["__events"] & string>(event: E, listener): void;
    terminate(): Promise<void>;
  };
```

메서드는 항상 `Promise<Awaited<R>>` 로 노출. `on`/`off`/`terminate` 는 예약어 — 워커 메서드명으로 사용 금지.

### Worker.create (메인 측)

```ts
Worker.create<TModule extends WorkerModule>(
  filePath: string,
  opt?: Omit<WorkerOptions, "stdout" | "stderr">,
): WorkerProxy<TModule>;
```

- `filePath`: `file://` URL 또는 절대 경로.
- 실행 모드는 `import.meta.filename` 확장자로 결정:
  - `.ts` (개발/tsx) → 내부 `lib/worker-dev-proxy.js` 를 띄우고 워커 파일을 argv 로 전달, tsx 로 동적 로드.
  - `.js` (프로덕션) → 워커 파일을 그대로 `new Worker(workerPath, ...)`.
- 항상 `stdout: true, stderr: true` 로 워커 띄우고 메인의 stdout/stderr 로 pipe. 워커 내부의 `process.stdout.write` 도 메시지 프로토콜(`type: "log"`)로 메인에 전달되어 그대로 stdout 에 출력 — 워커의 `console.log` 가 메인 터미널에 보임.
- `opt.env` 는 `process.env` 와 머지되어 워커에 전달.
- 워커 비정상 종료(`exit code !== 0`) 또는 `error` 발생 시 대기 중 모든 호출이 reject. `terminate()` 호출 시에도 in-flight 요청은 모두 reject.

### createWorker (워커 측)

```ts
function createWorker<
  TMethods extends Record<string, (...args: any[]) => unknown>,
  TEvents extends Record<string, unknown> = Record<string, never>,
>(methods: TMethods): {
  send<E extends keyof TEvents & string>(event: E, data?: TEvents[E]): void;
  __methods: TMethods;
  __events: TEvents;
};
```

- 워커 스레드에서만 호출 (`parentPort == null` 이면 `SdError` throw).
- `methods` 의 각 함수는 메인에서 `worker.<name>(...args)` 로 호출되어 결과/throw 가 그대로 전달됨. async 함수도 await 처리됨.
- 알 수 없는 메서드/잘못된 메시지 형식 호출 시 `SdError` 로 응답.
- 반환값 객체에 `send(event, data?)` 가 있어 워커 → 메인 단방향 이벤트 가능. `TEvents` 제네릭으로 이벤트 이름·페이로드 타입 보장. 반환값은 반드시 `export default` 해야 메인의 `typeof import(...)` 추론이 동작.

### WorkerRequest / WorkerResponse

내부 메시지 프로토콜 (사용자가 직접 다룰 일 없음).

```ts
interface WorkerRequest { id: string; method: string; params: unknown[]; }

type WorkerResponse =
  | { request: WorkerRequest; type: "return"; body?: unknown }
  | { request: WorkerRequest; type: "error";  body: Error }
  | { type: "event"; event: string; body?: unknown }
  | { type: "log";   body: string };
```

### 사용 예

```ts
// worker.ts
import { createWorker } from "@simplysm/core-node";

interface Events { progress: number; }

const methods = {
  async heavy(x: number) {
    sender.send("progress", 50);
    return x * 2;
  },
};

const sender = createWorker<typeof methods, Events>(methods);
export default sender;
```

```ts
// main.ts
import { Worker } from "@simplysm/core-node";

const worker = Worker.create<typeof import("./worker")>(
  new URL("./worker.ts", import.meta.url).href,
);
worker.on("progress", (p) => consola.info(`${p}%`));
const result = await worker.heavy(21);   // 42
await worker.terminate();
```
