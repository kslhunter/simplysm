# @simplysm/sd-service-server — legacy (V1)

- 구버전 sd-service 클라이언트(WebSocket query `ver` ≠ "2") 호환용 프로토콜, 소켓, 핸들러.
- 전부 `@deprecated` — 신규 코드 작성에는 사용 금지.
- `SdServiceServer`가 ver≠2 연결을 받으면 자동으로 V1 핸들러(`SdWebSocketHandlerV1`)로 라우팅합니다.
- V2와 달리 JSON 문자열 기반 프로토콜이며, **권한(`Authorize`)이 걸린 서비스는 V1에서 호출 불가**(executor가 차단).

## 커맨드 타입 (command-v1.types)

- `SD_SERVICE_SPECIAL_COMMANDS` — 특수 커맨드 상수 객체. 서버가 메서드 호출이 아닌 이벤트 처리로 분기하는 키.
  - 값: `ADD_EVENT_LISTENER:"addEventListener"`, `REMOVE_EVENT_LISTENER:"removeEventListener"`, `GET_EVENT_LISTENER_INFOS:"getEventListenerInfos"`, `EMIT_EVENT:"emitEvent"`.
- `TSdServiceSpecialCommand` — 위 상수 값들의 유니온.
- `TSdServiceMethodCommand` = `` `${string}.${string}` `` — `"서비스.메서드"` 형태 일반 호출 커맨드.
- `TSdServiceCommand` = `TSdServiceSpecialCommand | TSdServiceMethodCommand` — 허용되는 전체 커맨드.
- `ISdServiceMethodCommandInfo` — `{ serviceName: string; methodName: string }`. 커맨드 파싱 결과.

## 커맨드 헬퍼 (SdServiceCommandHelperV1)

`abstract class SdServiceCommandHelperV1` (static 전용)

- `static buildMethodCommand(cmdInfo): TSdServiceMethodCommand` — `serviceName`, `methodName`을 `"a.b"` 문자열로 결합.
- `static parseMethodCommand(command: string): ISdServiceMethodCommandInfo | undefined` — `.`로 정확히 2조각이고 둘 다 비어있지 않을 때만 파싱, 아니면 undefined(특수 커맨드 판별에 활용).

## 메시지 프로토콜 타입 (protocol-v1.types)

`name` 리터럴로 판별하는 JSON 메시지 유니온.

- `TSdServiceMessage` = `TSdServiceS2CMessage | TSdServiceC2SMessage` — 전체 메시지.
- `TSdServiceS2CMessage`(서버→클라) — reload, get-id, connected, pong, response, progress, split 계열, event.
- `TSdServiceC2SMessage`(클라→서버) — get-id-response, ping, request, request-split.
- `ISdServiceRequest` (`"request"`) — `clientName: string`, `uuid: string`, `command: TSdServiceCommand`, `params: any`. 메서드/이벤트 호출 요청.
- `TSdServiceResponse` = `ISdServiceSuccessResponse | ISdServiceErrorResponse` (`"response"`) — `reqUuid`로 요청 매칭.
  - `state:"success"`면 `body: any`(반환값), `state:"error"`면 `body: ISdServiceErrorBody`.
- `ISdServiceErrorBody` — `message: string`, `code: string`, `stack?: string`.
  - 핸들러가 쓰는 code: `"BAD_COMMAND"`(미인식 커맨드), `"INTERNAL_ERROR"`(실행 중 예외).
- `ISdServiceProgress` (`"progress"`) — `uuid`, `totalSize`, `receivedSize`. 수신 진행 알림.
- `ISdServiceSplitRequest` (`"request-split"`) / `ISdServiceSplitResponse` (`"response-split"`) — `fullSize`, `index`, `body`로 분할 전송한 조각(수신측이 재조립).
- `ISdServiceResponseForSplit` (`"response-for-split"`) — `reqUuid`, `totalSize`, `completedSize`. 분할 수신 ACK.
- 기타:
  - `ISdServiceClientReloadCommand`(`"client-reload"`, `clientName`, `changedFileSet`).
  - `ISdServiceClientGetIdCommand`(`"client-get-id"`)/`ISdServiceClientGetIdResponse`(`"client-get-id-response"`, `body:string`).
  - `ISdServiceClientConnectedAlarm`(`"connected"`).
  - `ISdServiceClientPing`(`"client-ping"`)/`ISdServiceClientPong`(`"client-pong"`).
  - `ISdServiceEmittedEvent`(`"event"`, `key`, `body`).

