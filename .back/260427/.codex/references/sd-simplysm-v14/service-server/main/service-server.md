# `ServiceServer`

> **읽어야 하는 상황**: Fastify 기반 서비스 서버를 생성하고 시작할 때. 팩토리 함수를 선호하면 [`createServiceServer`](./create-service-server.md) 참조.

Fastify를 래핑한 서비스 서버 클래스. WebSocket/HTTP 이중 전송, JWT 인증, 이벤트 브로드캐스트, graceful shutdown을 처리한다. `EventEmitter<{ ready: void; close: void }>`를 확장한다.

## When to use

- ✅ Fastify 기반 서비스 서버를 생성하고 시작할 때
- ✅ WebSocket/HTTP 이중 전송으로 서비스를 제공할 때
- ✅ 서버에서 클라이언트에 이벤트를 브로드캐스트할 때
- ❌ 브라우저에서 서버에 연결 → `@simplysm/service-client`

```typescript
class ServiceServer<TAuthInfo = unknown> extends EventEmitter<{
  ready: void;
  close: void;
}> {
  isOpen: boolean;
  readonly fastify: FastifyInstance;
  readonly options: ServiceServerOptions;

  constructor(options: ServiceServerOptions);

  async listen(): Promise<void>;
  async close(): Promise<void>;
  getEvent<TEventDef extends ServiceEventDef>(eventName: string): ServerEventProxy<TEventDef>;
  async emitEvent<TEventDef extends ServiceEventDef>(
    eventName: string,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
  async signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>;
  async verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `isOpen` | property | `boolean` | 서버가 리스닝 중인지 여부 |
| `fastify` | property | `FastifyInstance` | 내부 Fastify 인스턴스. 직접 접근이 필요할 때 사용 |
| `options` | property | `ServiceServerOptions` | 생성 시 전달된 옵션 |
| `listen()` | method | `Promise<void>` | 서버를 시작한다. 플러그인 등록, 라우트 설정, SIGINT/SIGTERM 핸들러 등록을 수행한다. 완료 시 `ready` 이벤트를 발생시킨다 |
| `close()` | method | `Promise<void>` | 모든 WebSocket 연결을 닫고 Fastify 서버를 종료한다. 완료 시 `close` 이벤트를 발생시킨다 |
| `getEvent(eventName)` | method | `ServerEventProxy<TEventDef>` | 타입 안전한 이벤트 프록시를 반환한다. `emit(infoSelector, data)` 메서드를 포함 |
| `emitEvent(eventName, infoSelector, data)` | method | `Promise<void>` | `infoSelector`에 매칭되는 WebSocket 클라이언트에 이벤트를 브로드캐스트한다 |
| `signAuthToken(payload)` | method | `Promise<string>` | JWT 토큰을 서명한다. `options.auth`가 설정되지 않으면 에러를 던진다 |
| `verifyAuthToken(token)` | method | `Promise<AuthTokenPayload<TAuthInfo>>` | JWT 토큰을 검증하고 페이로드를 반환한다. `options.auth`가 설정되지 않으면 에러를 던진다 |

`listen()` 시 등록되는 라우트:

| Route | Method | Handler |
|-------|--------|---------|
| `/api/:service/:method` | GET/POST | `handleHttpRequest` — 서비스 메서드 호출 |
| `/upload` | POST | `handleUpload` — multipart 파일 업로드 |
| `/`, `/ws` | WebSocket | WebSocket 핸들러. `ver=2` 쿼리 시 V2 프로토콜, 그 외 V1 레거시 |
| `/*` | GET/POST/PUT/DELETE/PATCH/HEAD | `handleStaticFile` — 정적 파일 서빙 |

`listen()` 시 Fastify 플러그인 등록 순서: `@fastify/websocket` → `@fastify/helmet` → `@fastify/multipart` → `@fastify/static` → `@fastify/cors`

Graceful shutdown: `SIGINT`/`SIGTERM` 시그널 수신 시 `close()`를 호출하고, 10초 내에 종료되지 않으면 `process.exit(1)`로 강제 종료한다.

## Related Types

### `ServerEventProxy`

`getEvent()`가 반환하는 타입 안전한 이벤트 프록시 인터페이스.

```typescript
interface ServerEventProxy<TEventDef extends ServiceEventDef> {
  emit(
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `emit(infoSelector, data)` | `infoSelector`에 매칭되는 이벤트 리스너를 가진 WebSocket 클라이언트에 이벤트를 브로드캐스트한다 |

## Usage

```typescript
import { createServiceServer, defineService, auth } from "@simplysm/service-server";

const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok" }),
}));

const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
})));

const server = createServiceServer<{ userId: string }>({
  rootPath: "/app",
  port: 3000,
  auth: { jwtSecret: "my-secret" },
  services: [HealthService, UserService],
});

await server.listen();

// JWT 토큰 발급
const token = await server.signAuthToken({
  roles: ["admin"],
  data: { userId: "123" },
});

// 이벤트 브로드캐스트
const evt = server.getEvent<typeof MyEvent>("MyEvent");
await evt.emit((info) => info.userId === "123", { name: "새 이름" });
```
