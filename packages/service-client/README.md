# @simplysm/service-client

Simplysm package - Service module (client)

Provides a WebSocket-based service client for communicating with a Simplysm service server. Includes typed RPC calls, file transfer, ORM connectivity, and server-sent event support.

## Installation

```bash
pnpm add @simplysm/service-client
```

## Main Modules

### Transport

#### `ServiceClient`

The primary entry point. Manages the WebSocket connection lifecycle, service calls, authentication, file transfer, and event subscriptions.

Extends `EventEmitter` and emits:

| Event | Payload | Description |
|---|---|---|
| `"state"` | `"connected" \| "closed" \| "reconnecting"` | Connection state changes |
| `"request-progress"` | `ServiceProgressState` | Upload progress |
| `"response-progress"` | `ServiceProgressState` | Download progress |
| `"reload"` | `Set<string>` | Hot-reload notification with changed file paths |

```typescript
import { ServiceClient } from "@simplysm/service-client";

const client = new ServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
  maxReconnectCount: 10,
});

client.on("state", (state) => {
  console.log("Connection state:", state);
});

await client.connect();
```

**Properties**

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Client identifier sent to the server |
| `options` | `ServiceConnectionConfig` | Connection configuration (readonly) |
| `connected` | `boolean` | Whether the WebSocket is currently connected |
| `hostUrl` | `string` | HTTP base URL derived from `options` (e.g. `http://localhost:3000`) |

**Methods**

- `connect(): Promise<void>` — Opens the WebSocket connection.
- `close(): Promise<void>` — Closes the WebSocket connection.
- `auth(token: string): Promise<void>` — Sends an auth token to the server and stores it for automatic re-authentication on reconnect.
- `send(serviceName, methodName, params, progress?): Promise<unknown>` — Sends a raw RPC call. Prefer `getService()` for type safety.
- `getService<TService>(serviceName): RemoteService<TService>` — Returns a typed proxy object where every method of `TService` is wrapped to return a `Promise`.
- `addEventListener(eventDef, info, cb): Promise<string>` — Subscribes to a server event. Returns a listener key.
- `removeEventListener(key): Promise<void>` — Unsubscribes from a server event by key.
- `emitToServer(eventDef, infoSelector, data): Promise<void>` — Triggers a server event for listeners matching `infoSelector`.
- `uploadFile(files): Promise<ServiceUploadResult[]>` — Uploads files to the server. Requires prior `auth()` call.
- `downloadFileBuffer(relPath): Promise<Bytes>` — Downloads a file from the server as a `Uint8Array`.

```typescript
import { ServiceClient } from "@simplysm/service-client";
import type { MyService } from "./my-service";

const client = new ServiceClient("my-app", { host: "localhost", port: 3000 });
await client.connect();
await client.auth("my-token");

const svc = client.getService<MyService>("MyService");
const result = await svc.getData(42);

await client.close();
```

---

#### `createServiceClient`

Factory function that creates a `ServiceClient` instance.

```typescript
import { createServiceClient } from "@simplysm/service-client";

const client = createServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
});
```

---

#### `SocketProvider` (interface)

Low-level WebSocket abstraction. Manages connection, heartbeat, and automatic reconnection.

```typescript
export interface SocketProvider {
  readonly clientName: string;
  readonly connected: boolean;
  on<K extends keyof SocketProviderEvents & string>(type: K, listener: (data: SocketProviderEvents[K]) => void): void;
  off<K extends keyof SocketProviderEvents & string>(type: K, listener: (data: SocketProviderEvents[K]) => void): void;
  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: Bytes): Promise<void>;
}
```

---

#### `SocketProviderEvents` (interface)

Events emitted by a `SocketProvider`.

| Event | Payload |
|---|---|
| `"message"` | `Bytes` — incoming raw bytes |
| `"state"` | `"connected" \| "closed" \| "reconnecting"` |

---

#### `createSocketProvider`

Factory function that creates a `SocketProvider`.

- Sends a ping every 5 seconds and considers the connection lost if no message is received for 30 seconds.
- Retries up to `maxReconnectCount` times on unexpected disconnection with a 3-second delay. Set to `0` to disable reconnection.

