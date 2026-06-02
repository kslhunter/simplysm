# @simplysm/service-server

Fastify 기반 서비스 서버. WebSocket(v2)/HTTP RPC, JWT 인증, 정적 파일·업로드, 서버→클라이언트 이벤트 푸시를 한 서버로 제공한다. 클라이언트는 `defineService` 로 정의한 서비스의 메서드를 원격 호출한다.

## 사용 트리거 인덱스

- **createServiceServer / ServiceServer / ServiceServerOptions / ServerEventProxy** — 서버를 부팅(listen)·종료하고, 토큰을 서명/검증하고, 클라이언트로 이벤트를 푸시할 때.
- **defineService / auth / ServiceContext / ServiceMethods / ServiceDefinition** — RPC 서비스(메서드 묶음)를 정의하고 인증을 걸 때. 서비스 작성 시 항상 함께 읽힘. 자세히: [service-authoring.md](./service-authoring.md)
- **signJwt / verifyJwt / decodeJwt / AuthTokenPayload** — JWT 토큰을 서버 밖에서 직접 서명·검증·디코드할 때(서버의 `signAuthToken`/`verifyAuthToken` 으로 충분하면 불필요).
- **OrmService / AutoUpdateService** — DB 원격 실행·앱 자동업데이트를 `services` 에 끼워 넣을 때.
- **getConfig** — `.config.json` 을 캐시·워치와 함께 직접 읽을 때(보통 `ctx.getConfig` 로 간접 사용).
- **전송·프로토콜 내부 (WebSocketHandler, ServiceSocket, handleHttpRequest, handleUpload, handleStaticFile, ServerProtocolWrapper)** — ServiceServer 내부에서만 쓰는 저수준 핸들러. 직접 서버를 조립·진단할 때만. 자세히: [transport-internals.md](./transport-internals.md)
- **V1 레거시 (handleV1Connection, V1RequestHandler 등)** — ver≠2 구버전 클라이언트(자동업데이트)를 받을 때. 자세히: [v1-legacy.md](./v1-legacy.md)

## 서버 부팅 (createServiceServer / ServiceServer)

`createServiceServer<TAuthInfo>(options): ServiceServer<TAuthInfo>` — `new ServiceServer(options)` 의 래퍼. `TAuthInfo` 는 `ctx.authInfo` 및 JWT 페이로드 `data` 의 타입.

`class ServiceServer<TAuthInfo> extends EventEmitter<{ ready: void; close: void }>`:

- `options: ServiceServerOptions` — 생성자에 넘긴 옵션(readonly).
- `isOpen: boolean` — listen 성공 후 true, close 후 false. 가동 여부 판단에 사용.
- `fastify: FastifyInstance` — 내부 Fastify 인스턴스. 임의 포트 조회(`fastify.server.address()`)·직접 라우트 추가에 사용.
- `listen(): Promise<void>` — 플러그인 등록 후 `0.0.0.0:options.port` 수신 시작. 완료 시 `ready` emit. `auth` 미설정인데 auth 요구 서비스가 있으면 throw. listen 중 SIGINT/SIGTERM graceful shutdown(10초 타임아웃 후 강제 종료) 1회 등록.
- `close(): Promise<void>` — 모든 WebSocket 연결을 닫고 Fastify 종료. `close` emit.
- `getEvent<TEventDef>(eventDef): ServerEventProxy<TEventDef>` — eventDef 를 바인딩한 emit 전용 프록시 획득. 같은 이벤트를 반복 emit 할 때 편의.
- `emitEvent<TEventDef>(eventDef, infoSelector, data): Promise<void>` — `infoSelector(info) === true` 인 리스너에게만 `data` 전송. `infoSelector` = 리스너 등록 시의 info 로 수신 대상 선별.
- `signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>` — JWT 발급. `auth` 미설정 시 throw. 로그인 처리에 사용.
- `verifyAuthToken(token): Promise<AuthTokenPayload<TAuthInfo>>` — JWT 검증·페이로드 반환. `auth` 미설정 시 throw.

`ServerEventProxy<TEventDef>`:

- `emit(infoSelector: (info: TEventDef["$info"]) => boolean, data: TEventDef["$data"]): Promise<void>` — `getEvent` 가 반환하는 emit 헬퍼. `emitEvent` 와 동작 동일하되 eventDef 가 이미 바인딩됨.

```ts
const server = createServiceServer<MyAuth>({
  rootPath: process.cwd(),
  port: 50080,
  auth: { jwtSecret: env("JWT_SECRET")! },
  services: [OrmService, AutoUpdateService, MyService],
});
await server.listen();
const token = await server.signAuthToken({ roles: ["admin"], data: authInfo });
await server.getEvent(MyEventDef).emit((info) => info.room === "lobby", payload);
```

## ServiceServerOptions

