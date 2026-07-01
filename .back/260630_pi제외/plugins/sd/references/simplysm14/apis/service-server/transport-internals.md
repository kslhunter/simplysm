# @simplysm/service-server — 전송 계층 내부

`ServiceServer.listen()`이 내부에서 엮는 실행기, HTTP/WebSocket/업로드/정적 파일 핸들러, 프로토콜 래퍼, 설정 캐시를 직접 테스트·확장할 때 같이 읽는 묶음이다. SSG 정적 셸 fallback 맥락: [client-ssg.md](../../manuals/client-ssg.md).

## executeServiceMethod

```ts
function executeServiceMethod(
  server: ServiceServer,
  def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
    http?: { clientName: string; authTokenPayload?: AuthTokenPayload };
  },
): Promise<unknown>;
```

- `server: ServiceServer` — `options.services`와 `options.auth`를 읽을 서버 인스턴스.
- `def.serviceName: string` — `ServiceDefinition.names`에 포함되는 이름으로 서비스를 찾는다. 없으면 `"서비스 [...]를 찾을 수 없습니다."`를 throw한다.
- `def.methodName: string` — 팩토리가 반환한 메서드 객체에서 찾을 키. 값이 함수가 아니면 `"메서드 [<service>.<method>]를 찾을 수 없습니다."` 형식 오류를 throw한다.
- `def.params: unknown[]` — 찾은 메서드에 spread로 전달할 인자 배열.
- `def.socket?: ServiceSocket` — WebSocket 요청 출처. 컨텍스트 생성과 인증 토큰 조회에 쓰인다.
- `def.socket.clientName: string` — 소켓 요청 클라이언트 이름. `..`, `/`, `\\`가 포함되면 보안 오류로 throw한다.
- `def.http?: { clientName; authTokenPayload? }` — HTTP 요청 출처. `clientName`은 보안 검사와 컨텍스트 생성에, `authTokenPayload`는 인증 검사에 쓰인다.
- `def.http.clientName: string` — HTTP 요청 클라이언트 이름. `..`, `/`, `\\`가 포함되면 보안 오류로 throw한다.
- `def.http.authTokenPayload?: AuthTokenPayload` — 로그인·역할 검사에 쓰는 HTTP 토큰 페이로드.
- 인증 순서 — 메서드 `auth` 권한이 있으면 그것을 쓰고, 없으면 서비스 수준 `authPermissions`를 쓴다. 권한 메타가 있고 `auth` 옵션이 `undefined`면 설정 오류, `false`면 인증 검사를 건너뛴다.

## ServiceSocket / createServiceSocket

```ts
interface ServiceSocket {
  readonly connectedAtDateTime: DateTime;
  readonly clientName: string;
  readonly connReq: FastifyRequest;
  authTokenPayload?: AuthTokenPayload;
  close(): void;
  send(uuid: string, msg: ServiceServerMessage): Promise<number>;
  addListener(key: string, eventName: string, info: unknown): void;
  removeListener(key: string): void;
  getEventListeners(eventName: string): Array<{ key: string; info: unknown }>;
  filterEventTargetKeys(targetKeys: string[]): string[];
  on(event: "error", handler: (err: Error) => void): void;
  on(event: "close", handler: (code: number) => void): void;
  on(event: "message", handler: (data: { uuid: string; msg: ServiceClientMessage }) => void): void;
}

function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket;
```

- `socket: WebSocket` — 원시 `ws` 소켓. close/error/message/pong 이벤트가 등록된다.
- `clientId: string` — 생성 시그니처의 연결 식별자. 이 함수는 반환 객체에 저장하지 않고, 상위 `WebSocketHandler`가 소켓 map key로 사용한다.
- `clientName: string` — 반환 객체의 `clientName`으로 노출되고 서비스 컨텍스트의 클라이언트 이름 출처가 된다.
- `connReq: FastifyRequest` — 반환 객체의 원본 연결 요청.
- `connectedAtDateTime: DateTime` — wrapper 생성 시각.
- `authTokenPayload?: AuthTokenPayload` — `auth` 메시지 검증 뒤 저장되는 소켓 인증 페이로드.
- `close()` — 원시 소켓을 `terminate()`한다.
- `send(uuid, msg)` — 서버 메시지를 protocol wrapper로 encode해 chunk들을 전송하고 전송 바이트 수를 반환한다. 소켓이 open이 아니면 `0`을 반환한다.
- `uuid: string` — 요청·응답 상관관계 ID. progress/error/response 전송에도 같이 쓰인다.
- `msg: ServiceServerMessage` — 클라이언트로 보낼 서버 메시지.
- `addListener(key, eventName, info)` — 이 소켓의 이벤트 리스너 목록에 항목을 추가한다.
- `key: string` — 리스너 식별자. 제거와 대상 필터링에 쓰인다.
- `eventName: string` — 구독 이벤트 이름. `getEventListeners(eventName)` 필터 기준이다.
- `info: unknown` — 이벤트 발생 시 `infoSelector`가 검사할 구독 메타데이터.
- `removeListener(key)` — 같은 key를 가진 첫 리스너를 제거한다.
- `getEventListeners(eventName)` — 해당 이벤트 이름의 `{ key, info }` 목록만 반환한다.
- `filterEventTargetKeys(targetKeys)` — 입력 key 중 이 소켓 리스너에 존재하는 key만 반환한다.
- `targetKeys: string[]` — 후보 리스너 key 배열.
- 이벤트 리터럴 `"error"` — 원시 소켓 error를 받은 뒤 `Error`를 handler에 전달한다.
- 이벤트 리터럴 `"close"` — close 시 ping timer와 protocol을 정리한 뒤 close code를 handler에 전달한다.
- 이벤트 리터럴 `"message"` — protocol decode가 완료된 클라이언트 메시지 `{ uuid, msg }`를 handler에 전달한다.
- 연결 유지 — 5초마다 WebSocket ping을 보내고 pong을 받지 못한 주기에는 소켓을 terminate한다. 1바이트 `0x01` 메시지는 `0x02` 응답으로 처리된다.

