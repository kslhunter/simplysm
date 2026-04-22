# @simplysm/service-server

Fastify 기반 서비스 서버. WebSocket/HTTP 이중 전송, JWT 인증, ORM 브리지, 자동 업데이트를 제공한다.

## Installation

```bash
npm install @simplysm/service-server
```

## API Overview

### Main

| Entry | Kind | Description |
|-------|------|-------------|
| [`ServiceServer`](./docs/main/service-server.md) | class | Fastify 래핑 서버. WebSocket/HTTP 라우팅, JWT 인증, 이벤트 브로드캐스트, graceful shutdown을 처리한다 |
| [`ServerEventProxy`](./docs/main/service-server.md#servereventproxy) | interface | `getEvent()`가 반환하는 서버 이벤트 프록시 (`emit` 메서드만 포함) |
| [`createServiceServer`](./docs/main/create-service-server.md) | function | `ServiceServer` 인스턴스를 생성하는 팩토리 함수 |

### Types

| Entry | Kind | Description |
|-------|------|-------------|
| [`ServiceServerOptions`](./docs/types/service-server-options.md) | interface | 서버 생성 옵션 (rootPath, port, ssl, auth, services) |

### Auth

| Entry | Kind | Description |
|-------|------|-------------|
| [`AuthTokenPayload`](./docs/auth/auth-token-payload.md) | interface | JWT 페이로드. `roles`와 `data`를 포함하며 `JWTPayload`를 확장한다 |
| [`signJwt`](./docs/auth/sign-jwt.md) | function | HS256/12시간 유효기간으로 JWT 토큰을 서명한다 |
| [`verifyJwt`](./docs/auth/verify-jwt.md) | function | JWT 토큰을 검증하고 페이로드를 반환한다 |
| [`decodeJwt`](./docs/auth/verify-jwt.md#decodejwt) | function | JWT 토큰을 검증 없이 디코딩한다 |

### Core

| Entry | Kind | Description |
|-------|------|-------------|
| [`ServiceContext`](./docs/core/service-context.md) | interface | 서비스 팩토리에 전달되는 컨텍스트. 인증 정보, 클라이언트 경로, 설정 접근을 제공한다 |
| [`createServiceContext`](./docs/core/service-context.md#createservicecontext) | function | `ServiceContext` 인스턴스를 생성한다 |
| [`auth`](./docs/core/auth.md) | function | 서비스/메서드에 인증을 요구하는 래퍼 함수 |
| [`getServiceAuthPermissions`](./docs/core/auth.md#getserviceauthpermissions) | function | `auth()`로 래핑된 함수에서 인증 권한 배열을 읽는다 |
| [`ServiceDefinition`](./docs/core/define-service.md#servicedefinition) | interface | 서비스 정의 구조체 (name, factory, authPermissions) |
| [`defineService`](./docs/core/define-service.md) | function | 이름과 팩토리로 서비스를 정의한다 |
| [`ServiceMethods`](./docs/core/define-service.md#servicemethods) | type | `ServiceDefinition`에서 메서드 시그니처를 추출하는 유틸리티 타입 |
| [`executeServiceMethod`](./docs/core/execute-service-method.md) | function | 서비스 조회 → 컨텍스트 생성 → 인증 확인 → 메서드 실행 파이프라인 |

### Transport - Socket

| Entry | Kind | Description |
|-------|------|-------------|
| [`WebSocketHandler`](./docs/transport-socket/websocket-handler.md) | interface | 다중 WebSocket 연결 관리, 메시지 라우팅, 이벤트 브로드캐스트 인터페이스 |
| [`createWebSocketHandler`](./docs/transport-socket/websocket-handler.md#createwebsockethandler) | function | `WebSocketHandler` 인스턴스를 생성한다 |
| [`ServiceSocket`](./docs/transport-socket/service-socket.md) | interface | 프로토콜 인코딩/디코딩, ping/pong, 이벤트 리스너 추적이 포함된 단일 WebSocket 연결 |
| [`createServiceSocket`](./docs/transport-socket/service-socket.md#createservicesocket) | function | `ServiceSocket` 인스턴스를 생성한다 |

### Transport - HTTP

| Entry | Kind | Description |
|-------|------|-------------|
| [`handleHttpRequest`](./docs/transport-http/handle-http-request.md) | function | GET/POST `/api/:service/:method` 요청을 처리한다 |
| [`handleUpload`](./docs/transport-http/handle-upload.md) | function | `/upload` 경로의 multipart 파일 업로드를 처리한다 |
| [`handleStaticFile`](./docs/transport-http/handle-static-file.md) | function | 정적 파일 서빙 (경로 탐색 공격 방지 포함) |

### Protocol

| Entry | Kind | Description |
|-------|------|-------------|
| [`ServerProtocolWrapper`](./docs/protocol/server-protocol-wrapper.md) | interface | 메시지 인코딩/디코딩 래퍼. 무거운 작업은 worker 스레드에 위임한다 |
| [`createServerProtocolWrapper`](./docs/protocol/server-protocol-wrapper.md#createserverprotocolwrapper) | function | `ServerProtocolWrapper` 인스턴스를 생성한다 |

### Services

| Entry | Kind | Description |
|-------|------|-------------|
| [`OrmService`](./docs/services/orm-service.md) | const | ORM 브리지 서비스 정의. WebSocket 전용, 인증 필수 |
| [`OrmServiceType`](./docs/services/orm-service.md#ormservicetype) | type | `OrmService`의 메서드 시그니처 타입 |
| [`AutoUpdateService`](./docs/services/auto-update-service.md) | const | 자동 업데이트 서비스 정의. 플랫폼별 최신 버전 파일을 탐색한다 |
| [`AutoUpdateServiceType`](./docs/services/auto-update-service.md#autoupdateservicetype) | type | `AutoUpdateService`의 메서드 시그니처 타입 |
| [`AppStructureService`](./docs/services/app-structure-service.md) | function | 앱 구조 정보 서비스를 생성하는 팩토리 함수 |
| [`AppStructureServiceType`](./docs/services/app-structure-service.md#appstructureservicetype) | type | `AppStructureService`가 반환하는 서비스의 메서드 시그니처 타입 |

### Utils

| Entry | Kind | Description |
|-------|------|-------------|
| [`getConfig`](./docs/utils/get-config.md) | function | `.config.json` 파일을 읽고 캐싱한다. 파일 변경 시 자동 리로드된다 |

### Legacy

| Entry | Kind | Description |
|-------|------|-------------|
| [`handleV1Connection`](./docs/legacy/handle-v1-connection.md) | function | V1 레거시 WebSocket 프로토콜 호환 레이어. 자동 업데이트만 지원한다 |

## Usage Examples

### 서버 생성 및 시작

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
```

### JWT 토큰 발급 및 검증

```typescript
const token = await server.signAuthToken({
  roles: ["admin"],
  data: { userId: "123" },
});

const payload = await server.verifyAuthToken(token);
// payload.data.userId === "123"
```

### 이벤트 브로드캐스트

```typescript
import { defineEvent } from "@simplysm/service-common";

export const UserUpdatedEvent = defineEvent<{ userId: string }, { name: string }>("UserUpdated");

const userUpdatedEvt = server.getEvent<typeof UserUpdatedEvent>("UserUpdated");
await userUpdatedEvt.emit((info) => info.userId === "123", { name: "새 이름" });
```
