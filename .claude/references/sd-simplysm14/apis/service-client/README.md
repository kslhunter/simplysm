# @simplysm/service-client

WebSocket 기반 simplysm 서비스 서버에 접속하는 클라이언트. 서비스 메서드 RPC 호출, 인증, 서버 푸시 이벤트 구독, 파일 업/다운로드, ORM 원격 실행을 제공한다. Node.js/브라우저 양쪽에서 동작(브라우저 `WebSocket` 없으면 `ws` 패키지로 polyfill).

## 사용 트리거 인덱스

- **createServiceClient / ServiceClient** — 서버 접속·서비스 메서드 호출·인증·접속 상태 이벤트가 필요할 때. 진입점.
- **ServiceConnectionOptions** — 클라이언트 생성 시 호스트/포트/SSL/재연결 옵션을 줄 때.
- **getService / ServiceProxy** — 서버 서비스 인터페이스를 타입 안전 프록시로 호출할 때.
- **이벤트 구독** (getEvent, addListener, emitEvent, ClientEventProxy, EventClient) — 서버 푸시 이벤트를 구독·발행할 때.
- **파일 전송** (uploadFile, downloadFileBuffer, FileClient, BlobInput, FileCollection) — 파일을 업로드/다운로드할 때.
- **진행률 추적** (ServiceProgress, ServiceProgressState, request/response/server-progress 이벤트) — 대용량 요청·응답 진행률을 추적할 때.
- **환경 호환 유틸** (isWorkerSupported 등, BrowserWorker) — Node/브라우저 Worker 지원 여부를 판별할 때.
- **ORM 원격 실행** (OrmClientConnector, OrmConnectOptions, OrmClientDbContextExecutor) — 서버 DB 를 클라이언트 측 DbContext 로 트랜잭션 실행할 때. 자세히: [orm.md](./orm.md)
- **저수준 전송 계층** (SocketProvider, ServiceTransport, ClientProtocolWrapper 및 create*) — 일반적으로 직접 쓰지 않음. `ServiceClient` 가 내부에서 조립. 자세히: [transport.md](./transport.md)

## ServiceClient

서버 접속과 모든 RPC/이벤트/파일 기능의 진입점. `EventEmitter<ServiceClientEvents>` 를 상속.

```ts
const client: ServiceClient = createServiceClient(name, options);
```

- `createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient` — 클라이언트 인스턴스 생성. `new ServiceClient(...)` 와 동일.
- `name: string` (생성자, readonly) — 클라이언트 식별 이름. WebSocket 접속 쿼리의 `clientName`, 파일 업로드 헤더 `x-sd-client-name` 으로 전송.
- `options: ServiceConnectionOptions` (생성자, readonly) — 접속 옵션. 아래 ServiceConnectionOptions 참조.

상태 접근자:

- `connected: boolean` (getter) — 현재 WebSocket 이 OPEN 상태인지. 재연결 중·종료 시 false.
- `hostUrl: string` (getter) — `http(s)://<host>:<port>` 형태 HTTP 베이스 URL. ssl 이면 `https`. 파일 전송이 이 URL 을 사용.

메서드:

- `connect(): Promise<void>` — WebSocket 접속. 초기 접속 실패 시 throw.
- `close(): Promise<void>` — 접속을 수동 종료(이후 재연결 안 함)하고 protocol worker 리소스 dispose. 종료 후 재사용하지 말 것.
- `send(serviceName, methodName, params, progress?): Promise<unknown>` — 서비스 메서드 1건 원격 호출. `getService` 가 내부에서 이걸 호출하므로 보통 직접 쓰지 않음. `progress` 미지정이어도 client 의 `request/response/server-progress` 이벤트는 항상 발생.
- `auth(token: string): Promise<void>` — 인증 토큰 전송. 성공 시 토큰을 보관해 재연결 시 자동 재인증. 파일 업로드 전 필수.
- `getService<TService>(serviceName): ServiceProxy<TService>` — 타입 안전 서비스 프록시. 아래 getService 참조.
- 이벤트 관련(`getEvent`, `addListener`, `removeListener`, `emitEvent`) — 아래 "이벤트 구독" 참조. `addListener` 는 미접속 시 throw.
- 파일 관련(`uploadFile`, `downloadFileBuffer`) — 아래 "파일 전송" 참조.