```typescript
import { createSocketProvider } from "@simplysm/service-client";

const socket = createSocketProvider("ws://localhost:3000/ws", "my-app", 10);
await socket.connect();
```

| Parameter | Type | Description |
|---|---|---|
| `url` | `string` | WebSocket server URL |
| `clientName` | `string` | Client identifier |
| `maxReconnectCount` | `number` | Maximum number of reconnection attempts |

---

#### `ServiceTransport` (interface)

Handles message framing, chunked encoding/decoding, and request/response correlation on top of a `SocketProvider`.

```typescript
export interface ServiceTransport {
  on<K extends keyof ServiceTransportEvents & string>(type: K, listener: (data: ServiceTransportEvents[K]) => void): void;
  off<K extends keyof ServiceTransportEvents & string>(type: K, listener: (data: ServiceTransportEvents[K]) => void): void;
  send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown>;
}
```

---

#### `ServiceTransportEvents` (interface)

Events emitted by a `ServiceTransport`.

| Event | Payload |
|---|---|
| `"reload"` | `Set<string>` — set of changed file paths |
| `"event"` | `{ keys: string[]; data: unknown }` — server-pushed event |

---

#### `createServiceTransport`

Factory function that creates a `ServiceTransport` from a `SocketProvider` and a `ClientProtocolWrapper`.

```typescript
import { createServiceTransport } from "@simplysm/service-client";

const transport = createServiceTransport(socket, protocolWrapper);
```

---

### Protocol

#### `ClientProtocolWrapper` (interface)

Wraps a `ServiceProtocol` and transparently offloads encode/decode work to a Web Worker for large payloads (threshold: 30 KB), falling back to the main thread when Workers are unavailable.

```typescript
export interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
}
```

---

#### `createClientProtocolWrapper`

Factory function that creates a `ClientProtocolWrapper` from a `ServiceProtocol`.

```typescript
import { createClientProtocolWrapper } from "@simplysm/service-client";
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();
const wrapper = createClientProtocolWrapper(protocol);
```

---

### Features

#### `EventClient` (interface)

Manages typed server-sent event subscriptions. Automatically re-registers all listeners after reconnection.

```typescript
export interface EventClient {
  addListener<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    info: TInfo,
    cb: (data: TData) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emitToServer<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
  reRegisterAll(): Promise<void>;
}
```

**Methods**

- `addListener(eventDef, info, cb)` — Registers a listener. `info` is sent to the server to filter which events this client receives. Returns a unique key.
- `removeListener(key)` — Unregisters a listener by the key returned from `addListener`.
- `emitToServer(eventDef, infoSelector, data)` — Fetches all registered listeners from the server and emits `data` to those where `infoSelector(info)` returns `true`.
- `reRegisterAll()` — Re-registers all listeners with the server (called automatically on reconnect).

---

#### `createEventClient`

Factory function that creates an `EventClient` from a `ServiceTransport`.

```typescript
import { createEventClient } from "@simplysm/service-client";

const eventClient = createEventClient(transport);
```

---

#### `FileClient` (interface)

HTTP-based file download and upload utility.

```typescript
export interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(
    files: File[] | FileList | { name: string; data: BlobPart }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]>;
}
```

**Methods**

- `download(relPath)` — GETs a file from `{hostUrl}{relPath}` and returns its content as a `Uint8Array`.
- `upload(files, authToken)` — POSTs files to `{hostUrl}/upload` using `multipart/form-data`. Accepts browser `File` objects, a `FileList`, or plain `{ name, data }` objects.

---

#### `createFileClient`

Factory function that creates a `FileClient`.

```typescript
import { createFileClient } from "@simplysm/service-client";

const fileClient = createFileClient("http://localhost:3000", "my-app");
```

| Parameter | Type | Description |
|---|---|---|
| `hostUrl` | `string` | HTTP base URL of the server |
| `clientName` | `string` | Sent as the `x-sd-client-name` header |

---

#### `OrmConnectConfig<TDef>` (interface)

Configuration for connecting to a database through the ORM service.

```typescript
export interface OrmConnectConfig<TDef extends DbContextDef<any, any, any>> {
  dbContextDef: TDef;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
```

