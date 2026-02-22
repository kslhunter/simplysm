# Transport Layer

## WebSocketHandler

`WebSocketHandler` is an interface that manages multiple WebSocket connections, routes messages to services, and handles event broadcasting. Create an instance with `createWebSocketHandler`.

**Methods:**

| Method | Returns | Description |
|--------|---------|------|
| `addSocket(socket, clientId, clientName, connReq)` | `void` | Add a new WebSocket connection. If a connection with the same `clientId` already exists, it is closed first |
| `closeAll()` | `void` | Close all active connections |
| `broadcastReload(clientName, changedFileSet)` | `Promise<void>` | Send a reload message to all connected clients |
| `emitToServer(eventDef, infoSelector, data)` | `Promise<void>` | Emit an event to clients whose registered event listeners match the `infoSelector` |

`WebSocketHandler` is created and managed internally by `ServiceServer`. Access its functionality through `ServiceServer` methods (`emitEvent`, `broadcastReload`).

### createWebSocketHandler

Factory function that creates a `WebSocketHandler` instance.

```typescript
import { createWebSocketHandler } from "@simplysm/service-server";

const handler = createWebSocketHandler(runMethod, jwtSecret);
```

| Parameter | Type | Description |
|-----------|------|------|
| `runMethod` | `(def: { serviceName: string; methodName: string; params: unknown[]; socket?: ServiceSocket }) => Promise<unknown>` | Function to execute service method calls |
| `jwtSecret` | `string \| undefined` | JWT secret for authentication (`undefined` disables auth) |

**Returns:** `WebSocketHandler`

## ServiceSocket

`ServiceSocket` is an interface wrapping a single WebSocket connection. It is available in service methods as `ctx.socket` when the request comes via WebSocket. Create an instance with `createServiceSocket`.

**Properties:**

| Property | Type | Description |
|----------|------|------|
| `clientName` | `string` | Client app name (from WebSocket query parameter) |
| `connectedAtDateTime` | `DateTime` | Connection timestamp |
| `authTokenPayload` | `AuthTokenPayload \| undefined` | Authenticated token payload (set after `auth` message) |
| `connReq` | `FastifyRequest` | Original Fastify request that initiated the WebSocket upgrade |

**Methods:**

| Method | Returns | Description |
|--------|---------|------|
| `send(uuid, msg)` | `Promise<number>` | Send a message to this client. Returns total bytes sent |
| `close()` | `void` | Terminate the WebSocket connection |
| `addEventListener(key, eventName, info)` | `void` | Register an event listener for this socket |
| `removeEventListener(key)` | `void` | Remove an event listener by key |
| `getEventListeners(eventName)` | `{ key, info }[]` | Get all event listeners for a given event name |
| `filterEventTargetKeys(targetKeys)` | `string[]` | Filter the given keys to only those registered on this socket |
| `on(event, handler)` | `void` | Register an event handler (`error`, `close`, or `message`) |

**Events:**

| Event | Payload | Description |
|-------|---------|------|
| `error` | `Error` | WebSocket error occurred |
| `close` | `number` | Connection closed (payload is the close code) |
| `message` | `{ uuid: string; msg: ServiceClientMessage }` | Decoded message received from client |

### createServiceSocket

Factory function that creates a `ServiceSocket` instance wrapping a raw WebSocket.

```typescript
import { createServiceSocket } from "@simplysm/service-server";

const serviceSocket = createServiceSocket(socket, clientId, clientName, connReq);
```

| Parameter | Type | Description |
|-----------|------|------|
| `socket` | `WebSocket` | Raw WebSocket connection |
| `clientId` | `string` | Unique client identifier |
| `clientName` | `string` | Client app name |
| `connReq` | `FastifyRequest` | Original Fastify request that initiated the WebSocket upgrade |

**Returns:** `ServiceSocket`

## HTTP API Call

Service methods can also be called via HTTP through the `/api/:service/:method` path.

**GET Request:**

```
GET /api/MyService/hello?json=["World"]
Header: x-sd-client-name: my-app
Header: Authorization: Bearer <token>  (optional)
```

**POST Request:**

```
POST /api/MyService/hello
Header: Content-Type: application/json
Header: x-sd-client-name: my-app
Header: Authorization: Bearer <token>  (optional)
Body: ["World"]
```

- The `x-sd-client-name` header is required.
- Parameters are passed in array form (in the order of method arguments).
- For GET requests, pass a JSON-serialized array in the `json` query parameter.

### handleHttpRequest

The internal handler function registered at `/api/:service/:method`. Exported for advanced use cases.

```typescript
import { handleHttpRequest } from "@simplysm/service-server";

await handleHttpRequest(req, reply, jwtSecret, runMethod);
```

