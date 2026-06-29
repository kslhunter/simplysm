# @simplysm/service-server — 서버 부트스트랩

서버 프로세스 진입점에서 Fastify 기반 서비스 서버를 만들고 `listen()`/`close()` lifecycle, JWT 시크릿, HTTPS, 이벤트 발생, 라우트를 구성할 때 같이 읽는 묶음이다. 이벤트 발생 사용법: [event.md](../../manuals/event.md). SSG 정적 셸 배포 맥락: [client-ssg.md](../../manuals/client-ssg.md).

## ServiceServerOptions

```ts
interface ServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?:
    | { pfxBytes: Uint8Array; passphrase?: string }
    | { pemKeyBytes: Uint8Array; certBytes: Uint8Array; caBytes?: Uint8Array; passphrase?: string }
    | { letsencrypt: { domains: string[]; email: string; staging?: boolean; cloudflareApiToken?: string } };
  auth?: { jwtSecret: string } | false;
  services: ServiceDefinition[];
  legacyV1Handlers?: V1RequestHandler[];
}
```

- `rootPath: string` — 서버 루트 경로. 정적 파일은 `rootPath/www`, 업로드는 `rootPath/www/uploads`, 루트 설정은 `rootPath/.config.json`, 클라이언트별 설정은 `rootPath/www/<clientName>/.config.json` 기준으로 처리된다.
- `port: number` — `listen()`에서 `host: "0.0.0.0"`와 함께 Fastify 리슨에 전달되는 포트.
- `ssl?: ...` — HTTPS 설정. 지정하면 Fastify `https` 옵션을 만들고, `listen()`의 helmet 설정에서 HSTS와 `crossOriginOpenerPolicy`가 켜진다.
- `pfxBytes: Uint8Array` — PFX 인증서 바이트. 내부에서 `Buffer.from(pfxBytes)`로 Fastify HTTPS `pfx`에 넣는다.
- `passphrase?: string` — PFX 또는 암호화된 PEM 키의 비밀번호. 값이 있을 때만 HTTPS 옵션에 전달된다.
- `pemKeyBytes: Uint8Array` — PEM 개인키 바이트. 내부에서 `Buffer`로 변환해 HTTPS `key`에 넣는다.
- `certBytes: Uint8Array` — PEM 인증서 바이트. 내부에서 `Buffer`로 변환해 HTTPS `cert`에 넣는다.
- `caBytes?: Uint8Array` — PEM CA 체인 바이트. 값이 있을 때만 HTTPS `ca`에 넣는다.
- `letsencrypt.domains: string[]` — ACME 인증서 대상 도메인 목록. 발급된 인증서가 모든 요청 도메인을 포함해야 캐시가 유효한 것으로 처리된다.
- `letsencrypt.email: string` — ACME 계정 연락처로 전달되는 이메일.
- `letsencrypt.staging?: boolean` — ACME 디렉터리 선택 플래그. 내부 매니저가 `true`이면 staging, 아니면 production 디렉터리를 선택한다.
- `letsencrypt.cloudflareApiToken?: string` — Cloudflare API 토큰. 지정 시 DNS-01로 TXT 레코드를 등록·삭제하고, 미지정 시 TLS-ALPN-01 챌린지 컨텍스트를 ALPN callback에 주입한다. 토큰 권한은 코드 주석 기준 `Zone:Read`와 `Zone.DNS:Edit`이다.
- `auth?: { jwtSecret: string } | false` — 인증 설정. 객체면 토큰 서명·검증 시 `jwtSecret`을 쓰고, `false`면 `auth(...)`가 붙은 서비스도 인증 검사를 건너뛴다. `undefined`인데 권한 요구 서비스가 있으면 `listen()` 또는 실행기에서 설정 오류를 throw한다.
- `auth.jwtSecret: string` — `ServiceServer.signAuthToken`/`verifyAuthToken`, HTTP/WS 인증 검증에 쓰는 JWT 시크릿.
- `services: ServiceDefinition[]` — RPC로 노출할 서비스 정의 배열. 실행기는 각 정의의 `names`에서 요청 서비스명을 찾는다.
- `legacyV1Handlers?: V1RequestHandler[]` — `ver !== "2"` WebSocket 요청에서 자동업데이트 fallback 전에 실행할 커스텀 레거시 핸들러 목록.

## createServiceServer / ServiceServer 생성

```ts
function createServiceServer<TAuthInfo = unknown>(
  options: ServiceServerOptions,
): ServiceServer<TAuthInfo>;
```

- `TAuthInfo = unknown` — 인증 토큰 `data` 타입. `signAuthToken`, `verifyAuthToken`, 서비스 컨텍스트의 `authInfo` 타입을 묶는다.
- `options: ServiceServerOptions` — 생성자에 그대로 전달되는 서버 설정. 생성 시점에는 리슨하지 않는다.
- 반환 `ServiceServer<TAuthInfo>` — `new ServiceServer<TAuthInfo>(options)` 결과와 같다.

