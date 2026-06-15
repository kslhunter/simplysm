# @simplysm/service-server

Fastify 위에서 동작하는 RPC 서버. `defineService` 로 정의한 서비스를 WebSocket·HTTP(`/api/:service/:method`) 두 전송으로 노출하고, JWT 인증·정적 파일 서빙·파일 업로드·서버측 이벤트 브로드캐스트·내장 ORM/자동업데이트 서비스를 한 프로세스에서 제공한다.

## 사용 트리거 인덱스

- **서버 부트스트랩** (이 문서 인라인): `createServiceServer` / `ServiceServer` / `ServiceServerOptions` / `ServerEventProxy` — 서버 앱 진입점에서 옵션을 주고 기동·종료하거나, 서비스 메서드에서 클라이언트로 이벤트를 발생시킬 때.
- **JWT 인증 토큰** (이 문서 인라인): `AuthTokenPayload` / `signJwt` / `verifyJwt` / `decodeJwt` — 로그인 처리에서 토큰을 서명·검증할 때.
- **서비스 작성** — `defineService` / `auth` / `getServiceAuthPermissions` / `ServiceContext` / `createServiceContext` / `ServiceDefinition` / `ServiceMethods`. 자세히: [service-authoring.md](./service-authoring.md)
- **내장 서비스** — `OrmService` / `OrmServiceMethods` / `AutoUpdateService` / `AutoUpdateServiceMethods`. 자세히: [built-in-services.md](./built-in-services.md)
- **전송 계층 내부** — `executeServiceMethod` / `createServiceContext` / `ServiceSocket` / `createServiceSocket` / `WebSocketHandler` / `createWebSocketHandler` / `ServerProtocolWrapper` / `createServerProtocolWrapper` / `handleHttpRequest` / `handleUpload` / `handleStaticFile` / `getConfig`. 자세히: [transport-internals.md](./transport-internals.md)
- **V1 레거시** — `handleV1Connection` / `V1ConnectionOptions` / `V1Request` / `V1Response` / `V1AutoUpdateMethods` / `V1RequestHandler` / `V1RequestHandlerResult` / `V1RequestHandlerContext`. 자세히: [v1-legacy.md](./v1-legacy.md)

## 서버 부트스트랩

서버 앱 진입점에서 `createServiceServer(options)` 로 인스턴스를 만들고 `await server.listen()` 으로 기동한다.

### createServiceServer / ServiceServer

```ts
function createServiceServer<TAuthInfo = unknown>(options: ServiceServerOptions): ServiceServer<TAuthInfo>;
```

옵션으로 서버 인스턴스를 생성한다(이 시점엔 아직 리슨하지 않음). `new ServiceServer<TAuthInfo>(options)` 직접 생성과 동일하다.

- `TAuthInfo` — 인증 토큰 `data` 페이로드 타입. `signAuthToken`·`verifyAuthToken`·`ServiceContext.authInfo` 가 모두 이 타입으로 묶인다.

`ServiceServerOptions` 필드:

