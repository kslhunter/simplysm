# Transport

Low-level transport layer that manages the WebSocket connection and request/response multiplexing. These are internal building blocks used by `ServiceClient`; most consumers will not interact with them directly.

## `SocketProvider`

**Interface** -- abstraction over a reconnecting WebSocket connection with heartbeat monitoring.

```typescript
interface SocketProvider {
  readonly clientName: string;
  readonly connected: boolean;
  on<K extends keyof SocketProviderEvents>(type: K, listener: (data: SocketProviderEvents[K]) => void): void;
  off<K extends keyof SocketProviderEvents>(type: K, listener: (data: SocketProviderEvents[K]) => void): void;
  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: Bytes): Promise<void>;
}
```

### Events (`SocketProviderEvents`)

| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `Bytes` | Raw binary message received from server |
| `state` | `"connected" \| "closed" \| "reconnecting"` | Connection state change |

---

## `createSocketProvider()`

**Factory function** -- creates a `SocketProvider` implementation backed by the browser `WebSocket` API.

```typescript
function createSocketProvider(
  url: string,
  clientName: string,
  maxReconnectCount: number,
): SocketProvider
```

### Behavior

- **Heartbeat**: Sends a ping (`0x01`) every 5 seconds. If no message is received for 30 seconds, the connection is considered lost and reconnection begins.
- **Reconnection**: On unexpected disconnect, retries up to `maxReconnectCount` times with a 3-second delay between attempts. Emits `"reconnecting"` state on each attempt and `"connected"` on success.
- **Graceful close**: `close()` sets a manual-close flag to suppress reconnection and waits up to 30 seconds for the socket to fully close.
- **Binary mode**: WebSocket is configured with `binaryType: "arraybuffer"`.

---

## `ServiceTransport`

**Interface** -- multiplexes named request/response pairs over a single `SocketProvider`.

```typescript
interface ServiceTransport {
  on<K extends keyof ServiceTransportEvents>(type: K, listener: (data: ServiceTransportEvents[K]) => void): void;
  off<K extends keyof ServiceTransportEvents>(type: K, listener: (data: ServiceTransportEvents[K]) => void): void;
  send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown>;
}
```

### Events (`ServiceTransportEvents`)

| Event | Payload | Description |
|-------|---------|-------------|
| `reload` | `Set<string>` | Server-initiated reload notification with changed file paths |
| `event` | `{ keys: string[]; data: unknown }` | Server-pushed event data |

---

## `createServiceTransport()`

**Factory function** -- creates a `ServiceTransport` that encodes/decodes messages through a protocol wrapper.

```typescript
function createServiceTransport(
  socket: SocketProvider,
  protocol: ClientProtocolWrapper,
): ServiceTransport
```

### Behavior

- Each `send()` call assigns a unique UUID, registers a pending-response listener, and encodes the message into one or more binary chunks.
- Progress callbacks are invoked for multi-chunk transfers.
- When the socket disconnects, all pending requests are rejected with `"Request canceled: Socket connection lost"`.
- Incoming messages are decoded and dispatched based on their name: `response`, `error`, `progress`, `reload`, or `evt:on`.
