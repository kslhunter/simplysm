# @simplysm/service-client — 저수준 전송 계층

`ServiceClient` 내부의 WebSocket 연결, 요청/응답 매칭, 프로토콜 인코딩 Worker 오프로딩 API. 소켓 연결, 하트비트, 청크 분할, Worker 오프로딩을 직접 제어하거나 확인할 때 참조.

## SocketProvider / createSocketProvider

```ts
interface SocketProviderEvents {
  message: Bytes;
  state: "connected" | "closed" | "reconnecting";
}
interface SocketProvider {
  readonly clientName: string;
  readonly connected: boolean;
  on<K extends keyof SocketProviderEvents & string>(
    type: K,
    listener: (data: SocketProviderEvents[K]) => void,
  ): void;
  off<K extends keyof SocketProviderEvents & string>(
    type: K,
    listener: (data: SocketProviderEvents[K]) => void,
  ): void;
  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: Bytes): Promise<void>;
}
function createSocketProvider(
  url: string,
  clientName: string,
  maxReconnectCount: number,
): SocketProvider;
```

- 모듈 import 부수효과 — `globalThis.WebSocket` 이 없으면 `ws` 패키지를 동적 import 해 `globalThis.WebSocket` 에 대입함(Node polyfill).
- `url: string` — WebSocket 기준 URL. 실제 연결은 `ver=2`, 생성 UUID `clientId`, `clientName` 쿼리를 붙여 만든다.
- `clientName: string` — 접속 쿼리의 `clientName` 값이자 반환 객체의 readonly 필드.
- `maxReconnectCount: number` — 자동 재연결 루프의 최대 시도 횟수. 0이면 루프가 실행되지 않고 closed 로 끝남.
- 내부 상수 `HEARTBEAT_TIMEOUT = 30000` — 마지막 메시지 이후 30초가 지나면 연결 끊김(타임아웃)으로 봄.
- 내부 상수 `HEARTBEAT_INTERVAL = 5000` — 5초마다 ping 전송·타임아웃 점검 타이머를 돌림.
- 내부 상수 `RECONNECT_DELAY = 3000` — 재연결 시도 사이 대기 시간(3초).
- `message: Bytes` — 수신 바이트 이벤트. 1바이트 `0x02`(pong)은 하트비트 갱신만 하고 emit 하지 않음.
- `state: "connected"|"closed"|"reconnecting"` — 연결 상태 이벤트.
  - `"connected"` — 최초 연결 또는 재연결 성공 시점.
  - `"closed"` — 수동 종료 또는 재연결 한도 초과 시점.
  - `"reconnecting"` — 재연결 루프의 각 시도 시작 시점.
- `clientName: string` (readonly) — 생성 시 받은 클라이언트 이름.
- `connected: boolean` (readonly getter) — 현재 `ws.readyState === WebSocket.OPEN` 여부.
- `on(type, listener)` / `off(type, listener)` — 내부 `EventEmitter` 에 리스너를 등록·해제함.
- `connect()` — 이미 OPEN 이면 즉시 반환, 아니면 소켓 생성 → 하트비트 시작 → 재연결 카운트 초기화 → `connected` emit 순서로 동작함. 초기 연결 실패는 throw 함.
- `close()` — 수동 종료 플래그를 세우고 하트비트를 멈춘 뒤 소켓 close 를 요청함. CLOSED 대기 실패는 catch 후 무시하고 `closed` 를 emit 함.
- `send(data: Bytes)` — 연결될 때까지 대기한 뒤 데이터를 `new Uint8Array(data)`(ArrayBuffer 기반)로 복사해 `WebSocket.send` 에 넘김. 연결 대기 실패 시 `"서버에 연결되지 않았습니다. 인터넷 연결을 확인해 주세요."` 를 throw 함.
- 하트비트 ping — 연결 중이면 1바이트 `0x01` 을 보냄. 전송 실패는 warn 로그만 남김.
- 하트비트 timeout — 기존 소켓의 핸들러를 제거하고 close 를 시도한 뒤, 수동 종료가 아니면 재연결 루프를 시작함.
- onclose 자동 재연결 — 수동 종료가 아니면 `RECONNECT_DELAY` 간격으로 `maxReconnectCount` 까지 재연결을 시도하고, 한도 초과 시 `closed` 를 emit 함.

## ServiceTransport / createServiceTransport

```ts
interface ServiceTransportEvents {
  event: { keys: string[]; data: unknown };
}
interface ServiceTransport {
  on<K extends keyof ServiceTransportEvents & string>(
    type: K,
    listener: (data: ServiceTransportEvents[K]) => void,
  ): void;
  off<K extends keyof ServiceTransportEvents & string>(
    type: K,
    listener: (data: ServiceTransportEvents[K]) => void,
  ): void;
  send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown>;
}
function createServiceTransport(
  socket: SocketProvider,
  protocol: ClientProtocolWrapper,
): ServiceTransport;
```

