# @simplysm/sd-service-server

Fastify 기반 sd-service 서버 런타임 — WebSocket(V2), HTTP API, 정적 파일, 파일 업로드를 한 서버로 처리.
서비스 클래스 등록, JWT 인증, 권한 데코레이터, 내장 서비스(ORM/Crypto/SMTP/AutoUpdate)를 제공.

## 사용 트리거 인덱스

- **SdServiceServer** — 서버를 띄우고(`listenAsync`), 서비스 클래스를 등록하며, 인증 토큰 발급/검증, 클라이언트 RELOAD, 이벤트 브로드캐스트를 할 때.
- **ISdServiceServerOptions** — `SdServiceServer` 생성자에 넘길 옵션(포트, SSL, 인증, 프록시, 서비스 목록, 미들웨어)을 구성할 때.
- **SdServiceBase** — 서버 측 서비스 클래스를 만들 때 상속하는 베이스. 메서드 안에서 `authInfo`, `clientName`, `clientPath`, `getConfigAsync()`에 접근.
- **Authorize / IAuthTokenPayload / SdServiceJwtManager** — 서비스 메서드, 클래스에 권한을 걸거나, JWT 페이로드 타입을 정의하거나, 토큰을 직접 서명/검증할 때.
- **내장 서비스** — `services` 옵션에 그대로 등록해 DB, 암호화, 메일, 앱 업데이트 기능을 클라이언트에 노출할 때.
  - 대상: `SdOrmService`, `SdCryptoService`, `SdSmtpClientService`, `SdAutoUpdateService`.
- **SdConfigManager** — `.config.json` 파일을 캐시, 실시간 감시하며 읽을 때(보통 `SdServiceBase.getConfigAsync`가 내부 호출).
- **SdServiceProtocolWrapper / ISdServiceProtocolWorker** — 대용량 메시지를 워커 스레드로 자동 분기해 인코딩/디코딩할 때(소켓 내부에서 사용).
- **SdServiceExecutor** — 서비스명, 메서드명, 파라미터로 서비스 메서드를 실행하는 내부 디스패처(권한, 경로 검증 포함). 직접 쓸 일은 드묾.
- **SdServiceSocket / SdWebSocketHandler / SdHttpRequestHandler / SdStaticFileHandler / SdUploadHandler** — V2 전송 계층 내부 구현.
  `SdServiceServer`가 생성, 구동하므로 직접 인스턴스화할 일은 거의 없음.
- **legacy V1 (`@deprecated`)** — 구버전 클라이언트(ver≠2) 호환 프로토콜, 소켓, 핸들러. 신규 작업에는 사용 금지. 자세히: [legacy.md](./legacy.md)

## 서버 부트스트랩 (SdServiceServer)

`class SdServiceServer<TAuthInfo = any> extends EventEmitter` — `constructor(readonly options: ISdServiceServerOptions)`. `TAuthInfo`는 인증 토큰 `data` 필드의 타입.

- `isOpen: boolean` — 현재 리슨 중 여부. `listenAsync` 성공 시 true, `closeAsync` 후 false.
- `listenAsync(): Promise<void>` — Fastify 인스턴스를 만들어 `0.0.0.0:options.port`에서 리슨.
  websocket, helmet(보안 헤더), multipart, middie, reply-from(프록시), static, cors 플러그인을 등록하고 라우트를 연결.
  SIGINT/SIGTERM graceful shutdown 핸들러 등록 후 `"ready"` 이벤트 emit.
  - 라우트: `POST/GET /api/:service/:method`, `/upload`, `/` 및 `/ws` WebSocket, `/*` 정적/포트프록시.
- `closeAsync(): Promise<void>` — V1, V2 소켓 전부 닫고 Fastify 종료, `isOpen=false`, `"close"` 이벤트 emit.
- `broadcastReloadAsync(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>` — 접속 중인 모든 클라이언트에 RELOAD 메시지 전송.
  `clientName`이 undefined면 전체 대상(핫리로드용). `changedFileSet`은 변경 파일 경로 집합.
- `emitEvent<T extends SdServiceEventListenerBase>(eventType: Type<T>, infoSelector: (info: T["info"]) => boolean, data: T["data"]): Promise<void>` — 등록된 이벤트 리스너 중
  `infoSelector`가 true인 대상에게 `data` 전달. V1, V2 양쪽에 전파.
- `generateAuthTokenAsync(payload: IAuthTokenPayload<TAuthInfo>): Promise<string>` — JWT 발급(내부 `SdServiceJwtManager.signAsync`). 로그인 처리 후 토큰 생성용.
- `verifyAuthTokenAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>>` — JWT 검증 후 페이로드 반환. 만료, 무효 시 throw.
- EventEmitter 이벤트: `"ready"`(리슨 완료), `"close"`(종료).