- `rootPath: string` — 서버 루트. 정적파일은 `<rootPath>/www`, 업로드는 `<rootPath>/www/uploads`, 설정은 `<rootPath>/.config.json` 및 `www/<client>/.config.json` 기준.
- `port: number` — 수신 포트. `0` 이면 OS가 임의 할당(테스트용, `fastify.server.address()` 로 확인).
- `ssl?: { pfxBytes: Uint8Array; passphrase: string }` — HTTPS 설정. `pfxBytes` = PFX 인증서 바이트, `passphrase` = 암호. 설정 시 HSTS·COOP 켜짐, 미설정 시 HTTP(`upgrade-insecure-requests` 해제).
- `auth?: { jwtSecret: string } | false` — 인증 모드. `{ jwtSecret }` = JWT 활성(서명/검증 키), `false` = auth 요구 서비스를 두되 인증 검사를 의도적으로 스킵, `undefined`(미지정) = 인증 비활성이되 auth 요구 서비스가 있으면 `listen()` 에서 throw.
- `services: ServiceDefinition[]` — 등록할 서비스 목록(`defineService` 산출물).
- `legacyV1Handlers?: V1RequestHandler[]` — ver≠2 구버전 클라이언트용 커스텀 핸들러. 미지정 시 빈 배열.

## 인증 토큰 (AuthTokenPayload / signJwt / verifyJwt / decodeJwt)

`ServiceServer.signAuthToken`/`verifyAuthToken` 의 저수준 구현. 서버 밖에서 토큰을 직접 다룰 때 사용. HS256, 발급시각 자동, 만료 12시간 고정.

`interface AuthTokenPayload<TAuthInfo> extends jose.JWTPayload`:

- `roles: string[]` — 권한 역할 목록. `auth(["admin"], ...)` 의 권한 검사 대상.
- `data: TAuthInfo` — 애플리케이션 인증 정보. `ctx.authInfo` 로 노출됨.

- `signJwt<TAuthInfo>(jwtSecret, payload): Promise<string>` — HS256·발급시각 자동·만료 12h 로 서명.
- `verifyJwt<TAuthInfo>(jwtSecret, token): Promise<AuthTokenPayload<TAuthInfo>>` — 검증·디코드. 만료 시 "토큰이 만료되었습니다.", 그 외 실패 시 "유효하지 않은 토큰입니다." throw.
- `decodeJwt<TAuthInfo>(token): AuthTokenPayload<TAuthInfo>` — 서명 검증 없이 페이로드만 디코드.

```ts
const token = await signJwt(secret, { roles: ["admin"], data: { userId: "u1" } });
const payload = await verifyJwt<MyAuth>(secret, token); // payload.data, payload.roles
```

## 빌트인 서비스 (OrmService / AutoUpdateService)

`services` 배열에 넣어 등록. 각 서비스는 별칭 2개로 노출된다.

`OrmService` (이름 `"Orm"`, `"SdOrmService"`) — `auth()` 래핑(로그인 필요). WebSocket 전용(HTTP 호출 시 throw). 소켓별 DB 연결을 `connId` 로 관리하며 소켓 종료 시 자동 정리. 연결 설정은 `ctx.getConfig("orm")[configName]` 에서 읽음. 메서드:

- `getInfo(opt): Promise<{ dialect; database?; schema? }>` — 설정의 dialect·DB·스키마 조회(`mssql-azure` → `mssql` 로 표준화). `opt` = `DbConnOptions & { configName }`.
- `connect(opt): Promise<number>` — DB 연결 후 `connId` 반환. 첫 연결 시 소켓 close 훅 등록(누수 방지).
- `close(connId): Promise<void>` — 연결 종료. 종료 중 에러는 warn 로그만 남기고 무시.
- `beginTransaction(connId, isolationLevel?): Promise<void>` — 트랜잭션 시작. `isolationLevel` = 격리수준(미지정 시 드라이버 기본).
- `commitTransaction(connId)` / `rollbackTransaction(connId): Promise<void>` — 커밋/롤백.
- `executeParametrized(connId, query, params?): Promise<unknown[][]>` — 파라미터 바인딩 SQL 실행.
- `executeDefs(connId, defs, options?): Promise<unknown[][]>` — 쿼리 정의 배열 실행. `options` 가 모두 null 이면 묶음 실행 후 빈 결과, 아니면 정의별 결과셋을 `options[i]`(ResultMeta) 로 파싱.
- `bulkInsert(connId, tableName, columnDefs, records): Promise<void>` — 대량 삽입. `columnDefs` = 컬럼별 메타, `records` = 행 객체 배열.
- `type OrmServiceType = ServiceMethods<typeof OrmService>` — 클라이언트 타입 공유용.

`AutoUpdateService` (이름 `"AutoUpdate"`, `"SdAutoUpdateService"`) — 인증 없음.

- `getLastVersion(platform): Promise<{ version; downloadPath } | undefined>` — `www/<client>/<platform>/updates` 에서 최신 semver 산출물(`platform === "android"` 면 `.apk`, 그 외 `.exe`)을 찾아 버전·다운로드 경로 반환. 디렉토리/산출물 없으면 undefined. clientPath 없으면 throw.
- `type AutoUpdateServiceType = ServiceMethods<typeof AutoUpdateService>` — 클라이언트 타입 공유용.

```ts
services: [OrmService, AutoUpdateService]
// 클라이언트: client.getService<OrmServiceType>("Orm")
```

## 설정 읽기 (getConfig)

`getConfig<TConfig>(filePath): Promise<TConfig | undefined>` — JSON 설정 파일 로드. 1시간 만료 캐시 + FsWatcher 로 파일 변경 시 자동 리로드, 삭제 시 캐시 무효화. 파일 없으면 undefined. 보통 직접 호출하지 않고 `ctx.getConfig(section)`(루트 + 클라이언트 설정 merge 후 섹션 추출)으로 사용.
