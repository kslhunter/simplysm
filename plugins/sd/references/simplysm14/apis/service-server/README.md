# @simplysm/service-server

Fastify 기반 서비스 서버: 부트스트랩·서비스 작성·JWT 인증·서버 이벤트 발생·내장 ORM/자동업데이트·전송 계층 구성.

## 사용 트리거 인덱스

- **서버 부트스트랩·구성** — 서버 옵션 설정, SSL/TLS(Let's Encrypt/자체 인증서), 인증 설정, 포트 바인딩으로 서버를 초기화할 때.
- **서비스 정의·작성** — 서비스와 메서드를 정의하고, 인증 권한 지정으로 RPC 엔드포인트를 구성할 때.
- **JWT 토큰 관리** — JWT 토큰 서명·검증·디코딩으로 클라이언트 인증을 구현할 때.
- **WebSocket 연결 관리** — 양방향 소켓 연결, 이벤트 리스너 등록·제거, 메시지 송수신을 다룰 때.
- **HTTP 요청·응답** — 서비스 메서드 호출(GET/POST), Authorization 헤더 파싱, 클라이언트 이름 추적을 다룰 때.
- **파일 업로드·다운로드** — 멀티파트 파일 업로드, 정적 파일 서빙, SPA 폴백(index.csr.html)을 구성할 때.
- **메시지 프로토콜** — 바이너리 메시지 인코딩/디코딩, 청크 재조립, worker 스레드 위임을 다룰 때.
- **내장 ORM 서비스** — 원격 DB 연결, 트랜잭션, ORM 쿼리 실행을 클라이언트에 노출할 때.
- **자동 업데이트 서비스** — 클라이언트 플랫폼별 최신 APK/EXE 버전 조회 및 다운로드 경로 제공.
- **설정 파일 관리** — JSON 기반 설정 파일(`.config.json`) 로드·캐싱·감시를 다룰 때.
- **서버 이벤트 발생** — 클라이언트에 실시간 푸시 이벤트 발생, 조건 기반 필터링을 할 때. 사용법: [event.md](../../manuals/event.md)
- **V1 레거시 호환** — v1 클라이언트의 자동 업데이트 요청 처리, 사용자 정의 핸들러 추가.

## 서버 부트스트랩·구성

### ServiceServerOptions

서버 생성 옵션. 필수 항목:

- rootPath: string — 정적 파일·클라이언트 디렉토리 루트(`www/` 자동 추가). 예: `/var/app`.
- port: number — 바인딩 포트.
- ssl?: 선택사항. 다음 중 하나:
  - pfxBytes + passphrase?: Uint8Array + string — PKCS#12 인증서 바이너리.
  - pemKeyBytes + certBytes + caBytes? + passphrase?: Uint8Array — PEM 형식 키·인증서·CA 바이너리.
  - letsencrypt: 도메인·이메일·DNS-01(Cloudflare) 옵션으로 Let's Encrypt 자동 발급.
- auth?: 인증 설정. `{ jwtSecret: string }` 또는 `false` (의도적 비활성화). 미지정 시 로그인 불요.
- services: ServiceDefinition[] — 노출할 서비스 정의 배열.
- legacyV1Handlers?: V1RequestHandler[] — V1 클라이언트 호환용 사용자 정의 핸들러.

### ServiceServer

메인 서버 클래스.

```typescript
class ServiceServer<TAuthInfo = unknown> {
  isOpen: boolean;
  fastify: FastifyInstance;
  constructor(options: ServiceServerOptions);
  async listen(): Promise<void>;
  async close(): Promise<void>;
  getEvent<TEventDef>(eventDef: TEventDef): ServerEventProxy<TEventDef>;
  async emitEvent<TEventDef>(eventDef: TEventDef, infoSelector, data): Promise<void>;
  async signAuthToken(payload: AuthTokenPayload<TAuthInfo>, expiresHours?): Promise<string>;
  async verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>;
}
```

- isOpen: boolean — 서버 수신 중 플래그.
- fastify: FastifyInstance — 내부 Fastify 인스턴스 (플러그인·라우트 커스터마이징용).
- listen() — 포트 바인딩 및 웹소켓/HTTP 라우트 등록. Let's Encrypt는 리슨 후 인증서 확보 (하이브리드 기동).
- close() — 연결 종료 및 리소스 해제.
- getEvent(eventDef) — 주어진 이벤트 정의로 ServerEventProxy 반환 (타입 안전한 이벤트 발생용).
- emitEvent(eventDef, infoSelector, data) — 조건 선택자로 일치하는 클라이언트에 이벤트 발생.
- signAuthToken(payload, expiresHours) — JWT 서명 (기본값 12시간 유효).
- verifyAuthToken(token) — JWT 검증 및 페이로드 추출.

### createServiceServer

서버 생성 팩토리.

```typescript
function createServiceServer<TAuthInfo = unknown>(
  options: ServiceServerOptions,
): ServiceServer<TAuthInfo>;
```

타입 매개변수 TAuthInfo로 인증 정보 타입 지정 가능.

## 서비스 정의·작성

### ServiceDefinition

서비스 정의 인터페이스.

```typescript
interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  names: string[];
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}
```

- name: string — 주(Primary) 서비스 이름.
- names: string[] — 서비스 이름 배열 (별칭 지원).
- factory: (ctx: ServiceContext) => TMethods — 컨텍스트를 받아 메서드 객체 반환하는 팩토리.
- authPermissions?: string[] — 서비스 수준 기본 인증 권한 (미지정 시 public).

### defineService

서비스 정의 헬퍼.

```typescript
function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string | string[],
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods>;
```

- name: 주 이름 또는 이름 배열 (첫 번째가 주 이름).
- factory: 서비스 메서드 객체를 반환하는 함수. auth() 래핑 시 권한이 자동 추출됨.

### auth

서비스·메서드 수준 인증 래퍼.

```typescript
function auth<TFunction extends (...args: any[]) => any>(fn: TFunction): TFunction;
function auth<TFunction extends (...args: any[]) => any>(
  permissions: string[],
  fn: TFunction,
): TFunction;
```

- 권한 미지정: 로그인만 필요.
- permissions 지정: 해당 권한 중 하나 이상 필요 (roles 배열에 포함).
- 서비스 수준: 모든 메서드에 적용. 메서드 수준: 특정 메서드만 적용 (메서드가 우선).

### ServiceContext

서비스 메서드 실행 시 전달되는 컨텍스트.

```typescript
interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> };
  legacy?: { clientName?: string };
  get authInfo(): TAuthInfo | undefined;
  get clientName(): string | undefined;
  get clientPath(): string | undefined;
  getConfig<T>(section: string): Promise<T>;
}
```

- server: ServiceServer — 현재 서버 인스턴스.
- socket: ServiceSocket (선택) — 웹소켓 연결 (WebSocket 요청 시에만).
- http: { clientName, authTokenPayload? } (선택) — HTTP 요청 메타데이터.
- legacy: { clientName? } (선택) — V1 레거시 컨텍스트.
- authInfo: getter — 현재 요청의 인증 정보 (socket 또는 http에서 추출).
- clientName: getter — 클라이언트 이름 (검증 및 경로 정규화). 유효성: `..`, `/`, `\` 검사.
- clientPath: getter — 클라이언트 디렉토리 절대경로 (`rootPath/www/{clientName}`).
- getConfig(section): Promise<T> — `.config.json` 로드 및 병합. rootPath와 clientPath 설정 모두 확인, clientPath가 우선.

### getServiceAuthPermissions

함수에서 인증 권한 추출.

```typescript
function getServiceAuthPermissions(fn: Function): string[] | undefined;
```

auth() 래핑 없으면 undefined 반환.

### ServiceMethods

ServiceDefinition에서 메서드 타입 추출.

```typescript
type ServiceMethods<TDefinition> = TDefinition extends ServiceDefinition<infer M> ? M : never;
```

클라이언트에서 타입 공유 시 사용.

## JWT 토큰 관리

### AuthTokenPayload

JWT 페이로드 타입.

```typescript
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];
  data: TAuthInfo;
}
```

- roles: string[] — 역할 배열 (권한 확인에 사용).
- data: TAuthInfo — 사용자 정의 인증 정보 (제네릭 타입).

### signJwt

JWT 토큰 서명.

```typescript
async function signJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  payload: AuthTokenPayload<TAuthInfo>,
  expiresHours?: number,
): Promise<string>;
```

- jwtSecret: string — 비밀키.
- payload: 페이로드 (roles, data).
- expiresHours: number — 만료 시간 (기본값 12시간).
- 알고리즘: HS256 (HMAC SHA-256).

### verifyJwt

JWT 토큰 검증.

```typescript
async function verifyJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  token: string,
): Promise<AuthTokenPayload<TAuthInfo>>;
```

- 유효하지 않거나 만료된 토큰은 Error throw.
- 만료 시: "토큰이 만료되었습니다."
- 검증 실패 시: "유효하지 않은 토큰입니다."

### decodeJwt

JWT 토큰 디코딩 (검증 없음).

```typescript
function decodeJwt<TAuthInfo = unknown>(token: string): AuthTokenPayload<TAuthInfo>;
```

토큰 내용 확인용 (검증이 필요하면 verifyJwt 사용).

## WebSocket 연결 관리

### WebSocketHandler

여러 WebSocket 연결을 관리하는 인터페이스.

```typescript
interface WebSocketHandler {
  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void;
  closeAll(): void;
  emit<TEventDef extends ServiceEventDef>(
    eventName: string,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
}
```

- addSocket() — 새 연결 추가 및 기존 연결 자동 해제.
- closeAll() — 모든 연결 종료.
- emit() — 조건 선택자에 일치하는 클라이언트에 이벤트 발생.

### ServiceSocket

단일 WebSocket 연결 관리.

```typescript
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
  on(event: "error" | "close" | "message", handler: (...args: any[]) => void): void;
}
```

- connectedAtDateTime: DateTime — 연결 시각.
- clientName: string — 클라이언트 이름.
- connReq: FastifyRequest — 원본 HTTP 업그레이드 요청.
- authTokenPayload?: AuthTokenPayload — 인증 토큰 (미인증 시 undefined).
- close() — 연결 종료.
- send(uuid, msg) — 메시지 전송 (uuid = 요청 ID). 전송 바이트 크기 반환. uuid는 클라이언트가 응답 매칭용으로 사용.
- addListener(key, eventName, info) — 이벤트 리스너 등록 (key = 고유 식별자, info = 필터 정보).
- removeListener(key) — 리스너 제거.
- getEventListeners(eventName) — 특정 이벤트의 모든 리스너 조회.
- filterEventTargetKeys(targetKeys) — 이 소켓의 리스너에 존재하는 키만 필터링.
- on() — 에러/종료/메시지 이벤트 핸들러 등록.

### createWebSocketHandler

WebSocketHandler 생성 팩토리.

```typescript
function createWebSocketHandler(
  runMethod: (def: { serviceName; methodName; params; socket? }) => Promise<unknown>,
  jwtSecret: string | undefined,
): WebSocketHandler;
```

- runMethod: 서비스 메서드 실행 콜백 (클라이언트 요청 라우팅).
- jwtSecret: JWT 검증용 비밀키 (인증 메시지 처리).

### createServiceSocket

ServiceSocket 생성 팩토리.

```typescript
function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket;
```

- clientId: 고유한 클라이언트 식별자 (같은 클라이언트의 중복 연결 감지용).
- Ping/Pong 5초 주기로 수행 (연결 유지 감지).

## HTTP 요청·응답

### handleHttpRequest

HTTP GET/POST 서비스 요청 핸들러.

```typescript
async function handleHttpRequest<TAuthInfo = unknown>(
  req: FastifyRequest,
  reply: FastifyReply,
  jwtSecret: string | undefined,
  runMethod: (def: {
    serviceName;
    methodName;
    params;
    http: { clientName; authTokenPayload? };
  }) => Promise<unknown>,
): Promise<void>;
```

- 라우트: `GET/POST /api/:service/:method`.
- GET: `?json=<JSON 배열>` 쿼리 파라미터로 인자 전달.
- POST: 요청 본문 배열이 인자.
- 헤더:
  - `x-sd-client-name`: 필수. 클라이언트 이름.
  - `Authorization: Bearer <token>`: 선택사항. JWT 토큰 (검증 시 401 응답).
- 성공 시 응답: 메서드 결과를 JSON 직렬화.
- 실패 시: 401/400/405 상태코드로 에러 JSON 응답.

## 파일 업로드·다운로드

### handleUpload

멀티파트 파일 업로드 핸들러.

```typescript
async function handleUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  jwtSecret: string | undefined,
): Promise<void>;
```

- 라우트: `POST /upload`.
- 인증 필수: Authorization 헤더 JWT 검증.
- 파일 저장: `rootPath/www/uploads/<UUID>.<ext>`.
- 응답: `{ path, filename, size }[]` 배열 (각 파일 메타데이터).
- 에러 시: 업로드 중단 후 저장된 파일 정리.

### handleStaticFile

정적 파일 서빙 핸들러 (SPA 폴백 포함).

```typescript
async function handleStaticFile(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  urlPath: string,
): Promise<void>;
```

- 루트: `rootPath/www/`.
- 경로 보안: `..` 등 경로 탐색 공격 차단.
- 디렉토리: 슬래시 리다이렉트 (표준 웹 서버 동작), index.html 자동 조회.
- 숨김 파일 (`.`로 시작): 403 거부.
- 파일 없음: 확장자 없는 경로는 부모 디렉토리부터 루트까지 거슬러 `index.csr.html`(SPA 셸) 검색. 없으면 404.

## 메시지 프로토콜

### ServerProtocolWrapper

메시지 인코딩/디코딩 래퍼 (worker 스레드 위임).

```typescript
interface ServerProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
```

- encode() — 메시지 바이너리 인코딩 (청크 배열 반환). Uint8Array나 배열 내 Uint8Array 포함 시 worker 자동 위임.
- decode() — 바이너리 디코딩 및 누적 재조립 (stateful, 메인 스레드 고정). 30KB 이상 JSON 파싱은 worker 위임.
- dispose() — 리소스 해제.

### createServerProtocolWrapper

프로토콜 래퍼 팩토리.

```typescript
function createServerProtocolWrapper(): ServerProtocolWrapper;
```

Worker 풀은 지연 싱글턴 (첫 사용 시 생성, maxOldGenerationSizeMb: 4096).

## 내장 ORM 서비스

### OrmService

원격 DB 연결 및 쿼리 실행 서비스 (WebSocket 전용).

```typescript
const OrmService = defineService(["Orm", "SdOrmService"], auth((ctx) => ({
  async getInfo(opt: DbConnOptions & { configName: string }): Promise<{ dialect, database?, schema? }>;
  async connect(opt: DbConnOptions & { configName: string }): Promise<number>;
  async close(connId: number): Promise<void>;
  async beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  async commitTransaction(connId: number): Promise<void>;
  async rollbackTransaction(connId: number): Promise<void>;
  async executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  async executeDefs(connId: number, defs: QueryDef[], options?: (ResultMeta | undefined)[]): Promise<unknown[][]>;
  async bulkInsert(connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]): Promise<void>;
})));
```

- getInfo() — DB dialect, 데이터베이스명, 스키마명 조회.
- connect() — 설정 기반 DB 연결 (connId = 소켓별 연결 풀 ID 반환). 소켓 종료 시 자동 정리.
- close() — 특정 연결 종료.
- 트랜잭션: beginTransaction(), commitTransaction(), rollbackTransaction().
- executeParametrized() — 원시 SQL 실행 (결과 2D 배열).
- executeDefs() — ORM 쿼리 정의 실행 (결과 파싱 선택사항).
- bulkInsert() — 대량 삽입 (dialect별 최적화).
- 설정: `.config.json` 의 `orm` 섹션에서 `configName` 키로 `DbConnConfig` 로드.
- 인증: 기본 로그인 필수.

### OrmServiceMethods

OrmService의 메서드 시그니처 타입.

```typescript
type OrmServiceMethods = ServiceMethods<typeof OrmService>;
```

클라이언트에서 타입 공유용.

## 자동 업데이트 서비스

### AutoUpdateService

클라이언트 플랫폼별 최신 버전 조회 서비스.

```typescript
const AutoUpdateService = defineService(["AutoUpdate", "SdAutoUpdateService"], (ctx) => ({
  async getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}));
