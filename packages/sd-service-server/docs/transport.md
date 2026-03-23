# Transport

## SdHttpRequestHandler

Handles HTTP API requests routed to `/api/:service/:method`. Extracts service/method from URL params, parses request body or query parameters, verifies JWT tokens, and delegates execution to `SdServiceExecutor`.

### Constructor

```typescript
constructor(
  private readonly _server: SdServiceServer,
  private readonly _executor: SdServiceExecutor,
  private readonly _jwt: SdServiceJwtManager,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_server` | `SdServiceServer` | Server instance |
| `_executor` | `SdServiceExecutor` | Service method executor |
| `_jwt` | `SdServiceJwtManager` | JWT verification manager |

### Methods

#### `handleAsync(req, reply)`

```typescript
async handleAsync(req: FastifyRequest, reply: FastifyReply): Promise<void>
```

Processes an incoming HTTP API request.

| Parameter | Type | Description |
|-----------|------|-------------|
| `req` | `FastifyRequest` | Fastify request object |
| `reply` | `FastifyReply` | Fastify reply object |

**Request format:**
- **GET:** Parameters in `?json=<JSON-encoded array>` query param
- **POST:** Parameters as a JSON array in the request body
- **Header `x-sd-client-name`:** Required client name
- **Header `Authorization`:** Optional `Bearer <token>` for authentication

**Responses:** Returns the service method result as JSON, or 401 for invalid tokens, 400 for malformed requests.

---

## SdStaticFileHandler

Serves static files from the server's `www` directory with support for path proxies, directory index resolution, and security checks.

### Constructor

```typescript
constructor(private readonly _server: SdServiceServer)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_server` | `SdServiceServer` | Server instance |

### Methods

#### `handleAsync(req, reply, urlPath)`

```typescript
async handleAsync(
  req: FastifyRequest,
  reply: FastifyReply,
  urlPath: string,
): Promise<void>
```

Serves a static file for the given URL path.

| Parameter | Type | Description |
|-----------|------|-------------|
| `req` | `FastifyRequest` | Fastify request object |
| `reply` | `FastifyReply` | Fastify reply object |
| `urlPath` | `string` | Decoded URL path (without leading `/`) |

**Behavior:**
- Resolves `pathProxy` if the URL matches a configured prefix
- Blocks path traversal in production (`../` detection)
- Resolves directories to `index.html`
- Returns 403 for hidden files (starting with `.`)
- Returns 404 for missing files
- Uses `@fastify/static` `reply.sendFile()` for efficient delivery

---

## SdUploadHandler

Handles multipart file uploads to the `/upload` endpoint. Requires JWT authentication.

### Constructor

```typescript
constructor(
  private readonly _server: SdServiceServer,
  private readonly _jwt: SdServiceJwtManager,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_server` | `SdServiceServer` | Server instance |
| `_jwt` | `SdServiceJwtManager` | JWT verification manager |

### Methods

#### `handleAsync(req, reply)`

```typescript
async handleAsync(req: FastifyRequest, reply: FastifyReply): Promise<void>
```

Processes a multipart file upload request.

| Parameter | Type | Description |
|-----------|------|-------------|
| `req` | `FastifyRequest` | Fastify request object |
| `reply` | `FastifyReply` | Fastify reply object |

**Behavior:**
- Validates multipart content type
- Verifies JWT from `Authorization: Bearer <token>` header
- Saves each uploaded file to `rootPath/www/uploads/` with a UUID filename
- Returns `ISdServiceUploadResult[]` with `path`, `filename`, and `size` for each file
- Cleans up incomplete files on error
- Returns 400 for non-multipart requests, 401 for missing/invalid tokens, 500 for upload failures

---

## SdServiceSocket

Server-side WebSocket wrapper for a single client connection. Extends `EventEmitter`. Handles ping/pong keep-alive, binary protocol encoding/decoding via `SdServiceProtocolWrapper`, and event listener management.

### Constructor

```typescript
constructor(
  private readonly _socket: WebSocket,
  private readonly _clientId: string,
  public readonly clientName: string,
  public readonly connReq: FastifyRequest,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_socket` | `WebSocket` | Raw WebSocket instance from `ws` |