```ts
const client = createServiceClient("my-app", { host: "localhost", port: 50080, ssl: false });
await client.connect();
await client.auth(jwtToken);
client.on("state", (state) => console.log(state)); // "connected" | "closed" | "reconnecting"
```

ServiceClientEvents (EventEmitter 이벤트):

- `state: "connected"|"closed"|"reconnecting"` — 접속 상태 변화. 재연결 성공("connected") 시 보관된 토큰으로 `auth` 재호출과 이벤트 리스너 자동 복구가 일어남.
- `request-progress: ServiceProgressState` — 요청 분할 전송 진행률(요청 청크가 2개 이상일 때).
- `response-progress: ServiceProgressState` — 응답 수신 진행률.
- `server-progress: ServiceProgressState` — 서버가 처리 중 보고하는 진행률.

## ServiceConnectionOptions

`createServiceClient` 의 두 번째 인자.

- `port: number` — 서버 포트. 필수.
- `host: string` — 서버 호스트. 필수.
- `ssl?: boolean` — TLS 사용 여부. true 면 `wss`/`https`, false·미지정이면 `ws`/`http`.
- `maxReconnectCount?: number` — 끊김 시 최대 재연결 시도 횟수. 미지정 시 10. `0` 이면 재연결을 비활성화하고 끊김 시 즉시 포기.

## getService / ServiceProxy

서버 서비스 인터페이스의 각 메서드를 `Promise` 반환 함수로 노출하는 프록시.

- `getService<TService>(serviceName: string): ServiceProxy<TService>` — `serviceName` 으로 등록된 서버 서비스에 대한 프록시 반환. 프록시 메서드 호출 = `client.send(serviceName, methodName, params)`.
- `ServiceProxy<TService>` — `TService` 의 함수 멤버 각각을 `(...args) => Promise<Awaited<R>>` 로 매핑. 함수가 아닌 속성은 `never` 로 제외.

```ts
const svc = client.getService<MyService>("MyService");
const result = await svc.echo("hi"); // 서버의 MyService.echo("hi") 호출, Promise<string>
```

## 이벤트 구독

서버 푸시 이벤트를 키 기반으로 구독·발행. 이벤트 정의는 `@simplysm/service-common` 의 `defineEvent` 로 만든 `ServiceEventDef`(`$info` = 구독 필터 정보 타입, `$data` = 페이로드 타입)를 사용.

ServiceClient 메서드:

- `addListener<TEventDef>(eventDef, info, cb): Promise<string>` — 리스너 등록. `info: TEventDef["$info"]` = 이 구독을 식별·필터링할 정보, `cb: (data) => PromiseLike<void>` = 이벤트 수신 콜백. 반환값은 제거에 쓰는 리스너 key. 미접속 시 throw. 재연결 시 자동 재등록됨.
- `removeListener(key: string): Promise<void>` — 등록한 리스너 해제. 서버 미응답(연결 끊김)은 무시(서버가 끊김 시 자동 정리).
- `emitEvent<TEventDef>(eventDef, infoSelector, data): Promise<void>` — 이벤트 발행. `infoSelector: (info) => boolean` 로 서버에 등록된 리스너 중 대상을 골라 `data: TEventDef["$data"]` 전달.
- `getEvent<TEventDef>(eventDef): ClientEventProxy<TEventDef>` — 특정 이벤트 정의에 바인딩된 프록시 반환(eventDef 반복 전달 생략용).

ClientEventProxy<TEventDef>:

- `addListener(info, cb): Promise<string>` — 위 `addListener` 의 eventDef 고정판.
- `removeListener(key): Promise<void>` — 리스너 해제.
- `emit(infoSelector, data): Promise<void>` — 위 `emitEvent` 의 eventDef 고정판.

```ts
const evtDef = defineEvent<{ channel: string }, string>("TestEvent");
const key = await client.addListener(evtDef, { channel: "a" }, async (data) => { /* ... */ });
await client.removeListener(key);
```