```

- getLastVersion(platform) — "android"|"windows" 플랫폼별 최신 버전 조회.
- 디렉토리: `clientPath/platform/updates/` (예: `www/myapp/android/updates/`).
- 파일명: 버전(숫자와 점만) + 확장자 (`.apk`|`.exe`).
- 반환: 최신 버전 문자열과 다운로드 상대경로 (`/uploads/...`).
- 버전 선택: semver.maxSatisfying() 기준 최대 버전.

### AutoUpdateServiceMethods

메서드 타입 추출.

```typescript
type AutoUpdateServiceMethods = ServiceMethods<typeof AutoUpdateService>;
```

## 설정 파일 관리

### getConfig

JSON 설정 파일 로드·캐싱·감시.

```typescript
async function getConfig<TConfig>(filePath: string): Promise<TConfig | undefined>;
```

- 캐시: 10분 GC 주기, 1시간 만료. 재접근 시 만료 시간 갱신.
- 워처: 파일 변경 감지 (100ms debounce), 자동 재로드. 파일 삭제 시 캐시 제거 및 워처 해제.
- 에러: 로드/리로드 실패 시 경고 로그. 캐시는 유지.
- 반환: 파일 없음 시 undefined.

## V1 레거시 호환

### handleV1Connection

V1 클라이언트 자동 업데이트 요청 처리.

```typescript
function handleV1Connection(socket: WebSocket, options: V1ConnectionOptions): void;
function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: V1AutoUpdateMethods,
  clientNameSetter?: (clientName: string | undefined) => void,
): void;
```

- 오버로드 1: autoUpdateMethods + clientNameSetter 직접 전달.
- 오버로드 2: V1ConnectionOptions 객체.

### V1ConnectionOptions

V1 연결 옵션.

```typescript
interface V1ConnectionOptions {
  serviceContext?: ServiceContext;
  serviceContextFactory?: (request: V1Request) => ServiceContext;
  handlers?: V1RequestHandler[];
  autoUpdateMethods?: V1AutoUpdateMethods;
  autoUpdateMethodsFactory?: (ctx: V1RequestHandlerContext) => V1AutoUpdateMethods;
  clientNameSetter?: (clientName: string | undefined) => void;
}
```

- serviceContext|serviceContextFactory: 사용자 핸들러 실행 시 전달할 컨텍스트.
- handlers: V1RequestHandler[] — 사용자 정의 요청 핸들러 (순차 실행, 처음 처리한 핸들러에서 중단).
- autoUpdateMethods|autoUpdateMethodsFactory: 자동 업데이트 fallback 메서드 (V1 호환).
- clientNameSetter: 클라이언트 이름 설정 콜백.

### V1RequestHandler

사용자 정의 요청 핸들러 타입.

```typescript
type V1RequestHandler =
  | ((ctx: V1RequestHandlerContext) => Promise<V1RequestHandlerResult>)
  | ((ctx: V1RequestHandlerContext) => V1RequestHandlerResult);
