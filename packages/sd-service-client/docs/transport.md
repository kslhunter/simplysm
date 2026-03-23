# Transport

## SdServiceTransport

Request/response multiplexer built on top of `SdSocketProvider`. Assigns a UUID to each outgoing request, tracks pending responses, handles chunked encoding/decoding via `SdServiceClientProtocolWrapper`, and emits progress and event notifications. Extends `EventEmitter`.

### Constructor

```typescript
constructor(private readonly _socket: SdSocketProvider)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_socket` | `SdSocketProvider` | The underlying WebSocket provider |

### Methods

#### `sendAsync(message, progress?)`

```typescript
async sendAsync(
  message: TSdServiceClientMessage,
  progress?: ISdServiceProgress,
): Promise<any>
```

Sends a message to the server and waits for the response. Automatically encodes into binary chunks, tracks upload progress, and resolves with the server's response body.

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `TSdServiceClientMessage` | Message to send (contains `name` and `body`) |
| `progress` | `ISdServiceProgress` | Optional progress callbacks for request/response tracking |

**Returns:** `Promise<any>` -- the server's response body.

**Throws:** `Error` if the server returns an error response or the socket disconnects.

### Events

| Event | Listener Signature | Description |
|-------|-------------------|-------------|
| `"reload"` | `(changedFileSet: Set<string>) => void` | Fired when the server broadcasts a reload notification for this client |
| `"event"` | `(keys: string[], data: any) => void` | Fired when the server pushes an event to subscribed listeners |

---

## SdSocketProvider

Low-level WebSocket connection manager with heartbeat monitoring and automatic reconnection. Extends `EventEmitter`.

### Constructor

```typescript
constructor(
  private readonly _url: string,
  public readonly clientName: string,
  private readonly _maxReconnectCount: number,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_url` | `string` | WebSocket URL (e.g. `wss://localhost:3000/ws`) |
| `clientName` | `string` | Client application name, sent as a query parameter |
| `_maxReconnectCount` | `number` | Maximum number of reconnection attempts before giving up |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `connected` | `boolean` | Whether the WebSocket is in `OPEN` state |
| `clientName` | `string` | Client application name |

### Methods

#### `connectAsync()`

```typescript
async connectAsync(): Promise<void>
```

Establishes a WebSocket connection. Starts heartbeat monitoring on success. Throws on initial connection failure.

#### `closeAsync()`

```typescript
async closeAsync(): Promise<void>
```

Gracefully closes the WebSocket connection. Stops heartbeat monitoring and waits up to 3 seconds for the socket to fully close.

#### `sendAsync(data)`

```typescript
async sendAsync(data: Buffer | Uint8Array): Promise<void>
```

Sends binary data through the WebSocket. Waits up to 5 seconds for the connection to be ready.

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Buffer \| Uint8Array` | Binary data to send |

### Events

| Event | Listener Signature | Description |
|-------|-------------------|-------------|
| `"message"` | `(data: Buffer) => void` | Fired when a data message (non-heartbeat) is received |
| `"state"` | `(state: "connected" \| "closed" \| "reconnecting") => void` | Fired on connection state changes |

### Internal Details

- **Heartbeat interval:** 5 seconds (`_HEARTBEAT_INTERVAL`)
- **Heartbeat timeout:** 30 seconds (`_HEARTBEAT_TIMEOUT`) -- connection is considered dead if no messages arrive within this window
- **Reconnect delay:** 3 seconds (`_RECONNECT_DELAY`) between reconnection attempts
- **Ping packet:** 1-byte `0x01`; pong packet: 1-byte `0x02`
- **Connection query params:** `ver=2`, `clientId` (UUID), `clientName`
