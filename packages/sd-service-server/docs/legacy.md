# Legacy (Deprecated)

All items in this file are marked `@deprecated`. They exist for backward compatibility with v1 protocol clients and should not be used in new code.

---

## Command Types

### ISdServiceMethodCommandInfo

**@deprecated**

```typescript
interface ISdServiceMethodCommandInfo {
  serviceName: string;
  methodName: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `serviceName` | `string` | Service class name |
| `methodName` | `string` | Method name |

### SD_SERVICE_SPECIAL_COMMANDS

**@deprecated**

```typescript
const SD_SERVICE_SPECIAL_COMMANDS = {
  ADD_EVENT_LISTENER: "addEventListener",
  REMOVE_EVENT_LISTENER: "removeEventListener",
  GET_EVENT_LISTENER_INFOS: "getEventListenerInfos",
  EMIT_EVENT: "emitEvent",
} as const;
```

Constant object mapping special command keys to their string values.

| Key | Value |
|-----|-------|
| `ADD_EVENT_LISTENER` | `"addEventListener"` |
| `REMOVE_EVENT_LISTENER` | `"removeEventListener"` |
| `GET_EVENT_LISTENER_INFOS` | `"getEventListenerInfos"` |
| `EMIT_EVENT` | `"emitEvent"` |

### TSdServiceSpecialCommand

**@deprecated**

```typescript
type TSdServiceSpecialCommand =
  (typeof SD_SERVICE_SPECIAL_COMMANDS)[keyof typeof SD_SERVICE_SPECIAL_COMMANDS];
```

Union type of all special command string values: `"addEventListener" | "removeEventListener" | "getEventListenerInfos" | "emitEvent"`.

### TSdServiceMethodCommand

**@deprecated**

```typescript
type TSdServiceMethodCommand = `${string}.${string}`;
```

Template literal type representing a `"ServiceName.methodName"` command string.

### TSdServiceCommand

**@deprecated**

```typescript
type TSdServiceCommand = TSdServiceSpecialCommand | TSdServiceMethodCommand;
```

Union of all allowed command types (special commands and method commands).

---

## Protocol V1 Types

### TSdServiceMessage

**@deprecated**

```typescript
type TSdServiceMessage = TSdServiceS2CMessage | TSdServiceC2SMessage;
```

Union of all v1 protocol messages (both directions).

### TSdServiceS2CMessage

**@deprecated**

```typescript
type TSdServiceS2CMessage =
  | ISdServiceClientReloadCommand
  | ISdServiceClientGetIdCommand
  | ISdServiceClientConnectedAlarm
  | ISdServiceClientPong
  | TSdServiceResponse
  | ISdServiceProgress
  | ISdServiceResponseForSplit
  | ISdServiceSplitResponse
  | ISdServiceEmittedEvent;
```

Union of all server-to-client message types.

### TSdServiceC2SMessage

**@deprecated**

```typescript
type TSdServiceC2SMessage =
  | ISdServiceClientGetIdResponse
  | ISdServiceClientPing
  | ISdServiceRequest
  | ISdServiceSplitRequest;
