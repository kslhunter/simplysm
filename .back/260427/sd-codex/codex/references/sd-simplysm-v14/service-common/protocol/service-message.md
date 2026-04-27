# `ServiceMessage`

> **읽어야 하는 상황**: 양방향 메시지의 전체 유니언 또는 방향별 하위 유니언(`ServiceClientMessage`, `ServiceServerMessage`)의 구조를 파악할 때.

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

## Related Types

### `ServiceClientMessage`

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

### `ServiceServerMessage`

서버 → 클라이언트 메시지 유니언.

```typescript
export type ServiceServerMessage =
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceEventMessage;
```

### `ServiceServerRawMessage`

서버가 보내는 모든 메시지 (진행 상태 포함).

```typescript
export type ServiceServerRawMessage = ServiceProgressMessage | ServiceServerMessage;
```
