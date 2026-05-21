## @simplysm/core-node — Worker

타입 안전한 `worker_threads` 래퍼. 메인에서는 `Worker.create()` 로 프록시 호출, 워커에서는 `createWorker()` 로 메서드·이벤트 노출.

### 워커 스크립트 — `createWorker`

```ts
createWorker<TMethods, TEvents = Record<string, never>>(methods: TMethods): {
  send<K extends keyof TEvents & string>(event: K, data?: TEvents[K]): void;
  __methods: TMethods;
  __events: TEvents;
}
```

- `methods`: 워커가 제공할 메서드 맵. 각 값은 동기/비동기 함수. 동기 반환도 메인에서는 Promise 로 받음.
- `TEvents`: 메인으로 발행할 이벤트 시그니처(`{ eventName: payloadType }`).
- 반환 객체의 `send(event, data?)` 로 메인에 이벤트 push. `__methods`/`__events` 는 타입 추론 전용(런타임 미사용).
- `parentPort` 없으면 throw (반드시 worker thread 에서 import).
- `process.stdout.write` 를 가로채 메인의 stdout 으로 전달(worker thread 의 stdout 미전달 한계 우회).
- 메서드 처리 중 throw → `Error` 직렬화되어 메인 호출 Promise reject.

워커 파일은 반드시 `export default createWorker(...)` 형태로 export.

### 메인 — `Worker.create`

```ts
Worker.create<TModule extends WorkerModule>(
  filePath: string,
  opt?: Omit<WorkerOptions, "stdout" | "stderr">,
): WorkerProxy<TModule>
```

- `TModule`: 워커 파일의 `typeof import("./worker")`. 메서드 시그니처·이벤트 타입 추론 소스.
- `filePath`: 워커 파일 경로. `file://` URL 또는 절대 경로 모두 허용.
- `opt`: Node `WorkerOptions` 중 `stdout/stderr` 제외(고정 `true`). `env` 는 `process.env` 와 병합. `argv` 는 dev 모드에서 워커 경로 뒤에 추가.
- 개발(`import.meta.filename` 이 `.ts`) → 내부 `worker-dev-proxy.js` 를 워커로 띄우고 tsx 로 사용자 워커 동적 로드. 프로덕션(`.js`) → 사용자 파일 직접 실행.
- 워커 stdout/stderr 는 메인 프로세스로 파이프.

### 반환 프록시 — `WorkerProxy<TModule>`

- `methods` (스프레드된 키): 각 메서드 → `(...args) => Promise<Awaited<R>>`. 매 호출마다 UUID 부여, `@simplysm/core-common` 의 `transfer.encode` 로 직렬화하여 `postMessage`.
- `on(event, listener)` / `off(event, listener)` — 워커가 `send()` 로 발행한 이벤트 구독/해제.
- `terminate(): Promise<void>` — 대기 중인 모든 요청을 reject 후 워커 종료.

### 비정상 종료

- 워커 `exit` (코드≠0, 사용자 terminate 아님) 또는 `error` 발생 시 대기 중인 모든 호출이 `Error("워커가 비정상 종료되었습니다 (코드: N) (method: X)")` 등으로 reject.

### 예

```ts
// worker.ts
import { createWorker } from "@simplysm/core-node";
interface E { progress: number }
const methods = { calc: (n: number) => n * 2 };
const sender = createWorker<typeof methods, E>(methods);
export default sender;

// main.ts
import { Worker } from "@simplysm/core-node";
const w = Worker.create<typeof import("./worker")>("./worker.ts");
w.on("progress", (p) => console.log(p));
console.log(await w.calc(21)); // 42
await w.terminate();
```
