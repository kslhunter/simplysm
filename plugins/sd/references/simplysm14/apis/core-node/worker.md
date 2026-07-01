# @simplysm/core-node — Worker / createWorker

`worker/*`. worker_threads 를 메서드 호출 프록시·typed event·stdout 전달 프로토콜로 감쌀 때 읽는 군. 워커 측은 `createWorker`, 메인 측은 `Worker.create` 를 쓴다.

## WorkerModule

`interface WorkerModule { default: { __methods: Record<string, (...args: any[]) => unknown>; __events: Record<string, unknown> } }`

- `default.__methods` — 워커가 노출하는 메서드 맵 타입.
- `default.__events` — 워커가 보낼 수 있는 이벤트명 → 데이터 타입 맵. `Worker.create<typeof import("./worker")>()` 의 타입 추론 입력이다.

## PromisifyMethods

`type PromisifyMethods<TMethods> = { [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R ? (...args: P) => Promise<Awaited<R>> : never }`

- `TMethods` — 워커 메서드 맵 타입.
- 함수 멤버는 같은 인자 `P` 를 받고 `Promise<Awaited<R>>` 를 반환하는 함수가 된다(워커 호출은 항상 비동기).
- 비함수 멤버는 `never` 가 된다.

## WorkerProxy

`type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<TModule["default"]["__methods"]> & { on(...); off(...); terminate(): Promise<void> }`

- 메서드 프록시 — `default.__methods` 의 각 함수가 Promise 반환 함수로 노출.
- `on<TEventName>(event, listener): void` — `default.__events` 의 key 를 event 로, 해당 event 데이터 타입을 listener 인자로 받는다.
- `off<TEventName>(event, listener): void` — 같은 타입 규칙의 해제용.
- `terminate(): Promise<void>` — 워커 종료 요청.

## WorkerRequest

`interface WorkerRequest { id: string; method: string; params: unknown[] }`

- `id: string` — 요청-응답 매칭용 식별자. 메인 측 call 에서 `Uuid.generate().toString()` 으로 생성.
- `method: string` — 호출할 워커 메서드명.
- `params: unknown[]` — 워커 메서드에 넘길 인자 배열.

## WorkerResponse

`type WorkerResponse` — 4개 union.

- `{ request; type: "return"; body? }` — 메서드 성공 응답. `body` 는 resolve 값.
- `{ request; type: "error"; body: Error }` — 메서드 실패 응답. `body` 는 reject 할 Error.
- `{ type: "event"; event; body? }` — 워커 `send` 가 만든 이벤트. 메인 측 EventEmitter 로 emit.
- `{ type: "log"; body: string }` — 워커 stdout 전달. 메인 측 `process.stdout.write(body)` 로 출력.

## createWorker (워커 측)

`function createWorker<TMethods extends Record<string, (...args: any[]) => unknown>, TEvents extends Record<string, unknown> = Record<string, never>>(methods: TMethods): { send<TEventName extends keyof TEvents & string>(event: TEventName, data?: TEvents[TEventName]): void; __methods: TMethods; __events: TEvents }`

- `TMethods` / `TEvents` — 워커가 제공할 메서드 맵 / 메인으로 보낼 이벤트 타입 맵(생략 시 `Record<string, never>`).
- `methods: TMethods` — 요청의 `method` 값으로 조회되는 실제 함수 맵. 결과는 `await methodFn(...params)` 로 처리.
- 반환 `send(event, data?): void` — `{ type: "event", event, body: data }` 를 `transfer.encode` 후 `parentPort.postMessage`.
- 반환 `__methods` / `__events` — 메인 측 타입 추론 전용 필드.
- parentPort 조건 — `parentPort == null` 이면 `SdError("이 스크립트는 worker thread에서 실행되어야 합니다 (parentPort 필요).")` throw.
- stdout 처리 — 워커의 `process.stdout.write` 를 덮어써 문자열 body 의 `log` 응답으로 메인에 전달하고, callback 이 있으면 microtask 로 호출.
- 요청 검증 — 디코딩 결과가 object 가 아니거나 `id`/`method`/`params` 가 없으면 `id`/`method` 가 `"unknown"` 인 `error` 응답.
- 메서드 없음 — `methods[request.method]` 가 없으면 `SdError("알 수 없는 메서드: ...")` 를 담은 `error` 응답.
- 실행 실패 — catch 한 값이 Error 면 그대로, 아니면 `new Error(String(err))` 로 바꿔 `error` 응답.

## Worker.create (메인 측)

`Worker.create<TModule extends WorkerModule>(filePath: string, opt?: Omit<WorkerRawOptions, "stdout" | "stderr">): WorkerProxy<TModule>`

- `filePath: string` — 워커 파일 경로(file:// URL 또는 절대 경로). `file://` 로 시작하면 `fileURLToPath` 로 변환.
- `opt?` — `worker_threads` 옵션. `stdout`/`stderr` 는 내부에서 `true` 로 고정되어 타입에서 제외.
- `opt.env` — object 면 `process.env` 와 병합해 워커 env 로, object 가 아니면 `process.env` 만 전달.
- `opt.argv` — 개발 분기에서 `[workerPath, ...(opt?.argv ?? [])]` 로 proxy worker 의 argv 가 됨.
- 개발 분기 — `path.extname(import.meta.filename) === ".ts"` 이면 `../../lib/worker-dev-proxy.js` 를 실행하고 실제 workerPath 를 argv 로 넘긴다(tsx 로 TS 워커 로드). 프로덕션 분기는 workerPath 를 직접 실행.
- stdout/stderr — 생성된 워커의 stdout/stderr 를 메인 `process.stdout`/`process.stderr` 로 pipe.
- 비정상 종료 — `_isTerminated` 가 아니고 exit code 가 0 이 아니면 `sd-worker` logger error 후 대기 중 요청을 모두 reject. worker `error` 이벤트도 동일하게 모두 reject.
- message 처리 — `transfer.decode` 결과의 `type` 에 따라 event emit / stdout write / pending resolve / pending reject. `type` 이 없으면 warn 로그 후 무시.
- 반환 프록시 — property 가 `on`/`off`/`terminate` 이면 예약 메서드, 그 외에는 `internal.call(prop, args)` 를 호출하는 메서드 프록시. 워커 메서드명이 `on`/`off`/`terminate` 와 겹치면 예약 메서드가 우선한다.
