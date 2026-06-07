# @simplysm/service-server

Fastify 기반 RPC 서비스 서버. WebSocket/HTTP 두 전송으로 서비스 메서드를 노출하고, JWT 인증·정적 파일·파일 업로드·서버측 이벤트 브로드캐스트·내장 ORM/자동업데이트 서비스를 한 프로세스에서 제공한다.

## 사용 트리거 인덱스

- **서버 부트스트랩** (`createServiceServer`, `ServiceServer`, `ServiceServerOptions`, `getEvent`/`emitEvent`) — 서버 앱 진입점에서 옵션을 주고 서버를 띄우거나, 서비스 메서드에서 클라이언트로 이벤트를 발생시킬 때. 아래 인라인 섹션.
- **서비스 작성** (`defineService`, `auth`, `ServiceContext`, `ServiceMethods`, `ServiceDefinition`, `getServiceAuthPermissions`) — RPC 로 노출할 서비스 메서드를 정의하고 컨텍스트·인증·권한을 붙일 때. 자세히: [service-authoring.md](./service-authoring.md)
- **JWT 인증 토큰** (`signJwt`, `verifyJwt`, `decodeJwt`, `AuthTokenPayload`) — 로그인 처리에서 토큰을 서명·검증할 때. 아래 인라인 섹션.
- **내장 서비스** (`OrmService`, `AutoUpdateService` 및 `*Methods` 타입) — DB 원격 실행·앱 자동업데이트를 서버 옵션 `services` 에 끼워넣을 때. 아래 인라인 섹션.
- **전송 계층 내부** (`executeServiceMethod`, `createServiceContext`, `ServiceSocket`, `WebSocketHandler`, `ServerProtocolWrapper`, HTTP/정적/업로드 핸들러, `getConfig`) — 커스텀 전송·테스트·디버깅에서 내부 구성요소를 직접 다룰 때. 자세히: [transport-internals.md](./transport-internals.md)
- **V1 레거시 지원** (`handleV1Connection`, `V1ConnectionOptions`, `V1RequestHandler` 등) — 구버전(ver≠2) 클라이언트의 WebSocket 연결을 받아 자동업데이트만 응대할 때. 자세히: [v1-legacy.md](./v1-legacy.md)

## 서버 부트스트랩

서버 앱 진입점에서 `createServiceServer(options)` 로 인스턴스를 만들고 `await server.listen()` 으로 기동한다.

### createServiceServer / ServiceServer

`createServiceServer<TAuthInfo = unknown>(options: ServiceServerOptions): ServiceServer<TAuthInfo>` — 옵션으로 서버 인스턴스를 생성(아직 리슨 안 함). `new ServiceServer<TAuthInfo>(options)` 직접 생성과 동일. `TAuthInfo` 는 인증 토큰 `data` 페이로드 타입으로 `server.signAuthToken`·`server.verifyAuthToken`·`ctx.authInfo` 에 그대로 흐른다.

`ServiceServerOptions` 필드:

- `rootPath: string` — 서버 작업 루트. 정적 파일·업로드·자동업데이트는 `rootPath/www` 하위를, 설정은 `rootPath/.config.json` 을 기준으로 한다. 절대경로 권장.
- `port: number` — 리슨 포트(`host: "0.0.0.0"` 고정). `0` 을 주면 OS 가 임의 포트를 할당하므로 테스트용으로 쓰고, 실제 포트는 `server.fastify.server.address()` 로 확인.
- `ssl?: { pfxBytes: Uint8Array; passphrase: string }` — HTTPS 인증서. `pfxBytes` = PFX 바이트(내부에서 `Buffer` 로 변환), `passphrase` = PFX 비밀번호. 지정 시 HTTPS 로 기동하고 HSTS·crossOriginOpenerPolicy 보안 헤더가 켜진다. 미지정 시 HTTP(평문)로 뜨고 `upgrade-insecure-requests` CSP 가 해제된다. 사내망 평문이면 생략, 외부 노출이면 지정.
- `auth?: { jwtSecret: string } | false` — JWT 인증 설정. 객체면 `jwtSecret` 으로 토큰 서명·검증; `false` 면 인증을 의도적으로 비활성(권한 요구 메서드도 인증 검사 스킵); `undefined`(미지정)이면서 권한 요구(`auth(...)` 래핑) 서비스가 하나라도 있으면 `listen()` 이 에러로 중단. 인증 쓰는 앱이면 객체, 인증을 명시적으로 끄려면 `false`.
- `services: ServiceDefinition[]` — `defineService` 로 만든 서비스 정의 배열. RPC 로 노출할 서비스 전부를 여기 등록.
- `legacyV1Handlers?: V1RequestHandler[]` — V1(ver≠2) 레거시 클라이언트의 커스텀 요청 핸들러. 자세히: [v1-legacy.md](./v1-legacy.md).

`ServiceServer<TAuthInfo>` 멤버(`EventEmitter<{ ready: void; close: void }>` 상속):

- `readonly options: ServiceServerOptions` — 생성 시 받은 옵션 원본.
- `readonly fastify: FastifyInstance` — 내부 Fastify 인스턴스. 포트 조회·추가 라우트 등록 등에 직접 접근.
- `isOpen: boolean` — 리슨 성공 후 `true`, `close()` 후 `false`.
- `listen(): Promise<void>` — 플러그인 등록(websocket/helmet/multipart/static/cors) 후 리슨. 완료 시 `"ready"` 이벤트 발생, `SIGINT`/`SIGTERM` 정상 종료 핸들러 등록(10초 내 미종료 시 강제 `process.exit(1)`). `auth` 미설정인데 권한 요구 서비스가 있으면 시작 전 throw.
- `close(): Promise<void>` — 모든 WebSocket 종료 후 Fastify 종료, `"close"` 이벤트 발생.
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

