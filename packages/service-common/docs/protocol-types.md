# Protocol Types

## `PROTOCOL_CONFIG`

Protocol configuration constants for message size limits and timing.

```typescript
export const PROTOCOL_CONFIG: {
  readonly MAX_TOTAL_SIZE: 104857600;   // 100MB
  readonly SPLIT_MESSAGE_SIZE: 3145728; // 3MB
  readonly CHUNK_SIZE: 307200;          // 300KB
  readonly GC_INTERVAL: 10000;          // 10s
  readonly EXPIRE_TIME: 60000;          // 60s
};
```

| Field | Value | Description |
|-------|-------|-------------|
| `MAX_TOTAL_SIZE` | `104857600` (100MB) | Maximum total message size |
| `SPLIT_MESSAGE_SIZE` | `3145728` (3MB) | Threshold above which messages are split into chunks |
| `CHUNK_SIZE` | `307200` (300KB) | Size of each chunk when splitting |
| `GC_INTERVAL` | `10000` (10s) | Garbage collection interval for incomplete messages |
| `EXPIRE_TIME` | `60000` (60s) | Expiration time for incomplete messages |

## `ServiceMessage`

Union of all service message types.

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

## `ServiceServerMessage`

Union of message types sent from server to client.

```typescript
export type ServiceServerMessage =
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceEventMessage;
```

## `ServiceServerRawMessage`

Union of server raw messages including progress notifications.

```typescript
export type ServiceServerRawMessage = ServiceProgressMessage | ServiceServerMessage;
```

## `ServiceClientMessage`

Union of message types sent from client to server.

```typescript
export type ServiceClientMessage =
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage;
```

## `ServiceProgressMessage`

Server notification about chunked message reception progress.

```typescript
export interface ServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number;
    completedSize: number;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"progress"` | Message type discriminator |
| `body.totalSize` | `number` | Total size in bytes |
| `body.completedSize` | `number` | Completed size in bytes |

## `ServiceErrorMessage`

Server error notification.

```typescript
export interface ServiceErrorMessage {
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

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"error"` | Message type discriminator |
| `body.name` | `string` | Error name |
| `body.message` | `string` | Error message |
| `body.code` | `string` | Error code (e.g., `"BAD_MESSAGE"`, `"INTERNAL_ERROR"`) |
| `body.stack` | `string?` | Stack trace (dev mode only) |
| `body.detail` | `unknown?` | Additional error detail |
| `body.cause` | `unknown?` | Error cause |

## `ServiceAuthMessage`

Client authentication message.

```typescript
export interface ServiceAuthMessage {
  name: "auth";
  body: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"auth"` | Message type discriminator |
| `body` | `string` | Authentication token |

## `ServiceRequestMessage`

Client service method request.

```typescript
export interface ServiceRequestMessage {
  name: `${string}.${string}`;
  body: unknown[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `` `${string}.${string}` `` | `${serviceName}.${methodName}` format |
| `body` | `unknown[]` | Method parameters |

## `ServiceResponseMessage`

Server service method response.

```typescript
export interface ServiceResponseMessage {
  name: "response";
  body?: unknown;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"response"` | Message type discriminator |
| `body` | `unknown?` | Method return value |

## `ServiceAddEventListenerMessage`

Client request to add an event listener.

```typescript
export interface ServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string;
    name: string;
    info: unknown;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:add"` | Message type discriminator |
| `body.key` | `string` | Listener key (UUID) for removal |
| `body.name` | `string` | Event name |
| `body.info` | `unknown` | Additional listener info for event filtering |

## `ServiceRemoveEventListenerMessage`

Client request to remove an event listener.

```typescript
export interface ServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:remove"` | Message type discriminator |
| `body.key` | `string` | Listener key (UUID) |

## `ServiceGetEventListenerInfosMessage`

Client request to get event listener information.

```typescript
export interface ServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:gets"` | Message type discriminator |
| `body.name` | `string` | Event name |

## `ServiceEmitEventMessage`

Client request to emit an event to specific listeners.

```typescript
export interface ServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[];
    data: unknown;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:emit"` | Message type discriminator |
| `body.keys` | `string[]` | Target listener keys |
| `body.data` | `unknown` | Event data |

## `ServiceEventMessage`

Server event notification to client.

```typescript
export interface ServiceEventMessage {
  name: "evt:on";
  body: {
    keys: string[];
    data: unknown;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:on"` | Message type discriminator |
| `body.keys` | `string[]` | Target listener keys |
| `body.data` | `unknown` | Event data |