| Parameter | Type | Description |
|-----------|------|------|
| `req` | `FastifyRequest` | Fastify request object |
| `reply` | `FastifyReply` | Fastify reply object |
| `jwtSecret` | `string \| undefined` | JWT secret for authentication |
| `runMethod` | `(def: { serviceName: string; methodName: string; params: unknown[]; http: { clientName: string; authTokenPayload?: AuthTokenPayload } }) => Promise<unknown>` | Function to execute service method calls |

## File Upload

Upload files via multipart request to the `/upload` endpoint. Auth token is required.

```typescript
// Client-side example
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

// Response: ServiceUploadResult[]
const results = await response.json();
// [{ path: "uploads/uuid.ext", filename: "original-filename.ext", size: 12345 }]
```

Uploaded files are stored in the `rootPath/www/uploads/` directory with UUID-based filenames.

### handleUpload

The internal handler function registered at `/upload`. Exported for advanced use cases.

```typescript
import { handleUpload } from "@simplysm/service-server";

await handleUpload(req, reply, rootPath, jwtSecret);
```

| Parameter | Type | Description |
|-----------|------|------|
| `req` | `FastifyRequest` | Fastify request object (must be multipart) |
| `reply` | `FastifyReply` | Fastify reply object |
| `rootPath` | `string` | Server root path (files stored under `rootPath/www/uploads/`) |
| `jwtSecret` | `string \| undefined` | JWT secret for authentication |

### handleStaticFile

The internal handler function for static file serving. Exported for advanced use cases.

```typescript
import { handleStaticFile } from "@simplysm/service-server";

await handleStaticFile(req, reply, rootPath, urlPath);
```

| Parameter | Type | Description |
|-----------|------|------|
| `req` | `FastifyRequest` | Fastify request object |
| `reply` | `FastifyReply` | Fastify reply object |
| `rootPath` | `string` | Server root path (serves files from `rootPath/www/`) |
| `urlPath` | `string` | URL path relative to the root |

Security behavior:
- Blocks path traversal (`..`, outside `rootPath/www/`)
- Returns 403 for files starting with `.` (hidden files)
- Redirects directory paths without trailing slash to path with trailing slash

## Real-time Event Publishing

Publish events to connected clients from the server using `defineEvent` from `@simplysm/service-common`.

```typescript
import { createServiceServer } from "@simplysm/service-server";
import { defineEvent } from "@simplysm/service-common";

// Event definition
const OrderUpdatedEvent = defineEvent<
  { orderId: number },
  { status: string }
>("OrderUpdatedEvent");

// Publish event from server
await server.emitEvent(
  OrderUpdatedEvent,
  (info) => info.orderId === 123,    // Target filter
  { status: "completed" },           // Data to send
);

// Send reload command to all clients
await server.broadcastReload("my-app", new Set(["main.js"]));
```

## ProtocolWrapper

`ProtocolWrapper` is an interface for encoding/decoding WebSocket messages. Create an instance with `createProtocolWrapper`. Automatically branches between main thread and worker thread based on message size. Uses a shared worker singleton internally.

### createProtocolWrapper

Factory function that creates a `ProtocolWrapper` instance.

**Returns:** `ProtocolWrapper` (no parameters)

```typescript
import { createProtocolWrapper } from "@simplysm/service-server";

const protocol = createProtocolWrapper();

// Encode a message into chunks
const { chunks, totalSize } = await protocol.encode(uuid, message);

// Decode received bytes
const result = await protocol.decode(bytes);

// Clean up
protocol.dispose();
```

| Method | Returns | Description |
|--------|---------|------|
| `encode(uuid, message)` | `Promise<{ chunks: Uint8Array[]; totalSize: number }>` | Encode a message into transmittable chunks |
| `decode(bytes)` | `Promise<ServiceMessageDecodeResult>` | Decode received bytes into a message |
| `dispose()` | `void` | Clean up internal protocol resources |

Worker thread branching:

| Condition | Processing Method |
|------|-----------|
| 30KB or less | Processed directly in main thread |
| Over 30KB | Processed in worker thread (max 4GB memory allocation) |

Messages containing large binary data (Uint8Array) also branch to worker thread regardless of size.

## Legacy: handleV1Connection

Handles V1 protocol WebSocket clients. Only supports the `SdAutoUpdateService.getLastVersion` command. All other requests return an upgrade-required error.

```typescript
import { handleV1Connection, AutoUpdateService } from "@simplysm/service-server";

// Used internally by ServiceServer for WebSocket connections without ver=2 query parameter
handleV1Connection(webSocket, autoUpdateMethods, clientNameSetter);
```

| Parameter | Type | Description |
|-----------|------|------|
| `socket` | `WebSocket` | The raw WebSocket connection |
| `autoUpdateMethods` | `{ getLastVersion: (platform: string) => Promise<any> }` | Auto-update service methods |
| `clientNameSetter` | `((clientName: string \| undefined) => void) \| undefined` | Optional callback to set the client name from the V1 request |
