# Protocol

Binary protocol V2 for encoding/decoding service messages over WebSocket.

## `PROTOCOL_CONFIG`

Service protocol configuration constants.

```typescript
const PROTOCOL_CONFIG = {
  /** Max message size (100MB) */
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,
  /** Chunking threshold (3MB) */
  SPLIT_MESSAGE_SIZE: 3 * 1024 * 1024,
  /** Chunk size (300KB) */
  CHUNK_SIZE: 300 * 1024,
  /** GC interval (10s) */
  GC_INTERVAL: 10 * 1000,
  /** Incomplete message expiry time (60s) */
  EXPIRE_TIME: 60 * 1000,
} as const;
```

## Message Types

### `ServiceMessage`

Union of all message types.

```typescript
type ServiceMessage =
  | ServiceReloadMessage
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

### `ServiceServerMessage`

Messages sent from server to client.

```typescript
type ServiceServerMessage =
  | ServiceReloadMessage
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceEventMessage;
```

### `ServiceServerRawMessage`

Server messages including progress (internal).

```typescript
type ServiceServerRawMessage = ServiceProgressMessage | ServiceServerMessage;
```

### `ServiceClientMessage`

Messages sent from client to server.

```typescript
type ServiceClientMessage =
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage;
```

### Individual Message Types

#### `ServiceReloadMessage`

Server reload command to client.

```typescript
interface ServiceReloadMessage {
  name: "reload";
  body: {
    clientName: string | undefined;
    changedFileSet: Set<string>;
  };
}
```

#### `ServiceProgressMessage`

Server progress notification for received chunked message.

```typescript
interface ServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number;
    completedSize: number;
  };
}
```

#### `ServiceErrorMessage`

Server error notification.

```typescript
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

#### `ServiceAuthMessage`

Client authentication message.

```typescript
interface ServiceAuthMessage {
  name: "auth";
  body: string; // JWT token
}
```

#### `ServiceRequestMessage`

Client service method request.

```typescript
interface ServiceRequestMessage {
  name: `${string}.${string}`; // ${service}.${method}
  body: unknown[];              // params
}
```

#### `ServiceResponseMessage`

Server service method response.

```typescript
interface ServiceResponseMessage {
  name: "response";
  body?: unknown; // result
}
```

#### `ServiceAddEventListenerMessage`

Client add event listener request.

```typescript
interface ServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string;    // Listener key (uuid)
    name: string;   // Event name
    info: unknown;  // Additional listener info for filtering
  };
}
```

#### `ServiceRemoveEventListenerMessage`

Client remove event listener request.

```typescript
interface ServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string;
  };
}
```

#### `ServiceGetEventListenerInfosMessage`

Client request event listener info list.

```typescript
interface ServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string;
  };
}
```

#### `ServiceEmitEventMessage`

Client emit event request.

```typescript
interface ServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[];
    data: unknown;
  };
}
```

#### `ServiceEventMessage`

Server event notification.

```typescript
interface ServiceEventMessage {
  name: "evt:on";
  body: {
    keys: string[];
    data: unknown;
  };
}
```

## ServiceProtocol

### Interface

```typescript
interface ServiceProtocol {
  /** Encode a message (auto-split if needed) */
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };

  /** Decode a message (auto-reassemble chunked packets) */
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;

  /** Dispose the protocol instance (releases GC timer and frees memory) */
  dispose(): void;
}
```

### `ServiceMessageDecodeResult`

```typescript
type ServiceMessageDecodeResult<TMessage extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: TMessage }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

### `createServiceProtocol`

Create a service protocol encoder/decoder.

```typescript
function createServiceProtocol(): ServiceProtocol;
```

**Binary Protocol V2 header structure (28 bytes, Big Endian):**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 16 | UUID (binary) |
| 16 | 8 | TotalSize (uint64) |
| 24 | 4 | Index (uint32) |

**Encoding behavior:**
- Messages are JSON-serialized as `[name, body]` array
- If total size <= 3MB: single chunk
- If total size > 3MB: split into 300KB chunks
- Max total size: 100MB (throws `ArgumentError` if exceeded)

**Decoding behavior:**
- Returns `"complete"` when all chunks are received
- Returns `"progress"` when chunks are still being accumulated
- Incomplete messages expire after 60s (GC runs every 10s)
