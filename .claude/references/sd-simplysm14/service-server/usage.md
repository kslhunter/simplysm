# @simplysm/service-server

Fastify 기반 서비스 서버. WebSocket/HTTP 이중 전송, JWT 인증, ORM 브리지, 자동 업데이트를 제공한다.

## Installation

```bash
npm install @simplysm/service-server
```

## API Overview

### Main

| API | Type | Description |
|-----|------|-------------|
| `ServiceServer` | class | Fastify 래핑 서버. WebSocket/HTTP 라우팅, JWT 인증, 이벤트 브로드캐스트, graceful shutdown을 처리한다 |
| `createServiceServer` | function | `ServiceServer` 인스턴스를 생성하는 팩토리 함수 |

→ See [docs/main.md](./docs/main.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `ServiceServerOptions` | interface | 서버 생성 옵션 (rootPath, port, ssl, auth, services) |

→ See [docs/types.md](./docs/types.md) for details.

### Auth

| API | Type | Description |
|-----|------|-------------|
| `AuthTokenPayload` | interface | JWT 페이로드. `roles`와 `data`를 포함하며 `JWTPayload`를 확장한다 |
| `signJwt` | function | HS256/12시간 유효기간으로 JWT 토큰을 서명한다 |
| `verifyJwt` | function | JWT 토큰을 검증하고 페이로드를 반환한다 |
| `decodeJwt` | function | JWT 토큰을 검증 없이 디코딩한다 |

→ See [docs/auth.md](./docs/auth.md) for details.

### Core

| API | Type | Description |
|-----|------|-------------|
| `ServiceContext` | interface | 서비스 팩토리에 전달되는 컨텍스트. 인증 정보, 클라이언트 경로, 설정 접근을 제공한다 |
| `createServiceContext` | function | `ServiceContext` 인스턴스를 생성한다 |
| `auth` | function | 서비스/메서드에 인증을 요구하는 래퍼 함수 |
| `getServiceAuthPermissions` | function | `auth()`로 래핑된 함수에서 인증 권한 배열을 읽는다 |
| `ServiceDefinition` | interface | 서비스 정의 구조체 (name, factory, authPermissions) |
| `defineService` | function | 이름과 팩토리로 서비스를 정의한다 |
| `ServiceMethods` | type | `ServiceDefinition`에서 메서드 시그니처를 추출하는 유틸리티 타입 |
| `executeServiceMethod` | function | 서비스 조회 → 컨텍스트 생성 → 인증 확인 → 메서드 실행 파이프라인 |

→ See [docs/core.md](./docs/core.md) for details.

### Transport - Socket

| API | Type | Description |
|-----|------|-------------|
| `WebSocketHandler` | interface | 다중 WebSocket 연결 관리, 메시지 라우팅, 이벤트 브로드캐스트 인터페이스 |
| `createWebSocketHandler` | function | `WebSocketHandler` 인스턴스를 생성한다 |
| `ServiceSocket` | interface | 프로토콜 인코딩/디코딩, ping/pong, 이벤트 리스너 추적이 포함된 단일 WebSocket 연결 |
| `createServiceSocket` | function | `ServiceSocket` 인스턴스를 생성한다 |

→ See [docs/transport-socket.md](./docs/transport-socket.md) for details.

### Transport - HTTP

| API | Type | Description |
|-----|------|-------------|
| `handleHttpRequest` | function | GET/POST `/api/:service/:method` 요청을 처리한다 |
| `handleUpload` | function | `/upload` 경로의 multipart 파일 업로드를 처리한다 |
| `handleStaticFile` | function | 정적 파일 서빙 (경로 탐색 공격 방지 포함) |

→ See [docs/transport-http.md](./docs/transport-http.md) for details.

### Protocol

| API | Type | Description |
|-----|------|-------------|
| `ServerProtocolWrapper` | interface | 메시지 인코딩/디코딩 래퍼. 무거운 작업은 worker 스레드에 위임한다 |
| `createServerProtocolWrapper` | function | `ServerProtocolWrapper` 인스턴스를 생성한다 |

→ See [docs/protocol.md](./docs/protocol.md) for details.

### Services

| API | Type | Description |
|-----|------|-------------|
| `OrmService` | const | ORM 브리지 서비스 정의. WebSocket 전용, 인증 필수 |
| `OrmServiceType` | type | `OrmService`의 메서드 시그니처 타입 |
| `AutoUpdateService` | const | 자동 업데이트 서비스 정의. 플랫폼별 최신 버전 파일을 탐색한다 |
| `AutoUpdateServiceType` | type | `AutoUpdateService`의 메서드 시그니처 타입 |

→ See [docs/services.md](./docs/services.md) for details.

### Utils

| API | Type | Description |
|-----|------|-------------|
| `getConfig` | function | `.config.json` 파일을 읽고 캐싱한다. 파일 변경 시 자동 리로드된다 |

→ See [docs/utils.md](./docs/utils.md) for details.

### Legacy

| API | Type | Description |
|-----|------|-------------|
| `handleV1Connection` | function | V1 레거시 WebSocket 프로토콜 호환 레이어. 자동 업데이트만 지원한다 |

→ See [docs/legacy.md](./docs/legacy.md) for details.

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
import { defineServiceEvent } from "@simplysm/service-common";

const UserUpdatedEvent = defineServiceEvent<{ userId: string }, { name: string }>("UserUpdated");

await server.emitEvent(
  UserUpdatedEvent,
  (info) => info.userId === "123",
  { name: "새 이름" },
);
```
