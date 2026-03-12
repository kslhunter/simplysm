# Transport

Handles communication between clients and the server over WebSocket and HTTP.

## WebSocket

### `WebSocketHandler`

Manages multiple WebSocket connections, routes messages to services, and handles event broadcasting.

```typescript
interface WebSocketHandler {
  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void;
  closeAll(): void;
  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>;
  emit<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, infoSelector: (item: TInfo) => boolean, data: TData): Promise<void>;
}
```

### `createWebSocketHandler(runMethod, jwtSecret): WebSocketHandler`

Creates a WebSocket handler instance. The `runMethod` callback is invoked to execute service methods.

**Message routing:**

| Message Pattern | Action |
|----------------|--------|
| `"ServiceName.methodName"` | Invoke service method |
| `"evt:add"` | Register event listener |
| `"evt:remove"` | Remove event listener |
| `"evt:gets"` | Get all listeners for an event |
| `"evt:emit"` | Emit event to matching clients |
| `"auth"` | Authenticate WebSocket connection via JWT |

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
  on(event: "error" | "close" | "message", handler: Function): void;
}
```

### `createServiceSocket(socket, clientId, clientName, connReq): ServiceSocket`

Creates a service socket instance. Features:

- **Protocol encoding/decoding** via `ServerProtocolWrapper` (with worker thread offloading)
- **Ping/pong keep-alive** every 5 seconds; terminates unresponsive connections
- **Event listener tracking** for pub/sub messaging
- **Progress reporting** for chunked message transfers

---

## HTTP

### `handleHttpRequest<TAuthInfo>(req, reply, jwtSecret, runMethod): Promise<void>`

Handles HTTP API requests on `/api/:service/:method`.

- **GET**: Parameters parsed from `?json=` query parameter
- **POST**: Parameters parsed from JSON request body (must be an array)
- **Auth**: Reads `Authorization: Bearer <token>` header; returns 401 on failure
- **Client name**: Required via `x-sd-client-name` header

### `handleUpload(req, reply, rootPath, jwtSecret): Promise<void>`

Handles multipart file uploads on `/upload`.

- Requires authentication (JWT in `Authorization` header)
- Files saved to `{rootPath}/www/uploads/` with UUID-based filenames
- Returns `ServiceUploadResult[]` with path, original filename, and size
- Cleans up incomplete files on failure

### `handleStaticFile(req, reply, rootPath, urlPath): Promise<void>`

Serves static files from `{rootPath}/www/`.

- Path traversal protection
- Auto-redirects directories to include trailing slash
- Serves `index.html` for directory requests
- Blocks access to hidden files (dotfiles) with 403
- Returns appropriate HTML error pages for 403, 404, 500
