# Protocol

## `PROTOCOL_CONFIG`

Service protocol configuration constants.

```typescript
const PROTOCOL_CONFIG = {
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,     // Max message size (100MB)
  SPLIT_MESSAGE_SIZE: 3 * 1024 * 1024,   // Chunking threshold (3MB)
  CHUNK_SIZE: 300 * 1024,                 // Chunk size (300KB)
  GC_INTERVAL: 10 * 1000,                // GC interval (10s)
  EXPIRE_TIME: 60 * 1000,                // Incomplete message expiry (60s)
} as const;
```

## `ServiceProtocol`

Service protocol interface for encoding/decoding binary messages.

```typescript
interface ServiceProtocol {
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;
  dispose(): void;
}
```

| Method | Description |
|--------|-------------|
| `encode()` | Encode a message (auto-split if exceeding 3MB) |
| `decode()` | Decode a message (auto-reassemble chunked packets) |
| `dispose()` | Release GC timer and free memory |

## `ServiceMessageDecodeResult`

Message decode result type (union).

```typescript
type ServiceMessageDecodeResult<TMessage extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: TMessage }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

## `createServiceProtocol`

Create a service protocol encoder/decoder. Binary Protocol V2: Header 28 bytes (UUID 16 + TotalSize 8 + Index 4) + JSON body. Auto chunking at 300KB when exceeding 3MB. Max 100MB.

```typescript
function createServiceProtocol(): ServiceProtocol;
```

## `ServiceMessage`

Union type of all service messages.

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

## `ServiceServerMessage`

Messages sent from server to client.

```typescript
type ServiceServerMessage =
  | ServiceReloadMessage
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceEventMessage;
```

## `ServiceServerRawMessage`

Server messages including progress notifications.

```typescript
type ServiceServerRawMessage = ServiceProgressMessage | ServiceServerMessage;
```

## `ServiceClientMessage`

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

## `ServiceReloadMessage`

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

## `ServiceProgressMessage`

Server progress notification for chunked messages.

```typescript
interface ServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number;
    completedSize: number;
  };
}
```

## `ServiceErrorMessage`

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

## `ServiceAuthMessage`

Client authentication message.

```typescript
interface ServiceAuthMessage {
  name: "auth";
  body: string;
}
```

## `ServiceRequestMessage`

Client service method request.

```typescript
interface ServiceRequestMessage {
  name: `${string}.${string}`;
  body: unknown[];
}
```

## `ServiceResponseMessage`

Server service method response.

```typescript
interface ServiceResponseMessage {
  name: "response";
  body?: unknown;
}
```

## `ServiceAddEventListenerMessage`

Client add event listener request.

```typescript
interface ServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string;
    name: string;
    info: unknown;
  };
}
```

## `ServiceRemoveEventListenerMessage`

Client remove event listener request.

```typescript
interface ServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string;
  };
}
```

## `ServiceGetEventListenerInfosMessage`

Client request for event listener info list.

```typescript
interface ServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string;
  };
}
```

## `ServiceEmitEventMessage`

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

## `ServiceEventMessage`

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
