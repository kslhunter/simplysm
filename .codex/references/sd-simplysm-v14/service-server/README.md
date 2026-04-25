# @simplysm/service-server

> Fastify 기반 서비스 서버. WebSocket/HTTP 이중 전송, JWT 인증, ORM 브리지, 자동 업데이트를 제공한다.
> Node.js 런타임 전용. `@simplysm/service-common`과 `@simplysm/core-common`에 의존한다.

## Installation

```bash
npm install @simplysm/service-server
```

## 하려는 작업 → 읽을 파일

### 서버 구성 및 실행

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| Fastify 기반 서비스 서버를 생성하고 시작할 때 | [ServiceServer](./main/service-server.md) |
| `new ServiceServer()` 대신 팩토리 함수로 서버를 생성할 때 | [createServiceServer](./main/create-service-server.md) |
| 서버 생성 옵션(rootPath, port, ssl, auth, services)을 구성할 때 | [ServiceServerOptions](./types/service-server-options.md) |

### 서비스 정의 및 인증

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 이름과 팩토리 함수로 서비스를 정의할 때 | [defineService](./core/define-service.md) |
| 서비스 또는 메서드에 로그인/역할 인증을 적용할 때 | [auth](./core/auth.md) |
| 서비스 팩토리에서 컨텍스트(인증 정보, 설정 파일 등)에 접근할 때 | [ServiceContext](./core/service-context.md) |
| 커스텀 전송 계층에서 서비스 실행 파이프라인을 직접 호출할 때 | [executeServiceMethod](./core/execute-service-method.md) |

### JWT 인증

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| JWT 페이로드 타입을 참조할 때 | [AuthTokenPayload](./auth/auth-token-payload.md) |
| 서버 외부에서 직접 JWT 토큰을 서명할 때 | [signJwt](./auth/sign-jwt.md) |
| 서버 외부에서 직접 JWT 토큰을 검증/디코딩할 때 | [verifyJwt](./auth/verify-jwt.md) |

### 내장 서비스 등록

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 클라이언트에서 WebSocket으로 DB 연결/쿼리를 수행할 때 | [OrmService](./services/orm-service.md) |
| 클라이언트 앱(APK/EXE) 자동 업데이트를 제공할 때 | [AutoUpdateService](./services/auto-update-service.md) |
| 클라이언트에 앱 구조(메뉴/페이지) 정보를 제공할 때 | [AppStructureService](./services/app-structure-service.md) |

### 전송 계층 (내부 동작 이해)

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| WebSocket 메시지 라우팅/이벤트 브로드캐스트 동작을 이해할 때 | [WebSocketHandler](./transport-socket/websocket-handler.md) |
| WebSocket 연결 추상화(`ServiceContext.socket`의 타입)를 참조할 때 | [ServiceSocket](./transport-socket/service-socket.md) |
| HTTP API 요청 처리 동작을 이해할 때 | [handleHttpRequest](./transport-http/handle-http-request.md) |
| 파일 업로드 처리 동작을 이해할 때 | [handleUpload](./transport-http/handle-upload.md) |
| 정적 파일 서빙 동작을 이해할 때 | [handleStaticFile](./transport-http/handle-static-file.md) |

### 프로토콜 및 유틸리티

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 프로토콜 인코딩/디코딩 래퍼(worker 자동 위임)를 이해할 때 | [ServerProtocolWrapper](./protocol/server-protocol-wrapper.md) |
| `.config.json` 파일을 캐싱/자동 리로드로 읽을 때 | [getConfig](./utils/get-config.md) |

### 레거시

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| V1 WebSocket 프로토콜 호환이 필요할 때 (자동 업데이트만 지원) | [handleV1Connection](./legacy/handle-v1-connection.md) |

## 이 패키지를 쓰지 말아야 할 때

- 브라우저 환경에서 서버에 연결 → `@simplysm/service-client`
- 서버-클라이언트 공유 타입/프로토콜 정의 → `@simplysm/service-common`

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