주의: `auth` 를 미지정한 채 권한 요구 서비스를 등록하면 `listen()` 이 즉시 throw 한다. 인증을 끄려면 `auth: false` 를 명시할 것.

### 서버측 이벤트 발생

서비스 메서드 처리 결과를 구독 중인 클라이언트에 브로드캐스트할 때. 이벤트 정의 객체(`@simplysm/service-common` 의 `defineEvent`)는 클라이언트·서버가 공유한다.

- `emitEvent<TEventDef>(eventDef: TEventDef, infoSelector: (info: TEventDef["$info"]) => boolean, data: TEventDef["$data"]): Promise<void>` — `eventDef.eventName` 을 구독한 전 클라이언트 리스너 중 `infoSelector(info)` 가 `true` 인 대상에게만 `data` 전송. 전체 전송은 `() => true`, 어느 구독에도 안 걸리면 전송 자체가 생략됨.
- `getEvent<TEventDef>(eventDef): ServerEventProxy<TEventDef>` — 같은 이벤트를 반복 발생시킬 때 쓰는 프록시. `proxy.emit(infoSelector, data)` 는 `emitEvent` 와 동일.
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

로그인 서비스 메서드에서 자격 확인 후 토큰을 발급하고, 다른 메서드에서 토큰을 검증할 때. 보통은 `server.signAuthToken`/`server.verifyAuthToken`(시크릿 자동 사용)을 쓰고, 시크릿을 직접 다룰 때만 아래 함수를 호출.

- `AuthTokenPayload<TAuthInfo>` — JWT 페이로드. `jose` 의 `JWTPayload`(`exp`/`iat` 등)를 확장하며 다음을 추가한다.
  - `roles: string[]` — 권한 역할 목록. `auth(["admin"], ...)` 의 권한 매칭 대상.
  - `data: TAuthInfo` — 앱 정의 사용자 정보. `ctx.authInfo` 로 노출.
- `signJwt<TAuthInfo>(jwtSecret: string, payload: AuthTokenPayload<TAuthInfo>): Promise<string>` — HS256 으로 서명. `iat` 자동 설정, 만료 12시간 고정.
- `verifyJwt<TAuthInfo>(jwtSecret: string, token: string): Promise<AuthTokenPayload<TAuthInfo>>` — 서명·만료 검증 후 페이로드 반환. 만료 시 "토큰이 만료되었습니다.", 그 외 검증 실패 시 "유효하지 않은 토큰입니다." 로 throw.
- `decodeJwt<TAuthInfo>(token: string): AuthTokenPayload<TAuthInfo>` — 서명 검증 없이 페이로드만 디코드(동기). 검증이 끝난 토큰의 내용만 다시 읽을 때 사용하고, 만료·위변조 판정에는 쓰지 말 것.

```ts
const AuthService = defineService("Auth", (ctx) => ({
  login: async (id: string, pw: string) => {
    const user = await authenticate(id, pw); // 앱 로직
    return ctx.server.signAuthToken({ roles: user.roles, data: user });
  },
}));
```

## 내장 서비스

서버 옵션 `services` 배열에 그대로 추가해 쓰는 미리 정의된 서비스. 두 이름(별칭)으로 노출되며, 클라이언트 타입 공유용 `*Methods` 타입도 함께 export 된다.

- `OrmService` / `OrmServiceMethods` — `["Orm", "SdOrmService"]` 두 이름으로 노출. 전체가 `auth(...)` 래핑이라 로그인 필요하고, **WebSocket 전송 전용**(소켓 단위로 DB 커넥션을 풀링하므로 HTTP 호출 시 throw). DB 접속 정보는 `ctx.getConfig("orm")[configName]` 으로 `rootPath/.config.json` 의 `orm` 섹션에서 읽는다. 소켓이 닫히면 그 소켓의 모든 커넥션을 자동 정리. 메서드:
  - `getInfo(opt)` — dialect·database·schema 조회(`mssql-azure` 는 `mssql` 로 정규화).
  - `connect(opt)` — 새 DB 연결을 풀에 추가하고 정수 `connId` 반환.
  - `close(connId)` — 해당 연결 종료.
  - `beginTransaction(connId, isolationLevel?)` / `commitTransaction(connId)` / `rollbackTransaction(connId)` — connId 대상 트랜잭션 제어.
  - `executeParametrized(connId, query, params?)` — 파라미터 바인딩 SQL 실행.
  - `executeDefs(connId, defs, options?)` — `QueryDef[]` 를 dialect 에 맞춰 빌드·실행하고, `options[i]` 가 있으면 결과를 파싱·반환(전부 `null` 이면 일괄 실행만).
  - `bulkInsert(connId, tableName, columnDefs, records)` — 대량 삽입.
- `AutoUpdateService` / `AutoUpdateServiceMethods` — `["AutoUpdate", "SdAutoUpdateService"]` 두 이름으로 노출. 인증 불필요. 메서드 `getLastVersion(platform: string)` 은 `rootPath/www/<clientName>/<platform>/updates` 에서 `android` 면 `.apk`, 그 외면 `.exe` 파일 중 semver 최대 버전을 찾아 `{ version, downloadPath }` 반환(대상 없으면 `undefined`).

```ts
services: [OrmService, AutoUpdateService, ...앱서비스들]
```

주의: 두 내장 서비스는 클라이언트가 짧은 이름(`getService("Orm")`/`getService("AutoUpdate")`) 또는 레거시 이름(`SdOrmService`/`SdAutoUpdateService`) 어느 쪽으로도 호출할 수 있다.
