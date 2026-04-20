# Protocol

## `PROTOCOL_CONFIG`

서비스 프로토콜 설정 상수.

```typescript
export const PROTOCOL_CONFIG = {
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,   // 최대 메시지 크기 (100MB)
  SPLIT_MESSAGE_SIZE: 3 * 1024 * 1024, // 청킹 임계값 (3MB)
  CHUNK_SIZE: 300 * 1024,              // 청크 크기 (300KB)
  GC_INTERVAL: 10 * 1000,             // GC 주기 (10초)
  EXPIRE_TIME: 60 * 1000,             // 미완성 메시지 만료 시간 (60초)
} as const;
```

| Field | Type | Description |
|-------|------|-------------|
| `MAX_TOTAL_SIZE` | `number` | 단일 메시지의 최대 허용 크기. 초과 시 `ArgumentError` 발생 |
| `SPLIT_MESSAGE_SIZE` | `number` | 이 크기를 초과하면 자동으로 청크 분할 |
| `CHUNK_SIZE` | `number` | 분할된 각 청크의 크기 |
| `GC_INTERVAL` | `number` | 내부 청크 누적기의 가비지 컬렉션 주기 (밀리초) |
| `EXPIRE_TIME` | `number` | 미완성 청크 메시지의 만료 시간. 이 시간 내에 모든 청크가 도착하지 않으면 제거 |

## `ServiceMessage`

모든 서비스 메시지의 유니언 타입. 클라이언트·서버 양방향 메시지를 모두 포함한다.

```typescript
export type ServiceMessage =
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
```

## `ServiceServerMessage`

서버 → 클라이언트 메시지 유니언.

```typescript
export type ServiceServerMessage =
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceEventMessage;
```

## `ServiceServerRawMessage`

서버가 보내는 모든 메시지 (진행 상태 포함).

```typescript
export type ServiceServerRawMessage = ServiceProgressMessage | ServiceServerMessage;
```

## `ServiceClientMessage`

클라이언트 → 서버 메시지 유니언.

```typescript
export type ServiceClientMessage =
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage;
```

## `ServiceProgressMessage`

서버가 보내는 청크 수신 진행 상태 알림 메시지.

```typescript
export interface ServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number;
    completedSize: number;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"progress"` | 고정 문자열 discriminant |
| `body.totalSize` | `number` | 전체 메시지 크기 (바이트) |
| `body.completedSize` | `number` | 현재까지 수신 완료된 크기 (바이트) |

## `ServiceErrorMessage`

서버가 보내는 에러 알림 메시지.

```typescript
export interface ServiceErrorMessage {
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

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"error"` | 고정 문자열 discriminant |
| `body.name` | `string` | 에러 이름 (클래스명) |
| `body.message` | `string` | 에러 메시지 |
| `body.code` | `string` | 에러 코드 |
| `body.stack` | `string?` | 스택 트레이스 (선택) |
| `body.detail` | `unknown?` | 추가 상세 정보 (선택) |
| `body.cause` | `unknown?` | 원인 에러 (선택) |

## `ServiceAuthMessage`

클라이언트가 보내는 인증 메시지.

```typescript
export interface ServiceAuthMessage {
  name: "auth";
  body: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"auth"` | 고정 문자열 discriminant |
| `body` | `string` | 인증 토큰 |

## `ServiceRequestMessage`

클라이언트가 보내는 서비스 메서드 요청 메시지.

