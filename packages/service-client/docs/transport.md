# Transport

## `SocketProvider`

WebSocket connection provider interface. Manages connection lifecycle, heartbeat, and auto-reconnect.

```typescript
interface SocketProvider {
  readonly clientName: string;
  readonly connected: boolean;
  on<K extends keyof SocketProviderEvents & string>(type: K, listener: (data: SocketProviderEvents[K]) => void): void;
  off<K extends keyof SocketProviderEvents & string>(type: K, listener: (data: SocketProviderEvents[K]) => void): void;
  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: Bytes): Promise<void>;
}
```

| Property/Method | Description |
|-----------------|-------------|
| `clientName` | Client name identifier |
| `connected` | Whether WebSocket is currently open |
| `on()` | Register event listener |
| `off()` | Remove event listener |
| `connect()` | Establish WebSocket connection |
| `close()` | Close connection (graceful shutdown) |
| `send()` | Send binary data |

## `SocketProviderEvents`

Events emitted by `SocketProvider`.

```typescript
interface SocketProviderEvents {
  message: Bytes;
  state: "connected" | "closed" | "reconnecting";
}
```

## `createSocketProvider`

Create a WebSocket provider with heartbeat and auto-reconnect.

```typescript
function createSocketProvider(
  url: string,
  clientName: string,
  maxReconnectCount: number,
): SocketProvider;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | WebSocket URL (ws:// or wss://) |
| `clientName` | `string` | Client name identifier |
| `maxReconnectCount` | `number` | Max reconnect attempts |

## `ServiceTransport`

Service transport interface. Handles message routing and request/response correlation.

```typescript
interface ServiceTransport {
  on<K extends keyof ServiceTransportEvents & string>(type: K, listener: (data: ServiceTransportEvents[K]) => void): void;
  off<K extends keyof ServiceTransportEvents & string>(type: K, listener: (data: ServiceTransportEvents[K]) => void): void;
  send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown>;
}
```

| Method | Description |
|--------|-------------|
| `on()` | Register event listener (reload, event) |
| `off()` | Remove event listener |
| `send()` | Send a client message and await response |

## `ServiceTransportEvents`

Events emitted by `ServiceTransport`.

```typescript
interface ServiceTransportEvents {
  reload: Set<string>;
  event: { keys: string[]; data: unknown };
}
```

## `createServiceTransport`

Create a service transport instance.

```typescript
function createServiceTransport(
  socket: SocketProvider,
  protocol: ClientProtocolWrapper,
): ServiceTransport;
```
