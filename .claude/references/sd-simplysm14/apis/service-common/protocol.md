# @simplysm/service-common — protocol

WebSocket 위 서비스 메시지의 와이어 포맷. 인코딩·자동 청킹·재조립을 담당하는 코덱(`createServiceProtocol`)과, 클라이언트↔서버가 주고받는 메시지 타입·설정 상수다. 서비스 클라이언트/서버 내부, 또는 재조립을 worker 에 위임하는 곳에서 같이 읽힌다.

바이너리 프로토콜 V2: 헤더 28바이트(UUID 16 + TotalSize 8 + Index 4) + JSON 본문. 3MB 초과 시 300KB 청크로 분할, 최대 100MB.

## PROTOCOL_CONFIG

```ts
const PROTOCOL_CONFIG = {
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,    // 100MB
  SPLIT_MESSAGE_SIZE: 3 * 1024 * 1024,  // 3MB
  CHUNK_SIZE: 300 * 1024,               // 300KB
  GC_INTERVAL: 10 * 1000,               // 10초
  EXPIRE_TIME: 60 * 1000,               // 60초
} as const
```

- `MAX_TOTAL_SIZE` — 단일 메시지 허용 상한(바이트, 100MB). 초과 시 `encode`/`accumulate` 가 throw. 대용량 전송 한계 확인용.
- `SPLIT_MESSAGE_SIZE` — 청킹 임계값(3MB). 이 크기 이하면 단일 청크, 초과하면 분할.
- `CHUNK_SIZE` — 분할 시 본문 청크 1개 크기(300KB).
- `GC_INTERVAL` — 미완성 누적 메시지를 정리하는 GC 타이머 주기(10초).
- `EXPIRE_TIME` — 마지막 청크 이후 이 시간(60초)이 지나면 미완성 누적을 폐기.

## createServiceProtocol / ServiceProtocol

```ts
function createServiceProtocol(): ServiceProtocol

interface ServiceProtocol {
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };
  accumulate(bytes: Bytes): ServiceAccumulateResult;
  parseMessage(resultBytes: Bytes): ServiceMessage;
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;
  dispose(): void;
}
```

- `encode(uuid, message)` — 메시지를 와이어 바이트로 인코딩. 3MB 초과 시 자동으로 여러 청크로 분할. 반환 `chunks` 는 전송할 패킷 배열, `totalSize` 는 본문 총 바이트. 같은 메시지의 모든 청크는 동일 `uuid` 를 공유. `MAX_TOTAL_SIZE` 초과 시 throw.
- `accumulate(bytes)` — 수신 청크 패킷을 누적(stateful). 같은 uuid 의 청크를 한 누적기에 모음. 미완성이면 `progress`, 전부 도착하면 재조립된 raw 바이트를 담은 `complete` 반환. JSON 파싱은 안 함. 헤더(28바이트) 미만이거나 크기 위반 시 throw. 중복 패킷은 인덱스 기준 1회만 반영(중복은 무시). 누적분이 `totalSize` 를 초과하면 무결성 위반으로 throw.
- `parseMessage(resultBytes)` — 재조립된 raw 바이트를 `ServiceMessage` 로 파싱(stateless). 누적기 상태에 의존하지 않아 worker 등 다른 컨텍스트에 위임 가능. 파싱 실패 시 throw.
- `decode(bytes)` — `accumulate` 후 완료 시 `parseMessage` 까지 수행하는 통합 경로. 단일 컨텍스트에서 한 번에 디코딩할 때.
- `dispose()` — 내부 청크 누적기의 GC 타이머 해제·메모리 반환. 인스턴스를 더 안 쓸 때 반드시 호출.

```ts
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();
const { chunks } = protocol.encode(uuid, { name: "TestService.echo", body: ["hi"] });
// 수신측: 각 청크를 accumulate, 완료 시 parseMessage (또는 decode 로 통합)
const res = protocol.decode(receivedBytes);
if (res.type === "complete") { /* res.message 사용 */ }
protocol.dispose();
```

> 주의: 앱 레이어에서 직접 쓰지 않는다. 메시지 송수신은 `@simplysm/service-client` 의 `ServiceClient`(`getService`/`addListener` 등)가 내부에서 이 코덱을 사용한다. 재조립을 worker 에 분산하는 등 저수준 제어가 필요할 때만 직접 호출.

## ServiceMessageDecodeResult / ServiceAccumulateResult

