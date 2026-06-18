# @simplysm/core-node — worker

`worker_threads` 를 타입 안전하게 쓰기 위한 래퍼 (`packages/core-node/src/worker/*`). 워커 파일에서 `createWorker(methods)` 로 메서드 묶음을 만들어 `export default` 하고, 메인에서 `Worker.create<typeof import("./worker")>(path)` 로 프록시를 만들어 `await worker.method(...)` 처럼 호출한다. 메시지 직렬화는 `@simplysm/core-common` 의 `transfer`(Date 등 특수타입·transferList 지원)를 사용. 개발(`.ts`)·프로덕션(`.js`) 양쪽을 자동 분기한다.

## createWorker (워커 스레드 측)

- `createWorker<TMethods, TEvents>(methods): { send; __methods; __events }` — 워커 스레드 진입 파일에서 호출하고 그 반환을 `export default`. `parentPort` 가 없으면(워커 컨텍스트 아님) `SdError` throw. 메서드 호출 메시지를 수신해 실행 후 결과/에러를 응답하고, 워커의 `process.stdout.write` 를 가로채 메인으로 로그를 전달한다.
  - `methods: TMethods` (`Record<string, (...args: any[]) => unknown>`) — 워커가 제공할 메서드 맵. 동기/비동기 모두 가능(내부에서 await). 알 수 없는 메서드 호출 시 `SdError("알 수 없는 메서드: ...")` 로 응답, 잘못된 요청 형식이면 `SdError("잘못된 워커 요청 형식: ...")` 응답.
  - 제네릭 `TEvents extends Record<string, unknown>`(기본 `Record<string, never>`) — 워커가 보낼 이벤트명→데이터 타입 맵(메인의 `on` 타입 추론에 사용).
  - 반환 `send<K extends keyof TEvents & string>(event, data?): void` — 워커→메인 이벤트 전송. 진행률 등 메서드 반환과 별개의 통지에 사용.
  - 반환 `__methods` / `__events` — 타입 추론용 마커. 런타임 값이 아니라 `Worker.create<typeof import(...)>` 의 타입에서만 참조됨.

```ts
// worker.ts (워커 스레드 진입)
import { createWorker } from "@simplysm/core-node";
interface MyEvents { progress: number; }
const methods = {
  calc: (x: number) => { sender.send("progress", 50); return x * 2; },
};
const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;
```

## Worker.create (메인 측)

- `Worker.create<TModule extends WorkerModule>(filePath, opt?): WorkerProxy<TModule>` — 워커 스레드를 띄우고 메서드 프록시를 반환. 메서드 호출은 메시지로 전달되어 결과가 Promise 로 resolve/reject 된다. 워커 stdout/stderr 는 메인 프로세스로 파이프되며, 워커 비정상 종료(exit code≠0)·error 시 대기 중인 모든 호출이 reject 된다. 로거 태그 `sd-worker`.
  - `filePath: string` — 워커 파일 경로. `file://` URL 또는 절대 경로. 확장자가 `.ts` 면 dev 모드로 `lib/worker-dev-proxy.js`(tsx 로 TS 동적 로드)를 통해 실행, `.js` 면 직접 실행.
  - `opt?: Omit<WorkerRawOptions, "stdout" | "stderr">` — worker_threads 옵션(stdout/stderr 는 내부 고정이라 제외). `env` 는 `process.env` 와 병합되어 전달, `argv` 는 dev 모드에서 워커 경로 뒤에 이어 붙는다.

```ts
// main.ts (메인 측)
import { Worker } from "@simplysm/core-node";
const worker = Worker.create<typeof import("./worker")>("./worker.ts");
worker.on("progress", (p) => console.log(p));
const result = await worker.calc(10); // 20
await worker.terminate();
```

## WorkerProxy

`Worker.create` 반환 프록시. 워커 메서드 + 예약 메서드 3종을 제공.

- 메서드 프록시: `TModule["default"]["__methods"]` 의 각 메서드가 `(...args) => Promise<Awaited<R>>` 로 노출(`PromisifyMethods`). 동기 메서드도 postMessage 기반이라 항상 Promise.
- `on<TEventName>(event, listener): void` — 워커 `send` 이벤트 구독. `event`/`listener` 타입은 `TEvents` 에서 추론.
- `off<TEventName>(event, listener): void` — 이벤트 구독 해제.
- `terminate(): Promise<void>` — 워커 종료. 대기 중 호출은 "워커가 종료되었습니다" 로 reject 후 스레드 종료.

## 타입

- `interface WorkerModule { default: { __methods: Record<string, (...args: any[]) => unknown>; __events: Record<string, unknown> } }` — `Worker.create` 의 제네릭 제약. `typeof import("./worker")` 가 이 구조를 만족(=`createWorker` 반환을 default export)해야 한다.
- `type PromisifyMethods<TMethods>` — 각 메서드 반환을 `Promise<Awaited<R>>` 로 바꾸는 매핑 타입. 함수가 아닌 멤버는 `never`.
- `type WorkerProxy<TModule>` — 위 프록시 타입(Promise화 메서드 + on/off/terminate).
- `interface WorkerRequest { id: string; method: string; params: unknown[] }` — 내부 요청 메시지.
  - `id: string` — 요청 식별자(Uuid). 응답을 대기 중 호출과 매칭하는 키.
  - `method: string` — 호출할 워커 메서드명.
  - `params: unknown[]` — 메서드 인자 배열.
- `type WorkerResponse` — 내부 응답 메시지 union: `return`(결과 body) / `error`(Error body) / `event`(워커 send: event+body) / `log`(stdout 전달 body). 직접 다룰 일은 거의 없음.
