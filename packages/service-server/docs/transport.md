# Transport

WebSocket and HTTP transport layer for `@simplysm/service-server`.

## WebSocket

### `WebSocketHandler`

Interface for the object that manages all active WebSocket connections. Created internally by `ServiceServer`.

```typescript
import { WebSocketHandler } from "@simplysm/service-server";

interface WebSocketHandler {
  // Register a new WebSocket connection
  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void;

  // Terminate all active connections
  closeAll(): void;

  // Send a reload notification to all connected clients
  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>;

  // Emit a server-side event to matching client listeners
  emit<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
}
```

### `createWebSocketHandler(runMethod, jwtSecret)`

Creates a `WebSocketHandler` instance.

```typescript
import { createWebSocketHandler } from "@simplysm/service-server";

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

---

### `ServiceSocket`

Interface representing a single active WebSocket connection. Handles protocol encoding/decoding, ping/pong keep-alive, and event listener tracking.

```typescript
import { ServiceSocket } from "@simplysm/service-server";

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

### `createServiceSocket(socket, clientId, clientName, connReq)`

Creates a `ServiceSocket` instance for a single WebSocket connection.

```typescript
import { createServiceSocket } from "@simplysm/service-server";

function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket;
```

---

## HTTP

### `handleHttpRequest(req, reply, jwtSecret, runMethod)`

Fastify route handler for `POST /api/:service/:method` and `GET /api/:service/:method`. Parses the request, verifies the JWT if present, and calls `runMethod`.

- GET: parameters are passed as a JSON-serialized `?json=` query string.
- POST: parameters are passed as a JSON array body.
- Requires `x-sd-client-name` header.

```typescript
import { handleHttpRequest } from "@simplysm/service-server";

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

### `handleUpload(req, reply, rootPath, jwtSecret)`

Fastify route handler for `POST /upload`. Accepts multipart file uploads, saves them to `rootPath/www/uploads/`, and returns an array of `ServiceUploadResult`. Requires a valid JWT `Authorization: Bearer <token>` header.

```typescript
import { handleUpload } from "@simplysm/service-server";

async function handleUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  jwtSecret: string | undefined,
): Promise<void>;
```

### `handleStaticFile(req, reply, rootPath, urlPath)`

Fastify route handler for serving static files from `rootPath/www/`. Prevents path traversal attacks and blocks access to hidden files (names starting with `.`). Redirects bare directory URLs to their trailing-slash equivalents.

```typescript
import { handleStaticFile } from "@simplysm/service-server";

async function handleStaticFile(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  urlPath: string,
): Promise<void>;
```

---

## Protocol

### `ServerProtocolWrapper`

Interface for encoding and decoding service messages. Automatically offloads large payloads (over 30 KB or containing `Uint8Array` data) to a worker thread.

```typescript
import { ServerProtocolWrapper } from "@simplysm/service-server";

interface ServerProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
```

### `createServerProtocolWrapper()`

Creates a `ServerProtocolWrapper` instance.

```typescript
import { createServerProtocolWrapper } from "@simplysm/service-server";

function createServerProtocolWrapper(): ServerProtocolWrapper;
```

---

## Legacy

### `handleV1Connection(socket, autoUpdateMethods, clientNameSetter?)`

WebSocket handler for legacy v1 clients. Only `SdAutoUpdateService.getLastVersion` is handled; all other requests receive an `"UPGRADE_REQUIRED"` error response. Used internally by `ServiceServer` when a WebSocket connects without the `ver=2` query parameter.

```typescript
import { handleV1Connection } from "@simplysm/service-server";

function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: { getLastVersion: (platform: string) => Promise<any> },
  clientNameSetter?: (clientName: string | undefined) => void,
): void;
```
