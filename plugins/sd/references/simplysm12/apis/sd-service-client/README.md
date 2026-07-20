# @simplysm/sd-service-client

WebSocket 기반 RPC 서비스 클라이언트. 서버의 서비스 메소드 원격 호출, 이벤트 구독, 파일 업/다운로드, 원격 ORM 접속을 제공함.

## 사용 트리거 인덱스

- **SdServiceClient** — 서버에 WebSocket 연결을 맺고 서비스 메소드 원격 호출/이벤트/파일 처리를 할 때 사용하는 진입 클래스. 거의 모든 작업의 시작점.
- **getService / TRemoteService** — 서버 서비스 인터페이스를 타입 안전한 Proxy로 받아 메소드를 `await` 호출할 때.
- **이벤트 구독 (addEventListenerAsync 등)** — 서버 푸시 이벤트를 구독/해제/발신할 때.
- **파일 업/다운로드 (uploadFileAsync, downloadFileBufferAsync)** — HTTP 멀티파트 업로드 또는 상대경로 다운로드가 필요할 때.
- **ISdServiceConnectionConfig** — 클라이언트 생성 시 접속 대상(host/port/ssl/재연결)을 지정할 때.
- **ISdServiceProgress / ISdServiceProgressState** — 대용량 요청, 응답의 전송 진행률을 받을 때.
- **원격 ORM 접속 (SdOrmServiceClientConnector 등)** — 서버를 경유해 DB 트랜잭션/쿼리를 실행할 때. 자세히: [orm.md](./orm.md)
- **SdServiceTransport / SdSocketProvider / SdServiceClientProtocolWrapper** — 전송, 소켓, 프로토콜 내부 계층. 보통 `SdServiceClient` 가 내부에서 조립하므로 직접 쓸 일은 거의 없음.

## SdServiceClient

`new SdServiceClient(name: string, options: ISdServiceConnectionConfig)` — `EventEmitter` 상속. `name` 은 WebSocket 접속 시 `clientName` 으로 전송되며 서버의 `reload` 타겟팅에 쓰임.

생성자에서 내부 모듈(`SdSocketProvider`, `SdServiceTransport`, `SdServiceEventClient`, `SdServiceFileClient`)을 자동 조립함.
소켓이 `connected` 가 되면 저장된 인증 토큰이 있으면 자동 재인증하고 이벤트 리스너를 자동 재등록함.

상태 접근자

- `connected: boolean` — 내부 소켓의 `readyState === OPEN` 여부. 연결 활성 확인용.
- `hostUrl: string` — `ssl` 에 따라 `http(s)://host:port` 조합 문자열. 파일 클라이언트 base URL.

메소드

- `connectAsync(): Promise<void>` — WebSocket 연결 수립. 최초 연결 실패는 에러를 던짐(이후 끊김은 자동 재연결).
- `closeAsync(): Promise<void>` — 수동 종료. 재연결을 멈추고 graceful close 후 `state: "closed"` 발신.
- `getService<T>(serviceName: string): TRemoteService<T>` — 서비스명을 받아 메소드 호출을 `sendAsync` 로 위임하는 Proxy 반환.
- `sendAsync(serviceName, methodName, params: any[], progress?: ISdServiceProgress): Promise<any>` — 단일 RPC 호출.
  `serviceName.methodName` 형태로 요청을 보냄.
  progress 콜백 + `request-progress`/`response-progress` 이벤트 동시 발신.
- `authAsync(token: string): Promise<void>` — 서버에 `auth` 요청을 보내 인증하고 토큰을 내부 보관(`_authToken`).
  재연결 시 이 토큰으로 자동 재인증.
  파일 업로드 전 필수.
- `addEventListenerAsync(eventType, info, cb): Promise<string>` — 이벤트 구독.
  미연결 상태면 즉시 throw.
  반환된 key 로 해제. (아래 이벤트 구독 절 참조)
