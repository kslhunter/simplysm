# @simplysm/service-server

Fastify 기반 서비스 서버. WebSocket/HTTP 두 전송 계층으로 RPC 스타일 서비스 메서드를 노출하고, JWT 인증·정적 파일·업로드·이벤트 브로드캐스팅·내장 ORM/자동업데이트 서비스를 제공한다.

## 사용 트리거 인덱스

- **ServiceServer / createServiceServer / ServiceServerOptions** — 서버 인스턴스를 만들고 listen/close 할 때, 포트·SSL·auth·서비스 목록을 설정할 때. (아래 "서버 인스턴스" 인라인)
- **이벤트 브로드캐스트 (getEvent / emitEvent / ServerEventProxy)** — 서버에서 WebSocket 클라이언트들에게 이벤트를 푸시할 때. (아래 "이벤트 브로드캐스트" 인라인)
- **JWT 인증 (signAuthToken/verifyAuthToken, signJwt/verifyJwt/decodeJwt, AuthTokenPayload)** — 로그인 토큰을 발급·검증할 때. (아래 "JWT 인증" 인라인)
- **서비스 정의 (defineService / auth / ServiceContext / ServiceDefinition / ServiceMethods)** — 서버에 노출할 RPC 서비스를 작성하고 인증·권한을 거는 작업 컨텍스트. 자세히: [service-authoring.md](./service-authoring.md)
- **내장 서비스 (OrmService / AutoUpdateService)** — DB 원격 실행·앱 자동업데이트를 services 목록에 바로 꽂을 때. (아래 "내장 서비스" 인라인)
- **전송 계층 내부 (WebSocketHandler / ServiceSocket / HTTP·업로드·정적 핸들러 / 프로토콜 래퍼 / ConfigManager)** — 서버 내부 동작을 이해하거나 커스텀 통합할 때. 자세히: [transport-internals.md](./transport-internals.md)
- **V1 레거시 자동업데이트 (handleV1Connection 등)** — 구버전(ver≠2) 클라이언트를 지원해야 할 때. 자세히: [v1-legacy.md](./v1-legacy.md)

## 서버 인스턴스

```ts
class ServiceServer<TAuthInfo = unknown> extends EventEmitter<{ ready: void; close: void }>
function createServiceServer<TAuthInfo = unknown>(options: ServiceServerOptions): ServiceServer<TAuthInfo>
```

`createServiceServer` 는 `new ServiceServer` 의 얇은 래퍼. `TAuthInfo` 는 인증 토큰 `data` 필드의 타입(`ctx.authInfo` 와 토큰 발급/검증에 전파됨).

`ServiceServerOptions`:

- `rootPath: string` — 서버 루트 디렉토리. 정적 파일은 `<rootPath>/www`, 업로드는 `<rootPath>/www/uploads`, 설정은 `<rootPath>/.config.json` 및 `<rootPath>/www/<clientName>/.config.json` 에서 읽음.
- `port: number` — 리슨 포트. host 는 항상 `0.0.0.0`. `0` 이면 OS 가 임의 포트 배정(테스트용).
- `ssl?: { pfxBytes: Uint8Array; passphrase: string }` — HTTPS 인증서. 지정 시 HTTPS 구동 + HSTS·crossOriginOpenerPolicy 활성, 미지정 시 HTTP 구동 + `upgrade-insecure-requests` CSP 해제. PFX 형식 인증서만 지원.
- `auth?: { jwtSecret: string } | false` — 인증 모드. `{ jwtSecret }` = JWT 검증 활성, `false` = auth 요구 서비스가 있어도 인증 검사 스킵(의도적 비활성화), 미지정(undefined) = auth 요구 서비스가 하나라도 있으면 `listen()` 시 throw.
- `services: ServiceDefinition[]` — 노출할 서비스 목록. `defineService` 결과를 나열.
- `legacyV1Handlers?: V1RequestHandler[]` — V1 레거시 클라이언트용 커스텀 요청 핸들러. 자세히: [v1-legacy.md](./v1-legacy.md).

메서드:

- `listen(): Promise<void>` — Fastify 플러그인(websocket/helmet/multipart/static/cors) 등록 후 리슨 시작. auth 미설정인데 auth 요구 서비스가 있으면 throw. SIGINT/SIGTERM graceful shutdown 핸들러 등록(10초 내 미종료 시 강제 종료). 완료 시 `isOpen=true` + `ready` 이벤트 발생.
- `close(): Promise<void>` — 모든 WebSocket 연결 종료 + Fastify 종료. `isOpen=false` + `close` 이벤트 발생.
- `isOpen: boolean` — 현재 리슨 중 여부.
- `fastify: FastifyInstance` — 내부 Fastify 인스턴스(예: `fastify.server.address()` 로 실제 포트 조회).
- `options: ServiceServerOptions` — 생성 시 전달한 옵션(읽기 전용 참조).

```ts
const server = createServiceServer<MyAuthInfo>({
  rootPath: import.meta.dirname,
  port: 50080,
  auth: { jwtSecret: "secret" },
  services: [MyService, OrmService, AutoUpdateService],
});
await server.listen();
```