## WebSocketHandler / createWebSocketHandler

```ts
interface WebSocketHandler {
  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void;
  closeAll(): void;
  emit<TEventDef extends ServiceEventDef>(
    eventName: string,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
}

function createWebSocketHandler(
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
  }) => Promise<unknown>,
  jwtSecret: string | undefined,
): WebSocketHandler;
```

- `runMethod` — 서비스 RPC 메시지를 실제 메서드 실행으로 넘기는 함수. 보통 `executeServiceMethod`를 서버에 바인딩한다.
- `runMethod.def.serviceName: string` — 메시지 이름의 첫 `.` 앞부분.
- `runMethod.def.methodName: string` — 메시지 이름의 첫 `.` 뒷부분.
- `runMethod.def.params: unknown[]` — 메시지 body 배열.
- `runMethod.def.socket?: ServiceSocket` — 요청 소켓 컨텍스트.
- `jwtSecret: string | undefined` — 소켓 `auth` 메시지 검증에 쓰는 시크릿. 없는데 `auth` 메시지가 오면 오류 응답이 된다.
- `addSocket(socket, clientId, clientName, connReq)` — 같은 `clientId`의 기존 소켓을 닫고 새 `ServiceSocket`을 등록한다. 생성 중 예외가 나면 원시 소켓을 terminate한다.
- `closeAll()` — 등록된 모든 service socket을 닫는다.
- `emit(eventName, infoSelector, data)` — 전체 소켓의 해당 이벤트 구독을 모아 `infoSelector`로 거른 key에만 `evt:on` 메시지를 보낸다.
- 처리 메시지 `"<service>.<method>"` — body 배열을 RPC params로 보고 `runMethod` 결과를 `response`로 보낸다.
- 처리 메시지 `"evt:add"` — body의 `key`, `name`, `info`로 리스너를 추가한다.
- 처리 메시지 `"evt:remove"` — body의 `key`로 리스너를 제거한다.
- 처리 메시지 `"evt:gets"` — body의 `name` 이벤트 리스너 info들을 모아 응답한다.
- 처리 메시지 `"evt:emit"` — body의 `keys`, `data`를 대상 소켓에 `evt:on`으로 전달한다.
- 처리 메시지 `"auth"` — body 토큰을 `verifyJwt(jwtSecret, token)`으로 검증해 소켓 `authTokenPayload`에 저장한다.
- 오류 응답 코드 `"BAD_MESSAGE"` — 알려진 메시지 형식이 아닐 때 보낸다.
- 오류 응답 코드 `"INTERNAL_ERROR"` — 처리 중 예외가 발생했을 때 보낸다. `DEV` 환경이면 stack도 포함한다.

## handleHttpRequest

```ts
function handleHttpRequest<TAuthInfo = unknown>(
  req: FastifyRequest,
  reply: FastifyReply,
  jwtSecret: string | undefined,
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    http: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> };
  }) => Promise<unknown>,
): Promise<void>;
```

- `req: FastifyRequest` — `params.service`, `params.method`, headers, query/body, method를 읽는 요청 객체.
- `reply: FastifyReply` — 인증 실패·잘못된 요청·지원하지 않는 메서드·성공 응답을 전송할 응답 객체.
- `jwtSecret: string | undefined` — Authorization 헤더가 있을 때 토큰 검증에 쓰는 시크릿. 헤더가 있는데 시크릿이 없으면 401 응답이다.
- `runMethod` — 파싱된 서비스명·메서드명·params·HTTP 컨텍스트를 실행하는 함수.
- `serviceName: string` — URL params의 `service` 값.
- `methodName: string` — URL params의 `method` 값.
- `params: unknown[]` — GET `json` 쿼리 또는 POST 배열 body에서 만든 메서드 인자 배열.
- `http.clientName: string` — `x-sd-client-name` 헤더 값. 없으면 throw한다.
- `http.authTokenPayload?: AuthTokenPayload<TAuthInfo>` — Authorization 검증 성공 시 전달되는 페이로드.
- GET — `req.query.json` 문자열이 필수이고 `json.parse` 결과를 params로 쓴다.
- POST — body가 배열이어야 하며 아니면 400 `잘못된 요청` 응답을 보낸다.
- 그 외 method — 405 `Method Not Allowed` 응답을 보낸다.

