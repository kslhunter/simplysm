# @simplysm/core-node — Worker

worker_threads 를 타입 안전 RPC + 이벤트로 감싼다. 워커 파일은 `createWorker` 로 메서드 묶음을 `export default` 하고, 메인은 `Worker.create<typeof import("...")>()` 로 프록시를 만들어 메서드를 직접 호출한다. 인자/반환은 `@simplysm/core-common` 의 `transfer`(structured clone + transferList)로 직렬화된다.

## createWorker (워커 측)

- `createWorker<TMethods, TEvents>(methods: TMethods): { send; __methods; __events }` — 워커 스레드 내에서 메서드 핸들러를 등록. 반환값을 `export default` 한다. `parentPort` 가 없으면(메인에서 직접 실행) `SdError` throw.
  - `methods: Record<string, (...args: any[]) => unknown>` — RPC 로 노출할 메서드. 반환은 동기/Promise 무관(메인에선 항상 Promise). 핸들러 throw 는 메인 호출에서 reject 로 전파.
  - `TEvents extends Record<string, unknown>` — 워커→메인 이벤트 페이로드 타입 맵(선택, 기본은 이벤트 없음).
  - `send<TEventName extends keyof TEvents & string>(event, data?): void` — 워커→메인 이벤트 전송.
  - `__methods` / `__events` — 타입 추론 전용 필드(런타임 의미 없음). 메인의 `Worker.create` 가 시그니처를 끌어올 때 사용.
- 워커의 `process.stdout.write` 는 내부에서 가로채져 메시지 프로토콜로 메인의 stdout 에 전달됨(워커 로그가 메인 콘솔에 보임).

```ts
// worker.ts
interface Events { progress: number }
const methods = {
  calc: (x: number) => { sender.send("progress", 50); return x * 2; },
};
const sender = createWorker<typeof methods, Events>(methods);
export default sender;
```

## Worker.create (메인 측)

- `Worker.create<TModule extends WorkerModule>(filePath: string, opt?): WorkerProxy<TModule>` — 워커를 띄우고 프록시 반환. `.ts` 경로면 `lib/worker-dev-proxy.js`(tsx) 경유 로드, `.js` 면 직접 로드. `file://` URL / 절대 경로 모두 허용.
  - `filePath` — 워커 파일 경로.
  - `opt?: Omit<WorkerRawOptions, "stdout" | "stderr">` — `worker_threads` `WorkerOptions`(단 `stdout`/`stderr` 제외 — 내부에서 항상 캡처해 파이프). `opt.env` 는 `process.env` 위에 머지, `opt.argv` 는 워커 인자.
- `WorkerProxy<TModule>` — 프록시 형태:
  - 각 메서드 — `(...args) => Promise<Awaited<R>>`. 호출하면 RPC. 워커 핸들러 에러는 reject.
  - `on(event, listener)` / `off(event, listener)` — 워커 `send` 이벤트 구독/해제.
  - `terminate(): Promise<void>` — 워커 종료. 대기 중 요청은 reject.

```ts
// main.ts
const worker = Worker.create<typeof import("./worker")>("./worker.ts");
worker.on("progress", (p) => console.log(p));
const r = await worker.calc(21); // 42
await worker.terminate();
```

## 타입

- `WorkerModule` — `{ default: { __methods; __events } }`. `Worker.create` 의 `TModule` 제약. `typeof import("./worker")` 로 충족.
- `PromisifyMethods<TMethods>` — 각 메서드 반환을 `Promise<Awaited<R>>` 로 매핑(워커 호출은 항상 비동기).
- `WorkerProxy<TModule>` — 위 프록시 타입(promise화 메서드 + on/off + terminate).
- `WorkerRequest` — `{ id; method; params }` 내부 요청 메시지.
- `WorkerResponse` — 내부 응답 유니온: `return`(반환값) / `error`(Error) / `event`(send 이벤트) / `log`(stdout 전달).

## 주의사항

- 비정상 종료(exit code≠0)·워커 error 시 대기 중 모든 요청이 reject 되고 error 로깅됨 — silent 무시 아님.
- 워커 메서드는 항상 Promise 반환 — 동기 시그니처여도 메인에선 `await` 필요.
- 인자/반환은 transfer 직렬화 가능한 값이어야 함(함수·일부 클래스 인스턴스 제약).