- `removeEventListenerAsync(key: string): Promise<void>` — key 로 구독 해제.
- `emitAsync(eventType, infoSelector, data): Promise<void>` — 조건에 맞는 다른 구독자에게 이벤트 발신.
- `uploadFileAsync(files): Promise<ISdServiceUploadResult[]>` — 파일 업로드. `_authToken` 이 없으면 throw(먼저 `authAsync` 필요).
- `downloadFileBufferAsync(relPath: string): Promise<Buffer>` — 상대경로 파일을 `hostUrl` 기준으로 GET 다운로드.

이벤트 (`on(event, listener)` 오버로드)

- `"request-progress"` → `(state: ISdServiceProgressState)` — 요청(업로드 측) 전송 진행률.
- `"response-progress"` → `(state: ISdServiceProgressState)` — 응답(다운로드 측) 수신 진행률.
- `"state"` → `(state: "connected" | "closed" | "reconnecting")` — 소켓 연결 상태 전이. `connected` 시 자동 재인증/리스너 복구 수행.
- `"reload"` → `(changedFileSet: Set<string>)` — 서버가 보낸 reload 신호 중 `clientName` 이 일치할 때만 발신. dev 서버 핫리로드용.

## TRemoteService

```ts
type TRemoteService<T> = {
  [K in keyof T]: T[K] extends (...a: any[]) => any
    ? (...a: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
    : never;
};
```

- 서버 서비스 타입 `T` 의 각 메소드를 동일 시그니처에 반환형만 `Promise` 로 감싼 타입.
- 함수가 아닌 프로퍼티는 `never`.
- `getService<T>()` 의 반환형으로 사용해 원격 호출을 로컬 호출처럼 타이핑함.

## 이벤트 구독

서버 → 클라이언트 푸시 이벤트를 다룸.

- `eventType` 은 `SdServiceEventListenerBase<TInfo, TData>` 를 상속한 클래스(@simplysm/sd-service-common 정의).
- `info` 는 구독 필터 조건, `data` 는 전달 페이로드.

- `addEventListenerAsync<T>(eventType: Type<T>, info: T["info"], cb: (data: T["data"]) => PromiseLike<void>): Promise<string>` — 구독 등록.
  내부에서 UUID key 생성 후 서버에 `evt:add` 전송하고 로컬 맵에 저장(재연결 복구용).
  반환 key 는 해제에 사용. 미연결이면 `"서버와 연결되어있지 않습니다."` throw.
- `removeEventListenerAsync(key: string): Promise<void>` — 서버에 `evt:remove` 전송 후 로컬 맵에서 제거.
- `emitAsync<T>(eventType: Type<T>, infoSelector: (info: T["info"]) => boolean, data: T["data"]): Promise<void>` — 서버에 `evt:gets` 로 해당 이벤트의 구독 목록을 받아
  `infoSelector` 가 true 인 key 들에만 `evt:emit` 발신. 대상이 없으면 아무것도 보내지 않음.

수신 콜백(`cb`)에서 던진 예외는 내부에서 catch 되어 콘솔 에러로만 기록되고 전파되지 않음.

## 파일 업/다운로드

WebSocket 이 아닌 HTTP `fetch` 로 동작함(base URL = `hostUrl`).

- `uploadFileAsync(files: File[] | FileList | { name: string; data: BlobPart }[])` — `POST {hostUrl}/upload` 멀티파트 전송.
  헤더에 `x-sd-client-name`(클라이언트 name), `Authorization: Bearer {authToken}` 포함.
  `{ name, data }` 형태는 `data` 가 Blob 이 아니면 `new Blob([data])` 로 감쌈.
  응답 JSON 을 `ISdServiceUploadResult[]` 로 반환. `authAsync` 선행 필수(없으면 throw).
- `downloadFileBufferAsync(relPath: string): Promise<Buffer>` — `GET {hostUrl}{/relPath}` (선두 `/` 자동 보정).
  비-2xx 응답이면 `Download failed: {status} {statusText}` throw.
  본문 ArrayBuffer 를 `Buffer` 로 변환해 반환.

## 접속/진행률 타입

### ISdServiceConnectionConfig

`SdServiceClient` 생성자 2번째 인자.

