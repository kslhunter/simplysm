# @simplysm/service-client

A service client package for the Simplysm framework. Provides WebSocket communication with `@simplysm/service-server`, remote service invocation (RPC), event subscription, file upload/download, and ORM remote access.

Works in both browser and Node.js environments, with built-in features like automatic message chunking/merging for large payloads, heartbeat-based connection monitoring, and automatic reconnection.

## Installation

```bash
npm install @simplysm/service-client
# or
pnpm add @simplysm/service-client
```

## Main Modules

### Core Functions and Classes

| Function/Class | Description |
|--------|------|
| `createServiceClient` | Factory function for creating a ServiceClient instance. **Recommended over using the class constructor directly.** |
| `ServiceClient` | Main service client class. Provides integrated connection management, RPC calls, events, files, and authentication. |
| `createServiceTransport` | Factory function for creating a ServiceTransport instance |
| `ServiceTransport` | Message transport layer. Handles request/response matching, progress tracking, and protocol encoding/decoding. |
| `createSocketProvider` | Factory function for creating a SocketProvider instance |
| `SocketProvider` | WebSocket connection management. Handles heartbeat, auto-reconnection, and connection state events. |
| `createClientProtocolWrapper` | Factory function for creating a ClientProtocolWrapper instance |
| `ClientProtocolWrapper` | Protocol wrapper. Automatically selects main thread/Web Worker for encoding/decoding based on data size. |

### Feature Functions and Classes

| Function/Class | Description |
|--------|------|
| `createEventClient` | Factory function for creating an EventClient instance |
| `EventClient` | Server event subscription/publishing. Supports automatic listener recovery on reconnection. |
| `createFileClient` | Factory function for creating a FileClient instance |
| `FileClient` | Handles HTTP-based file upload/download. |
| `createOrmClientConnector` | Factory function for creating an OrmClientConnector instance |
| `OrmClientConnector` | ORM remote connection connector. Supports transaction/non-transaction connections. |
| `OrmClientDbContextExecutor` | ORM DbContext remote executor. Calls server's `OrmService` via RPC. |

### Types/Interfaces

| Type | Description |
|------|------|
| `ServiceConnectionConfig` | Server connection config (host, port, ssl, maxReconnectCount) |
| `ServiceProgress` | Request/response progress callback |
| `ServiceProgressState` | Progress state (uuid, totalSize, completedSize) |
| `OrmConnectConfig<T>` | ORM connection config (DbContext type, connection options, DB/schema override) |
| `RemoteService<T>` | Utility type that wraps all method return types of a service interface with `Promise` |

## Usage

### Basic Connection and Service Call

```typescript
import { createServiceClient } from "@simplysm/service-client";

// Create client (recommended: use factory function)
const client = createServiceClient("my-app", {
  host: "localhost",
  port: 8080,
  ssl: false,
  maxReconnectCount: 10, // Max reconnection attempts (default: 10, 0 means no reconnection)
});

// Connect to server
await client.connect();

// Check connection status
console.log(client.connected); // true
console.log(client.hostUrl);   // "http://localhost:8080"

// Direct RPC call
const result = await client.send("MyService", "getUsers", [{ page: 1 }]);

// Close connection
await client.close();
```

### Type-Safe Service Call (getService)

`getService<T>()` uses `Proxy` to provide type-safe remote calls to service interfaces.

```typescript
// Server-side service definition
import { defineService } from "@simplysm/service-server";

export const UserService = defineService("UserService", (ctx) => ({
  getUsers: async (filter: { page: number }): Promise<User[]> => {
    // ...
  },
  createUser: async (data: CreateUserDto): Promise<number> => {
    // ...
  },
  deleteUser: async (id: number): Promise<void> => {
    // ...
  },
}));

// Export type for client-side usage
export type UserServiceMethods = import("@simplysm/service-server").ServiceMethods<typeof UserService>;

// Client-side usage
import type { UserServiceMethods } from "./server/services/user-service";

const userService = client.getService<UserServiceMethods>("UserService");

// Parameter/return types are automatically inferred on method calls
const users = await userService.getUsers({ page: 1 }); // users: User[]
const newId = await userService.createUser({ name: "test" }); // newId: number
```

`ServiceMethods<T>` extracts method types from a service definition. `RemoteService<T>` wraps all method return types with `Promise` (methods already returning `Promise` are not double-wrapped).

### Authentication

```typescript
// Send auth token after server connection
await client.connect();
await client.auth("jwt-token-here");

// Automatically re-authenticated on reconnection
```

Tokens stored after `auth()` calls are automatically resent to the server on WebSocket reconnection.

### Connection State Monitoring

`ServiceClient` extends `EventEmitter` and supports the following events.

| Event | Type | Description |
|--------|------|------|
| `state` | `"connected" \| "closed" \| "reconnecting"` | Connection state change |
| `request-progress` | `ServiceProgressState` | Request transmission progress |
| `response-progress` | `ServiceProgressState` | Response reception progress |
| `reload` | `Set<string>` | File change notification from server (dev mode HMR) |

