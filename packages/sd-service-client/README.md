# @simplysm/sd-service-client

WebSocket-based service client for communicating with `@simplysm/sd-service-server`. Provides RPC-style method calls, server-sent event subscriptions, file upload/download, and ORM database access -- all over a single persistent WebSocket connection with automatic reconnection and heartbeat monitoring.

## Installation

```bash
npm install @simplysm/sd-service-client
```

**Peer dependencies:** `@simplysm/sd-core-common`, `@simplysm/sd-orm-common`, `@simplysm/sd-service-common`

## Quick Start

```ts
import { SdServiceClient } from "@simplysm/sd-service-client";

const client = new SdServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
});

// Connect to the server
await client.connectAsync();

// Call a remote service method
const result = await client.sendAsync("MyService", "getItems", [{ page: 1 }]);

// Close connection
await client.closeAsync();
```

## API Reference

### SdServiceClient

The main entry point. Extends `EventEmitter`.

#### Constructor

```ts
new SdServiceClient(name: string, options: ISdServiceConnectionConfig)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Client application name (sent to the server on connection) |
| `options` | `ISdServiceConnectionConfig` | Connection configuration |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Client name passed to the constructor |
| `options` | `ISdServiceConnectionConfig` | Connection config passed to the constructor |
| `connected` | `boolean` | Whether the WebSocket is currently open |
| `hostUrl` | `string` | Computed HTTP(S) base URL (e.g. `https://localhost:3000`) |

#### Methods

##### `connectAsync(): Promise<void>`

Opens the WebSocket connection to the server. Throws if the initial connection fails.

##### `closeAsync(): Promise<void>`

Gracefully closes the WebSocket connection.

##### `sendAsync(serviceName, methodName, params, progress?): Promise<any>`

Sends an RPC request to a named service method on the server.

| Parameter | Type | Description |
|-----------|------|-------------|
| `serviceName` | `string` | Server-side service class name |
| `methodName` | `string` | Method name to invoke |
| `params` | `any[]` | Positional arguments for the method |
| `progress` | `ISdServiceProgress` | Optional progress callbacks for upload/download tracking |

##### `getService<T>(serviceName): TRemoteService<T>`

Returns a typed proxy object whose method calls are automatically forwarded as RPC requests via `sendAsync`. Every method on the proxy returns a `Promise`.

```ts
interface IMyService {
  getItems(page: number): Item[];
  save(item: Item): void;
}

const myService = client.getService<IMyService>("MyService");
const items = await myService.getItems(1); // typed as Item[]
```

##### `authAsync(token: string): Promise<void>`

Sends an authentication token to the server. The token is persisted internally and automatically re-sent on reconnection. Required before calling `uploadFileAsync`.

##### `addEventListenerAsync<T>(eventType, info, cb): Promise<string>`

Subscribes to a server-sent event. Returns a listener key for later removal.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventType` | `Type<T>` | Event listener class (extends `SdServiceEventListenerBase`) |
| `info` | `T["info"]` | Subscription filter info sent to the server |
| `cb` | `(data: T["data"]) => PromiseLike<void>` | Callback invoked when the event fires |

##### `removeEventListenerAsync(key: string): Promise<void>`

Unsubscribes a previously registered event listener by its key.

##### `emitAsync<T>(eventType, infoSelector, data): Promise<void>`

Emits an event to other connected clients via the server.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventType` | `Type<T>` | Event listener class to target |
| `infoSelector` | `(item: T["info"]) => boolean` | Predicate to filter which listeners receive the event |
| `data` | `T["data"]` | Payload to deliver |

##### `uploadFileAsync(files): Promise<ISdServiceUploadResult[]>`

Uploads files to the server via HTTP POST. Requires prior authentication via `authAsync`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `files` | `File[] \| FileList \| { name: string; data: BlobPart }[]` | Files to upload (browser File objects or custom blobs) |

Returns an array of `ISdServiceUploadResult` with `path`, `filename`, and `size` for each uploaded file.

##### `downloadFileBufferAsync(relPath: string): Promise<Buffer>`

Downloads a file from the server by relative path and returns its contents as a `Buffer`.

#### Events

| Event | Callback Signature | Description |
|-------|-------------------|-------------|
| `"state"` | `(state: "connected" \| "closed" \| "reconnecting") => void` | Fired on connection state changes |
| `"request-progress"` | `(state: ISdServiceProgressState) => void` | Fired during outbound request chunked transfer |
| `"response-progress"` | `(state: ISdServiceProgressState) => void` | Fired during inbound response chunked transfer |
| `"reload"` | `(changedFileSet: Set<string>) => void` | Fired when the server signals a hot-reload |

---

### TRemoteService\<T\>

```ts
type TRemoteService<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
    : never;
};
```

Utility type that wraps all method return types of `T` in `Promise`. Non-function properties become `never`. Used by `SdServiceClient.getService<T>()`.

---

### ISdServiceConnectionConfig

```ts
interface ISdServiceConnectionConfig {
  host: string;
  port: number;
  ssl?: boolean;
  maxReconnectCount?: number; // default 10; set 0 to disable reconnection
}
```

---

### ISdServiceProgress / ISdServiceProgressState

