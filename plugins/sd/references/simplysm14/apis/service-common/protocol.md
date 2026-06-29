# @simplysm/service-common — Service protocol

서비스 WebSocket 메시지의 타입 계약, 크기/청킹 상수, 바이너리 인코딩·누적·파싱 코덱 묶음이다. 바이너리 패킷은 JSDoc 기준 28바이트 헤더(UUID 16 + TotalSize 8 + Index 4)와 JSON 본문으로 구성된다.

## PROTOCOL_CONFIG

```ts
const PROTOCOL_CONFIG = {
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,
  SPLIT_MESSAGE_SIZE: 3 * 1024 * 1024,
  CHUNK_SIZE: 300 * 1024,
  GC_INTERVAL: 10 * 1000,
  EXPIRE_TIME: 60 * 1000,
} as const
```

- `MAX_TOTAL_SIZE: 100 * 1024 * 1024` — 단일 메시지 본문 최대 크기. `encode` 와 `accumulate` 는 `totalSize` 가 이 값보다 크면 `ArgumentError` 를 throw한다.
- `SPLIT_MESSAGE_SIZE: 3 * 1024 * 1024` — `encode` 의 분할 기준. 본문 크기가 이 값 이하면 단일 청크, 초과하면 여러 청크가 된다.
- `CHUNK_SIZE: 300 * 1024` — `encode` 가 분할할 때 본문을 자르는 청크 바이트 크기.
- `GC_INTERVAL: 10 * 1000` — `createServiceProtocol` 내부 `LazyGcMap` 의 GC 실행 주기.
- `EXPIRE_TIME: 60 * 1000` — `createServiceProtocol` 내부 `LazyGcMap` 에서 미완성 누적 항목이 만료되는 시간.

## 메시지 유니언

```ts
type ServiceMessage =
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceProgressMessage
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage
  | ServiceEventMessage;

type ServiceServerMessage = ServiceResponseMessage | ServiceErrorMessage | ServiceEventMessage;
type ServiceServerRawMessage = ServiceProgressMessage | ServiceServerMessage;
type ServiceClientMessage =
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage;
```

- `ServiceMessage` — 이 프로토콜에서 파싱·인코딩 대상으로 다루는 전체 메시지 유니언.
- `ServiceServerMessage` — 서버가 보내는 완료 응답·에러·이벤트 알림 메시지 유니언.
- `ServiceServerRawMessage` — 서버 메시지에 청크 진행률 메시지를 더한 유니언.
- `ServiceClientMessage` — 클라이언트가 보내는 서비스 요청·인증·이벤트 리스너/발생 메시지 유니언.

## 시스템 메시지

### ServiceProgressMessage

```ts
interface ServiceProgressMessage {
  name: "progress";
  body: { totalSize: number; completedSize: number };
}
```

- `name: "progress"` — 청크 메시지 진행 상태 알림 리터럴.
- `body.totalSize: number` — 전체 크기(바이트).
- `body.completedSize: number` — 완료된 크기(바이트).

### ServiceErrorMessage

```ts
interface ServiceErrorMessage {
  name: "error";
  body: {
    name: string;
    message: string;
    code: string;
    stack?: string;
    detail?: unknown;
    cause?: unknown;
  };
}
```

- `name: "error"` — 서버 에러 알림 리터럴.
- `body.name: string` — 에러 이름 문자열.
- `body.message: string` — 에러 메시지 문자열.
- `body.code: string` — 에러 코드 문자열.
- `body.stack?: string` — 선택 stack 문자열.
- `body.detail?: unknown` — 선택 상세 값.
- `body.cause?: unknown` — 선택 원인 값.

### ServiceAuthMessage

```ts
interface ServiceAuthMessage {
  name: "auth";
  body: string;
}
```

- `name: "auth"` — 클라이언트 인증 메시지 리터럴.
- `body: string` — 토큰 문자열.

## 서비스 메서드 메시지

### ServiceRequestMessage

```ts
interface ServiceRequestMessage {
  name: `${string}.${string}`;
  body: unknown[];
}
```

- `name`: ``${string}.${string}`` — JSDoc 기준 `${service}.${method}` 형식의 서비스 메서드 요청 이름.
- `body: unknown[]` — 메서드 매개변수 배열.

### ServiceResponseMessage

```ts
interface ServiceResponseMessage {
  name: "response";
  body?: unknown;
}
```

- `name: "response"` — 서비스 메서드 응답 리터럴.
- `body?: unknown` — 선택 결과 값.

## 이벤트 메시지

### ServiceAddEventListenerMessage

```ts
interface ServiceAddEventListenerMessage {
  name: "evt:add";
  body: { key: string; name: string; info: unknown };
}
```

- `name: "evt:add"` — 이벤트 리스너 추가 메시지 리터럴.
- `body.key: string` — 리스너 키(uuid). JSDoc 기준 제거 요청에 필요하다.
- `body.name: string` — 이벤트 이름(Type.name).
- `body.info: unknown` — 이벤트 발생 시 필터링을 위한 추가 리스너 정보.

