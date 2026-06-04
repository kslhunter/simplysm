# @simplysm/service-client

WebSocket 으로 서비스 서버(`@simplysm/service-server`)에 접속해 서비스 메서드 RPC 호출·서버 푸시 이벤트 구독/발행·파일 업/다운로드·서버측 ORM 원격 실행을 수행하는 클라이언트. 브라우저(DOM Worker)와 Node.js(글로벌 `WebSocket` 없으면 `ws` 로 polyfill, `worker_threads`) 양쪽에서 동작.

## 사용 트리거 인덱스

- **createServiceClient / ServiceClient** — 서버 접속, 서비스 호출, 인증, 연결 상태 추적이 필요할 때. 이 패키지의 주 진입점. (아래 인라인 섹션)
- **ServiceConnectionOptions** — 클라이언트 생성 시 접속 대상(host/port/ssl)·재연결 정책을 정할 때. (아래 인라인 섹션)
- **getService / ServiceProxy** — 서버 서비스 인터페이스를 타입 안전 프록시로 호출할 때. (아래 인라인 섹션)
- **이벤트 구독·발행 (addListener / removeListener / emitEvent / getEvent / ClientEventProxy / EventClient)** — 서버 푸시 이벤트를 구독·발행할 때. (아래 인라인 섹션)
- **파일 업/다운로드 (uploadFile / downloadFileBuffer / FileClient)** — 인증된 파일 업로드, 서버 상대경로 파일 다운로드 시. (아래 인라인 섹션)
- **진행률 (ServiceProgress / ServiceProgressState)** — 대용량 요청·응답의 청크 전송 진행률을 추적할 때. (아래 인라인 섹션)
- **환경 호환 타입·헬퍼 (BlobInput / FileCollection / BrowserWorker / isWorkerSupported 등)** — Node/browser 공용 코드에서 DOM 전용 타입 회피, Worker 지원 분기 시. (아래 인라인 섹션)
- **ORM 원격 실행 (createOrmClientConnector / OrmClientConnector / OrmConnectOptions / OrmClientDbContextExecutor)** — 서버측 ORM DbContext 를 클라이언트에서 트랜잭션 단위로 실행할 때. 자세히: [orm.md](./orm.md)
- **저수준 전송 계층 (SocketProvider / ServiceTransport / ClientProtocolWrapper 및 create\*)** — 일반적으로 직접 쓰지 않음. `ServiceClient` 가 내부에서 조립. 소켓·하트비트·프로토콜·청크 동작을 이해해야 할 때. 자세히: [transport.md](./transport.md)

> 앱(Angular) 레이어에서는 `ServiceClient` 를 화면에서 직접 만들지 않고 `AppServiceProvider`(root provider) 의 `client` getter 를 경유해 서비스·이벤트·ORM 진입점을 모은다. 아래 예시는 client 직접 호출 형태로 보여주지만, 실제 앱 코드는 manuals/client-service.md·client-orm.md 의 provider 패턴을 따른다.

## 메인 클라이언트 (createServiceClient / ServiceClient)

`createServiceClient(name, options): ServiceClient` — 클라이언트 인스턴스 생성. `new ServiceClient(name, options)` 와 동일.

- name: string — 클라이언트 식별 이름. WebSocket 접속 쿼리의 `clientName`·파일 업로드 헤더 `x-sd-client-name` 으로 서버에 전달. 서버 로그·연결 구분에 사용.
- options: ServiceConnectionOptions — 접속 대상·재연결 정책 (아래 섹션).

`ServiceClient` 는 `EventEmitter<ServiceClientEvents>` 를 상속하며 다음을 노출:

- name: string (readonly) — 생성 시 받은 클라이언트 이름.
- options: ServiceConnectionOptions (readonly) — 생성 시 받은 접속 옵션.
- connected: boolean (getter) — 현재 WebSocket 이 OPEN 상태인지. 재연결 중·종료 시 false. 이벤트 등록 가능 여부 판단에 사용 (`addListener` 는 false 면 throw).
- hostUrl: string (getter) — `http(s)://host:port` 형태의 HTTP 베이스 URL. `ssl` 이 true 면 https. 파일 업/다운로드가 이 URL 을 베이스로 사용.
- connect(): Promise\<void\> — 서버에 WebSocket 연결. 초기 연결 실패 시 throw. 통신(서비스 호출·이벤트 등록) 전에 반드시 1회 호출.
- close(): Promise\<void\> — 연결 수동 종료(이후 자동 재연결 안 함) 및 프로토콜 워커 자원 해제. 종료한 인스턴스는 재사용하지 말 것.
- send(serviceName, methodName, params, progress?): Promise\<unknown\> — 저수준 서비스 호출. `serviceName.methodName` 메시지를 보내고 응답 반환. 보통 `getService` 프록시로 간접 호출. progress 인자를 주지 않아도 client 의 `request/response/server-progress` 이벤트는 항상 발생.
- auth(token): Promise\<void\> — 인증 토큰 전송 후 내부 보관. 보관 토큰은 재연결 시 자동 재인증·파일 업로드 Bearer 인증에 재사용.
- getService / getEvent / addListener / removeListener / emitEvent / uploadFile / downloadFileBuffer — 아래 각 섹션 참조.

