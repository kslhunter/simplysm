# Service Transport

## `ServiceTransportEvents`

Event map for the service transport.

```typescript
export interface ServiceTransportEvents {
  event: { keys: string[]; data: unknown };
}
```

| Event | Data Type | Description |
|-------|-----------|-------------|
| `event` | `{ keys: string[]; data: unknown }` | Server-side event broadcast received |

## `ServiceTransport`

Service-level message transport built on top of `SocketProvider` and `ClientProtocolWrapper`. Manages pending request/response correlation via UUIDs, handles progress notifications, and dispatches events.

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

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `on` | `type: K, listener` | `void` | Subscribe to transport events |
| `off` | `type: K, listener` | `void` | Unsubscribe from transport events |
| `send` | `message: ServiceClientMessage, progress?: ServiceProgress` | `Promise<unknown>` | Sends a service message and awaits the server response. Returns the response body |

## `createServiceTransport`

Creates a `ServiceTransport` instance.

```typescript
export function createServiceTransport(
  socket: SocketProvider,
  protocol: ClientProtocolWrapper,
): ServiceTransport;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `socket` | `SocketProvider` | The socket provider for sending/receiving binary data |
| `protocol` | `ClientProtocolWrapper` | The protocol wrapper for encoding/decoding messages |

Behavior:
- Generates a UUID per `send()` call and registers a pending resolver
- On socket disconnect (`closed`/`reconnecting`), rejects all pending requests
- Routes server messages: `response` resolves, `error` rejects, `evt:on` emits event, `progress` invokes progress callbacks