- `rootPath: string` — 서버 작업 루트. 정적 파일·업로드·자동업데이트는 `rootPath/www` 하위를, 설정은 `rootPath/.config.json` 을 기준으로 한다. 절대경로 권장.
- `port: number` — 리슨 포트(바인딩 호스트는 `"0.0.0.0"` 고정). `0` 을 주면 OS 가 임의 포트를 할당하므로 테스트에 쓰고, 실제 포트는 `server.fastify.server.address()` 로 확인한다.
- `ssl?: { pfxBytes: Uint8Array; passphrase?: string } | { pemKeyBytes: Uint8Array; certBytes: Uint8Array; caBytes?: Uint8Array; passphrase?: string } | { letsencrypt: { domains: string[]; email: string; staging?: boolean } }` — HTTPS 인증서. 형식은 들어온 필드로 구분한다.
  - `pfxBytes` 가 있으면 PFX 방식(인증서+키 번들, `passphrase` 는 PFX 비밀번호).
  - `pemKeyBytes`+`certBytes` 가 있으면 PEM 방식(`pemKeyBytes` 개인키·`certBytes` 인증서, 선택적으로 `caBytes` 중간 CA 체인·`passphrase` 암호화된 키 비밀번호). 바이트는 내부에서 `Buffer` 로 변환.
  - `letsencrypt` 가 있으면 Let's Encrypt 자동 발급/갱신. `domains` 인증서를 TLS-ALPN-01 챌린지로 발급해 `rootPath/.acme/`(계정키·인증서·키)에 저장하고, 만료 30일 전 자동 갱신 후 무중단 교체한다. `email` 은 LE 계정 연락처, `staging: true` 면 LE 스테이징(레이트리밋 회피, 테스트용)을 쓴다. 캐시된 유효 인증서가 있으면 즉시 적용하고, 없으면 최초 발급 완료까지 `listen()` 이 대기하며 발급 실패 시 throw 한다(`SD_ACME_DIRECTORY_URL` 환경변수로 ACME 디렉토리 URL 재정의 가능 — 사설 CA·테스트용).

  지정 시(어느 방식이든) HTTPS 로 기동하고 HSTS·`crossOriginOpenerPolicy` 보안 헤더가 켜진다. 미지정 시 HTTP(평문)로 뜨고 `upgrade-insecure-requests` CSP 가 해제된다. 사내망 평문이면 생략, 외부 노출이면 지정.

  `letsencrypt` 전제(코드 밖, 운영자 책임):
  - **Node 20.18.0+ 또는 22.9.0+** — 핸드셰이크 중 인증서를 주입하는 `TLSSocket.setKeyCert` 가 필요하다. 미만이면 기동 시 throw.
  - TLS-ALPN-01 은 **와일드카드 불가** — `domains` 는 정확한 FQDN.
  - 검증 connection 이 포트 443 으로 인입되어 이 서버에 도달해야 한다: 공개 DNS A 레코드 → 서버, 앞단에 L4 프록시가 있으면 SNI 기준으로 이 서버에 패스스루(예: nginx `stream` + `ssl_preread`). 도메인 CAA 가 `letsencrypt.org` 를 허용하고, 서버에서 LE API 로 아웃바운드가 가능해야 한다.
- `auth?: { jwtSecret: string } | false` — JWT 인증 설정. 객체면 `jwtSecret` 으로 토큰을 서명·검증한다. `false` 면 인증을 **의도적으로 비활성화**(`auth(...)` 래핑 메서드도 인증 검사 스킵). `undefined`(미지정)인데 권한 요구(`auth(...)` 래핑) 서비스가 하나라도 등록돼 있으면 `listen()` 이 throw — 설정 누락과 의도적 비활성화를 구분한다.
- `services: ServiceDefinition[]` — `defineService` 로 만든 서비스 정의 배열. RPC 로 노출할 서비스 전부를 여기 등록한다. 라우팅은 정의의 `names` 매칭으로 이뤄진다.
- `legacyV1Handlers?: V1RequestHandler[]` — V1(ver≠2) 레거시 클라이언트용 커스텀 요청 핸들러(선택). 자세히: [v1-legacy.md](./v1-legacy.md).

`ServiceServer<TAuthInfo>` 멤버(`EventEmitter<{ ready: void; close: void }>` 상속):

- `readonly options: ServiceServerOptions` — 생성 시 받은 옵션 원본.
- `readonly fastify: FastifyInstance` — 내부 Fastify 인스턴스. 실제 포트 조회·추가 라우트 등록 등에 직접 접근한다.
- `isOpen: boolean` — `listen()` 성공 후 `true`, `close()` 후 `false`. 정상 종료 핸들러가 중복 close 를 막는 데 쓴다.
- `listen(): Promise<void>` — 플러그인 등록(websocket·helmet·multipart·static·cors) → 라우트 바인딩 → 리슨 → 정상 종료 핸들러(`SIGINT`/`SIGTERM`, 10초 내 미종료 시 강제 `process.exit(1)`) 등록 후 `"ready"` 이벤트 발생. `auth` 미설정인데 권한 요구 서비스가 있으면 시작 전 throw.
- `close(): Promise<void>` — 모든 WebSocket 연결 종료 후 Fastify 종료, `"close"` 이벤트 발생.
- `signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>` — `auth.jwtSecret` 으로 토큰 서명. 시크릿 미설정 시 throw.
- `verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>` — 토큰 검증·디코드. 시크릿 미설정 시 throw.
- `getEvent`/`emitEvent` — 아래 "서버측 이벤트 발생" 참조.
- `on("ready" | "close", handler)` — 기동·종료 시점 후킹(`EventEmitter` 상속).

