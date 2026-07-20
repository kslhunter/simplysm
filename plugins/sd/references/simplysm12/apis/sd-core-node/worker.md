# @simplysm/sd-core-node — 워커(worker_threads RPC)

`worker_threads` 위에 타입세이프한 RPC(부모→워커 메서드 호출, 워커→부모 이벤트 송신)를 올린 한 쌍.

- 메인 측은 `SdWorker`, 워커 스크립트 측은 `createSdWorker`.
- 메시지 직렬화는 `@simplysm/sd-core-common` 의 `TransferableConvert`(transferList 지원)로 처리.

## 계약 타입

- `interface ISdWorkerType { methods: Record<string, { params: any[]; returnType: any }>; events: Record<string, any> }` — 워커 한 종류의 계약.
  - `methods` 는 호출 가능한 함수 시그니처 맵(`params` 인자 튜플, `returnType` 반환).
  - `events` 는 이벤트명→페이로드 타입 맵.
  - `SdWorker<T>`, `createSdWorker<T>` 의 제네릭에 이 타입을 넘겨 양측 시그니처를 묶음.
- `interface ISdWorkerRequest<T, K extends keyof T["methods"]> { id: string; method: K; params: T["methods"][K]["params"] }` — 부모가 보내는 호출 요청.
  - `id` 는 `Uuid.new()` 로 응답 매칭에 사용.
- `type TSdWorkerResponse<T, K>` — 워커가 보내는 응답 유니온:
  - `{ request; type: "return"; body? }` — 메서드 정상 반환(body=returnType).
  - `{ request; type: "error"; body: Error }` — 메서드 throw.
  - `{ type: "event"; event: string; body? }` — 워커가 `send` 로 보낸 이벤트.
  - `{ type: "log"; body: string }` — 워커 `process.stdout.write` 가로채 보낸 로그 청크.

## createSdWorker (워커 스크립트 측)

`function createSdWorker<T extends ISdWorkerType>(methods: { [P in keyof T["methods"]]: (...args) => returnType | Promise<returnType> })`

- `parentPort` 없으면 즉시 Error throw(워커 스레드에서만 실행 가능).
- 워커의 `process.stdout.write` 를 가로채 `{type:"log"}` 메시지로 부모에 전달(워커 콘솔 출력을 부모 stdout 에 합류시키기 위함).
- 부모 메시지 수신 시 `request.method` 와 일치하는 등록 메서드를 `...request.params` 로 호출, 성공이면 `type:"return"`, throw 면 `type:"error"` 응답.
- 반환 객체의 `send<K extends keyof T["events"] & string>(event: K, body?: T["events"][K])` — 워커→부모 이벤트 송신.

## SdWorker (메인 측)

`class SdWorker<T extends ISdWorkerType> extends EventEmitter`

- `constructor(filePath: string, opt?: Omit<WorkerOptions, "stdout" | "stderr">)` — 워커 생성.
  - `stdout/stderr` 는 항상 true 로 강제되어 옵션에서 제외.
  - env 는 `process.env` 에 `opt.env` 병합.
  - 워커 stdout/stderr 를 메인 stdout/stderr 로 pipe.
  - `import.meta.filename` 확장자가 `.ts` 면(개발 모드) `../../lib/worker-dev-proxy.js` 를 실제 진입점으로 띄우고 `filePath` 를 argv[0] 로 전달.
  - 아니면 `fileURLToPath(filePath)` 로 직접 실행.
  - 워커 비정상 종료(code≠0, 단 killAsync 미호출 시)와 error 는 내부 `SdLogger`(그룹 `["simplysm","sd-cli","SdWorker"]`)로 error 로그.
- `run<K extends keyof T["methods"]>(method: K, params: T["methods"][K]["params"]): Promise<returnType>` — 워커 메서드 호출.
  - 요청마다 uuid 부여, 같은 id 의 `return` 이면 resolve, `error` 면 reject 후 리스너 해제(요청별 1회성).
- `on<K extends keyof T["events"] & string>(event: K, listener: (args: T["events"][K]) => void): this` — 워커가 `send` 로 보낸 이벤트 구독(EventEmitter override, 타입세이프).
- `killAsync(): Promise<void>` — `_isTerminated=true` 설정 후 `worker.terminate()`. 이후 종료코드 에러로그 억제.

## 사용 흐름

1. 공용 계약 타입 정의: `interface MyWorkerType extends ISdWorkerType { methods: { add: { params: [number, number]; returnType: number } }; events: { progress: number } }`.
2. 워커 스크립트: `const w = createSdWorker<MyWorkerType>({ add: (a, b) => a + b }); w.send("progress", 50);`
3. 메인: `const worker = new SdWorker<MyWorkerType>(import.meta.url); worker.on("progress", p => ...); const r = await worker.run("add", [1, 2]); await worker.killAsync();`

주의: 개발(.ts) 모드 분기는 빌드 산출물의 `lib/worker-dev-proxy.js` 존재에 의존함(이 패키지가 빌드/배포되는 형태에 한함).