```ts
type ServiceMessageDecodeResult<TMessage extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: TMessage }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };

type ServiceAccumulateResult =
  | { type: "complete"; uuid: string; resultBytes: Bytes }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

- `type: "complete"` — 모든 청크 수신·재조립 완료. `decode` 결과는 파싱된 `message`, `accumulate` 결과는 파싱 전 `resultBytes` 를 담음.
- `type: "progress"` — 일부 청크만 도착. `totalSize`(전체 바이트)·`completedSize`(수신 바이트)로 진행률 산출(예: 진행 콜백).
- `uuid` — 어느 메시지의 결과인지 식별. 분기·진행 추적 시 사용.

## 메시지 타입

클라이언트↔서버가 주고받는 메시지의 판별 유니언. 각 메시지는 `name`(판별자)과 `body` 로 구성. 직접 만들기보다 코덱이 인코딩·파싱하는 형태를 확인할 때 참조.

```ts
type ServiceMessage = ServiceRequestMessage | ServiceAuthMessage | ServiceProgressMessage | ServiceResponseMessage | ServiceErrorMessage
  | ServiceAddEventListenerMessage | ServiceRemoveEventListenerMessage | ServiceGetEventListenerInfosMessage | ServiceEmitEventMessage | ServiceEventMessage
type ServiceClientMessage = ServiceRequestMessage | ServiceAuthMessage | ServiceAddEventListenerMessage | ServiceRemoveEventListenerMessage | ServiceGetEventListenerInfosMessage | ServiceEmitEventMessage
type ServiceServerMessage = ServiceResponseMessage | ServiceErrorMessage | ServiceEventMessage
type ServiceServerRawMessage = ServiceProgressMessage | ServiceServerMessage
```

- `ServiceMessage` — 전체 메시지 유니언.
- `ServiceClientMessage` — 클라이언트가 보내는 메시지(요청·인증·이벤트 등록/제거/조회/발생).
- `ServiceServerMessage` — 서버가 보내는 최종 메시지(응답·에러·이벤트 알림).
- `ServiceServerRawMessage` — 서버 메시지 + 진행 알림(`progress` 포함). 청크 수신 중 진행 통지를 포함한 서버측 raw 흐름.

### 시스템 (공통)

```ts
interface ServiceProgressMessage { name: "progress"; body: { totalSize: number; completedSize: number } }
interface ServiceErrorMessage { name: "error"; body: { name: string; message: string; code: string; stack?: string; detail?: unknown; cause?: unknown } }
interface ServiceAuthMessage { name: "auth"; body: string }
```

- `ServiceProgressMessage` (`name: "progress"`) — 서버가 청크 수신 진행을 알림. `body.totalSize`/`completedSize` 로 진행률.
- `ServiceErrorMessage` (`name: "error"`) — 서버 에러 알림. `body.name`/`message`/`code` 는 필수, `stack`/`detail`/`cause` 는 디버깅·원인 추적용 optional.
- `ServiceAuthMessage` (`name: "auth"`) — 클라이언트 인증. `body` 는 토큰 문자열.

### Service.Method

```ts
interface ServiceRequestMessage { name: `${string}.${string}`; body: unknown[] }
interface ServiceResponseMessage { name: "response"; body?: unknown }
```

- `ServiceRequestMessage` (`name: "${service}.${method}"`) — 클라이언트의 서비스 메서드 호출. `name` 은 `서비스.메서드` 형식 템플릿, `body` 는 인자 배열.
- `ServiceResponseMessage` (`name: "response"`) — 서버의 메서드 응답. `body` 는 결과(없으면 생략).

### 이벤트

```ts
interface ServiceAddEventListenerMessage { name: "evt:add"; body: { key: string; name: string; info: unknown } }
interface ServiceRemoveEventListenerMessage { name: "evt:remove"; body: { key: string } }
interface ServiceGetEventListenerInfosMessage { name: "evt:gets"; body: { name: string } }
interface ServiceEmitEventMessage { name: "evt:emit"; body: { keys: string[]; data: unknown } }
interface ServiceEventMessage { name: "evt:on"; body: { keys: string[]; data: unknown } }
```

- `ServiceAddEventListenerMessage` (`name: "evt:add"`) — 클라이언트가 리스너 등록. `body.key` = 리스너 키(uuid, 해제에 사용), `name` = 이벤트 이름, `info` = 발생 시 필터링용 리스너 정보(`TInfo`).
- `ServiceRemoveEventListenerMessage` (`name: "evt:remove"`) — 리스너 제거. `body.key` 로 대상 지정.
- `ServiceGetEventListenerInfosMessage` (`name: "evt:gets"`) — 특정 이벤트의 현재 리스너 정보 목록 요청. `body.name` 으로 이벤트 지정.
- `ServiceEmitEventMessage` (`name: "evt:emit"`) — 클라이언트가 이벤트 발생. `body.keys` = 대상 리스너 키 목록, `data` = 페이로드(`TData`).
- `ServiceEventMessage` (`name: "evt:on"`) — 서버가 구독 클라이언트에 보내는 이벤트 알림. `body.keys` = 대상 키, `data` = 페이로드.