## 이벤트 브로드캐스트

```ts
interface ServerEventProxy<TEventDef extends ServiceEventDef> {
  emit(infoSelector: (item: TEventDef["$info"]) => boolean, data: TEventDef["$data"]): Promise<void>;
}
server.getEvent<TEventDef>(eventDef: TEventDef): ServerEventProxy<TEventDef>
server.emitEvent<TEventDef>(eventDef, infoSelector, data): Promise<void>
```

`ServiceEventDef` 는 `@simplysm/service-common` 의 이벤트 정의 타입(`eventName`/`$info`/`$data` 보유). 클라이언트는 이벤트 리스너 등록 시 `info` 를 같이 보내고, 서버는 등록된 모든 소켓의 리스너 중 `infoSelector` 가 true 인 대상에게만 `data` 를 푸시한다.

- `infoSelector: (item) => boolean` — 수신 대상 필터. 등록된 각 리스너의 `info` 를 받아 전송 여부를 결정. 특정 조건(예: 같은 화면을 보는 클라이언트)에만 보낼 때 사용.
- `getEvent` 는 `emit` 만 노출하는 프록시를 반환(내부적으로 `emitEvent` 호출) — 같은 eventDef 로 여러 번 emit 할 때 편함.

```ts
const evt = server.getEvent(MyDataChangedEvent);
await evt.emit((info) => info.boardId === 3, { updatedAt: new Date() });
```

## JWT 인증

```ts
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];
  data: TAuthInfo;
}
server.signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>
server.verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>

function signJwt<T>(jwtSecret: string, payload: AuthTokenPayload<T>): Promise<string>
function verifyJwt<T>(jwtSecret: string, token: string): Promise<AuthTokenPayload<T>>
function decodeJwt<T>(token: string): AuthTokenPayload<T>
```

- `AuthTokenPayload.roles: string[]` — 보유 역할 목록. `auth(["admin"], ...)` 권한 검사 시 이 배열에 해당 권한이 포함되는지 확인.
- `AuthTokenPayload.data: TAuthInfo` — 임의 사용자 정보. 서비스 메서드에서 `ctx.authInfo` 로 읽힘.
- `signAuthToken`/`verifyAuthToken` — 서버 옵션의 `jwtSecret` 을 자동 사용하는 인스턴스 메서드. jwtSecret 미설정 시 throw.
- `signJwt` — HS256, 발급시각 자동 설정, **만료 12시간 고정**. secret 은 UTF-8 로 인코딩됨.
- `verifyJwt` — 검증 실패 시 만료면 `"토큰이 만료되었습니다."`, 그 외엔 `"유효하지 않은 토큰입니다."` throw(jose 에러 코드 `ERR_JWT_EXPIRED` 로 만료 여부 구분).
- `decodeJwt` — **서명 검증 없이** 페이로드만 디코드. 신뢰할 수 없는 토큰 검증 용도로는 쓰지 말 것.

## 내장 서비스

`defineService` 결과 상수. `services` 목록에 그대로 추가해 사용. 둘 다 이름 별칭(`["Orm","SdOrmService"]`, `["AutoUpdate","SdAutoUpdateService"]`)을 가져 신·구 클라이언트 모두 호출 가능.

### OrmService / OrmServiceType

```ts
export const OrmService: ServiceDefinition
export type OrmServiceType = ServiceMethods<typeof OrmService>
```

`auth()` 로 래핑됨(로그인 필요). **WebSocket 전용** — HTTP 호출 시 throw(연결 ID 상태를 소켓에 묶어 관리하기 때문). DB 설정은 `ctx.getConfig("orm")` 의 `<configName>` 키에서 읽음. 소켓 종료 시 해당 소켓의 모든 열린 DB 연결을 자동 정리. 메서드: `getInfo`/`connect`(연결 ID 반환)/`close`/`beginTransaction`(`isolationLevel?`)/`commitTransaction`/`rollbackTransaction`/`executeParametrized`/`executeDefs`/`bulkInsert`. `dialect` 가 `"mssql-azure"` 면 `"mssql"` 로 정규화해 응답.

### AutoUpdateService / AutoUpdateServiceType

```ts
export const AutoUpdateService: ServiceDefinition
export type AutoUpdateServiceType = ServiceMethods<typeof AutoUpdateService>
```

인증 불필요. `getLastVersion(platform: string)` — `<clientPath>/<platform>/updates/` 에서 최신 버전 파일을 semver 로 골라 `{ version, downloadPath }` 반환, 없으면 undefined. `platform === "android"` 면 `.apk`, 그 외엔 `.exe` 파일만 후보(파일명이 버전 숫자 패턴 `^[0-9.]*$` 여야 함). `downloadPath` 는 `/` 로 시작하는 POSIX 경로.

```ts
client.getService<OrmServiceType>("Orm");
client.getService<AutoUpdateServiceType>("AutoUpdate");
```
