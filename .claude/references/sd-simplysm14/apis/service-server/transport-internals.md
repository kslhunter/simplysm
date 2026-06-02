# @simplysm/service-server — transport-internals

`ServiceServer.listen()` 이 내부적으로 등록하는 저수준 전송·프로토콜 핸들러. 보통 직접 호출하지 않으며, 커스텀 서버를 손수 조립하거나 동작을 디버깅할 때만 참조한다.

## WebSocketHandler

`createWebSocketHandler(runMethod, jwtSecret): WebSocketHandler` — 다중 WebSocket 연결을 `clientId` 단위로 관리하고 메시지를 `runMethod`(보통 `executeServiceMethod` 바인딩)로 라우팅·이벤트 브로드캐스트.

- `runMethod(def): Promise<unknown>` — `{ serviceName, methodName, params, socket? }` 받아 RPC 결과 반환.
- `jwtSecret: string | undefined` — `"auth"` 메시지로 들어온 토큰 검증용. 없으면 auth 메시지에서 "JWT Secret이 정의되지 않았습니다." throw.

`WebSocketHandler`:

- `addSocket(socket, clientId, clientName, connReq): void` — 연결 등록. 같은 `clientId` 의 기존 연결은 닫고 교체(동일 clientId 다중 동시 연결 불가).
- `closeAll(): void` — 전 연결 종료.
- `emit<TEventDef>(eventName, infoSelector, data): Promise<void>` — `infoSelector(info) === true` 인 리스너에 `evt:on` 푸시. `infoSelector` = 리스너 info 로 수신 대상 선별.

처리 메시지: `"<Service>.<method>"`(RPC), `evt:add`/`evt:remove`/`evt:gets`/`evt:emit`(이벤트 리스너 등록·해제·조회·브로드캐스트), `auth`(토큰 등록). 미지원 메시지는 code `BAD_MESSAGE`, 처리 중 예외는 `INTERNAL_ERROR` 응답(`DEV` env 시 stack 포함).

## ServiceSocket

`createServiceSocket(socket, clientId, clientName, connReq): ServiceSocket` — 단일 WebSocket 연결 래퍼. 프로토콜 인코딩/디코딩, 5초 ping/pong keep-alive(무응답 시 terminate), 이벤트 리스너 추적.

- `connectedAtDateTime: DateTime` / `clientName: string` / `connReq: FastifyRequest` — 연결 메타(readonly).
- `authTokenPayload?: AuthTokenPayload` — `auth` 메시지로 세팅되는 인증 페이로드. 읽기/쓰기 가능.
- `close(): void` — 연결 terminate.
- `send(uuid, msg): Promise<number>` — 메시지 인코딩 후 전송, 전송 바이트수 반환(소켓 미개방 시 0).
- `addListener(key, eventName, info): void` — key/이벤트명/info 로 리스너 등록.
- `removeListener(key): void` — key 로 리스너 제거.
- `getEventListeners(eventName): Array<{ key; info }>` — 해당 이벤트명 리스너 전체 조회.
- `filterEventTargetKeys(targetKeys): string[]` — 이 소켓에 존재하는 대상 key 만 필터.
- `on("error"|"close"|"message", handler): void` — 핸들러 등록. `error` → `(err)`, `close` → `(code)`, `message` → `({ uuid, msg })`.

## HTTP 핸들러

- `handleHttpRequest(req, reply, jwtSecret, runMethod): Promise<void>` — `/api/:service/:method` 처리. `x-sd-client-name` 헤더 필수(없으면 throw). `Authorization: Bearer <t>` 있으면 검증(실패 시 401). GET 은 `?json=` 쿼리, POST 는 배열 본문에서 params 추출(POST 비배열 400, 그 외 메서드 405).
- `handleUpload(req, reply, rootPath, jwtSecret): Promise<void>` — `/upload` multipart 처리. 인증 필수(토큰 없음·검증 실패 시 401). 파일을 `www/uploads/<uuid><ext>` 로 저장하고 `ServiceUploadResult[]`(path/filename/size) 반환. 멀티파트 아니면 400. 도중 실패 시 이미 저장한 파일·불완전 파일 전부 삭제 후 500(원자성).
- `handleStaticFile(req, reply, rootPath, urlPath): Promise<void>` — `www` 하위 정적 파일 서빙. `www` 밖 경로는 "접근이 거부되었습니다" throw(경로탐색 가드). 디렉토리는 슬래시 리다이렉트 후 `index.html`. `.` 시작 파일은 403. 없으면 404, 그 외 500(HTML 에러 페이지).

## ServerProtocolWrapper

`createServerProtocolWrapper(): ServerProtocolWrapper` — 무거운 인코딩/디코딩을 공유 worker 스레드(지연 싱글턴)에 자동 위임, 가벼운 건 메인 스레드.

- `encode(uuid, message): Promise<{ chunks; totalSize }>` — body 가 `Uint8Array`(또는 Uint8Array 포함 배열)면 worker, 아니면 메인.
- `decode(bytes): Promise<ServiceMessageDecodeResult>` — 청크 재조립(stateful)은 항상 메인 단일 누적기, 재조립 완료 후 30KB 초과 JSON 파싱만 worker(청크 분산 재조립 버그 #35 방지).
- `dispose(): void` — 프로토콜 리소스 해제.

## 주의사항

- `decode` 의 청크 재조립을 worker 로 분기하면 한 메시지의 청크가 서로 다른 누적기로 흩어져 재조립이 완성되지 못함 — 메인 스레드 누적기 유지가 필수.
- 같은 `clientId` 재연결 시 이전 소켓이 강제 종료되므로 동일 `clientId` 다중 동시 연결은 불가.
