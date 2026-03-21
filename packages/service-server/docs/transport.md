# Transport

## WebSocket Transport

### `WebSocketHandler`

Manages multiple WebSocket connections, routes messages to services, and handles event broadcasting.

```typescript
interface WebSocketHandler {
  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void;
  closeAll(): void;
  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>;
  emit<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
}
```

### `createWebSocketHandler`

```typescript
function createWebSocketHandler(
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
  }) => Promise<unknown>,
  jwtSecret: string | undefined,
): WebSocketHandler;
```

**Behavior:**
- Routes incoming messages to service methods, auth, and event operations
- Manages a map of connected `ServiceSocket` instances by client ID
- Replaces existing connections for the same client ID
- Handles `auth`, `evt:add`, `evt:remove`, `evt:gets`, `evt:emit`, and service method requests

---

### `ServiceSocket`

Manages a single WebSocket connection with protocol encoding/decoding, ping/pong keep-alive, and event listener tracking.

```typescript
interface ServiceSocket {
  readonly connectedAtDateTime: DateTime;
  readonly clientName: string;
  readonly connReq: FastifyRequest;
  authTokenPayload?: AuthTokenPayload;

  close(): void;
  send(uuid: string, msg: ServiceServerMessage): Promise<number>;
  addListener(key: string, eventName: string, info: unknown): void;
  removeListener(key: string): void;
  getEventListeners(eventName: string): Array<{ key: string; info: unknown }>;
  filterEventTargetKeys(targetKeys: string[]): string[];

  on(event: "error", handler: (err: Error) => void): void;
  on(event: "close", handler: (code: number) => void): void;
  on(event: "message", handler: (data: { uuid: string; msg: ServiceClientMessage }) => void): void;
}
```

### `createServiceSocket`

```typescript
function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket;
```

**Behavior:**
- Wraps raw WebSocket with protocol encoding/decoding via `ServerProtocolWrapper`
- Sends ping every 5s; terminates if pong not received
- Handles raw ping/pong packets (`0x01` ping, `0x02` pong)
- Tracks event listeners per socket for event broadcasting
- Sends progress notifications for chunked message reception

---

## HTTP Transport

### `handleHttpRequest`

Handle HTTP API requests (GET/POST) to `/api/:service/:method`.

```typescript
async function handleHttpRequest<TAuthInfo = unknown>(
  req: FastifyRequest,
  reply: FastifyReply,
  jwtSecret: string | undefined,
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    http: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> };
  }) => Promise<unknown>,
): Promise<void>;
```

**Behavior:**
- Requires `x-sd-client-name` header
- GET: reads params from `?json=...` query parameter
- POST: reads params from request body (must be an array)
- Parses `Authorization: Bearer <token>` header if present

### `handleUpload`

Handle multipart file upload to `/upload`.

```typescript
async function handleUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  jwtSecret: string | undefined,
): Promise<void>;
```

**Behavior:**
- Requires authentication (JWT token in Authorization header)
- Saves files to `{rootPath}/www/uploads/` with UUID filenames
- Returns `ServiceUploadResult[]` with path, filename, and size
- Cleans up incomplete files on error

### `handleStaticFile`

Handle static file serving.

```typescript
async function handleStaticFile(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  urlPath: string,
): Promise<void>;
```

**Behavior:**
- Serves files from `{rootPath}/www/`
- Path traversal protection (rejects paths outside allowed root)
- Redirects directories to trailing-slash URLs
- Returns `index.html` for directory requests
- Returns 403 for hidden files (starting with `.`)
- Returns 404 for missing files