## handleUpload

```ts
function handleUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  jwtSecret: string | undefined,
): Promise<void>;
```

- `req: FastifyRequest` — multipart 여부, Authorization 헤더, parts stream을 읽는 요청 객체.
- `reply: FastifyReply` — 400/401/500 또는 성공 결과를 전송할 응답 객체.
- `rootPath: string` — 업로드 저장 기준 경로. 파일은 `rootPath/www/uploads/<uuid><ext>`에 저장된다.
- `jwtSecret: string | undefined` — 업로드 인증 토큰 검증 시크릿. 없거나 토큰이 없거나 검증 실패하면 401 응답이다.
- 성공 반환 body — `ServiceUploadResult[]` 형태의 `{ path, filename, size }` 배열.
- `path: string` — `uploads/<uuid><ext>` 상대 경로.
- `filename: string` — multipart 원본 파일명.
- `size: number` — 저장된 파일 크기.
- 실패 처리 — 저장 중 현재 파일 또는 이미 저장된 파일을 삭제 시도한 뒤 500 `업로드 실패`를 보낸다.

## handleStaticFile

```ts
function handleStaticFile(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  urlPath: string,
): Promise<void>;
```

- `req: FastifyRequest` — 디렉터리 redirect URL 계산에 원본 `raw.url`을 쓴다.
- `reply: FastifyReply` — redirect, `sendFile`, HTML 오류 응답을 전송한다.
- `rootPath: string` — 정적 파일 루트 기준. 허용 루트는 `rootPath/www`다.
- `urlPath: string` — 요청 pathname에서 앞 `/`를 제거한 경로. `rootPath/www/urlPath`로 resolve한다.
- 경로 보안 — 대상이 `rootPath/www`도 아니고 그 하위도 아니면 `"접근이 거부되었습니다"`를 throw한다.
- 디렉터리 — 루트가 아닌 디렉터리 요청이 `/`로 끝나지 않으면 slash를 붙여 redirect하고, 이후 `index.html`을 전송 대상으로 삼는다.
- 숨김 파일 — basename이 `.`으로 시작하면 403 HTML 응답을 보낸다.
- 파일 없음 — 확장자 없는 경로면 현재 위치에서 `www` 루트까지 거슬러 가장 가까운 `index.csr.html`을 찾아 전송한다. 없거나 확장자 있는 요청이면 404 HTML 응답이다.
- 그 외 전송 실패 — 500 HTML 응답을 보낸다.

## ServerProtocolWrapper / createServerProtocolWrapper

```ts
interface ServerProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}

function createServerProtocolWrapper(): ServerProtocolWrapper;
```

- `encode(uuid, message)` — 메시지를 protocol chunks로 인코딩한다.
- `uuid: string` — protocol message ID.
- `message: ServiceMessage` — 인코딩할 서비스 메시지. `body`가 `Uint8Array`이거나 배열 안에 `Uint8Array`가 있으면 worker로 위임한다.
- 반환 `chunks: Bytes[]` — 전송할 byte chunk 배열.
- 반환 `totalSize: number` — protocol encode 결과의 전체 크기.
- `decode(bytes)` — 수신 bytes를 누적·파싱한다.
- `bytes: Bytes` — 수신 chunk. 청크 재조립은 항상 메인 스레드 누적기에서 한다.
- 진행 반환 — 재조립 중이면 `type: "progress"` 결과를 반환한다.
- 완료 반환 — 재조립 완료 후 payload가 30KB를 초과하면 worker에서 JSON parse, 아니면 메인 스레드에서 parse한다.
- `dispose()` — 내부 protocol 리소스를 해제한다.

## getConfig

```ts
function getConfig<TConfig>(filePath: string): Promise<TConfig | undefined>;
```

- `TConfig` — JSON 파일 내용을 받을 타입 파라미터.
- `filePath: string` — 읽고 감시할 JSON 설정 파일 경로.
- 반환 `TConfig | undefined` — 파일이 없으면 `undefined`, 있으면 JSON을 읽어 캐시에 저장한 값을 반환한다.
- 캐시 — 같은 `filePath`가 cache hit이면 즉시 반환하고 접근 시간이 갱신된다.
- 파일 감시 — 최초 로드 후 watcher를 등록하고 변경 시 JSON을 다시 읽어 캐시를 교체한다. 파일이 삭제되면 캐시와 watcher를 제거한다.
- 만료 — 1시간 무접근이면 캐시가 만료되고 watcher가 닫힌다.