| Field | Type | Description |
|---|---|---|
| `dbContextDef` | `TDef` | The `DbContextDef` definition object |
| `connOpt` | `DbConnOptions & { configName: string }` | Connection options plus the server-side config name |
| `dbContextOpt` | `{ database, schema }?` | Overrides the database/schema resolved from the server |

---

#### `OrmClientConnector` (interface)

Provides a high-level API for running ORM operations through the service client.

```typescript
export interface OrmClientConnector {
  connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
  connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
}
```

**Methods**

- `connect(config, callback)` — Opens a database connection, begins a transaction, calls `callback`, and commits. Rolls back on error. Foreign key constraint errors are wrapped with a user-friendly message.
- `connectWithoutTransaction(config, callback)` — Opens a database connection without a transaction and calls `callback`.

```typescript
import { createOrmClientConnector } from "@simplysm/service-client";

const orm = createOrmClientConnector(client);

const result = await orm.connect(
  { dbContextDef: MyDbDef, connOpt: { configName: "default" } },
  async (db) => {
    return db.myTable.select().toArray();
  },
);
```

---

#### `createOrmClientConnector`

Factory function that creates an `OrmClientConnector` from a `ServiceClient`.

```typescript
import { createOrmClientConnector } from "@simplysm/service-client";

const orm = createOrmClientConnector(client);
```

---

#### `OrmClientDbContextExecutor`

Class that implements `DbContextExecutor` by delegating all database operations to the server-side `OrmService` over the service transport. Used internally by `createOrmClientConnector` and typically not instantiated directly.

```typescript
import { OrmClientDbContextExecutor } from "@simplysm/service-client";

const executor = new OrmClientDbContextExecutor(client, {
  configName: "default",
  // ...other DbConnOptions
});
```

**Constructor**

```typescript
constructor(client: ServiceClient, opt: DbConnOptions & { configName: string })
```

**Methods** (all implement `DbContextExecutor`)

- `getInfo(): Promise<{ dialect, database?, schema? }>` — Retrieves database connection metadata.
- `connect(): Promise<void>` — Opens a server-side database connection.
- `beginTransaction(isolationLevel?): Promise<void>`
- `commitTransaction(): Promise<void>`
- `rollbackTransaction(): Promise<void>`
- `close(): Promise<void>`
- `executeDefs(defs, options?): Promise<T[][]>` — Executes query definitions.
- `executeParametrized(query, params?): Promise<unknown[][]>` — Executes a parameterized raw query.
- `bulkInsert(tableName, columnDefs, records): Promise<void>` — Performs a bulk insert.

---

## Types

### `ServiceConnectionConfig`

```typescript
import { ServiceConnectionConfig } from "@simplysm/service-client";

export interface ServiceConnectionConfig {
  port: number;
  host: string;
  ssl?: boolean;
  /** Set to 0 to disable reconnect; disconnects immediately */
  maxReconnectCount?: number;
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `host` | `string` | — | Server hostname or IP address |
| `port` | `number` | — | Server port |
| `ssl` | `boolean?` | `false` | Use `wss://` / `https://` when `true` |
| `maxReconnectCount` | `number?` | `10` | Maximum reconnection attempts. Set to `0` to disable. |

---

### `ServiceProgress`

Callbacks for tracking upload and download progress of a single request.

```typescript
import { ServiceProgress } from "@simplysm/service-client";

export interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
}
```

---

### `ServiceProgressState`

Payload passed to `ServiceProgress` callbacks.

```typescript
import { ServiceProgressState } from "@simplysm/service-client";

export interface ServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

| Field | Type | Description |
|---|---|---|
| `uuid` | `string` | Unique request identifier |
| `totalSize` | `number` | Total payload size in bytes |
| `completedSize` | `number` | Bytes transferred so far |

---

### `RemoteService<TService>`

Utility type that wraps all methods of `TService` so their return types become `Promise`. Non-function properties are excluded (`never`). Used as the return type of `ServiceClient.getService()`.

```typescript
import type { RemoteService } from "@simplysm/service-client";

type RemoteMyService = RemoteService<MyService>;
// Every method now returns Promise<ReturnType>
```