- `socket: SocketProvider` — 메시지 바이트 송수신과 상태 이벤트 원천.
- `protocol: ClientProtocolWrapper` — `ServiceClientMessage` encode 와 수신 바이트 decode 담당.
- `event: { keys; data }` — 서버 `evt:on` 메시지를 `EventClient` 로 넘기는 이벤트.
- `keys: string[]` — 서버가 전달한 대상 리스너 key 배열.
- `data: unknown` — 서버가 전달한 이벤트 데이터.
- `send(message, progress?)` — UUID 생성 → pending map 등록(전송 전에 리스너 먼저 등록) → `protocol.encode` → 청크 순차 `socket.send` → 응답 Promise 반환 순서로 동작함. 전송 실패 시 해당 요청을 reject·정리하고 re-throw 함.
- `message: ServiceClientMessage` — 전송할 클라이언트 메시지(`{ name, body }`).
- `progress?: ServiceProgress` — 요청·응답·서버 진행 콜백 묶음. 없으면 진행 콜백 호출을 건너뜀.
- 요청 progress — 인코딩 결과 `chunks.length > 1` 이면 `request({ uuid, totalSize, completedSize: 0 })` 를 호출함.
- 응답 progress — decode 결과가 `type: "progress"` 이면 totalSize 를 기억하고 `response` 콜백을 호출함. 최종 response 수신 시 기억한 totalSize 가 있으면 100% 상태로 `response` 를 한 번 더 호출함.
- 서버 progress — 최종 메시지 이름이 `"progress"` 이면 body 의 `totalSize`·`completedSize` 로 `server` 콜백을 호출함.
- response 메시지 — pending map 에서 제거하고 body 를 resolve 함.
- error 메시지 — pending map 과 response progress totalSize 를 정리하고 `err.fromObject(body)` 로 reject 함.
- evt:on 메시지 — body 의 `{ keys, data }` 를 `event` 로 emit 함.
- decode 실패 — 헤더 첫 16바이트에서 UUID 를 먼저 추출해 해당 pending 요청만 reject·정리함.
- socket `closed`·`reconnecting` 수신 — 모든 pending 요청을 `요청 취소됨: 소켓 연결이 끊어졌습니다` 로 reject 하고 progress totalSize map 을 비움.

## ClientProtocolWrapper / createClientProtocolWrapper

```ts
interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
function createClientProtocolWrapper(protocol: ServiceProtocol): ClientProtocolWrapper;
```

`ServiceProtocol` 의 encode/parseMessage 중 무거운 작업을 크기 기준으로 Worker(브라우저 DOM Worker 또는 Node worker_threads)에 위임하는 래퍼. Worker 미가용 시 메인 스레드로 fallback 함.

- `protocol: ServiceProtocol` — 실제 encode·accumulate·parseMessage·dispose 를 수행하는 하위 프로토콜.
- `uuid: string` — encode 대상 요청 식별자.
- `message: ServiceMessage` — encode 대상 메시지. `body` 형태로 Worker 사용 여부를 판단함.
- `chunks: Bytes[]` — 인코딩 결과 청크 배열.
- `totalSize: number` — 인코딩 결과 전체 크기.
- `bytes: Bytes` — decode 대상 수신 바이트.
- 내부 상수 `SIZE_THRESHOLD = 30 * 1024` — 문자열 encode 와 parseMessage Worker 분기 기준 크기(30KB).
- Worker 가용 캐시 — `isWorkerSupported()` 결과를 1회 계산해 `workerAvailable` 에 저장함. Worker 초기화·실행 실패 시 false 로 전환됨.
- 브라우저 Worker 생성 — `new Worker(new URL("../workers/client-protocol.worker.js", import.meta.url), { type: "module" })`.
- Node Worker 생성 — `import.meta.resolve(...)` 와 동적 import 한 `worker_threads.Worker` 로 만든 뒤 `BrowserWorker` 어댑터로 감싼다.
- Worker 작업 timeout — `LazyGcMap`(gc 5초, 만료 60초)이 만료 시 해당 작업을 `Worker 작업 시간 초과 (uuid: ...)` 로 reject 함.
- `encode` 메인 경로 — Worker 미가용이거나 body 가 Worker 조건에 안 맞으면 `protocol.encode(uuid, message)` 를 직접 호출함.
- `encode` Worker 조건 — body 가 `Uint8Array`, 30KB 초과 문자열, 길이 100 초과 배열, 또는 첫 항목이 `Uint8Array` 인 배열이면 Worker encode 를 시도함.
- `encode` fallback — Worker 결과가 `undefined`(미가용)면 `protocol.encode` 로 fallback 함.
- `decode` accumulate — 청크 재조립(stateful)은 항상 `protocol.accumulate(bytes)` 로 메인 스레드 단일 누적기에서 수행함.
- `decode` progress — accumulate 결과가 `type: "progress"` 이면 그대로 반환함(미완성 청크).
- `decode` parse 메인 경로 — 재조립 바이트가 30KB 이하이거나 Worker 미가용이면 `protocol.parseMessage(resultBytes)` 로 파싱함.
- `decode` parse Worker 경로 — 재조립 바이트가 30KB 초과이면 `parseMessage` 작업을 Worker 에 보내며 `resultBytes.buffer` 를 transfer 함.
- `decode` Worker 결과 — Worker 결과를 `transfer.decode(rawResult)` 로 복원해 `complete` 결과에 넣는다. Worker 결과가 `undefined` 면 메인 스레드 파싱으로 fallback.
- `dispose()` — 하위 `protocol.dispose()` 와 `workerResolvers.dispose()` 를 호출함.
