# @simplysm/service-server — 내부 전송 계층

`ServiceServer.listen()` 이 자동 결선하므로 일반 사용에선 불필요. 커스텀 Fastify 라우트·테스트·비표준 전송 시 참고.

## HTTP

### `handleHttpRequest(req, reply, jwtSecret, runMethod)`

`/api/:service/:method` 라우트 핸들러.

- `x-sd-client-name` 헤더 필수(없으면 throw).
- `Authorization: Bearer <jwt>` 있고 `jwtSecret` 도 있으면 `verifyJwt`. 토큰만 있고 secret 없으면 throw. 검증 실패 시 401 응답.
- GET: `?json=<JSON encoded array>` → `json.parse`.
- POST: body 가 배열이어야 함(아니면 400).
- 그 외 메서드: 405.
- `runMethod({ serviceName, methodName, params, http: { clientName, authTokenPayload } })` 호출 후 결과를 `reply.send`.

### `handleUpload(req, reply, rootPath, jwtSecret)`

multipart 업로드. `Authorization` 헤더 필수(없으면 401, `jwtSecret` 미구성 시 401). 각 파일을 `<rootPath>/www/uploads/<uuid><ext>` 로 저장. 응답 `ServiceUploadResult[] = { path, filename, size }[]` (`path` = `uploads/<saveName>`). 도중 truncated 또는 에러 발생 시 진행 중 + 이미 저장된 모든 파일 삭제 후 500.

### `handleStaticFile(req, reply, rootPath, urlPath)`

`<rootPath>/www/<urlPath>` 정적 서빙.

- 경로 탐색 차단: `pathx.isChildPath(targetFilePath, allowedRootPath)` 가드.
- 디렉터리 + URL 미 trailing slash → `pathname + "/"` 리다이렉트. trailing slash 있으면 `<dir>/index.html` 사용.
- 숨김 파일(basename 이 `.` 시작) → 403.
- ENOENT 404, 기타 500. 에러는 HTML 응답.

## WebSocket

### `createWebSocketHandler(runMethod, jwtSecret): WebSocketHandler`

여러 WS 연결 풀 관리. 처리 메시지:

- `<service>.<method>` (body 가 배열) → RPC. `runMethod` 위임.
- `evt:add { key, name, info }` — 이벤트 리스너 등록.
- `evt:remove { key }` — 제거.
- `evt:gets { name }` — 모든 소켓의 해당 이벤트 리스너 정보 조회.
- `evt:emit { keys, data }` — 매칭 키 가진 소켓에게 `evt:on` 푸시.
- `auth <token>` — JWT 검증 후 `socket.authTokenPayload` 설정.

에러 코드: `BAD_MESSAGE`(알 수 없는 요청), `INTERNAL_ERROR`. `env("DEV")` truthy 시 `stack` 포함.

`addSocket(socket, clientId, clientName, connReq)` 동일 clientId 이전 연결 자동 종료 후 교체. `emit(name, infoSelector, data)` 는 `ServiceServer.emitEvent` 의 백엔드.

### `createServiceSocket(socket, clientId, clientName, connReq): ServiceSocket`

단일 WS 관리.

- 5초 ping/pong (`socket.ping()` → 응답 없으면 `terminate()`).
- 1바이트 `0x01`(ping) 수신 → `0x02`(pong) 송신.
- 메시지는 `createServerProtocolWrapper()` 통과. 진행률(`type === "progress"`) 디코드 결과는 자동으로 `progress` 메시지 회신.

표면: `connectedAtDateTime: DateTime`, `clientName`, `connReq`, `authTokenPayload`(get/set), `close()`, `send(uuid, msg)`(전송 바이트), `addListener(key, eventName, info)`, `removeListener(key)`, `getEventListeners(eventName)`, `filterEventTargetKeys(targetKeys)`, `on("error"|"close"|"message", handler)`.

## 프로토콜 래퍼

### `createServerProtocolWrapper(): ServerProtocolWrapper`

`@simplysm/service-common` 의 `createServiceProtocol()` 기반. 무거운 케이스만 워커 스레드로 위임:

- encode: body 가 `Uint8Array` 이거나 `Uint8Array` 요소를 하나라도 가진 배열 → 워커.
- decode: 입력 바이트 > 30KB → 워커.

워커는 모듈 로드 시 1회 생성 lazy singleton(`maxOldGenerationSizeMb: 4096`). 워커 모듈: `workers/service-protocol.worker.ts`.

표면: `encode(uuid, message)`, `decode(bytes)`, `dispose()`(메인 스레드 프로토콜만 정리, 워커는 공유).

## 설정 캐시

### `getConfig<T>(filePath: string): Promise<T | undefined>`

JSON 설정 파일 로더.

- `LazyGcMap` 캐시: 만료 1시간, GC 10분 간격. 캐시 히트 시 만료 시간 자동 갱신.
- 파일 없으면 undefined.
- `FsWatcher` 로 변경 감시 → 100ms 디바운스 후 리로드. 삭제 감지 시 캐시·워처 정리.
- 만료 시 워처도 함께 해제.

`ServiceContext.getConfig(section)` 이 root/client `.config.json` 두 경로를 이 함수로 읽어 `obj.merge`. 그 외 경로의 설정 파일을 읽을 때만 직접 호출.
