# @simplysm/core-node — Worker / createWorker

worker_threads를 타입 안전한 메서드 프록시, 이벤트, stdout 전달 프로토콜로 감싼다. 워커 스레드 측은 `createWorker`, 메인 스레드 측은 `Worker.create`를 사용.

## 타입

### WorkerModule

메인 측 타입 추론용 인터페이스.

```typescript
interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}
```

- `__methods` — 워커가 노출하는 메서드 맵 (메서드명 → 함수 타입).
- `__events` — 워커가 보낼 수 있는 이벤트 맵 (이벤트명 → 데이터 타입).

### PromisifyMethods

워커 메서드를 Promise 반환으로 변환하는 매핑 타입.

```typescript
type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

- 원본 동기/비동기 메서드를 모두 `Promise<Awaited<R>>`로 변환 (워커 호출은 항상 비동기).

### WorkerProxy

메인 측 워커 프록시 타입.

```typescript
type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<
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

### WorkerRequest / WorkerResponse

내부 메시지 프로토콜.

**WorkerRequest**

- `id: string` — 요청-응답 매칭용 UUID. 메인 측에서 생성.
- `method: string` — 호출할 워커 메서드명.
- `params: unknown[]` — 메서드 인자 배열.

**WorkerResponse** (4가지 union)

- `{ request; type: "return"; body?: unknown }` — 메서드 성공 응답. body는 resolve 값.
- `{ request; type: "error"; body: Error }` — 메서드 실패 응답. body는 reject할 Error.
- `{ type: "event"; event: string; body?: unknown }` — 워커에서 전송한 이벤트.
- `{ type: "log"; body: string }` — 워커 stdout 전달 (메인 stdout으로 출력).

## createWorker (워커 스레드 측)

`function createWorker<TMethods, TEvents>(methods: TMethods): { send, __methods, __events }`

워커 메서드·이벤트 정의 및 메인 스레드 요청 처리.

### 인자

- `TMethods extends Record<string, (...args: any[]) => unknown>` — 제공할 메서드 맵. 각 메서드는 `await methodFn(...params)` 형태로 실행.
- `TEvents extends Record<string, unknown>` — 메인으로 보낼 이벤트 타입 맵 (생략 시 `Record<string, never>`).

### 반환값

- `send<TEventName>(event: TEventName, data?: TEvents[TEventName]): void` — 이벤트를 메인 스레드로 전송. 내부에서 `{ type: "event", event, body: data }`를 `transfer.encode` 후 `parentPort.postMessage`.
- `__methods: TMethods` — 메인 측 타입 추론 전용.
- `__events: TEvents` — 메인 측 타입 추론 전용.

### 동작

**parentPort 검증**

- `parentPort == null`이면 `SdError("이 스크립트는 worker thread에서 실행되어야 합니다 (parentPort 필요).")` throw.

**stdout 가로채기**

- `process.stdout.write`를 덮어써 모든 콘솔 출력을 `{ type: "log", body }` 응답으로 메인에 전달.
- 콜백 있으면 microtask 큐에서 호출.

**요청 처리**

1. `parentPort.on("message")`에서 요청 디코딩.
2. 요청 구조 검증: object이고 `id`, `method`, `params` 필드 필수. 위반 시 `id`/`method` = "unknown"인 `error` 응답.
3. `methods[request.method]` 조회. 없으면 `SdError("알 수 없는 메서드: ...")` 응답.
4. `await methodFn(...request.params)` 실행.
5. 성공 → `{ request, type: "return", body }` 응답.
6. 실패 → Error 그대로, 아니면 `new Error(String(err))`로 변환해 `{ request, type: "error", body }` 응답.

## Worker.create (메인 스레드 측)

`Worker.create<TModule>(filePath: string, opt?: Omit<WorkerRawOptions, "stdout" | "stderr">): WorkerProxy<TModule>`

타입 안전한 워커 프록시 생성.

### 인자

- `filePath: string` — 워커 파일 경로. `file://` URL 또는 절대 경로. file:// 시작하면 `fileURLToPath`로 변환.
- `opt?: Omit<WorkerRawOptions, "stdout" | "stderr">` — Node worker_threads 옵션. stdout/stderr는 내부에서 true로 고정.
  - `opt.env?: NodeJS.ProcessEnv` — object면 `process.env`와 병합, 아니면 `process.env` 그대로 전달.
  - `opt.argv?: string[]` — 개발 모드(TS 워커)에서는 proxy worker의 argv로 `[workerPath, ...(opt?.argv ?? [])]` 사용.

### 개발/프로덕션 분기

- **개발** (`path.extname(import.meta.filename) === ".ts"`):
  - `../../lib/worker-dev-proxy.js`를 실행하고 실제 workerPath를 argv로 전달 (tsx로 TS 워커 로드).
- **프로덕션**: 워커 .js 파일을 직접 실행.

### 동작

**stderr/stdout 파이핑**

- 생성된 워커의 stdout/stderr를 메인 `process.stdout/stderr`로 자동 pipe.

**비정상 종료 처리**

- `_isTerminated` 아니고 exit code ≠ 0이면 `sd-worker` logger error 로그.
- 대기 중인 모든 요청(pending)을 `Error("워커가 비정상 종료되었습니다 (코드: ...)")` reject.

**워커 error 이벤트 처리**

- `sd-worker` logger error 로그.
- 대기 중인 모든 요청 reject.

**message 처리**

1. `transfer.decode` 후 `type` 확인.
2. `type === "event"` → EventEmitter로 이벤트 emit.
3. `type === "log"` → `process.stdout.write(body)` 호출.
4. `type === "return"` → pending request resolve, 삭제.
5. `type === "error"` → pending request reject, 삭제.
6. `type` 미지정 → warn 로그 후 무시.

**프록시 동작**

- property = "on"/"off"/"terminate" → 예약 메서드 호출.
- 그 외 property → `internal.call(propertyName, args)` 호출 (워커 메서드 프록시).
- 워커 메서드명이 "on"/"off"/"terminate"과 겹치면 예약 메서드가 우선.

### 정리

`terminate(): Promise<void>` — 워커 종료.

- `_isTerminated = true` 설정.
- 대기 중 모든 요청을 `Error("워커가 종료되었습니다")` reject.
- `_worker.terminate()` await.
