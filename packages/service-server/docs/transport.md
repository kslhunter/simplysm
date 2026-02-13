# Transport Layer

## ServiceSocket

`ServiceSocket` extends `EventEmitter` and wraps an individual WebSocket connection. It is available in service methods as `ctx.socket` when the request comes via WebSocket.

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

**Events:**

| Event | Payload | Description |
|-------|---------|------|
| `error` | `Error` | WebSocket error occurred |
| `close` | `number` | Connection closed (payload is the close code) |
| `message` | `{ uuid: string; msg: ServiceClientMessage }` | Decoded message received from client |

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

Handles encoding/decoding of WebSocket messages. Automatically branches between main thread and worker thread based on message size.

```typescript
import { ProtocolWrapper } from "@simplysm/service-server";

const protocol = new ProtocolWrapper();

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

Messages containing large binary data (Uint8Array) also branch to worker thread.

## Legacy: handleV1Connection

Handles V1 protocol WebSocket clients. Only supports the `SdAutoUpdateService.getLastVersion` command. All other requests return an upgrade-required error.

```typescript
import { handleV1Connection, AutoUpdateService } from "@simplysm/service-server";

// Used internally by ServiceServer for WebSocket connections without ver=2 query parameter
handleV1Connection(webSocket, autoUpdateService);
```