```typescript
export interface ServiceRequestMessage {
  name: `${string}.${string}`;
  body: unknown[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `` `${string}.${string}` `` | 서비스명.메서드명 형식 (예: `"OrmService.connect"`) |
| `body` | `unknown[]` | 메서드 매개변수 배열 |

## `ServiceResponseMessage`

서버가 보내는 서비스 메서드 응답 메시지.

```typescript
export interface ServiceResponseMessage {
  name: "response";
  body?: unknown;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"response"` | 고정 문자열 discriminant |
| `body` | `unknown?` | 메서드 실행 결과 (없으면 void) |

## `ServiceAddEventListenerMessage`

클라이언트가 보내는 이벤트 리스너 추가 메시지.

```typescript
export interface ServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string;
    name: string;
    info: unknown;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:add"` | 고정 문자열 discriminant |
| `body.key` | `string` | 리스너 키 (UUID). removeEventListener에 사용 |
| `body.name` | `string` | 이벤트 이름 (`ServiceEventDef.eventName`) |
| `body.info` | `unknown` | 이벤트 발생 시 필터링을 위한 추가 리스너 정보 |

## `ServiceRemoveEventListenerMessage`

클라이언트가 보내는 이벤트 리스너 제거 메시지.

```typescript
export interface ServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:remove"` | 고정 문자열 discriminant |
| `body.key` | `string` | 제거할 리스너 키 (UUID) |

## `ServiceGetEventListenerInfosMessage`

클라이언트가 보내는 이벤트 리스너 정보 목록 요청 메시지.

```typescript
export interface ServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:gets"` | 고정 문자열 discriminant |
| `body.name` | `string` | 조회할 이벤트 이름 |

## `ServiceEmitEventMessage`

클라이언트가 보내는 이벤트 발생 메시지.

```typescript
export interface ServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[];
    data: unknown;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:emit"` | 고정 문자열 discriminant |
| `body.keys` | `string[]` | 대상 리스너 키 목록 |
| `body.data` | `unknown` | 이벤트 데이터 |

## `ServiceEventMessage`

서버가 보내는 이벤트 알림 메시지.

```typescript
export interface ServiceEventMessage {
  name: "evt:on";
  body: {
    keys: string[];
    data: unknown;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:on"` | 고정 문자열 discriminant |
| `body.keys` | `string[]` | 대상 리스너 키 목록 |
| `body.data` | `unknown` | 이벤트 데이터 |

## `ServiceProtocol`

바이너리 프로토콜 V2 인코더/디코더 인터페이스. `createServiceProtocol()`로 생성한다.

```typescript
export interface ServiceProtocol {
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;
  dispose(): void;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `encode` | `uuid: string, message: ServiceMessage` | `{ chunks: Bytes[]; totalSize: number }` | 메시지를 인코딩한다. 3MB 초과 시 300KB 청크로 자동 분할 |
| `decode` | `bytes: Bytes` | `ServiceMessageDecodeResult<T>` | 청크를 디코딩한다. 청크가 모두 도착하면 complete, 아니면 progress 반환 |
| `dispose` | 없음 | `void` | 내부 GC 타이머와 청크 누적기를 해제한다. 사용 후 반드시 호출 |

헤더 구조 (28바이트, Big Endian):

| Offset | Size | Field |
|--------|------|-------|
| 0 | 16 | UUID (바이너리) |
| 16 | 8 | TotalSize (uint64, 상위 4바이트 = 0) |
| 24 | 4 | Index (uint32) |

## `ServiceMessageDecodeResult`

메시지 디코딩 결과 유니언 타입. `type` 필드로 분기한다.

```typescript
export type ServiceMessageDecodeResult<TMessage extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: TMessage }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

**Variant: `complete`** — 모든 청크가 도착하여 메시지 재조립이 완료된 상태.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"complete"` | discriminant |
| `uuid` | `string` | 메시지 UUID |
| `message` | `TMessage` | 재조립된 메시지 |

**Variant: `progress`** — 청크 메시지 수신 진행 중.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"progress"` | discriminant |
| `uuid` | `string` | 메시지 UUID |
| `totalSize` | `number` | 전체 크기 (바이트) |
| `completedSize` | `number` | 수신 완료된 크기 (바이트) |

## `createServiceProtocol`

ServiceProtocol 인스턴스를 생성하는 팩토리 함수.

```typescript
export function createServiceProtocol(): ServiceProtocol;
```

내부에 `LazyGcMap` 기반 청크 누적기를 캡슐화한다. 미완성 메시지는 60초 후 GC로 자동 정리된다. 사용 후 반드시 `dispose()`를 호출하여 GC 타이머를 해제해야 한다.