`EventClient` / `createEventClient(transport)` 는 `ServiceClient` 가 내부 조립에 쓰는 저수준 구현. 위 4개 메서드에 더해 `resubscribeAll(): Promise<void>`(보관된 모든 리스너를 서버에 재등록, 재연결 복구용)을 가짐. 일반 사용에선 직접 만들지 않음.

## 파일 전송

ServiceClient 메서드:

- `uploadFile(files): Promise<ServiceUploadResult[]>` — 파일 업로드(`POST <hostUrl>/upload`, multipart). 보관된 인증 토큰을 `Authorization: Bearer` 로 전송하므로 사전 `auth()` 필수(미인증 시 throw). `files` 는 아래 3형식 허용.
- `downloadFileBuffer(relPath: string): Promise<Bytes>` — `<hostUrl>/<relPath>` 를 GET 해 바이트(`Uint8Array`)로 반환. 응답 비정상(`!res.ok`) 시 throw.

`files` 허용 형식 (`FileClient.upload` 기준):

- `File[]` — 브라우저 `File` 객체 배열.
- `FileCollection` — DOM `FileList` 와 구조 호환 인터페이스(`length`, `item(i)`, 인덱스 접근, iterable). DOM lib 없이도 타입체크 통과용 대체 타입.
- `{ name: string; data: BlobInput }[]` — 커스텀 객체. `name` = 파일명, `data` = 본문. `data` 가 `Blob` 이 아니면 `new Blob([data])` 로 감쌈.

`BlobInput` — Blob 생성 입력 타입(DOM `BlobPart` 대체): `Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string` 중 하나.

`FileClient` / `createFileClient(hostUrl, clientName)` 는 `ServiceClient` 내부 구현. `download(relPath)`/`upload(files, authToken)` 두 메서드를 가지며 직접 생성은 보통 불필요.

```ts
await client.auth(token);
const results = await client.uploadFile([{ name: "a.txt", data: "hello" }]);
const bytes = await client.downloadFileBuffer("/files/a.txt");
```

## 진행률 추적

대용량 요청/응답이 청크로 분할될 때 진행 상황을 보고하는 콜백·상태 타입.

ServiceProgress — `send` 류에 넘길 수 있는 콜백 집합. 각 콜백은 `(state: ServiceProgressState) => void`:

- `request?` — 요청 청크 전송 진행(요청 청크 2개 이상일 때만).
- `response?` — 응답 수신 진행. 분할 응답이었으면 완료 시 100%(`completedSize === totalSize`)를 한 번 더 보고.
- `server?` — 서버가 처리 중 보고하는 진행(`name: "progress"` 메시지 수신 시).

ServiceProgressState:

- `uuid: string` — 해당 요청/응답을 식별하는 UUID. 동시 요청 구분용.
- `totalSize: number` — 전체 바이트 크기.
- `completedSize: number` — 현재까지 처리된 바이트 크기. `totalSize` 와 같아지면 완료.

`send` 호출 시 위 콜백과 무관하게 ServiceClient 의 `request/response/server-progress` 이벤트도 항상 발생하므로, 전역 추적이면 콜백 대신 `client.on("response-progress", ...)` 를 써도 됨.

## 환경 호환 유틸 (browser-compat)

Node/브라우저 Worker 지원 여부 판별 함수와 Worker 인터페이스. 프로토콜 인코딩/파싱을 Worker 로 오프로딩할지 결정할 때 내부에서 사용.

- `isBrowserWorkerSupported(): boolean` — `globalThis` 에 DOM `Worker` 가 있는지(브라우저 환경 판별).
- `isNodeWorkerSupported(): boolean` — Node.js 런타임(`process.versions.node` 존재)인지.
- `isWorkerSupported(): boolean` — 위 둘 중 하나라도 참인지(브라우저 Worker 또는 Node worker_threads 가용 여부).
- `BrowserWorker` (interface) — DOM lib 없이 타입체크하기 위한 Worker 최소 인터페이스: `onmessage`/`onerror` 핸들러, `postMessage(message, transfer?)`, `terminate()`.