```typescript
// Monitor connection state changes
client.on("state", (state) => {
  if (state === "connected") {
    console.log("Connected to server");
  } else if (state === "reconnecting") {
    console.log("Reconnection in progress...");
  } else if (state === "closed") {
    console.log("Connection closed");
  }
});

// Monitor request/response progress (large messages)
client.on("request-progress", (state) => {
  const percent = Math.round((state.completedSize / state.totalSize) * 100);
  console.log(`Sending: ${percent}%`);
});

client.on("response-progress", (state) => {
  const percent = Math.round((state.completedSize / state.totalSize) * 100);
  console.log(`Receiving: ${percent}%`);
});
```

### Individual Request Progress Tracking

Track progress of individual requests with the `progress` parameter of the `send()` method.

```typescript
const result = await client.send("DataService", "getLargeData", [query], {
  request: (state) => {
    console.log(`Request sending: ${state.completedSize}/${state.totalSize} bytes`);
  },
  response: (state) => {
    console.log(`Response receiving: ${state.completedSize}/${state.totalSize} bytes`);
  },
});
```

### Event Subscription (Server -> Client)

Subscribe to events from the server, and listeners are automatically recovered on reconnection.

```typescript
import { defineEvent } from "@simplysm/service-common";

// Event definition (shared between server/client)
export const SharedDataChangeEvent = defineEvent<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>("SharedDataChangeEvent");

// Subscribe to event
const listenerKey = await client.addEventListener(
  SharedDataChangeEvent,
  { name: "users", filter: null },
  async (data) => {
    console.log("Data changed:", data);
  },
);

// Unsubscribe from event
await client.removeEventListener(listenerKey);
```

### Event Publishing (Client -> Server -> Other Clients)

```typescript
import { defineEvent } from "@simplysm/service-common";

export const SharedDataChangeEvent = defineEvent<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>("SharedDataChangeEvent");

// Publish event to listeners matching specific conditions
await client.emitToServer(
  SharedDataChangeEvent,
  (info) => info.name === "users", // Target filter
  [1, 2, 3],                       // Data to send
);
```

The server finds listeners matching the `infoSelector` condition in the registered listener list and delivers the event.

### File Upload

File upload is handled via HTTP POST requests and requires an authentication token.

```typescript
// Authentication required
await client.auth("jwt-token");

// Upload with browser File object
const fileInput = document.querySelector("input[type=file]") as HTMLInputElement;
const results = await client.uploadFile(fileInput.files!);

// Upload with custom data
const results = await client.uploadFile([
  { name: "data.json", data: JSON.stringify({ key: "value" }) },
  { name: "image.png", data: imageBlob },
]);

// Upload results
for (const result of results) {
  console.log(result.path);     // Server storage path
  console.log(result.filename); // Original filename
  console.log(result.size);     // File size (bytes)
}
```

### File Download

```typescript
// Download file from server's relative path
const buffer = await client.downloadFileBuffer("/uploads/2024/file.pdf");
// buffer: Uint8Array
```

### ORM Remote Access

Access the database through the server's ORM service. Transactions are automatically managed.

```typescript
import { createOrmClientConnector } from "@simplysm/service-client";
import type { OrmConnectConfig } from "@simplysm/service-client";
import { DbContext } from "@simplysm/orm-common";

const connector = createOrmClientConnector(client);

// Connect with transaction (auto rollback on error)
await connector.connect(
  {
    dbContextType: MyDbContext,
    connOpt: { configName: "default" },
    dbContextOpt: { database: "mydb", schema: "dbo" }, // Optional
  },
  async (db) => {
    const users = await db.user().result();
    await db.user().insert([{ name: "test" }]);
    // Auto commit on callback success
  },
);

// Connect without transaction (suitable for read-only operations)
await connector.connectWithoutTransaction(
  {
    dbContextType: MyDbContext,
    connOpt: { configName: "default" },
  },
  async (db) => {
    const users = await db.user().result();
    return users;
  },
);
```

## Detailed API

### ServiceConnectionConfig

Server connection configuration interface.

| Property | Type | Required | Description |
|------|------|------|------|
| `host` | `string` | Yes | Server host address |
| `port` | `number` | Yes | Server port number |
| `ssl` | `boolean` | No | SSL usage. If `true`, uses `wss://` / `https://` |
| `maxReconnectCount` | `number` | No | Max reconnection attempts (default: 10). 0 means no reconnection |

### createServiceClient

Factory function for creating a ServiceClient instance.

```typescript
function createServiceClient(name: string, options: ServiceConnectionConfig): ServiceClient
```

**Parameters:**
- `name` - Client identifier (used for server-side logging and connection management)
- `options` - Server connection configuration

**Returns:** ServiceClient instance