```ts
const client = createServiceClient("my-app", { host: "localhost", port: 50080, ssl: false });
await client.connect();
await client.auth(jwtToken);
```

**ServiceClientEvents** (EventEmitter 이벤트):

- "request-progress": ServiceProgressState — 요청(업로드) 청크 진행률. 요청 본문이 청크 2개 이상으로 분할될 때만 발생.
- "response-progress": ServiceProgressState — 응답(다운로드) 청크 수신 진행률. 분할 응답 완료 시 100% 한 번 더 보고.
- "server-progress": ServiceProgressState — 서버가 처리 중 직접 보고하는 진행률(서버측 `progress` 메시지 수신 시).
- "state": "connected" | "closed" | "reconnecting" — 연결 상태 변화. "connected" = 연결/재연결 성공(이 전이 시 보관 토큰으로 자동 재인증 + 이벤트 리스너 자동 복구), "closed" = 정상 종료 또는 재연결 한도 초과, "reconnecting" = 재연결 시도 중. 오프라인 배너 토글 등에 사용.

```ts
client.on("state", (s) => { if (s === "reconnecting") showOfflineBanner(); });
```

## ServiceConnectionOptions

`createServiceClient` 의 두 번째 인자.

- port: number — 서버 포트. 필수.
- host: string — 서버 호스트. 필수.
- ssl?: boolean — TLS 사용 여부. true 면 `wss`/`https`, false·미지정이면 `ws`/`http`. TLS 서버에 붙을 때만 true.
- maxReconnectCount?: number — 연결 끊김 시 최대 재연결 시도 횟수. 미지정 시 10. 0 이면 재연결 비활성화(끊기면 즉시 포기). 테스트·단발성 연결이면 0.

## getService / ServiceProxy

서버 서비스 인터페이스의 각 메서드를 `Promise` 반환 함수로 노출하는 타입 안전 프록시.

`getService<TService>(serviceName): ServiceProxy<TService>` — `serviceName` 으로 등록된 서버 서비스의 프록시 반환. 프록시 메서드 호출은 내부적으로 `client.send(serviceName, 메서드명, 인자배열)` 로 위임.

- TService — 서버 서비스 메서드 인터페이스 타입. 컴파일 타임 시그니처 검증용(런타임 검증 아님). 앱에선 server 패키지가 export 한 `ServiceMethods<typeof XxxService>` 사용.
- serviceName: string — 서버의 `defineService("XxxName", ...)` 이름과 일치해야 함.
- ServiceProxy\<TService\> — TService 의 각 함수 멤버를 `(...args) => Promise<Awaited<R>>` 로 매핑. 함수 아닌 속성은 `never` 로 제외.

```ts
const svc = client.getService<TestServiceMethods>("TestService");
const result = await svc.echo("hi"); // 서버 TestService.echo("hi") 호출, Promise<string>
```

## 이벤트 구독·발행 (addListener / removeListener / emitEvent / getEvent)

서버 푸시 이벤트는 `@simplysm/service-common` 의 `defineEvent` 산출물(`ServiceEventDef`. `$info` = 구독 필터 정보 타입, `$data` = 페이로드 타입) 단위로 다룬다. 등록한 리스너는 재연결 시 자동 복구됨.

`addListener<TEventDef>(eventDef, info, cb): Promise<string>` — 리스너 등록. 미연결(`connected === false`)이면 throw. 반환 key 로 나중에 제거.

- eventDef: TEventDef — 이벤트 정의(`defineEvent` 결과). `$info`/`$data` 타입의 출처.
- info: TEventDef["$info"] — 이 구독을 식별·필터링할 정보. 서버가 emit 대상 선별에 사용.
- cb: (data: $data) => PromiseLike\<void\> — 이벤트 수신 콜백. 콜백 내 예외는 로깅만 되고 호출부로 전파되지 않음.

`removeListener(key): Promise<void>` — 등록 key 로 리스너 제거. 서버 전송 실패(연결 끊김 등)는 무시(서버가 끊김 시 리스너를 자동 정리하므로 안전).

`emitEvent<TEventDef>(eventDef, infoSelector, data): Promise<void>` — 이벤트 발행. 서버에서 동일 이벤트 구독자 목록을 조회한 뒤 `infoSelector(info)` 가 true 인 대상에게만 data 전송.

- infoSelector: (item: $info) => boolean — 발행 대상 구독자를 info 기준으로 필터. true 반환 구독자에게만 전달.
- data: TEventDef["$data"] — 전송 페이로드.

`getEvent<TEventDef>(eventDef): ClientEventProxy<TEventDef>` — 특정 eventDef 에 바인딩된 프록시 반환. eventDef 를 매번 넘기지 않고 짧게 쓰려 할 때(앱의 `AppServiceProvider.xxxEvent` getter 패턴).

