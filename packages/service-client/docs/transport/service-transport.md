# ServiceTransport

요청-응답 매핑, progress 중계, 서버 이벤트 디스패치를 담당하는 인터페이스. 팩토리 함수 `createServiceTransport`로 생성한다.

```typescript
export interface ServiceTransport {
  on<K extends keyof ServiceTransportEvents & string>(
    type: K,
    listener: (data: ServiceTransportEvents[K]) => void,
  ): void;
  off<K extends keyof ServiceTransportEvents & string>(
    type: K,
    listener: (data: ServiceTransportEvents[K]) => void,
  ): void;
  send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `on(type, listener)` | method | `void` | 이벤트 리스너 등록 |
| `off(type, listener)` | method | `void` | 이벤트 리스너 제거 |
| `send(message, progress?)` | method | `Promise<unknown>` | 서버에 메시지 전송하고 응답 대기 |

## Related Types

### `ServiceTransportEvents`

`ServiceTransport`에서 발생하는 이벤트 타입 맵.

```typescript
export interface ServiceTransportEvents {
  event: { keys: string[]; data: unknown };
}
```

| Event | Type | Description |
|-------|------|-------------|
| `event` | `{ keys: string[]; data: unknown }` | 서버에서 발행된 이벤트 수신 |

## `createServiceTransport`

`ServiceTransport` 팩토리 함수.

```typescript
export function createServiceTransport(
  socket: SocketProvider,
  protocol: ClientProtocolWrapper,
): ServiceTransport;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `socket` | [`SocketProvider`](./socket-provider.md) | WebSocket 소켓 제공자 |
| `protocol` | [`ClientProtocolWrapper`](../protocol/client-protocol-wrapper.md) | 인코딩/디코딩 래퍼 |

내부 동작:
- `uuid` 기반 요청-응답 `Map`으로 비동기 응답을 매핑
- 소켓 `closed`/`reconnecting` 상태 시 대기 중인 모든 요청을 reject
- 분할 메시지의 progress 상태를 추적하여 완료 시 100% 이벤트 전송
- 소켓 `message` 이벤트를 수신하여 `progress`, `response`, `error`, `evt:on` 타입으로 분기 처리