```

Union of all client-to-server message types.

### TSdServiceResponse

**@deprecated**

```typescript
type TSdServiceResponse = ISdServiceSuccessResponse | ISdServiceErrorResponse;
```

Union of success and error response types.

### ISdServiceSuccessResponse

**@deprecated**

```typescript
interface ISdServiceSuccessResponse {
  name: "response";
  reqUuid: string;
  state: "success";
  body: any;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"response"` | Message type discriminator |
| `reqUuid` | `string` | UUID of the original request |
| `state` | `"success"` | Response state |
| `body` | `any` | Response payload |

### ISdServiceErrorResponse

**@deprecated**

```typescript
interface ISdServiceErrorResponse {
  name: "response";
  reqUuid: string;
  state: "error";
  body: ISdServiceErrorBody;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"response"` | Message type discriminator |
| `reqUuid` | `string` | UUID of the original request |
| `state` | `"error"` | Response state |
| `body` | `ISdServiceErrorBody` | Error details |

### ISdServiceErrorBody

**@deprecated**

```typescript
interface ISdServiceErrorBody {
  message: string;
  code: string;
  stack?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string` | Error message |
| `code` | `string` | Error code (e.g. `"BAD_COMMAND"`, `"INTERNAL_ERROR"`) |
| `stack` | `string` | Optional stack trace |

### ISdServiceRequest

**@deprecated**

```typescript
interface ISdServiceRequest {
  name: "request";
  clientName: string;
  uuid: string;
  command: TSdServiceCommand;
  params: any;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"request"` | Message type discriminator |
| `clientName` | `string` | Client application name |
| `uuid` | `string` | Unique request identifier |
| `command` | `TSdServiceCommand` | Command to execute |
| `params` | `any` | Command parameters |

### ISdServiceProgress

**@deprecated**

```typescript
interface ISdServiceProgress {
  name: "progress";
  uuid: string;
  totalSize: number;
  receivedSize: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"progress"` | Message type discriminator |
| `uuid` | `string` | Request UUID |
| `totalSize` | `number` | Total message size |
| `receivedSize` | `number` | Bytes received so far |

### ISdServiceSplitRequest

**@deprecated**

```typescript
interface ISdServiceSplitRequest {
  name: "request-split";
  uuid: string;
  fullSize: number;
  index: number;
  body: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"request-split"` | Message type discriminator |
| `uuid` | `string` | Request UUID |
| `fullSize` | `number` | Total size of the full message |
| `index` | `number` | Chunk index |
| `body` | `string` | Chunk content |

### ISdServiceResponseForSplit

**@deprecated**

```typescript
interface ISdServiceResponseForSplit {
  name: "response-for-split";
  reqUuid: string;
  totalSize: number;
  completedSize: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"response-for-split"` | Message type discriminator |
| `reqUuid` | `string` | Original request UUID |
| `totalSize` | `number` | Total size of the split message |
| `completedSize` | `number` | Bytes received so far |

### ISdServiceSplitResponse

**@deprecated**

```typescript
interface ISdServiceSplitResponse {
  name: "response-split";
  reqUuid: string;
  fullSize: number;
  index: number;
  body: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"response-split"` | Message type discriminator |
| `reqUuid` | `string` | Original request UUID |
| `fullSize` | `number` | Total size of the full response |
| `index` | `number` | Chunk index |
| `body` | `string` | Chunk content |

---

## SdServiceCommandHelperV1

**@deprecated**

Abstract helper class for building and parsing v1 command strings.

```typescript
abstract class SdServiceCommandHelperV1 {
  static buildMethodCommand(cmdInfo: ISdServiceMethodCommandInfo): TSdServiceMethodCommand;
  static parseMethodCommand(command: string): ISdServiceMethodCommandInfo | undefined;
}
```

### Static Methods

#### `buildMethodCommand(cmdInfo)`

```typescript
static buildMethodCommand(cmdInfo: ISdServiceMethodCommandInfo): TSdServiceMethodCommand
```

Builds a `"ServiceName.methodName"` command string from a command info object.

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmdInfo` | `ISdServiceMethodCommandInfo` | Object with `serviceName` and `methodName` |

#### `parseMethodCommand(command)`

```typescript
static parseMethodCommand(command: string): ISdServiceMethodCommandInfo | undefined
```

Parses a command string into its service and method components. Returns `undefined` if the format is invalid.

| Parameter | Type | Description |
|-----------|------|-------------|
| `command` | `string` | Command string to parse |

---

## SdServiceProtocolV1

**@deprecated**

JSON-based protocol encoder/decoder with automatic message splitting for large payloads.

### Constructor

```typescript
constructor()
```

### Methods

#### `encode(message)`

```typescript
encode(message: TSdServiceMessage): { json: string; chunks: string[] }
```

Encodes a message to JSON. Automatically splits messages larger than 3MB into 300KB chunks.

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `TSdServiceMessage` | Message to encode |

**Returns:** `{ json: string; chunks: string[] }` -- the full JSON and the split chunks.

**Throws:** `Error` if the message exceeds 100MB.

#### `decode(json)`

```typescript
decode(json: string): ISdServiceProtocolDecodeResult
```

Decodes a JSON string. Automatically reassembles split messages using an internal accumulator.

| Parameter | Type | Description |
|-----------|------|-------------|
| `json` | `string` | JSON string to decode |

**Returns:** `ISdServiceProtocolDecodeResult` -- either a complete message or an accumulating progress status.

#### `dispose()`

```typescript
dispose(): void
```

Clears the GC timer and accumulated message fragments.

### Internal Details

- **Split threshold:** 3MB (`_SPLIT_MESSAGE_SIZE`)
- **Chunk size:** 300KB (`_CHUNK_SIZE`)
- **Max total size:** 100MB (`_MAX_TOTAL_SIZE`)
- **GC interval:** 10 seconds, removes fragments older than 60 seconds

---

## ISdServiceProtocolDecodeResult

**@deprecated**

```typescript
type ISdServiceProtocolDecodeResult =
  | { type: "complete"; message: TSdServiceMessage }
  | { type: "accumulating"; uuid: string; completedSize: number; totalSize: number };
```

Union type for decode results. `"complete"` means the full message is available. `"accumulating"` means more chunks are needed.

---

## SdServiceSocketV1

**@deprecated**

V1 WebSocket wrapper for a single client connection. Extends `EventEmitter`. Uses JSON-based `SdServiceProtocolV1` for encoding/decoding.

### Constructor

```typescript
constructor(private readonly _socket: WebSocket)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_socket` | `WebSocket` | Raw WebSocket instance |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `connectedAtDateTime` | `DateTime` | Timestamp when the connection was established |

### Methods

#### `getClientIdAsync()`

```typescript
async getClientIdAsync(): Promise<string>
```

Requests a client ID from the connected client via the `"client-get-id"` handshake protocol.

#### `close()`

```typescript
close(): void
```

Forcefully terminates the WebSocket connection.

#### `send(msg)`

```typescript
send(msg: TSdServiceS2CMessage): number
```

Encodes and sends a server-to-client message. Returns 0 if the socket is not open.

| Parameter | Type | Description |
|-----------|------|-------------|
| `msg` | `TSdServiceS2CMessage` | Message to send |

**Returns:** `number` -- total bytes sent.

#### `addEventListener(key, eventName, info)`

```typescript
addEventListener(key: string, eventName: string, info: any): void
```

Registers an event listener.

#### `removeEventListener(key)`

```typescript
removeEventListener(key: string): void
```

Removes an event listener by key.

#### `getEventListners(eventName)`

```typescript
getEventListners(eventName: string): { key: string; info: any }[]
```

Returns all event listeners for the given event name.

#### `emitByKeys(targetKeys, data)`

```typescript
emitByKeys(targetKeys: string[], data: any): void
```

Sends event data to listeners matching the given keys.

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetKeys` | `string[]` | Target listener keys |
| `data` | `any` | Event data |

### Events

| Event | Listener Signature | Description |
|-------|-------------------|-------------|
| `"close"` | `(code: number) => void` | Fired when the connection closes |
| `"request"` | `(req: ISdServiceRequest) => void` | Fired when a complete request is received |

---

## SdWebSocketHandlerV1

**@deprecated**

V1 WebSocket connection handler. Manages all v1 client connections, routes requests to `SdServiceExecutor`, and handles event broadcasting.

### Constructor

```typescript
constructor(private readonly _executor: SdServiceExecutor)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_executor` | `SdServiceExecutor` | Service method executor |

### Methods

#### `addSocket(socket, remoteAddress)`

```typescript
async addSocket(socket: WebSocket, remoteAddress: string | undefined): Promise<void>
```

Registers a new v1 WebSocket connection. Performs client ID handshake.

| Parameter | Type | Description |
|-----------|------|-------------|
| `socket` | `WebSocket` | Raw WebSocket instance |
| `remoteAddress` | `string \| undefined` | Client's IP address |

#### `closeAll()`

```typescript
closeAll(): void
```

Forcefully terminates all v1 WebSocket connections.

#### `broadcastReload(clientName, changedFileSet)`

```typescript
broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): void
```

Sends a reload command to all connected v1 clients.

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientName` | `string \| undefined` | Target client name |
| `changedFileSet` | `Set<string>` | Changed file paths |

#### `emit(eventType, infoSelector, data)`

```typescript
emit<T extends SdServiceEventListenerBase<any, any>>(
  eventType: Type<T>,
  infoSelector: (item: T["info"]) => boolean,
  data: T["data"],
): void
```

Emits an event to all matching v1 listeners.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventType` | `Type<T>` | Event listener class |
| `infoSelector` | `(item: T["info"]) => boolean` | Filter function |
| `data` | `T["data"]` | Event payload |

### Supported Commands

| Command | Description |
|---------|-------------|
| `"ServiceName.methodName"` | RPC service method call |
| `"addEventListener"` | Register event listener |
| `"removeEventListener"` | Remove event listener |
| `"getEventListenerInfos"` | Query listeners for an event |
| `"emitEvent"` | Emit event to target keys |