`ClientEventProxy<TEventDef>` 멤버: `addListener(info, cb)`, `removeListener(key)`, `emit(infoSelector, data)` — 위 client 메서드의 eventDef 고정판.

```ts
const chatEvent = defineEvent<{ channel: string }, string>("Chat");
const key = await client.addListener(chatEvent, { channel: "room1" }, async (msg) => render(msg));
await client.emitEvent(chatEvent, (info) => info.channel === "room1", "hello");
await client.removeListener(key);
```

`EventClient` / `createEventClient(transport)` 는 `ServiceClient` 가 내부 조립에 쓰는 저수준 구현. 위 메서드에 더해 `resubscribeAll(): Promise<void>`(보관된 모든 리스너를 서버에 재등록, 재연결 복구용)를 가짐. 일반 사용에선 직접 만들지 않음.

## 파일 업/다운로드 (uploadFile / downloadFileBuffer)

`uploadFile(files): Promise<ServiceUploadResult[]>` — `POST <hostUrl>/upload` (multipart/form-data) 로 파일 업로드. 보관 토큰을 `Authorization: Bearer` 헤더로 전송하므로 사전 `auth()` 필수(미인증 시 throw). 응답 비정상 시 throw.

- files: `File[] | FileCollection | { name: string; data: BlobInput }[]` — 업로드 대상. 브라우저 `File` 배열, `FileCollection`(FileList 호환), 또는 `{ name, data }` 커스텀 객체 배열. 커스텀 객체의 data 가 `Blob` 이 아니면 `new Blob([data])` 로 감싸 전송.

`downloadFileBuffer(relPath): Promise<Bytes>` — `<hostUrl>/<relPath>` 를 GET 해 `Uint8Array` 반환. 응답 비정상(`!res.ok`) 시 throw.

- relPath: string — 서버 기준 상대경로. 선행 `/` 유무 모두 허용(없으면 자동으로 `/` 추가).

```ts
await client.auth(token);
const results = await client.uploadFile([{ name: "a.txt", data: "hello" }]);
const bytes = await client.downloadFileBuffer("/files/a.txt");
```

`FileClient` / `createFileClient(hostUrl, clientName)` 는 `ServiceClient` 내부 구현. `download(relPath)` / `upload(files, authToken)` 두 메서드를 가지며 직접 생성은 보통 불필요.

## 진행률 (ServiceProgress / ServiceProgressState)

대용량 요청/응답이 청크로 분할될 때 진행 상황을 보고하는 콜백·상태 타입.

`ServiceProgress` — `send(..., progress)` 에 넘기는 콜백 집합(해당 호출 단건 추적용, 전역 이벤트와 별개). 각 콜백은 `(s: ServiceProgressState) => void`:

- request? — 요청 청크 업로드 진행 시 호출. 요청 청크가 2개 이상일 때만 발생.
- response? — 응답 청크 수신 진행 시 호출. 분할 응답이었으면 완료 시 100%(`completedSize === totalSize`)를 한 번 더 보고.
- server? — 서버가 처리 중 보고한 진행률 수신 시 호출(`name: "progress"` 메시지).

`ServiceProgressState` — 진행률 스냅샷.

- uuid: string — 해당 요청/응답 식별자. 동시 요청 구분용.
- totalSize: number — 전체 바이트 수.
- completedSize: number — 완료 바이트 수. `completedSize === totalSize` 면 완료.

전역 추적이면 콜백 대신 ServiceClient 의 `request/response/server-progress` 이벤트(`client.on("response-progress", ...)`)를 써도 됨 — `send` 는 progress 인자 유무와 무관하게 이 이벤트들을 항상 발생시킴.

## 환경 호환 타입·헬퍼 (browser-compat)

Node/browser 공용 코드에서 DOM 전용 타입을 피하고 Worker 지원 여부를 분기하기 위한 타입·함수. 프로토콜 인코딩/파싱 Worker 오프로딩 판단 시 내부에서 사용.

- BlobInput = `Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string` — `Blob` 생성자가 받는 데이터 타입(DOM `BlobPart` 대체). `uploadFile` 의 커스텀 객체 data 타입.
- FileCollection (interface) — DOM `FileList` 대체. `length`, `item(index): File | null`, 인덱스 접근, `[Symbol.iterator]` 보유. 브라우저 `FileList` 와 구조적 호환.
- BrowserWorker (interface) — DOM `Worker` 최소 인터페이스(`onmessage`/`onerror` 핸들러, `postMessage(message, transfer?)`, `terminate()`). DOM lib 없이 타입체크 통과용.
- isBrowserWorkerSupported(): boolean — `globalThis` 에 `Worker` 존재 여부. 브라우저 DOM Worker 가용 판단.
- isNodeWorkerSupported(): boolean — `process.versions.node` 존재 여부. Node `worker_threads` 가용 판단.
- isWorkerSupported(): boolean — 위 둘 중 하나라도 true. 프로토콜 인코딩/파싱 오프로딩 가능 여부 판단(미지원 시 메인 스레드 폴백).