```ts
interface ISdServiceProgress {
  request?: (s: ISdServiceProgressState) => void;
  response?: (s: ISdServiceProgressState) => void;
}

interface ISdServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

Callbacks for tracking chunked message transfer progress.

---

### SdServiceTransport

Low-level message transport layer over `SdSocketProvider`. Encodes/decodes messages using the binary protocol, dispatches responses to waiting callers, and emits `"reload"` / `"event"` signals.

#### Constructor

```ts
new SdServiceTransport(socket: SdSocketProvider)
```

#### Methods

| Method | Description |
|--------|-------------|
| `sendAsync(message, progress?)` | Encodes and sends a `TSdServiceClientMessage`, waits for the server response |

#### Events

| Event | Callback Signature | Description |
|-------|-------------------|-------------|
| `"reload"` | `(changedFileSet: Set<string>) => void` | Server hot-reload notification |
| `"event"` | `(keys: string[], data: any) => void` | Server-sent event dispatched to `SdServiceEventClient` |

---

### SdSocketProvider

WebSocket connection manager with automatic heartbeat and reconnection. Extends `EventEmitter`.

#### Constructor

```ts
new SdSocketProvider(url: string, clientName: string, maxReconnectCount: number)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `connected` | `boolean` | `true` when the WebSocket is in the `OPEN` state |
| `clientName` | `string` | Client name sent as a query parameter on connection |

#### Methods

| Method | Description |
|--------|-------------|
| `connectAsync()` | Opens the WebSocket connection |
| `closeAsync()` | Gracefully closes the connection |
| `sendAsync(data)` | Sends a `Buffer` or `Uint8Array` over the socket (waits up to 5s for connection) |

#### Events

| Event | Callback Signature | Description |
|-------|-------------------|-------------|
| `"message"` | `(data: Buffer) => void` | Received binary message (ping/pong packets are filtered out) |
| `"state"` | `(state: "connected" \| "closed" \| "reconnecting") => void` | Connection state change |

#### Heartbeat & Reconnection

- Sends a 1-byte ping every **5 seconds**
- Considers the connection dead after **30 seconds** of silence
- Retries reconnection every **3 seconds**, up to `maxReconnectCount` attempts (default 10)
- On reconnection, `SdServiceClient` automatically re-authenticates and re-registers event listeners

---

### SdServiceClientProtocolWrapper

Hybrid encoder/decoder that transparently offloads heavy payloads (> 30 KB) to a Web Worker for encoding/decoding, keeping the main thread responsive. Small messages are processed synchronously on the main thread.

#### Methods

| Method | Description |
|--------|-------------|
| `encodeAsync(uuid, message)` | Encodes a service message into chunked buffers |
| `decodeAsync(buffer)` | Decodes a received buffer into a structured message |

---

### SdServiceEventClient

Manages server-sent event subscriptions. Automatically re-registers all listeners on reconnection.

#### Constructor

```ts
new SdServiceEventClient(transport: SdServiceTransport)
```

#### Methods

| Method | Description |
|--------|-------------|
| `addListenerAsync(eventType, info, cb)` | Registers an event listener on the server and returns a unique key |
| `removeListenerAsync(key)` | Unregisters a listener by key |
| `emitAsync(eventType, infoSelector, data)` | Emits an event to matching listeners across all clients |
| `reRegisterAllAsync()` | Re-registers all tracked listeners (called internally on reconnection) |

---

### SdServiceFileClient

HTTP-based file upload and download client.

#### Constructor

```ts
new SdServiceFileClient(hostUrl: string, clientName: string)
```

#### Methods

| Method | Description |
|--------|-------------|
| `uploadAsync(files, authToken)` | Uploads files via `POST /upload` with bearer auth. Returns `ISdServiceUploadResult[]` |
| `downloadAsync(relPath)` | Downloads a file via `GET` and returns a `Buffer` |

---

### ORM Integration

#### ISdOrmServiceConnectConfig\<T\>

```ts
interface ISdOrmServiceConnectConfig<T> {
  dbContextType: Type<T>;
  connOpt: TDbConnOptions & { configName: string };
  dbContextOpt?: { database: string; schema: string };
}
```

Configuration for establishing an ORM database connection through the service layer.

#### SdOrmServiceClientConnector

Bridges `SdServiceClient` with `@simplysm/sd-orm-common` `DbContext`. Delegates all database operations to the server's `SdOrmService` via RPC.

```ts
const connector = new SdOrmServiceClientConnector(client);

await connector.connectAsync(
  {
    dbContextType: MyDbContext,
    connOpt: { dialect: "mysql", configName: "main", ... },
  },
  async (db) => {
    const items = await db.item.select();
    // ...
  },
);
```

##### Methods

| Method | Description |
|--------|-------------|
| `connectAsync(config, callback)` | Opens a transactional DB connection, runs the callback, then closes |
| `connectWithoutTransactionAsync(config, callback)` | Same as above but without a wrapping transaction |

#### SdOrmServiceClientDbContextExecutor

Implements `IDbContextExecutor` from `@simplysm/sd-orm-common`. Translates local ORM operations into RPC calls to the server's `SdOrmService`.

| Method | Description |
|--------|-------------|
| `getInfoAsync()` | Retrieves dialect, database, and schema info from the server |
| `connectAsync()` | Establishes a server-side DB connection |
| `beginTransactionAsync(isolationLevel?)` | Starts a transaction |
| `commitTransactionAsync()` | Commits the current transaction |
| `rollbackTransactionAsync()` | Rolls back the current transaction |
| `closeAsync()` | Closes the server-side DB connection |
| `executeDefsAsync(defs, options?)` | Executes query definitions |
| `executeParametrizedAsync(query, params?)` | Executes a raw parameterized query |
| `bulkInsertAsync(tableName, columnDefs, records)` | Performs a bulk insert |
| `bulkUpsertAsync(tableName, columnDefs, records)` | Performs a bulk upsert |