| `_clientId` | `string` | Unique client identifier |
| `clientName` | `string` | Client application name |
| `connReq` | `FastifyRequest` | Original connection request |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `clientName` | `string` | Client application name |
| `connReq` | `FastifyRequest` | Original Fastify request that initiated the WebSocket |
| `connectedAtDateTime` | `DateTime` | Timestamp when the connection was established |
| `authTokenPayload` | `IAuthTokenPayload \| undefined` | Authenticated user's token payload (set after auth) |

### Methods

#### `close()`

```typescript
close(): void
```

Forcefully terminates the WebSocket connection.

#### `sendAsync(uuid, msg)`

```typescript
async sendAsync(uuid: string, msg: TSdServiceServerMessage): Promise<number>
```

Encodes and sends a server message to the client. Returns 0 if the socket is not open.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uuid` | `string` | Request UUID to correlate with |
| `msg` | `TSdServiceServerMessage` | Message to send |

**Returns:** `Promise<number>` -- total bytes sent.

#### `addEventListener(key, eventName, info)`

```typescript
addEventListener(key: string, eventName: string, info: any): void
```

Registers an event listener for this socket.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Unique listener key |
| `eventName` | `string` | Event type name |
| `info` | `any` | Listener filter info |

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

#### `filterEventTargetKeys(targetKeys)`

```typescript
filterEventTargetKeys(targetKeys: string[]): string[]
```

Filters the given target keys to only those registered on this socket.

### Events

| Event | Listener Signature | Description |
|-------|-------------------|-------------|
| `"close"` | `(code: number) => void` | Fired when the WebSocket connection closes |
| `"message"` | `(uuid: string, message: TSdServiceClientMessage) => void` | Fired when a decoded client message is received |

### Internal Details

- **Ping interval:** 5 seconds -- terminates socket if no pong response
- **Pong packet:** 1-byte `0x02` sent in response to client's 1-byte `0x01` ping
- Disposes `SdServiceProtocolWrapper` on close

---

## SdWebSocketHandler

Manages all v2 WebSocket connections. Handles socket registration, message routing, event broadcasting, and reload notifications.

### Constructor

```typescript
constructor(
  private readonly _executor: SdServiceExecutor,
  private readonly _jwt: SdServiceJwtManager,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_executor` | `SdServiceExecutor` | Service method executor |
| `_jwt` | `SdServiceJwtManager` | JWT verification manager |

### Methods

#### `addSocket(socket, clientId, clientName, connReq)`

```typescript
addSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): void
```

Registers a new WebSocket connection. Disconnects any previous connection with the same `clientId`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `socket` | `WebSocket` | Raw WebSocket instance |
| `clientId` | `string` | Unique client identifier |
| `clientName` | `string` | Client application name |
| `connReq` | `FastifyRequest` | Original connection request |

#### `closeAll()`

```typescript
closeAll(): void
```

Forcefully terminates all connected WebSocket clients.

#### `broadcastReloadAsync(clientName, changedFileSet)`

```typescript
async broadcastReloadAsync(
  clientName: string | undefined,
  changedFileSet: Set<string>,
): Promise<void>
```

Sends a reload notification to all connected clients.

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientName` | `string \| undefined` | Target client name |
| `changedFileSet` | `Set<string>` | Changed file paths |

#### `emitAsync(eventType, infoSelector, data)`

```typescript
async emitAsync<T extends SdServiceEventListenerBase<any, any>>(
  eventType: Type<T>,
  infoSelector: (item: T["info"]) => boolean,
  data: T["data"],
): Promise<void>
```

Emits an event to all matching listeners across all connected sockets.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventType` | `Type<T>` | Event listener class |
| `infoSelector` | `(item: T["info"]) => boolean` | Filter function |
| `data` | `T["data"]` | Event payload |

### Supported Message Types

| Message Name | Description |
|-------------|-------------|
| `"{Service}.{method}"` | RPC service method call |
| `"evt:add"` | Register event listener |
| `"evt:remove"` | Remove event listener |
| `"evt:gets"` | Query all listeners for an event type |
| `"evt:emit"` | Emit event to target listener keys |
| `"auth"` | Authenticate with JWT token |