**Example:**
```typescript
const client = createServiceClient("my-app", {
  host: "localhost",
  port: 8080,
  ssl: false,
});
```

### ServiceClient

| Method/Property | Return Type | Description |
|-------------|----------|------|
| `constructor(name, options)` | - | Create client instance. `name` is the client identifier. **Note: Prefer using `createServiceClient()` factory function.** |
| `connected` | `boolean` | WebSocket connection status |
| `hostUrl` | `string` | HTTP URL (e.g., `http://localhost:8080`) |
| `connect()` | `Promise<void>` | Connect to server via WebSocket |
| `close()` | `Promise<void>` | Close connection (Graceful Shutdown) |
| `send(serviceName, methodName, params, progress?)` | `Promise<unknown>` | Remote call to service method |
| `getService<T>(serviceName)` | `RemoteService<T>` | Create type-safe service proxy |
| `auth(token)` | `Promise<void>` | Send auth token (auto re-auth on reconnection) |
| `addEventListener(eventType, info, cb)` | `Promise<string>` | Register event listener. Returns listener key |
| `removeEventListener(key)` | `Promise<void>` | Remove event listener |
| `emitToServer(eventType, infoSelector, data)` | `Promise<void>` | Publish event to other clients through server |
| `uploadFile(files)` | `Promise<ServiceUploadResult[]>` | File upload (auth required) |
| `downloadFileBuffer(relPath)` | `Promise<Uint8Array>` | File download |

### ServiceProgress / ServiceProgressState

Interfaces for tracking progress of large message transmissions.

```typescript
interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;   // Request transmission progress
  response?: (s: ServiceProgressState) => void;  // Response reception progress
}

interface ServiceProgressState {
  uuid: string;          // Request unique identifier
  totalSize: number;     // Total size (bytes)
  completedSize: number; // Completed size (bytes)
}
```

### OrmConnectConfig\<T\>

ORM remote connection configuration interface.

| Property | Type | Required | Description |
|------|------|------|------|
| `dbContextType` | `Type<T>` | Yes | DbContext class |
| `connOpt` | `DbConnOptions & { configName: string }` | Yes | DB connection options. `configName` identifies the server-side DB config; `config` can pass additional connection settings |
| `dbContextOpt` | `{ database: string; schema: string }` | No | Database/schema override |

### SocketProvider

Handles low-level management of WebSocket connections. Not typically used directly, but indirectly through `ServiceClient`.

| Constant | Value | Description |
|------|-----|------|
| Heartbeat Timeout | 30s | Connection considered disconnected if no messages for this duration |
| Heartbeat Interval | 5s | Ping transmission interval |
| Reconnect Delay | 3s | Reconnection attempt interval |

### ClientProtocolWrapper

Handles message encoding/decoding. In browser environments, data exceeding 30KB is automatically processed in a Web Worker to prevent main thread blocking.

| Threshold | Condition |
|--------|------|
| 30KB or less | Processed directly in main thread |
| Over 30KB | Delegated to Web Worker (browser environments only) |

Worker delegation conditions (during encoding):
- `Uint8Array` data
- Strings exceeding 30KB
- Arrays exceeding 100 elements or arrays containing `Uint8Array`

## Architecture

```
ServiceClient (integrated entry point)
  |
  +-- SocketProvider (WebSocket connection management)
  |     +-- Heartbeat (Ping/Pong)
  |     +-- Auto reconnection
  |
  +-- ServiceTransport (message send/receive)
  |     +-- ClientProtocolWrapper (encoding/decoding)
  |     |     +-- ServiceProtocol (main thread)
  |     |     +-- Web Worker (large data)
  |     +-- Request/response matching (UUID-based)
  |     +-- Progress tracking
  |
  +-- EventClient (event subscription/publishing)
  |     +-- Listener management (registration/removal)
  |     +-- Auto recovery on reconnection
  |
  +-- FileClient (HTTP file transfer)
        +-- Upload (FormData, POST)
        +-- Download (GET)
```

## Caveats

- **Auth Required**: You must authenticate with `auth()` before calling `uploadFile()`. An error occurs if not authenticated.
- **Connection State Check**: `addEventListener()` can only be called when connected to the server. An error occurs if not connected.
- **Auto Reconnection**: If the connection is lost, automatic reconnection is attempted up to `maxReconnectCount` times at 3-second intervals. On successful reconnection, auth tokens and event listeners are automatically recovered.
- **Large Messages**: Large messages are automatically split/merged by `ServiceProtocol` from `@simplysm/service-common`. Progress can be tracked via `ServiceProgress` callbacks or `ServiceClient` events.
- **Web Worker**: In browser environments, encoding/decoding of data exceeding 30KB is automatically handled in a Web Worker. In Node.js environments, it's always processed in the main thread.
- **Foreign Key Error Conversion**: ORM connection errors due to foreign key constraint violations are automatically converted to user-friendly messages.

## License

Apache-2.0
