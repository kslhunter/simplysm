# Socket Provider

## `SocketProviderEvents`

Event map for the socket provider.

```typescript
export interface SocketProviderEvents {
  message: Bytes;
  state: "connected" | "closed" | "reconnecting";
}
```

| Event | Data Type | Description |
|-------|-----------|-------------|
| `message` | `Bytes` | Raw binary message received from server |
| `state` | `"connected" \| "closed" \| "reconnecting"` | Connection state change |

## `SocketProvider`

Low-level WebSocket abstraction with automatic reconnection and heartbeat keepalive. Works in both browser and Node.js environments (uses `ws` package as polyfill in Node.js).

```typescript
export interface SocketProvider {
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

| Member | Kind | Description |
|--------|------|-------------|
| `clientName` | property (readonly) | Client identifier name |
| `connected` | property (readonly) | Whether currently connected |
| `on` | method | Subscribe to an event |
| `off` | method | Unsubscribe from an event |
| `connect` | method | Opens the WebSocket connection. Throws on initial connection failure |
| `close` | method | Closes the connection gracefully |
| `send` | method | Sends binary data. Waits for connection if not yet open |

## `createSocketProvider`

Creates a `SocketProvider` instance with auto-reconnect and heartbeat.

```typescript
export function createSocketProvider(
  url: string,
  clientName: string,
  maxReconnectCount: number,
): SocketProvider;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | WebSocket URL (e.g., `ws://localhost:3000/ws`) |
| `clientName` | `string` | Client identifier |
| `maxReconnectCount` | `number` | Maximum reconnection attempts |

Internal constants:
- Heartbeat timeout: 30 seconds
- Heartbeat interval: 5 seconds (sends ping `0x01`, expects pong `0x02`)
- Reconnect delay: 3 seconds between attempts