보안 동작 메모:

- `options.ssl`이 없으면 helmet의 HSTS, COOP 가 비활성화되고 `upgrade-insecure-requests`가 꺼짐(IP/HTTP 접속 고객사 대응).
- CORS는 모든 origin 허용, 노출 헤더로 `Content-Disposition`, `Content-Length`(파일 다운로드용)를 명시.

## 서버 옵션 (ISdServiceServerOptions)

```
interface ISdServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?: { pfxBuffer: Buffer | (() => Promise<Buffer> | Buffer); passphrase: string };
  auth?: { jwtSecret: string };
  pathProxy?: Record<string, string>;
  portProxy?: Record<string, number>;
  services: Type<SdServiceBase>[];
  middlewares?: ((req, res, next) => void)[];
}
```

- `rootPath` — 서버 루트 디렉터리. 정적 파일은 `<rootPath>/www`, 업로드는 `<rootPath>/www/uploads`, 루트 설정은 `<rootPath>/.config.json` 기준.
- `port` — 리슨 포트(host는 항상 `0.0.0.0` 고정).
- `ssl.pfxBuffer` — PFX 인증서 버퍼 또는 이를 반환하는 (비동기) 함수. 설정 시 HTTPS로 구동. `ssl.passphrase` — PFX 암호.
- `auth.jwtSecret` — JWT 서명/검증 비밀키. **이 값이 있어야 권한 검사(`Authorize`)가 동작**하고 토큰 발급/검증이 가능. 없으면 모든 `Authorize` 검사가 통과(인증 비활성).
- `pathProxy` — `urlPath` 접두사 → 실제 파일시스템 경로 매핑. 정적 파일 핸들러가 해당 접두사 요청을 다른 디렉터리에서 서빙하고, 클라이언트별 `clientPath` 결정에도 사용.
- `portProxy` — `urlPath` 접두사 → 로컬 포트. 매칭되면 `http://127.0.0.1:<port>`로 리버스 프록시(`reply.from`).
- `services` — 등록할 서비스 클래스 배열(`SdServiceBase` 상속). 클래스 `name`이 요청 `serviceName`과 매칭됨.
- `middlewares` — connect 스타일 미들웨어 배열. 라우트 등록 전에 `fastify.use()`로 적용.

## 서비스 작성 (SdServiceBase)

`abstract class SdServiceBase<TAuthInfo = any>` — 모든 서비스 클래스가 상속.
메서드 호출 시 `SdServiceExecutor`가 인스턴스를 생성하고 컨텍스트(`server`/`socket`/`http`/`v1`)를 주입함.
public 메서드가 곧 호출 가능한 API.

