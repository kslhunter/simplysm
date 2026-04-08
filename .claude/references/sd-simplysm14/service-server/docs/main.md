# Main

## `ServiceServer`

Fastify를 래핑한 서비스 서버 클래스. WebSocket/HTTP 이중 전송, JWT 인증, 이벤트 브로드캐스트, graceful shutdown을 처리한다. `EventEmitter<{ ready: void; close: void }>`를 확장한다.

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
  async emitEvent<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
  async signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>;
  async verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `isOpen` | `boolean` | 서버가 리스닝 중인지 여부 |
| `fastify` | `FastifyInstance` | 내부 Fastify 인스턴스. 직접 접근이 필요할 때 사용 |
| `options` | `ServiceServerOptions` | 생성 시 전달된 옵션 |

| Method | Description |
|--------|-------------|
| `listen()` | 서버를 시작한다. 플러그인 등록, 라우트 설정, SIGINT/SIGTERM 핸들러 등록을 수행한다. 완료 시 `ready` 이벤트를 발생시킨다 |
| `close()` | 모든 WebSocket 연결을 닫고 Fastify 서버를 종료한다. 완료 시 `close` 이벤트를 발생시킨다 |
| `emitEvent(eventDef, infoSelector, data)` | `infoSelector`에 매칭되는 WebSocket 클라이언트에 이벤트를 브로드캐스트한다 |
| `signAuthToken(payload)` | JWT 토큰을 서명한다. `options.auth`가 설정되지 않으면 에러를 던진다 |
| `verifyAuthToken(token)` | JWT 토큰을 검증하고 페이로드를 반환한다. `options.auth`가 설정되지 않으면 에러를 던진다 |

`listen()` 시 등록되는 라우트:

| Route | Method | Handler |
|-------|--------|---------|
| `/api/:service/:method` | GET/POST | `handleHttpRequest` -- 서비스 메서드 호출 |
| `/upload` | POST | `handleUpload` -- multipart 파일 업로드 |
| `/`, `/ws` | WebSocket | WebSocket 핸들러. `ver=2` 쿼리 시 V2 프로토콜, 그 외 V1 레거시 |
| `/*` | GET/POST/PUT/DELETE/PATCH/HEAD | `handleStaticFile` -- 정적 파일 서빙 |

`listen()` 시 Fastify 플러그인 등록 순서: `@fastify/websocket` -> `@fastify/helmet` -> `@fastify/multipart` -> `@fastify/static` -> `@fastify/cors`

Graceful shutdown: `SIGINT`/`SIGTERM` 시그널 수신 시 `close()`를 호출하고, 10초 내에 종료되지 않으면 `process.exit(1)`로 강제 종료한다.

## `createServiceServer`

`ServiceServer` 인스턴스를 생성하는 팩토리 함수.

```typescript
function createServiceServer<TAuthInfo = unknown>(
  options: ServiceServerOptions,
): ServiceServer<TAuthInfo>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `ServiceServerOptions` | 서버 설정 옵션 |
