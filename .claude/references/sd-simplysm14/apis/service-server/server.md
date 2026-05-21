# @simplysm/service-server — 서버

## `createServiceServer<TAuthInfo>(options): ServiceServer<TAuthInfo>`

`new ServiceServer(options)` 단순 팩토리. `TAuthInfo` 는 JWT payload 의 `data` 필드 타입.

## `ServiceServerOptions`

- `rootPath: string` — 정적/업로드/설정 루트. 정적은 `<rootPath>/www/`, 업로드 저장은 `<rootPath>/www/uploads/`, 설정은 `<rootPath>/.config.json` 및 `<rootPath>/www/<clientName>/.config.json`.
- `port: number` — listen 포트. host 는 항상 `0.0.0.0`.
- `ssl?: { pfxBytes: Uint8Array; passphrase: string }` — 지정 시 HTTPS. 내부에서 `Buffer.from(pfxBytes)` 변환. 미지정 시 helmet 의 `upgrade-insecure-requests` 제거, `hsts`/`crossOriginOpenerPolicy` 비활성.
- `auth?: { jwtSecret: string } | false`
  - `undefined`(미지정): auth 미구성. 인증 요구 서비스가 하나라도 있으면 `listen()` 시 throw.
  - `false`: 의도적 비활성화. `auth()` 래핑된 서비스/메서드도 인증 스킵.
  - 객체: jwt 시크릿 등록.
- `services: ServiceDefinition[]` — `defineService()` 결과 배열.
- `legacyV1Handlers?: V1RequestHandler[]` — ver≠"2" 로 접속한 클라이언트의 커스텀 핸들러. 이 배열도 비고 `AutoUpdate` 서비스도 services 에 없으면 V1 연결을 1008 로 거부.

## `ServiceServer<TAuthInfo>`

`EventEmitter<{ ready: void; close: void }>` 상속.

- `readonly options: ServiceServerOptions`
- `readonly fastify: FastifyInstance` — 생성자에서 즉시 생성, 플러그인은 `listen()` 시 등록.
- `isOpen: boolean`
- `listen(): Promise<void>` — fastify 플러그인(`@fastify/websocket`, `@fastify/helmet`, `@fastify/multipart`, `@fastify/static`, `@fastify/cors`) 등록, JSON 파서/직렬화기를 `@simplysm/core-common` 의 `json` 으로 교체(Date/BigInt/Uint8Array 보존), 라우트 바인딩, `0.0.0.0:port` listen, SIGINT/SIGTERM 핸들러 등록(10초 후 `process.exit(1)` 강제), `ready` 이벤트 발생.
- `close(): Promise<void>` — 모든 WebSocket 종료 → `fastify.close()` → `close` 이벤트.
- `getEvent<TEventDef>(eventName): ServerEventProxy<TEventDef>` — `{ emit(infoSelector, data): Promise<void> }` 핸들 반환.
- `emitEvent<TEventDef>(eventName, infoSelector, data): Promise<void>` — 클라이언트가 `evt:add` 로 등록한 리스너 중 `infoSelector(info) === true` 인 키에만 푸시.
- `signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>` — HS256, `exp` 12h 고정. `jwtSecret` 미구성 시 throw.
- `verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>` — 만료/위조 시 throw.

`TEventDef` 는 `@simplysm/service-common` 의 `ServiceEventDef`(`{ $info; $data }` 형태). `infoSelector` 는 클라이언트가 listener 등록 시 보낸 `info` 객체를 받아 boolean 반환.

## 자동 등록되는 라우트

- `ALL /api/:service/:method` — RPC. `x-sd-client-name` 헤더 필수, `Authorization: Bearer <jwt>` 옵션. GET 은 `?json=<JSON encoded array>`, POST 는 body 가 params 배열. 그 외 HTTP 메서드 405.
- `ALL /upload` — multipart 업로드. 인증 헤더 필수. 응답 `ServiceUploadResult[]`.
- `GET /`, `GET /ws` — WebSocket. 쿼리 `ver=2&clientId=<id>&clientName=<name>` (clientId/clientName 누락 시 1008). ver≠"2" → V1 레거시.
- `* /*` — 정적 서빙(`/api/...`·`/upload`·`/`·`/ws` 외).

## 예

```ts
const server = createServiceServer<{ userId: string }>({
  rootPath: process.cwd(),
  port: 50080,
  auth: { jwtSecret: process.env.JWT_SECRET! },
  services: [UserService, OrmService],
});
server.on("ready", () => console.log("up"));
await server.listen();

const token = await server.signAuthToken({ roles: ["admin"], data: { userId: "u1" } });
await server.getEvent<{ $info: { shopId: number }; $data: { id: number } }>("order-created")
  .emit(info => info.shopId === 1, { id: 99 });
```
