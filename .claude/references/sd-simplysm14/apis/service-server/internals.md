# @simplysm/service-server — internals

`ServiceServer.listen()` 이 자동으로 endpoint 에 연결하는 핸들러·소켓·프로토콜·레거시 유틸의 표면. 표준 부트스트랩에서는 호출할 필요가 없으며, 자체 Fastify 인스턴스에 라우트를 직접 부착하거나 비표준 전송을 만들 때만 직접 import 한다.

## HTTP 핸들러

### `handleHttpRequest(req, reply, jwtSecret, runMethod)`

`/api/:service/:method` 라우트 핸들러. `x-sd-client-name` 헤더 필수. `Authorization: Bearer <token>` 있으면 `verifyJwt` 검증 (실패 401). GET 은 `?json=<배열>`, POST 는 본문이 배열이어야 함. 결과를 `runMethod({serviceName, methodName, params, http})` 로 위임.

### `handleUpload(req, reply, rootPath, jwtSecret)`

multipart 업로드. `Authorization` 필수 (없거나 검증 실패 시 401). 각 파일을 `<rootPath>/www/uploads/<uuid><ext>` 로 저장 후 `ServiceUploadResult[]` 반환. 중간 에러 시 이미 저장된 모든 파일 삭제 후 500.

### `handleStaticFile(req, reply, rootPath, urlPath)`

`<rootPath>/www/<urlPath>` 정적 서빙. 경로 탐색 가드(`pathx.isChildPath`), 디렉토리 슬래시 리다이렉트 후 `index.html` 폴백, 숨김 파일(`.` 시작) 403, ENOENT 404, 기타 500.

## WebSocket / 소켓

### `createWebSocketHandler(runMethod, jwtSecret) → WebSocketHandler`

여러 WS 연결 풀 관리. `addSocket(socket, clientId, clientName, req)` 으로 등록(기존 동일 `clientId` 강제 교체). 메시지를 디코드해 `runMethod` 로 RPC, `evt:add/remove/gets/emit`, `auth` 메시지를 처리. `emit(name, infoSelector, data)` 로 매칭 클라이언트 푸시(`ServiceServer.emitEvent` 의 백엔드).

### `createServiceSocket(socket, clientId, clientName, connReq) → ServiceSocket`

단일 WS 래퍼. 5초 ping/pong 헬스체크, `createServerProtocolWrapper` 로 메시지 인코딩, 이벤트 리스너 키 보관, `on("error"|"close"|"message")`.

## 프로토콜

### `createServerProtocolWrapper() → ServerProtocolWrapper`

`@simplysm/service-common` 의 프로토콜을 worker(`service-protocol.worker`) 에 위임할지 메인 스레드에서 처리할지 자동 분기. encode 는 body 에 `Uint8Array` 가 있으면 worker, decode 는 30KB 초과 시 worker. `dispose()` 로 메인 스레드 프로토콜 정리.

## V1 레거시

### `handleV1Connection(socket, optionsOrMethods, clientNameSetter?)`

`ver` 쿼리가 `"2"` 가 아닌 클라이언트를 처리. JSON 텍스트 프로토콜로 `{ uuid, command, params, clientName }` 수신. 사용자 `handlers` 가 `handled: true` 를 반환하면 그 결과, 아니면 `SdAutoUpdateService.getLastVersion` fallback, 그것도 아니면 `UPGRADE_REQUIRED` 에러 반환.

타입: `V1Request`, `V1Response`, `V1AutoUpdateMethods`, `V1RequestHandler`, `V1RequestHandlerContext`, `V1RequestHandlerResult`, `V1ConnectionOptions`. `ServiceServerOptions.legacyV1Handlers` 에 `V1RequestHandler[]` 를 넘기면 `ServiceServer` 가 자동 사용.