## ServiceServer

```ts
class ServiceServer<TAuthInfo = unknown> extends EventEmitter<{
  ready: void;
  close: void;
}> {
  isOpen: boolean;
  readonly fastify: FastifyInstance;
  constructor(readonly options: ServiceServerOptions);
  listen(): Promise<void>;
  close(): Promise<void>;
  getEvent<TEventDef extends ServiceEventDef>(eventDef: TEventDef): ServerEventProxy<TEventDef>;
  emitEvent<TEventDef extends ServiceEventDef>(
    eventDef: TEventDef,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
  signAuthToken(payload: AuthTokenPayload<TAuthInfo>, expiresHours?: number): Promise<string>;
  verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>;
}
```

- `options: ServiceServerOptions` — 생성 시 받은 옵션 원본. 라우트·컨텍스트·핸들러가 같은 값을 참조한다.
- `isOpen: boolean` — `listen()` 성공 후 `true`, `close()` 후 `false`로 갱신된다.
- `fastify: FastifyInstance` — 내부 Fastify 인스턴스. `listen()`은 여기에 플러그인·라우트·파서·직렬화기를 등록한다.
- `listen(): Promise<void>` — auth 설정 사전검사, websocket/helmet/multipart/static/cors 플러그인, JSON 파서·직렬화기, API·업로드·WebSocket·정적 파일 라우트를 등록한 뒤 리슨한다. 성공하면 graceful shutdown 핸들러를 등록하고 `"ready"` 이벤트를 emit한다.
- `close(): Promise<void>` — ACME 갱신 타이머를 멈추고 WebSocket을 모두 닫은 뒤 Fastify를 닫는다. 완료 후 `isOpen=false`와 `"close"` 이벤트를 emit한다.
- `getEvent(eventDef)` — `eventDef.eventName`을 쓰는 서버 이벤트 발생 프록시를 만든다. 구독은 클라이언트 전용이고 서버 프록시는 `emit`만 제공한다.
- `emitEvent(eventDef, infoSelector, data)` — WebSocket handler에 이벤트 발생을 위임한다. `infoSelector`가 각 구독 `info`에 대해 `true`를 반환한 키에만 `data`를 보낸다.
- `eventDef: TEventDef` — `ServiceEventDef` 객체. `eventName`, `$info`, `$data` 타입을 함께 제공한다.
- `infoSelector: (item: TEventDef["$info"]) => boolean` — 구독 메타데이터를 받아 전송 대상 여부를 결정하는 필터.
- `data: TEventDef["$data"]` — 대상 구독자에게 보낼 이벤트 페이로드.
- `signAuthToken(payload, expiresHours?)` — 서버 옵션의 `auth.jwtSecret`으로 `signJwt`를 호출한다. 시크릿이 없으면 `"JWT Secret이 정의되지 않았습니다."`를 throw한다.
- `payload: AuthTokenPayload<TAuthInfo>` — 서명할 인증 페이로드. `roles`와 `data`가 이후 요청 인증 정보가 된다.
- `expiresHours?: number` — 토큰 만료 시간(시간 단위). 생략 시 `signJwt` 기본값을 따른다.
- `verifyAuthToken(token)` — 서버 옵션의 `auth.jwtSecret`으로 `verifyJwt`를 호출한다. 시크릿이 없으면 throw한다.
- `token: string` — 검증할 JWT 문자열.
- 이벤트 리터럴 `"ready"` — `listen()` 성공 뒤 발생한다.
- 이벤트 리터럴 `"close"` — `close()` 완료 뒤 발생한다.

`listen()`이 등록하는 공개 라우트:

- `/api/:service/:method` — HTTP RPC. 자세한 파라미터 처리: [transport-internals.md](./transport-internals.md).
- `/upload` — 인증된 multipart 업로드 처리.
- `/` WebSocket upgrade와 `/ws` — `ver === "2"`이면 `clientId`/`clientName` 필수, 그 외는 V1 레거시 처리로 분기한다.
- `/` 일반 GET과 `/*` — `rootPath/www` 정적 파일 처리. 확장자 없는 미존재 경로는 가까운 `index.csr.html`을 찾아 SSG 클라이언트 셸로 fallback할 수 있다.

## ServerEventProxy

```ts
interface ServerEventProxy<TEventDef extends ServiceEventDef> {
  emit(
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
}
```

- `TEventDef extends ServiceEventDef` — 이벤트 이름과 `info`/`data` 타입을 담은 이벤트 정의 타입.
- `emit(infoSelector, data)` — `ServiceServer.emitEvent`와 같은 경로로 이벤트를 발생시킨다.
- `infoSelector` — 각 클라이언트 구독의 `info`를 받아 대상 여부를 반환한다.
- `data` — 선택된 구독자에게 전송할 페이로드.