- `server: SdServiceServer<TAuthInfo>` — 주입된 서버 인스턴스(이벤트 emit, 옵션 접근용).
- `socket?: SdServiceSocket` — V2 WebSocket 호출일 때의 소켓(HTTP/V1 호출이면 undefined).
- `http?: { clientName: string; authTokenPayload?: IAuthTokenPayload }` — HTTP 호출일 때의 컨텍스트.
- `v1?: { socket: SdServiceSocketV1; request: ISdServiceRequest }` — 레거시 V1 호출일 때의 컨텍스트.
- `get authInfo(): TAuthInfo | undefined` — 소켓 또는 HTTP 인증 토큰 페이로드의 `data`. 로그인 사용자 정보 접근용.
- `get clientName(): string | undefined` — 호출 클라이언트명(v1.request → socket → http 순). `..`, `/`, `\` 포함 시 throw(Path Traversal 방어).
- `get clientPath(): string | undefined` — 클라이언트의 파일 루트. `options.pathProxy[clientName]`가 있으면 그 경로, 없으면 `<rootPath>/www/<clientName>`.
- `getConfigAsync<T>(section: string): Promise<T>` — 루트 `.config.json`과 클라이언트 `.config.json`(`clientPath` 하위)을
  병합(`ObjectUtils.merge`, 클라이언트 우선)한 뒤 `section` 키 값을 반환. 해당 섹션이 없으면 throw.
  내장 서비스들이 `orm`/`crypto`/`smtp` 섹션을 읽는 데 사용.

## 인증, 권한 (auth)

### Authorize 데코레이터

`function Authorize(permissions: string[] = []): (target, propertyKey?) => void` — 클래스 또는 메서드에 필요 권한을 메타데이터(`SD_SERVICE_AUTH_META` 심볼)로 부착.
`SdServiceExecutor`가 실행 직전 검사.

- 메서드에 붙이면 메서드 레벨 권한, 클래스에 붙이면 클래스 레벨 권한(메서드에 메타데이터 없을 때 fallback).
- `permissions = []`(빈 배열) — 로그인만 요구(권한 코드 무관, 토큰만 있으면 통과).
- `permissions = ["a", "b"]` — 토큰의 `perms`에 하나라도 포함되면 통과(OR 검사). 부족 시 "권한이 부족합니다." throw.
- 검사 전제: `options.auth`가 설정돼 있을 때만 동작. 권한이 걸린 서비스는 **V1 호출 시 무조건 차단**("보안강화로 인한 접근 불가"), 토큰 없으면 "로그인이 필요합니다." throw.
- `SD_SERVICE_AUTH_META: symbol` — 권한 메타데이터 저장 키(직접 쓸 일 드묾).

### IAuthTokenPayload

`interface IAuthTokenPayload<TAuthInfo = any> extends JWTPayload` — JWT 페이로드 형태.

- `perms: string[]` — 사용자 권한 코드 목록(`Authorize` 검사 대상).
- `data: TAuthInfo` — 임의의 로그인 사용자 정보(`SdServiceBase.authInfo`로 노출).
- `JWTPayload`(jose) 표준 클레임(`exp`,`iat` 등)도 포함.

### SdServiceJwtManager

`class SdServiceJwtManager<TAuthInfo = any>` — `constructor(server)`.

- `options.auth.jwtSecret` 미설정 시 모든 메서드가 throw.
- 보통 서버의 `generateAuthTokenAsync`/`verifyAuthTokenAsync`로 간접 사용.
- `signAsync(payload): Promise<string>` — HS256, `iat` 자동, 만료 **12시간** 고정으로 서명.
- `verifyAsync(token): Promise<IAuthTokenPayload>` — 서명, 만료 검증. 만료 시 "토큰이 만료되었습니다.", 그 외 무효 시 "유효하지 않은 토큰입니다." throw.
- `decodeAsync(token): Promise<IAuthTokenPayload>` — 검증 없이 페이로드만 디코드(secret 존재 여부만 확인).

## 내장 서비스 (services)

`services` 옵션에 클래스를 그대로 넣으면 클라이언트가 `서비스명.메서드` 로 호출 가능. 인터페이스 계약, 옵션 타입은 `@simplysm/sd-service-common` 참조.

### SdOrmService (`@Authorize()` — 로그인 필수)

DB 연결/쿼리.

- 연결은 호출 소켓(V2 또는 V1)별로 `connId`(1부터 증가)로 관리되고, 소켓 close 시 일괄 종료.
- HTTP 호출은 소켓이 없어 throw("소켓 연결 필요").
- 설정은 `getConfigAsync("orm")[configName]`.
- `getInfo(opt & {configName})` — dialect, database, schema 조회.
- `connect`/`close(connId)` — 연결 생성(번호 반환)/종료.
- `beginTransaction(connId, isolationLevel?)`/`commitTransaction`/`rollbackTransaction` — 트랜잭션.
- `executeParametrized(connId, query, params?)` / `executeDefs(connId, defs, options?)` — 쿼리 실행.
- `bulkInsert`/`bulkUpsert(connId, tableName, columnDefs, records)` — 대량 처리.

### SdCryptoService

`getConfigAsync("crypto")`의 `key` 사용.

- `encrypt(data: string | Buffer): Promise<string>` — HMAC-SHA256 hex(단방향).
- `encryptAes(data: Buffer): Promise<string>` — AES-256-CBC, `iv(hex):cipher(hex)` 형식 반환.
- `decryptAes(encText: string): Promise<Buffer>` — 위 형식을 복호화.

### SdSmtpClientService

nodemailer 기반(TLS `rejectUnauthorized:false`).

- `send(options): Promise<string>` — 접속정보를 옵션에 직접 담아 발송, messageId 반환.
- `sendByConfig(configName, options): Promise<string>` — `getConfigAsync("smtp")[configName]` 접속정보로 발송. `from`은 `"senderName" <senderEmail|user>` 조합.

### SdAutoUpdateService

- `getLastVersion(platform: string): { version; downloadPath } | undefined` — `<clientPath>/<platform>/updates` 폴더에서
  semver 최대 버전 탐색. `platform === "android"`면 `.apk`, 그 외는 `.exe` 중 `[0-9.]` 버전명만 후보.
  updates 폴더 없으면 undefined, clientPath 없으면 throw.

## 설정 관리 (SdConfigManager)

`class SdConfigManager` (static 전용) — `.config.json` 로딩을 캐시 + 파일 감시.

- `static getConfigAsync<T>(filePath: string): Promise<T | undefined>` — 캐시 적중 시 즉시 반환(접근 시 만료시간 갱신).
  미스면 파일 읽어 캐시하고 `SdFsWatcher`로 감시 등록(변경 시 자동 갱신, 삭제 시 캐시, 감시 해제).
  파일 없으면 undefined.
- 캐시: `LazyGcMap`, GC 10분 주기, 만료 1시간(만료 시 watcher close).
  - 같은 설정을 여러 서비스가 반복 읽어도 디스크 I/O 1회로 수렴.

## 프로토콜 래퍼 (protocol)

`class SdServiceProtocolWrapper` — V2 소켓이 메시지 직렬화를 위해 사용. 크기에 따라 메인 스레드(`SdServiceProtocol`)와 워커 스레드를 자동 분기.

- `encodeAsync(uuid: string, message: TSdServiceMessage): Promise<{ chunks: Buffer[]; totalSize: number }>` — body가 Buffer이거나 Buffer를 포함한 배열이면 워커로, 아니면 메인 스레드로 인코딩.
- `decodeAsync(buffer: Buffer): Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>>` — buffer가 30KB(`_SIZE_THRESHOLD`) 초과면 워커, 이하면 메인 스레드로 디코딩.
- `dispose(): void` — 메인 스레드 프로토콜 인스턴스 정리(워커는 static 싱글톤이라 유지).
- 워커는 static Lazy 싱글톤(`maxOldGenerationSizeMb: 4096`), 전 인스턴스 공유.

`interface ISdServiceProtocolWorker` — 워커 RPC 계약. `SdWorker` 타입 파라미터로 사용.

- `methods.encode` — params `[string, TSdServiceMessage]` → `{chunks, totalSize}`.
- `methods.decode` — params `[Buffer]` → `ISdServiceMessageDecodeResult`.
- `events: {}`.

## 실행 디스패처 (SdServiceExecutor)

`class SdServiceExecutor` — `constructor(server)`.
전송 계층(HTTP/WS/V1 핸들러)이 공통으로 호출하는 메서드 실행기. 직접 쓸 일은 드묾.

- `runMethodAsync(def): Promise<any>` — 권한 검사 규칙은 위 [Authorize](#authorize-데코레이터) 절과 동일.
  - `def`: `serviceName`, `methodName`, `params: any[]` + 컨텍스트 중 하나(`socket?` / `v1?` / `http?`).
  - 동작: 서비스 클래스 조회(없으면 throw) → clientName Path Traversal 검증 →
    (`options.auth` 있을 때) 메서드/클래스 권한 메타데이터 검사 → 서비스 인스턴스 생성, 컨텍스트 주입 → 메서드 호출.

## V2 전송 계층 (transport)

`SdServiceServer`가 내부에서 생성, 구동. 직접 인스턴스화할 일은 거의 없으나 동작 이해용.

- `SdServiceSocket extends EventEmitter` — 클라이언트 WS 연결 1개.
  5초 핑, 1바이트(0x01) ping에 0x02 pong 응답, 메시지를 `SdServiceProtocolWrapper`로 인코드, 디코드.
  `authTokenPayload?`(auth 메시지로 세팅), `clientName`, `connectedAtDateTime` 노출.
  `sendAsync(uuid, msg)`로 송신, 이벤트: `"close"(code)`, `"message"(uuid, msg)`.
  `addEventListener/removeEventListener/getEventListners/filterEventTargetKeys`로 이벤트 구독 관리.
- `SdWebSocketHandler` — `constructor(executor, jwt)`. `clientId`별 소켓 맵 관리(동일 id 재접속 시 기존 연결 종료).
  수신 메시지를 분기: `service.method`(메서드 실행), `evt:add/remove/gets/emit`(이벤트), `auth`(토큰 검증 후 소켓에 저장).
  `addSocket(socket, clientId, clientName, connReq)`, `closeAll()`,
  `broadcastReloadAsync(clientName, changedFileSet)`, `emitAsync(eventType, infoSelector, data)`.
- `SdHttpRequestHandler` — `/api/:service/:method` 처리.
  `x-sd-client-name` 헤더 필수(없으면 throw). `Authorization: Bearer <token>` 있으면 검증(무효 시 401).
  GET이면 `?json=` 쿼리를 파싱해 params, POST면 body(배열이어야 함, 아니면 400)를 params로 사용.
- `SdStaticFileHandler` — `<rootPath>/www` 기준 정적 파일 서빙. `pathProxy` 접두사 매칭 시 대체 경로에서 서빙.
  production(`NODE_ENV`)에서 허용 루트 밖 경로 차단, `.`으로 시작하는 숨김 파일 403,
  디렉터리는 `index.html`로, 없으면 404 HTML.
- `SdUploadHandler` — `/upload` multipart 처리. **인증 필수**(`Authorization` 없으면 401).
  각 파일을 `<rootPath>/www/uploads/<uuid><ext>`로 스트림 저장, 크기 제한 초과 시 throw 및 부분 파일 삭제.
  응답: `ISdServiceUploadResult[]`(`path`, `filename`, `size`).