### ServiceRemoveEventListenerMessage

```ts
interface ServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: { key: string };
}
```

- `name: "evt:remove"` — 이벤트 리스너 제거 메시지 리터럴.
- `body.key: string` — 제거할 리스너 키(uuid).

### ServiceGetEventListenerInfosMessage

```ts
interface ServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: { name: string };
}
```

- `name: "evt:gets"` — 이벤트 리스너 정보 목록 요청 메시지 리터럴.
- `body.name: string` — 조회할 이벤트 이름.

### ServiceEmitEventMessage

```ts
interface ServiceEmitEventMessage {
  name: "evt:emit";
  body: { keys: string[]; data: unknown };
}
```

- `name: "evt:emit"` — 이벤트 발생 메시지 리터럴.
- `body.keys: string[]` — 이벤트를 받을 리스너 키 목록.
- `body.data: unknown` — 이벤트 데이터.

### ServiceEventMessage

```ts
interface ServiceEventMessage {
  name: "evt:on";
  body: { keys: string[]; data: unknown };
}
```

- `name: "evt:on"` — 서버 이벤트 알림 메시지 리터럴.
- `body.keys: string[]` — 이벤트 알림 대상 리스너 키 목록.
- `body.data: unknown` — 이벤트 데이터.

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

- `createServiceProtocol()` — 청크 누적 상태와 GC 타이머를 가진 프로토콜 인스턴스를 만든다.
- `encode(uuid, message)` — `message.name` 과 `message.body` 를 JSON 배열로 직렬화하고 28바이트 헤더를 붙여 `Bytes[]` 로 만든다. `uuid: string` 은 헤더 UUID, `message: ServiceMessage` 는 직렬화할 메시지다.
- `encode` 반환 `chunks: Bytes[]` — 전송할 바이너리 패킷 배열. 본문 크기가 `SPLIT_MESSAGE_SIZE` 를 넘으면 `CHUNK_SIZE` 단위로 여러 개가 된다.
- `encode` 반환 `totalSize: number` — JSON 본문 바이트 길이.
- `accumulate(bytes)` — 수신 패킷을 헤더 기준으로 같은 uuid 에 누적한다. `bytes: Bytes` 는 헤더와 본문을 포함한 단일 패킷이다.
- `accumulate` 완료 전 반환 — `{ type: "progress", uuid, totalSize, completedSize }`.
- `accumulate` 완료 반환 — `{ type: "complete", uuid, resultBytes }`; 완료 시 내부 누적 항목을 삭제한다.
- `accumulate` 예외 — 패킷 길이가 28바이트 미만이거나, `totalSize` 가 최대 크기를 넘거나, 누적 완료 크기가 `totalSize` 를 초과하면 `ArgumentError` 를 throw한다.
- `accumulate` 중복 처리 — 같은 uuid/같은 index 청크가 이미 있으면 본문 크기를 다시 더하지 않는다.
- `parseMessage(resultBytes)` — 재조립된 raw 바이트를 JSON 파싱해 `{ name, body } as ServiceMessage` 로 반환한다. 파싱 실패 시 `ArgumentError` 를 throw한다.
- `decode<T>(bytes)` — `accumulate(bytes)` 를 호출하고, 진행 중이면 progress 결과를 그대로 반환하며, 완료면 `parseMessage` 결과를 `T` 메시지로 담아 반환한다.
- `dispose()` — 내부 청크 누적기의 GC 타이머와 메모리를 해제한다.

## ServiceMessageDecodeResult

```ts
type ServiceMessageDecodeResult<TMessage extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: TMessage }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

- `TMessage extends ServiceMessage` — 완료 결과의 `message` 타입.
- `type: "complete"` — 모든 청크가 도착해 메시지 파싱까지 끝난 결과 리터럴.
- `complete.uuid: string` — 메시지 uuid.
- `complete.message: TMessage` — 파싱된 서비스 메시지.
- `type: "progress"` — 일부 청크만 도착한 진행 결과 리터럴.
- `progress.uuid: string` — 메시지 uuid.
- `progress.totalSize: number` — 전체 본문 크기(바이트).
- `progress.completedSize: number` — 현재까지 누적된 본문 크기(바이트).

## ServiceAccumulateResult

```ts
type ServiceAccumulateResult =
  | { type: "complete"; uuid: string; resultBytes: Bytes }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

- `type: "complete"` — 모든 청크가 도착해 raw 바이트 재조립이 끝난 결과 리터럴.
- `complete.uuid: string` — 메시지 uuid.
- `complete.resultBytes: Bytes` — JSON 파싱 전 재조립 raw 바이트.
- `type: "progress"` — 일부 청크만 도착한 진행 결과 리터럴.
- `progress.uuid: string` — 메시지 uuid.
- `progress.totalSize: number` — 전체 본문 크기(바이트).
- `progress.completedSize: number` — 현재까지 누적된 본문 크기(바이트).
