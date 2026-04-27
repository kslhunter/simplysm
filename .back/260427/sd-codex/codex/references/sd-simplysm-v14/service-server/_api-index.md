# API Index — @simplysm/service-server

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Main

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ServiceServer` | class | [service-server.md](./main/service-server.md) | 서버를 생성하고 시작할 때 |
| `ServerEventProxy` | interface | [service-server.md](./main/service-server.md#servereventproxy) | `getEvent()`의 반환 타입을 참조할 때 |
| `createServiceServer` | function | [create-service-server.md](./main/create-service-server.md) | 팩토리 함수로 서버를 생성할 때 |

## Types

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ServiceServerOptions` | interface | [service-server-options.md](./types/service-server-options.md) | 서버 생성 옵션을 구성할 때 |

## Auth

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `AuthTokenPayload` | interface | [auth-token-payload.md](./auth/auth-token-payload.md) | JWT 페이로드 타입을 참조할 때 |
| `signJwt` | function | [sign-jwt.md](./auth/sign-jwt.md) | JWT 토큰을 서명할 때 |
| `verifyJwt` | function | [verify-jwt.md](./auth/verify-jwt.md) | JWT 토큰을 검증할 때 |
| `decodeJwt` | function | [verify-jwt.md](./auth/verify-jwt.md#decodejwt) | 검증 없이 토큰 내용을 확인할 때 |

## Core

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `defineService` | function | [define-service.md](./core/define-service.md) | 서비스를 정의할 때 |
| `ServiceDefinition` | interface | [define-service.md](./core/define-service.md#servicedefinition) | 서비스 정의 타입을 참조할 때 |
| `ServiceMethods` | type | [define-service.md](./core/define-service.md#servicemethods) | 클라이언트 측 타입 공유를 위해 메서드 시그니처를 추출할 때 |
| `auth` | function | [auth.md](./core/auth.md) | 서비스 또는 메서드에 인증을 요구할 때 |
| `getServiceAuthPermissions` | function | [auth.md](./core/auth.md#getserviceauthpermissions) | `auth()`로 래핑된 함수의 권한 배열을 읽을 때 |
| `ServiceContext` | interface | [service-context.md](./core/service-context.md) | 서비스 팩토리에서 컨텍스트 타입을 참조할 때 |
| `createServiceContext` | function | [service-context.md](./core/service-context.md#createservicecontext) | 테스트 등에서 `ServiceContext`를 직접 생성할 때 |
| `executeServiceMethod` | function | [execute-service-method.md](./core/execute-service-method.md) | 커스텀 전송 계층에서 서비스 실행 파이프라인을 직접 호출할 때 |

## Transport - Socket

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `WebSocketHandler` | interface | [websocket-handler.md](./transport-socket/websocket-handler.md) | WebSocket 메시지 라우팅 동작을 이해할 때 |
| `createWebSocketHandler` | function | [websocket-handler.md](./transport-socket/websocket-handler.md#createwebsockethandler) | 커스텀 WebSocket 핸들러를 생성할 때 |
| `ServiceSocket` | interface | [service-socket.md](./transport-socket/service-socket.md) | WebSocket 연결 추상화를 참조할 때 |
| `createServiceSocket` | function | [service-socket.md](./transport-socket/service-socket.md#createservicesocket) | 테스트 등에서 `ServiceSocket`을 직접 생성할 때 |

## Transport - HTTP

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `handleHttpRequest` | function | [handle-http-request.md](./transport-http/handle-http-request.md) | HTTP API 요청 처리 동작을 이해할 때 |
| `handleUpload` | function | [handle-upload.md](./transport-http/handle-upload.md) | 파일 업로드 처리 동작을 이해할 때 |
| `handleStaticFile` | function | [handle-static-file.md](./transport-http/handle-static-file.md) | 정적 파일 서빙 동작을 이해할 때 |

## Protocol

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ServerProtocolWrapper` | interface | [server-protocol-wrapper.md](./protocol/server-protocol-wrapper.md) | 프로토콜 인코딩/디코딩 래퍼의 동작을 이해할 때 |
| `createServerProtocolWrapper` | function | [server-protocol-wrapper.md](./protocol/server-protocol-wrapper.md#createserverprotocolwrapper) | 커스텀 프로토콜 래퍼를 생성할 때 |

## Services

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `OrmService` | const | [orm-service.md](./services/orm-service.md) | DB 연결을 서비스 계층에서 제공할 때 |
| `OrmServiceType` | type | [orm-service.md](./services/orm-service.md#ormservicetype) | 클라이언트에서 ORM 서비스 타입을 참조할 때 |
| `AutoUpdateService` | const | [auto-update-service.md](./services/auto-update-service.md) | 클라이언트 앱 자동 업데이트를 제공할 때 |
| `AutoUpdateServiceType` | type | [auto-update-service.md](./services/auto-update-service.md#autoupdateservicetype) | 클라이언트에서 자동 업데이트 서비스 타입을 참조할 때 |
| `AppStructureService` | function | [app-structure-service.md](./services/app-structure-service.md) | 앱 구조 정보를 클라이언트에 제공할 때 |
| `AppStructureServiceType` | type | [app-structure-service.md](./services/app-structure-service.md#appstructureservicetype) | 클라이언트에서 앱 구조 서비스 타입을 참조할 때 |

## Utils

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `getConfig` | function | [get-config.md](./utils/get-config.md) | `.config.json` 파일을 캐싱/자동 리로드로 읽을 때 |

## Legacy

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `handleV1Connection` | function | [handle-v1-connection.md](./legacy/handle-v1-connection.md) | V1 WebSocket 프로토콜 호환이 필요할 때 |
| `V1RequestHandler` | type | [handle-v1-connection.md](./legacy/handle-v1-connection.md) | 자동 업데이트 전 V1 레거시 요청 처리기를 작성할 때 |
| `V1RequestHandlerContext` | interface | [handle-v1-connection.md](./legacy/handle-v1-connection.md) | V1 처리기에서 요청과 서비스 컨텍스트를 참조할 때 |
| `V1RequestHandlerResult` | type | [handle-v1-connection.md](./legacy/handle-v1-connection.md) | V1 처리기의 처리/미처리 결과를 반환할 때 |
| `V1ConnectionOptions` | interface | [handle-v1-connection.md](./legacy/handle-v1-connection.md) | `handleV1Connection`을 옵션 객체로 구성할 때 |