```

### V1RequestHandlerContext

핸들러 인자.

```typescript
interface V1RequestHandlerContext {
  request: V1Request;
  serviceContext: ServiceContext;
}
```

- request: { uuid, command, params, clientName? }.
- serviceContext: 서비스 실행 컨텍스트.

### V1RequestHandlerResult

핸들러 반환값.

```typescript
type V1RequestHandlerResult =
  { handled: true; state?: "success" | "error"; body: unknown } | { handled: false };
```

- handled: false → 다음 핸들러 또는 autoUpdateMethods 폴백 시도.
- handled: true, state 미지정 → "success" 기본값.

### V1Request

V1 클라이언트 요청.

```typescript
interface V1Request {
  uuid: string;
  command: string;
  params: unknown[];
  clientName?: string;
}
```

### V1Response

V1 응답 구조.

```typescript
interface V1Response {
  name: "response";
  reqUuid: string;
  state: "success" | "error";
  body: unknown;
}
```

### V1AutoUpdateMethods

V1 자동 업데이트 fallback 메서드.

```typescript
interface V1AutoUpdateMethods {
  getLastVersion: (platform: string) => Promise<unknown> | unknown;
}
```

## 서버 이벤트 발생

### ServerEventProxy

이벤트 발생 인터페이스 (타입 안전).

```typescript
interface ServerEventProxy<TEventDef extends ServiceEventDef> {
  emit(
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
}
```

- emit() — infoSelector로 필터링된 클라이언트에만 이벤트 발생.

### getEvent

이벤트 정의로부터 ServerEventProxy 생성.

```typescript
getEvent<TEventDef extends ServiceEventDef>(
  eventDef: TEventDef
): ServerEventProxy<TEventDef>
```

ServiceServer의 메서드. 클라이언트 타입 안전 보장.
