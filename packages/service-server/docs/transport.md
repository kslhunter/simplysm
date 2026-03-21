# Transport

## WebSocket Transport

### `WebSocketHandler`

WebSocket handler interface. Manages multiple WebSocket connections, routes messages to services, and handles event broadcasting.

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

| Method | Description |
|--------|-------------|
| `addSocket()` | Add a new WebSocket connection |
| `closeAll()` | Close all active connections |
| `broadcastReload()` | Broadcast reload message to all clients |
| `emit()` | Emit event to matching clients |

### `createWebSocketHandler`

Create a WebSocket handler instance.

```typescript
function createWebSocketHandler(
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket: ServiceSocket;
  }) => Promise<unknown>,
  jwtSecret?: string,
): WebSocketHandler;
```

### `ServiceSocket`

Service socket interface. Manages a single WebSocket connection with protocol encoding/decoding, ping/pong keep-alive, and event listener tracking.

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

| Property | Type | Description |
|----------|------|-------------|
| `connectedAtDateTime` | `DateTime` | Connection time |
| `clientName` | `string` | Client name |
| `connReq` | `FastifyRequest` | Original Fastify request |
| `authTokenPayload` | `AuthTokenPayload` | Authenticated token payload |

| Method | Description |
|--------|-------------|
| `close()` | Close the WebSocket connection |
| `send()` | Send a message to the client |
| `addListener()` | Register an event listener |
| `removeListener()` | Remove an event listener |
| `getEventListeners()` | Get all listeners for an event name |
| `filterEventTargetKeys()` | Filter target keys that exist in this socket |
| `on()` | Register event handlers (error, close, message) |

### `createServiceSocket`

Create a service socket instance.

```typescript
function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket;
```

## HTTP Transport

### `handleHttpRequest`

Handle HTTP API requests. Routes `POST/GET /api/:service/:method` to service methods.

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

### `handleUpload`

Handle file upload requests. Accepts multipart form data with auth token.

```typescript
async function handleUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  jwtSecret: string | undefined,
): Promise<void>;
```

### `handleStaticFile`

Handle static file serving. Serves files from `www/` directory with security checks (path traversal protection, hidden file blocking).

```typescript
async function handleStaticFile(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  urlPath: string,
): Promise<void>;
```

## Protocol

### `ServerProtocolWrapper`

Server-side protocol wrapper interface. Automatically offloads heavy encoding/decoding to a worker thread (>30KB threshold).

```typescript
interface ServerProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
```

### `createServerProtocolWrapper`

Create a server protocol wrapper instance.

```typescript
function createServerProtocolWrapper(): ServerProtocolWrapper;
```
