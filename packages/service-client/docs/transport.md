# Transport

The transport layer handles WebSocket connections and message routing.

## SocketProvider

Low-level WebSocket connection manager with automatic reconnection and heartbeat keep-alive.

### `SocketProviderEvents`

```typescript
interface SocketProviderEvents {
  message: Bytes;
  state: "connected" | "closed" | "reconnecting";
}
```

### `SocketProvider`

```typescript
interface SocketProvider {
  readonly clientName: string;
  readonly connected: boolean;
  on<K extends keyof SocketProviderEvents & string>(
    type: K,
    listener: (data: SocketProviderEvents[K]) => void,
  ): void;
  off<K extends keyof SocketProviderEvents & string>(
    type: K,
    listener: (data: SocketProviderEvents[K]) => void,
  ): void;
  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: Bytes): Promise<void>;
}
```

### `createSocketProvider`

Create a SocketProvider instance.

```typescript
function createSocketProvider(
  url: string,
  clientName: string,
  maxReconnectCount: number,
): SocketProvider;
```

**Behavior:**
- Heartbeat: sends ping every 5s, considers disconnected if no message for 30s
- Reconnect: retries every 3s up to `maxReconnectCount` times
- Binary protocol: uses `ArrayBuffer` for data transfer
- Ping/Pong: `0x01` = ping, `0x02` = pong

---

## ServiceTransport

Higher-level transport that handles message encoding/decoding, request-response correlation, and event dispatching.

### `ServiceTransportEvents`

```typescript
interface ServiceTransportEvents {
  reload: Set<string>;
  event: { keys: string[]; data: unknown };
}
```

### `ServiceTransport`

```typescript
interface ServiceTransport {
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

### `createServiceTransport`

Create a ServiceTransport instance.

```typescript
function createServiceTransport(
  socket: SocketProvider,
  protocol: ClientProtocolWrapper,
): ServiceTransport;
```

**Behavior:**
- Each `send()` call generates a unique UUID and registers a pending request
- Incoming messages are correlated by UUID and resolved/rejected accordingly
- Progress callbacks are invoked for chunked message transfers
- All pending requests are rejected when the socket disconnects