```ts
const server = createServiceServer<AuthInfo>({
  rootPath: process.cwd(),
  port: 50080,
  auth: { jwtSecret: env("JWT_SECRET")! },
  services: [UserService, OrmService, AutoUpdateService],
});
await server.listen();
```

주의: `auth` 를 미지정한 채 권한 요구 서비스를 등록하면 `listen()` 이 즉시 throw 한다. 인증을 끄려면 `auth: false` 를 명시한다.

### 서버측 이벤트 발생

서비스 메서드 처리 결과를 구독 중인 클라이언트에 브로드캐스트할 때. 이벤트 정의 객체(`@simplysm/service-common` 의 `defineEvent`)는 클라이언트·서버가 공유한다.

- `emitEvent<TEventDef>(eventDef: TEventDef, infoSelector: (info: TEventDef["$info"]) => boolean, data: TEventDef["$data"]): Promise<void>` — `eventDef.eventName` 을 구독한 전 클라이언트 리스너 중 `infoSelector(info)` 가 `true` 인 대상에게만 `data` 전송. 전체 전송은 `() => true`, 어느 구독에도 안 걸리면 전송 자체가 생략된다.
- `getEvent<TEventDef>(eventDef): ServerEventProxy<TEventDef>` — 같은 이벤트를 반복 발생시킬 때 쓰는 프록시. `proxy.emit(infoSelector, data)` 는 `emitEvent` 와 동일하게 동작한다.
- `ServerEventProxy<TEventDef>` — `{ emit(infoSelector, data): Promise<void> }` 형태. 구독(리스너 등록)은 클라이언트 전용이라 서버에는 발생 메서드만 있다.

```ts
export const OrderService = defineService("Order", (ctx) => ({
  ship: async (orderId: number) => {
    // ... 처리 ...
    await ctx.server.emitEvent(
      OrderStatusChangedEvent,
      (info) => info.warehouseId === 7,
      { orderId, status: "shipped" },
    );
  },
}));
```

## JWT 인증 토큰

로그인 서비스 메서드에서 자격 확인 후 토큰을 발급하고, 다른 메서드에서 토큰을 검증할 때. 보통은 `server.signAuthToken`/`server.verifyAuthToken`(시크릿 자동 사용)을 쓰고, 시크릿을 직접 다룰 때만 아래 함수를 호출한다.

- `AuthTokenPayload<TAuthInfo>` — JWT 페이로드. `jose` 의 `JWTPayload`(`exp`·`iat` 등)를 확장하며 다음을 추가한다.
  - `roles: string[]` — 권한 역할 목록. `auth(["admin"], ...)` 의 권한 매칭 대상으로, 요구 역할 중 하나라도 이 배열에 있으면 통과.
  - `data: TAuthInfo` — 앱이 정의하는 사용자 정보. `ctx.authInfo` 로 노출된다.
- `signJwt<TAuthInfo>(jwtSecret: string, payload: AuthTokenPayload<TAuthInfo>): Promise<string>` — HS256 으로 서명. `iat` 자동 설정, 만료는 12시간 고정.
- `verifyJwt<TAuthInfo>(jwtSecret: string, token: string): Promise<AuthTokenPayload<TAuthInfo>>` — 서명·만료 검증 후 페이로드 반환. 만료(`ERR_JWT_EXPIRED`)면 `"토큰이 만료되었습니다."`, 그 외 검증 실패면 `"유효하지 않은 토큰입니다."` 로 throw.
- `decodeJwt<TAuthInfo>(token: string): AuthTokenPayload<TAuthInfo>` — 서명 검증 없이 페이로드만 디코드(동기). 이미 검증된 토큰의 내용만 다시 읽을 때 쓰고, 만료·위변조 판정에는 쓰지 말 것.

```ts
const AuthService = defineService("Auth", (ctx) => ({
  login: async (id: string, pw: string) => {
    const user = await authenticate(id, pw); // 앱 로직
    return ctx.server.signAuthToken({ roles: user.roles, data: user });
  },
}));
```