## 프로토콜 인코딩 (SdServiceProtocolV1)

`class SdServiceProtocolV1` — JSON 문자열 기반. 상태(분할 누적 버퍼)를 가지므로 채널당 1개 유지, 종료 시 `dispose()`.

- `encode(message): { json: string; chunks: string[] }` — JSON 직렬화.
  - 총 길이 100MB(`_MAX_TOTAL_SIZE`) 초과면 throw.
  - 3MB(`_SPLIT_MESSAGE_SIZE`) 이하거나 `request`/`response`가 아닌 메시지는 단일 청크.
  - 초과 시 300KB(`_CHUNK_SIZE`)씩 잘라 `name`을 `request-split`/`response-split`으로 바꾸고 `fullSize`, `index`, `body` 부여.
- `decode(json: string): ISdServiceProtocolDecodeResult` — 분할 패킷이면 uuid별 누적.
  - 같은 index는 무시(중복 방어), 100MB 초과면 throw.
  - 누적 완료 시 `{ type: "complete", message }`(누적분 삭제).
  - 진행 중이면 `{ type: "accumulating", uuid, completedSize, totalSize }`.
  - 일반 메시지는 즉시 complete.
- `dispose()` — GC 타이머(10초 주기, 60초 지난 미완성 조각 제거) 해제, 누적 맵 비움.
- `ISdServiceProtocolDecodeResult` = `{ type:"complete"; message } | { type:"accumulating"; uuid; completedSize; totalSize }`.

## 소켓 (SdServiceSocketV1)

`class SdServiceSocketV1 extends EventEmitter` — `constructor(socket: WebSocket)`. 10초 핑퐁, JSON 메시지 송수신.

- `getClientIdAsync(): Promise<string>` — 클라에 `client-get-id` 보내고 `client-get-id-response` 대기(캐시됨). 연결 식별자 확보용.
- `send(msg: TSdServiceS2CMessage): number` — `SdServiceProtocolV1.encode`로 (분할) 전송, 보낸 바이트 합 반환.
- `close()` — 소켓 강제 종료(`terminate`).
- `addEventListener(key, eventName, info)`/`removeEventListener(key)`/`getEventListners(eventName)` — 이벤트 구독 관리.
- `emitByKeys(targetKeys: string[], data)` — 매칭 key 구독자에게 `event` 메시지 송신.
- 이벤트: `"close"(code)`, `"request"(req: ISdServiceRequest)`.
  - 수신 시 분할 조립 중이면 `response-for-split` ACK, `request`면 emit, `client-ping`엔 `client-pong` 응답.

## 핸들러 (SdWebSocketHandlerV1)

`class SdWebSocketHandlerV1` — `constructor(executor: SdServiceExecutor)`. ver≠2 연결 전담. `clientId`별 소켓 맵(동일 id 재접속 시 기존 종료).

- `addSocket(socket, remoteAddress?): Promise<void>` — `getClientIdAsync`로 id 확보 후 등록, `request`/`close` 리스너 연결, 클라에 `connected` 통보.
- `closeAll()` — 전 소켓 종료.
- `broadcastReload(clientName, changedFileSet)` — 전 소켓에 `client-reload` 전송.
- `emit(eventType, infoSelector, data)` — `infoSelector`가 true인 리스너 key로 이벤트 전파.
- 요청 처리:
  - `command`가 `"a.b"`면 `executor.runMethodAsync`(컨텍스트 `v1`)로 메서드 실행.
  - 아니면 `SD_SERVICE_SPECIAL_COMMANDS` 4종(이벤트 add/remove/gets/emit)으로 분기.
  - 미인식 시 `BAD_COMMAND`, 예외 시 `INTERNAL_ERROR` 응답.
