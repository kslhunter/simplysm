# @simplysm/service-server — transport-internals

`ServiceServer.listen()` 이 내부적으로 등록하는 저수준 전송·프로토콜 핸들러와 서비스 실행기. 보통 직접 호출하지 않으며, 커스텀 서버를 손수 조립하거나 동작을 디버깅·확장할 때만 참조한다.

## executeServiceMethod

`executeServiceMethod(server, def): Promise<unknown>` — 서비스 이름·메서드 이름·params 로 실제 메서드를 찾아 인증 검사 후 실행하는 핵심 디스패처. WebSocket/HTTP 핸들러가 공통으로 이걸 호출한다.

- `def.serviceName` / `def.methodName` — `services` 에서 매칭할 이름. 서비스 없으면 `"서비스 [..]를 찾을 수 없습니다."`, 메서드 없으면 `"메서드 [..]를 찾을 수 없습니다."` throw.
- `def.params: unknown[]` — 메서드 인자.
- `def.socket?` / `def.http?` — 요청 출처(둘 중 하나). clientName 에 `..`·`/`·`\` 포함 시 보안 throw.

인증 검사는 메서드/서비스 권한 + 서버 `auth` 설정 조합으로 수행(service-authoring.md 의 `auth` 항목 참조).

## createWebSocketHandler / WebSocketHandler

`createWebSocketHandler(runMethod, jwtSecret?): WebSocketHandler` — 여러 WebSocket 연결을 `clientId` 키로 관리하고 메시지를 라우팅·이벤트 브로드캐스트한다. `runMethod` 는 보통 `executeServiceMethod` 바인딩.

`WebSocketHandler` 멤버:

- `addSocket(socket, clientId, clientName, connReq)` — 새 연결 등록. 같은 `clientId` 기존 연결은 닫고 교체. 연결 처리 중 에러 시 소켓 terminate.
- `closeAll()` — 모든 연결 종료(서버 close 시).
- `emit<TEventDef>(eventName, infoSelector, data): Promise<void>` — 등록 리스너 중 `infoSelector(info)` true 인 키에만 `evt:on` 전송.

처리하는 클라이언트 메시지 `name`: `"<service>.<method>"`(RPC 실행), `evt:add`/`evt:remove`/`evt:gets`/`evt:emit`(이벤트 리스너 등록·해제·조회·발신), `auth`(토큰 검증 후 소켓에 페이로드 저장; jwtSecret 없으면 throw). 그 외엔 `BAD_MESSAGE`, 실행 중 예외는 `INTERNAL_ERROR` 코드로 에러 응답(`DEV` env 시 stack 포함).

## createServiceSocket / ServiceSocket

`createServiceSocket(socket: WebSocket, clientId, clientName, connReq): ServiceSocket` — 단일 WebSocket 연결을 감싸 프로토콜 인코딩/디코딩, 5초 주기 ping/pong keep-alive(무응답 시 terminate), 이벤트 리스너 추적을 담당.

`ServiceSocket` 멤버:

- `connectedAtDateTime: DateTime` / `clientName: string` / `connReq: FastifyRequest` — 연결 메타(읽기 전용).
- `authTokenPayload?: AuthTokenPayload` — `auth` 메시지 검증 후 저장되는 인증 페이로드(get/set).
- `close()` — 연결 terminate.
- `send(uuid, msg): Promise<number>` — 메시지 인코딩 후 전송, 전송 바이트 수 반환(소켓 닫혀 있으면 0).
- `addListener(key, eventName, info)` / `removeListener(key)` — 이벤트 리스너 등록·제거.
- `getEventListeners(eventName): Array<{ key, info }>` — 해당 이벤트의 리스너 목록.
- `filterEventTargetKeys(targetKeys): string[]` — 이 소켓에 실제 등록된 키만 필터.
- `on(event, handler)` — `"error"`(Error) / `"close"`(code: number) / `"message"`({ uuid, msg }) 핸들러 등록.

## handleHttpRequest

`handleHttpRequest<TAuthInfo>(req, reply, jwtSecret?, runMethod): Promise<void>` — `/api/:service/:method` 라우트 처리. `x-sd-client-name` 헤더 필수(없으면 throw), `Authorization: Bearer <token>` 있으면 검증(실패 시 401). GET 은 `?json=` 쿼리에서 params 파싱, POST 는 본문 배열(아니면 400), 그 외 메서드는 405. 결과를 그대로 응답.

## handleUpload

`handleUpload(req, reply, rootPath, jwtSecret?): Promise<void>` — `/upload` multipart 업로드 처리. multipart 아니면 400, 인증 토큰 누락·검증 실패 시 401. 각 파일을 `<rootPath>/www/uploads/<uuid><ext>` 로 저장하고 `ServiceUploadResult[]`(`{ path, filename, size }`) 반환. 크기 제한 초과나 도중 에러 시 이미 저장된 파일을 모두 삭제(원자적 정리)하고 500.

## handleStaticFile

`handleStaticFile(req, reply, rootPath, urlPath): Promise<void>` — `<rootPath>/www/` 하위 정적 파일 제공. `www` 밖 경로 탐색 시도는 throw. 디렉토리는 끝에 `/` 붙여 리다이렉트 후 `index.html` 제공. `.` 으로 시작하는 숨김 파일은 403, 없는 파일은 404, 그 외 전송 에러는 500(각각 HTML 에러 페이지).

## createServerProtocolWrapper / ServerProtocolWrapper

`createServerProtocolWrapper(): ServerProtocolWrapper` — 메시지 인코딩/디코딩 래퍼. 무거운 작업(Uint8Array 본문, 30KB 초과 JSON 파싱)은 공유 worker 스레드에 위임하고 가벼운 작업은 메인에서 처리. 청크 재조립(stateful)은 항상 메인 단일 누적기에서 수행한다(분산 시 재조립 불가 회피, #35).

`ServerProtocolWrapper` 멤버:

- `encode(uuid, message): Promise<{ chunks: Bytes[]; totalSize: number }>` — 인코딩. 본문이 Uint8Array 거나 Uint8Array 요소를 포함한 배열이면 worker 사용.
- `decode(bytes): Promise<ServiceMessageDecodeResult>` — 누적·디코딩. 진행 중이면 `{ type: "progress", ... }`, 완료 시 `{ type: "complete", uuid, message }`(30KB 초과 시 worker 파싱).
- `dispose()` — 프로토콜 리소스 해제(소켓 종료 시).
