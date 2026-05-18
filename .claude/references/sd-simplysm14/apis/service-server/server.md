# @simplysm/service-server — server

서버 인스턴스 부트스트랩 표면. `ServiceServer` 가 Fastify · WebSocket · JWT · 정적/업로드/API 라우트를 일괄 등록하고 SIGINT/SIGTERM 정상 종료까지 처리한다.

## `ServiceServerOptions`

```ts
interface ServiceServerOptions {
  rootPath: string;                                  // 정적/업로드/설정 루트 (www, .config.json 기준)
  port: number;
  ssl?: { pfxBytes: Uint8Array; passphrase: string };
  auth?: { jwtSecret: string } | false;              // undefined: auth 미설정(=auth 서비스 등록 시 에러)
                                                     // false: 의도적 비활성화 (검사 스킵)
  services: ServiceDefinition[];                     // defineService 결과
  legacyV1Handlers?: V1RequestHandler[];             // V1 클라이언트 fallback
}
```

## `createServiceServer<TAuthInfo>(opts) → ServiceServer<TAuthInfo>`

`new ServiceServer(opts)` 단순 래퍼. `TAuthInfo` 는 JWT `data` 페이로드 타입.

## `ServiceServer<TAuthInfo>`

```ts
class ServiceServer<TAuthInfo = unknown> extends EventEmitter<{ ready: void; close: void }> {
  readonly fastify: FastifyInstance;
  readonly options: ServiceServerOptions;
  isOpen: boolean;

  listen(): Promise<void>;                           // 플러그인 등록 + 0.0.0.0 listen + SIGINT/SIGTERM 훅
  close(): Promise<void>;                            // 모든 WS close + fastify.close
  signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>;  // HS256, 12h
  verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>;
  getEvent<TEventDef>(eventName): ServerEventProxy<TEventDef>;
  emitEvent<TEventDef>(name, infoSelector, data): Promise<void>;
}
```

`listen()` 동작 — 한 번 호출로 모두 등록: helmet/cors/multipart/websocket/@fastify/static, `POST /api/:service/:method` (HTTP RPC), `ALL /upload` (multipart 업로드), `GET /` 및 `GET /ws` (WebSocket: `?ver=2&clientId=&clientName=` 필요. ver 누락 시 V1 레거시 분기), 와일드카드 `/*` (`<rootPath>/www` 정적 파일).

`auth == null` 인데 `services` 중 하나라도 `authPermissions != null` 이면 `listen()` 에서 즉시 throw.

이벤트 브로드캐스트 — 서버는 클라이언트가 `evt:add` 로 등록한 리스너만 안다. `getEvent(name).emit(infoSelector, data)` 로 매칭된 리스너에게만 푸시:

```ts
server.getEvent<{ $info: { tenantId: string }; $data: { id: string } }>("orderCreated")
  .emit((info) => info.tenantId === "T1", { id: "O-100" });
```

## `ServerEventProxy<TEventDef>`

`getEvent()` 가 반환하는 핸들. `emit(infoSelector, data)` 만 노출.

## 최소 예제

```ts
const server = createServiceServer<MyAuth>({
  rootPath: process.cwd(),
  port: 50080,
  auth: { jwtSecret: env("JWT_SECRET")! },
  services: [OrmService, AutoUpdateService, MyService],
});
server.on("ready", () => console.log("up"));
await server.listen();
```
