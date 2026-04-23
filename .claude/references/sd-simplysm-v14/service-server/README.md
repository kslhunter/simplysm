# @simplysm/service-server

> Fastify 기반 서비스 서버. WebSocket/HTTP 이중 전송, JWT 인증, ORM 브리지, 자동 업데이트를 제공한다.
> Node.js 런타임 전용. `@simplysm/service-common`과 `@simplysm/core-common`에 의존한다.

## Installation

```bash
npm install @simplysm/service-server
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| 서버 생성 및 시작 | [`ServiceServer`](./main/service-server.md) |
| 서비스 정의 | [`defineService`](./core/define-service.md) |
| 인증 적용 | [`auth`](./core/auth.md) |
| JWT 토큰 발급/검증 | [`signJwt`](./auth/sign-jwt.md), [`verifyJwt`](./auth/verify-jwt.md) |
| 이벤트 브로드캐스트 | [`ServiceServer`](./main/service-server.md) (`getEvent` / `emitEvent`) |
| ORM 서비스 등록 | [`OrmService`](./services/orm-service.md) |
| 자동 업데이트 서비스 등록 | [`AutoUpdateService`](./services/auto-update-service.md) |
| 파일 업로드 처리 | [`handleUpload`](./transport-http/handle-upload.md) |
| 설정 파일 읽기 | [`getConfig`](./utils/get-config.md) |

## API Overview

### Main

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ServiceServer`](./main/service-server.md) | class | 서버를 생성하고 시작할 때. WebSocket/HTTP 라우팅, JWT 인증, 이벤트 브로드캐스트, graceful shutdown을 처리한다 |
| [`ServerEventProxy`](./main/service-server.md#servereventproxy) | interface | `getEvent()`의 반환 타입을 참조할 때 |
| [`createServiceServer`](./main/create-service-server.md) | function | `new ServiceServer()` 대신 팩토리 함수로 서버를 생성할 때 |

### Types

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ServiceServerOptions`](./types/service-server-options.md) | interface | 서버 생성 옵션을 구성할 때 (rootPath, port, ssl, auth, services) |

### Auth

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`AuthTokenPayload`](./auth/auth-token-payload.md) | interface | JWT 페이로드 타입을 참조할 때 |
| [`signJwt`](./auth/sign-jwt.md) | function | 서버 외부에서 직접 JWT 토큰을 서명할 때. 일반적으로는 `server.signAuthToken()` 사용을 권장 |
| [`verifyJwt`](./auth/verify-jwt.md) | function | 서버 외부에서 직접 JWT 토큰을 검증할 때. 일반적으로는 `server.verifyAuthToken()` 사용을 권장 |
| [`decodeJwt`](./auth/verify-jwt.md#decodejwt) | function | 검증 없이 토큰 내용을 확인할 때 (디버깅 등) |

### Core

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`defineService`](./core/define-service.md) | function | 서비스를 정의할 때. 이름과 팩토리 함수로 구성한다 |
| [`ServiceDefinition`](./core/define-service.md#servicedefinition) | interface | 서비스 정의 타입을 참조할 때 |
| [`ServiceMethods`](./core/define-service.md#servicemethods) | type | 클라이언트 측 타입 공유를 위해 서비스 메서드 시그니처를 추출할 때 |
| [`auth`](./core/auth.md) | function | 서비스 또는 메서드에 인증을 요구할 때 |
| [`getServiceAuthPermissions`](./core/auth.md#getserviceauthpermissions) | function | `auth()`로 래핑된 함수의 권한 배열을 프로그래밍적으로 읽을 때 |
| [`ServiceContext`](./core/service-context.md) | interface | 서비스 팩토리에서 컨텍스트 타입을 참조할 때 |
| [`createServiceContext`](./core/service-context.md#createservicecontext) | function | 테스트 등에서 `ServiceContext`를 직접 생성할 때 |
| [`executeServiceMethod`](./core/execute-service-method.md) | function | 커스텀 전송 계층에서 서비스 실행 파이프라인을 직접 호출할 때 |

### Transport - Socket

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`WebSocketHandler`](./transport-socket/websocket-handler.md) | interface | WebSocket 메시지 라우팅 및 이벤트 브로드캐스트 동작을 이해할 때 |
| [`createWebSocketHandler`](./transport-socket/websocket-handler.md#createwebsockethandler) | function | 커스텀 WebSocket 핸들러를 생성할 때 |
| [`ServiceSocket`](./transport-socket/service-socket.md) | interface | WebSocket 연결 추상화를 참조할 때. `ServiceContext.socket`의 타입이다 |
| [`createServiceSocket`](./transport-socket/service-socket.md#createservicesocket) | function | 테스트 등에서 `ServiceSocket`을 직접 생성할 때 |

### Transport - HTTP

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`handleHttpRequest`](./transport-http/handle-http-request.md) | function | HTTP API 요청 처리 동작을 이해할 때. `ServiceServer`가 내부적으로 사용한다 |
| [`handleUpload`](./transport-http/handle-upload.md) | function | 파일 업로드 처리 동작을 이해할 때. `ServiceServer`가 내부적으로 사용한다 |
| [`handleStaticFile`](./transport-http/handle-static-file.md) | function | 정적 파일 서빙 동작을 이해할 때. `ServiceServer`가 내부적으로 사용한다 |

### Protocol

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ServerProtocolWrapper`](./protocol/server-protocol-wrapper.md) | interface | 프로토콜 인코딩/디코딩 래퍼의 동작을 이해할 때. worker 스레드 자동 위임 기준을 확인할 때 |
| [`createServerProtocolWrapper`](./protocol/server-protocol-wrapper.md#createserverprotocolwrapper) | function | 커스텀 프로토콜 래퍼를 생성할 때 |

### Services

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`OrmService`](./services/orm-service.md) | const | DB 연결을 서비스 계층에서 제공할 때. WebSocket 전용, 인증 필수 |
| [`OrmServiceType`](./services/orm-service.md#ormservicetype) | type | 클라이언트에서 ORM 서비스 타입을 참조할 때 |
| [`AutoUpdateService`](./services/auto-update-service.md) | const | 클라이언트 앱 자동 업데이트를 제공할 때 |
| [`AutoUpdateServiceType`](./services/auto-update-service.md#autoupdateservicetype) | type | 클라이언트에서 자동 업데이트 서비스 타입을 참조할 때 |
| [`AppStructureService`](./services/app-structure-service.md) | function | 앱 구조 정보를 클라이언트에 제공할 때 |
| [`AppStructureServiceType`](./services/app-structure-service.md#appstructureservicetype) | type | 클라이언트에서 앱 구조 서비스 타입을 참조할 때 |

### Utils

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`getConfig`](./utils/get-config.md) | function | `.config.json` 파일을 캐싱 및 자동 리로드로 읽을 때 |

### Legacy

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`handleV1Connection`](./legacy/handle-v1-connection.md) | function | V1 WebSocket 프로토콜 호환이 필요할 때. 자동 업데이트만 지원한다 |

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

## 이 패키지를 쓰지 말아야 할 때

- 브라우저 환경에서 서버에 연결 → `@simplysm/service-client`
- 서버-클라이언트 공유 타입/프로토콜 정의 → `@simplysm/service-common`
