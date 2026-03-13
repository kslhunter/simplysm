# Transport

HTTP and WebSocket transport layer handlers.

## HTTP Handlers

### SdHttpRequestHandler

Handles HTTP API requests at `/api/:service/:method`. Supports both GET (query parameter) and POST (JSON body) methods.

```typescript
class SdHttpRequestHandler
```

#### Request Format

- **GET**: `/api/MyService/myMethod?json=["param1","param2"]`
- **POST**: `/api/MyService/myMethod` with JSON body `["param1", "param2"]`

#### Headers

| Header | Required | Description |
|---|---|---|
| `x-sd-client-name` | Yes | Client application name. |
| `Authorization` | No | Bearer token for authenticated endpoints (`Bearer <jwt>`). |

#### Response

Returns the service method's return value as JSON. Returns HTTP 401 if the token is present but invalid.

---

### SdStaticFileHandler

Serves static files from the `{rootPath}/www` directory. Supports path proxying via `pathProxy` configuration.

```typescript
class SdStaticFileHandler
```

#### Behavior

- Resolves files from `{rootPath}/www/{urlPath}`.
- If `pathProxy` is configured, maps matching URL prefixes to alternative directories.
- Directories automatically resolve to `index.html`.
- Hidden files (starting with `.`) return HTTP 403.
- Non-existent files return HTTP 404.
- Path traversal protection in production mode (`NODE_ENV=production`).

---

### SdUploadHandler

Handles multipart file uploads at `/upload`. Requires authentication.

```typescript
class SdUploadHandler
```

#### Behavior

- Accepts multipart/form-data requests.
- Requires a valid `Authorization: Bearer <jwt>` header.
- Saves files to `{rootPath}/www/uploads/` with UUID-based filenames.
- Returns an array of upload results.
- Cleans up incomplete files on error.

#### Response Format

```typescript
interface ISdServiceUploadResult {
  path: string;      // Relative path (e.g., "uploads/abc-123.png")
  filename: string;  // Original filename
  size: number;      // File size in bytes
}
```

---

## WebSocket Handlers

### SdWebSocketHandler

Manages v2 WebSocket connections. Handles service method calls, event subscriptions, and authentication over WebSocket.

```typescript
class SdWebSocketHandler
```

#### Connection

Clients connect via `ws://host/?ver=2&clientId=<id>&clientName=<name>`. Both `clientId` and `clientName` are required for v2 connections.

#### Methods

##### `addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void`

Registers a new WebSocket connection. Closes any previous connection with the same `clientId`.

##### `closeAll(): void`

Terminates all active WebSocket connections.

##### `broadcastReloadAsync(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>`

Sends a reload message to all connected clients.

##### `emitAsync<T>(eventType: Type<T>, infoSelector, data): Promise<void>`

Emits a server-side event to matching subscribed clients.

#### Message Protocol

Client messages (`TSdServiceClientMessage`):

| Message Name | Body | Description |
|---|---|---|
| `"ServiceName.methodName"` | `any[]` (params array) | Invokes a service method. |
| `"evt:add"` | `{ key, name, info }` | Subscribes to an event. |
| `"evt:remove"` | `{ key }` | Unsubscribes from an event. |
| `"evt:gets"` | `{ name }` | Gets all listener infos for an event. |
| `"evt:emit"` | `{ keys, data }` | Emits an event to specific listeners. |
| `"auth"` | `string` (JWT token) | Authenticates the connection. |

Server messages (`TSdServiceServerMessage`):

| Message Name | Body | Description |
|---|---|---|
| `"response"` | `any` | Successful response to a request. |
| `"error"` | `{ name, message, stack, code }` | Error response. |
| `"reload"` | `{ clientName, changedFileSet }` | Hot-reload command. |
| `"evt:on"` | `{ keys, data }` | Event notification. |
| `"progress"` | `{ totalSize, completedSize }` | Transfer progress for large messages. |

---

### SdServiceSocket

Wraps an individual WebSocket connection. Handles message encoding/decoding via `SdServiceProtocolWrapper`, ping/pong health checks, and event listener management.

```typescript
class SdServiceSocket extends EventEmitter
```

#### Properties

| Property | Type | Description |
|---|---|---|
| `clientName` | `string` | The client application name. |
| `connReq` | `FastifyRequest` | The original connection request. |
| `connectedAtDateTime` | `DateTime` | Timestamp of when the connection was established. |
| `authTokenPayload` | `IAuthTokenPayload \| undefined` | Authenticated user's token payload (set after `"auth"` message). |

#### Methods

##### `close(): void`

Terminates the WebSocket connection.

##### `sendAsync(uuid: string, msg: TSdServiceServerMessage): Promise<number>`

Encodes and sends a message. Returns the total bytes sent. Uses protocol chunking for large messages.

##### `addEventListener(key: string, eventName: string, info: any): void`

Registers an event listener for this socket.

##### `removeEventListener(key: string): void`

Removes a registered event listener by key.

##### `getEventListners(eventName: string): { key: string; info: any }[]`

Returns all event listeners registered for the given event name.

##### `filterEventTargetKeys(targetKeys: string[]): string[]`

Filters and returns the keys from the provided list that match registered listeners on this socket.

#### Events

| Event | Callback | Description |
|---|---|---|
| `"close"` | `(code: number) => void` | Emitted when the connection closes. |
| `"message"` | `(uuid: string, message: TSdServiceClientMessage) => void` | Emitted when a complete decoded message is received. |

#### Ping/Pong

The socket sends a WebSocket ping every 5 seconds. If no pong is received before the next ping interval, the connection is terminated. Application-level ping (byte `0x01`) is also supported, with an immediate pong response (byte `0x02`).