- `host: string` — 서버 호스트.
- `port: number` — 서버 포트.
- `ssl?: boolean` — true 면 `wss://`/`https://`, 아니면 `ws://`/`http://`. WebSocket, 파일 URL 스킴 결정.
- `maxReconnectCount?: number` — 최대 재연결 시도 횟수.
  미지정 시 `10`.
  `0` 입력 시 재연결 안 함(끊기면 바로 종료).

### ISdServiceProgress

`sendAsync`/`getService` 호출의 4번째 인자(진행률 콜백 묶음).

- `request?: (s: ISdServiceProgressState) => void` — 요청 전송 진행 콜백.
- `response?: (s: ISdServiceProgressState) => void` — 응답 수신 진행 콜백.

### ISdServiceProgressState

- `uuid: string` — 해당 요청의 식별자. 동시 다중 요청 구분용.
- `totalSize: number` — 전체 바이트.
- `completedSize: number` — 현재까지 처리 바이트.

## 전송, 소켓, 프로토콜 내부 계층

`SdServiceClient` 가 내부에서 조립하는 하위 모듈. 직접 사용은 드물지만 export 되어 있음.

### SdServiceTransport

`new SdServiceTransport(socket: SdSocketProvider)` — `EventEmitter` 상속. 요청/응답 매칭과 메시지 디코딩 라우팅 담당.

- `sendAsync(message: TSdServiceClientMessage, progress?: ISdServiceProgress): Promise<any>` — UUID 생성 → 응답 리스너 등록 → 인코딩 후 청크 단위 전송 → 응답 resolve.
  청크가 2개 이상이면 request progress 초기 이벤트 발신.
- `on("reload", (changedFileSet: Set<string>) => void)` — clientName 일치 reload 수신.
- `on("event", (keys: string[], data: any) => void)` — 서버 `evt:on` 푸시 수신.
- 소켓이 `closed`/`reconnecting` 이 되면 대기 중 모든 요청을 `Request canceled: Socket connection lost` 로 reject 해 메모리 해제.

### SdSocketProvider

`new SdSocketProvider(url: string, clientName: string, maxReconnectCount: number)` — `EventEmitter` 상속. 실제 WebSocket 수명주기, 하트비트, 재연결 담당.

- `connected: boolean` — `readyState === OPEN`.
- `clientName: string` — 접속 query 의 `clientName`, reload 타겟 비교에 사용.
- `connectAsync()` / `closeAsync()` — 연결/수동 종료.
- `sendAsync(data: Buffer | Uint8Array)` — 연결될 때까지 최대 5초 대기 후 전송. 미연결이면 `"서버와 연결되어있지 않습니다. ..."` throw.
- `on("message", (data: Buffer) => void)` / `on("state", (state) => void)` — 메시지/상태 이벤트.
- 내부 상수: 하트비트 ping 5초 간격, 30초 무응답 시 타임아웃 후 강제 재연결, 재연결 지연 3초.
  ping=`0x01` 송신, pong=`0x02` 1바이트 패킷은 수신 시 무시(타임스탬프만 갱신).
  접속 query `ver=2`, 무작위 `clientId` 포함.

### SdServiceClientProtocolWrapper

메시지 인코딩/디코딩을 메인 스레드 또는 Web Worker 로 분기. (export 되지만 보통 `SdServiceTransport` 내부에서만 생성)

- `encodeAsync(uuid: string, message: TSdServiceMessage): Promise<{ chunks: Buffer[]; totalSize: number }>` — 본문이 무거우면 Worker 인코딩, 아니면 메인 스레드.
  - 무거움 판정: Buffer 포함, 문자열 30KB 초과, 배열 100개 초과, 배열 첫 요소가 Buffer.
- `decodeAsync(buffer: Buffer): Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>>` — 버퍼가 30KB(`_SIZE_THRESHOLD`) 초과면 Worker 로 zero-copy 디코딩 후
  `TransferableConvert.decode` 로 클래스 인스턴스(DateTime 등) 복원, 아니면 메인 스레드.
- Worker 작업은 60초 미응답 시 timeout reject(5초 주기 GC). Worker 는 static 으로 1회 생성, 공유.
