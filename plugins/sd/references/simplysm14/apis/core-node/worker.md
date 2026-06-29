# @simplysm/core-node — Worker / createWorker

worker_threads 를 메서드 호출 프록시, typed event, stdout 전달 프로토콜로 감쌀 때 읽는 군. 워커 측은 `createWorker`, 메인 측은 `Worker.create` 를 사용한다.

## WorkerModule

`interface WorkerModule { default: { __methods: Record<string, (...args: any[]) => unknown>; __events: Record<string, unknown> } }`

- `default` — 워커 모듈의 default export 구조.
- `default.__methods: Record<string, (...args: any[]) => unknown>` — 워커가 노출하는 메서드 맵 타입.
- `default.__events: Record<string, unknown>` — 워커가 보낼 수 있는 이벤트명과 데이터 타입 맵.

## PromisifyMethods

`type PromisifyMethods<TMethods> = { [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R ? (...args: P) => Promise<Awaited<R>> : never }`

- `TMethods` — 워커 메서드 맵 타입.
- 반환 매핑 — 함수 멤버는 같은 인자 `P` 를 받고 `Promise<Awaited<R>>` 를 반환하는 함수가 된다.
- 비함수 멤버 — 조건 타입의 false 분기 때문에 `never` 가 된다.

## WorkerProxy

`type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<TModule["default"]["__methods"]> & { on(...): void; off(...): void; terminate(): Promise<void> }`

- `TModule extends WorkerModule` — `Worker.create` 에 넘기는 워커 모듈 타입.
- 메서드 프록시 — `default.__methods` 의 각 함수가 Promise 반환 함수로 노출된다.
- `on<TEventName>(event, listener): void` — `default.__events` 의 key 를 event 로 받고, 해당 event 데이터 타입을 listener 인자로 받는다.
- `off<TEventName>(event, listener): void` — 등록 해제용 event 와 listener 를 같은 타입 규칙으로 받는다.
- `terminate(): Promise<void>` — 워커 종료 요청 메서드.

## WorkerRequest

`interface WorkerRequest { id: string; method: string; params: unknown[] }`

- `id: string` — 요청-응답 매칭용 식별자. 메인 측 call 에서 `Uuid.generate().toString()` 으로 만든다.
- `method: string` — 호출할 워커 메서드명.
- `params: unknown[]` — 워커 메서드에 전달할 인자 배열.

## WorkerResponse

`type WorkerResponse = return | error | event | log union`

- `{ request: WorkerRequest; type: "return"; body?: unknown }` — 메서드 실행 성공 응답. `body` 는 resolve 값이다.
- `{ request: WorkerRequest; type: "error"; body: Error }` — 메서드 실행 실패 응답. `body` 는 reject 할 Error 이다.
- `{ type: "event"; event: string; body?: unknown }` — 워커의 `send` 가 만든 이벤트 응답. 메인 측 EventEmitter 로 emit 된다.
- `{ type: "log"; body: string }` — 워커 stdout 전달 응답. 메인 측 `process.stdout.write(body)` 로 출력된다.

## createWorker

`function createWorker<TMethods extends Record<string, (...args: any[]) => unknown>, TEvents extends Record<string, unknown> = Record<string, never>>(methods: TMethods): { send<TEventName extends keyof TEvents & string>(event: TEventName, data?: TEvents[TEventName]): void; __methods: TMethods; __events: TEvents }`

- `TMethods` — 워커가 제공할 메서드 맵 타입. 각 값은 함수여야 한다.
- `TEvents` — 워커가 메인으로 보낼 이벤트 타입 맵. 생략하면 `Record<string, never>`.
- `methods: TMethods` — 요청의 `method` 값으로 조회되는 실제 함수 맵. 결과는 `await methodFn(...params)` 로 처리된다.
- 반환 `send(event, data?): void` — `{ type: "event", event, body: data }` 응답을 `transfer.encode` 한 뒤 `parentPort.postMessage` 로 보낸다.
- 반환 `__methods: TMethods` — `Worker.create<typeof import(...)>` 타입 추론용 필드.
- 반환 `__events: TEvents` — `WorkerProxy.on/off` 이벤트 타입 추론용 필드.
- parentPort 조건 — `parentPort == null` 이면 `SdError("이 스크립트는 worker thread에서 실행되어야 합니다 (parentPort 필요).")` 를 throw.
- stdout 처리 — 워커의 `process.stdout.write` 를 덮어써 문자열 body 를 가진 `log` 응답으로 메인에 전달하고, callback 이 있으면 microtask 로 호출한다.
- 요청 검증 — 디코딩된 메시지가 object 가 아니거나 `id`, `method`, `params` 필드가 없으면 `id/method` 가 `unknown` 인 `error` 응답을 보낸다.
- 메서드 없음 — `methods[request.method]` 가 없으면 `SdError("알 수 없는 메서드: ...")` 를 담은 `error` 응답을 보낸다.
- 실행 실패 — catch 한 값이 Error 이면 그대로, 아니면 `new Error(String(err))` 로 바꿔 `error` 응답을 보낸다.

## Worker.create

`Worker.create<TModule extends WorkerModule>(filePath: string, opt?: Omit<WorkerRawOptions, "stdout" | "stderr">): WorkerProxy<TModule>`

- `TModule extends WorkerModule` — 워커 모듈 타입. 반환 프록시의 메서드·이벤트 타입을 결정한다.
- `filePath: string` — 워커 파일 경로. JSDoc 기준으로 file:// URL 또는 절대 경로를 받는다. `file://` 로 시작하면 `fileURLToPath` 로 변환한다.
- `opt?: Omit<WorkerRawOptions, "stdout" | "stderr">` — `worker_threads` 옵션. `stdout` 과 `stderr` 는 내부에서 `true` 로 고정되어 제외된다.
- `opt.env` — object 인 경우 `process.env` 와 병합되어 워커 env 로 전달된다. object 가 아니면 추가 env 없이 `process.env` 만 전달된다.
- `opt.argv` — 개발 분기에서 `[workerPath, ...(opt?.argv ?? [])]` 형태로 proxy worker 의 argv 가 된다.
- 개발 분기 — `path.extname(import.meta.filename) === ".ts"` 이면 `../../lib/worker-dev-proxy.js` 를 WorkerRaw 로 실행하고, 실제 workerPath 는 argv 로 넘긴다.
- 프로덕션 분기 — 위 조건이 아니면 workerPath 를 직접 WorkerRaw 에 넘긴다.
- stdout/stderr — 생성된 워커의 stdout 과 stderr 를 각각 메인 `process.stdout`, `process.stderr` 로 pipe 한다.
- 비정상 종료 — `_isTerminated` 가 아니고 exit code 가 0 이 아니면 `sd-worker` logger 로 error 를 남기고 대기 중 요청을 모두 reject 한다.
- worker error — `error` 이벤트는 logger 로 출력하고 대기 중 요청을 모두 reject 한다.
- message 처리 — `transfer.decode` 결과의 `type` 에 따라 event emit, stdout write, pending resolve, pending reject 를 수행한다. `type` 이 없으면 warn 로그 후 무시한다.
- 반환 프록시 — property 가 `on`, `off`, `terminate` 이면 예약 메서드를 반환하고, 그 외 property 는 `internal.call(prop, args)` 를 실행하는 메서드 프록시가 된다.
- 예약명 충돌 — 워커 메서드명이 `on`, `off`, `terminate` 이면 프록시 get 분기상 예약 메서드가 우선한다.
