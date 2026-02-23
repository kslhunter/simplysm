# @simplysm/sd-service-client

WebSocket-based service client for the Simplysm framework. Provides typed RPC calls, server-sent events, file upload/download, and ORM connectivity through a WebSocket connection.

## Installation

```bash
yarn add @simplysm/sd-service-client
```

## Main Modules

### SdServiceClient

Main client class for communicating with `@simplysm/sd-service-server`. Extends `EventEmitter`.

```typescript
import { SdServiceClient } from "@simplysm/sd-service-client";

const client = new SdServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
});

await client.connectAsync();
```

#### Constructor

```typescript
new SdServiceClient(name: string, options: ISdServiceConnectionConfig)
```

- `name` — Client identifier name
- `options` — Connection configuration

#### Properties

| Property    | Type                         | Description                              |
| ----------- | ---------------------------- | ---------------------------------------- |
| `name`      | `string`                     | Client identifier                        |
| `options`   | `ISdServiceConnectionConfig` | Connection config                        |
| `connected` | `boolean`                    | Whether WebSocket is currently connected |
| `hostUrl`   | `string`                     | Full HTTP(S) URL derived from options    |

#### Methods

##### `connectAsync(): Promise<void>`

Establishes WebSocket connection to the server.

##### `closeAsync(): Promise<void>`

Closes the WebSocket connection.

##### `getService<T>(serviceName: string): TRemoteService<T>`

Creates a typed proxy for calling remote service methods via RPC.

```typescript
interface IMyService {
  getData(id: number): string[];
}

const myService = client.getService<IMyService>("MyService");
const result = await myService.getData(123); // typed as Promise<string[]>
```

##### `sendAsync(serviceName: string, methodName: string, params: any[], progress?: ISdServiceProgress): Promise<any>`

Low-level method for sending RPC requests with optional progress tracking.

##### `authAsync(token: string): Promise<void>`

Authenticates the client with a JWT token. The token is stored and automatically re-sent on reconnection.

##### `addEventListenerAsync<T>(eventType: Type<T>, info: T["info"], cb: (data: T["data"]) => PromiseLike<void>): Promise<string>`

Registers a server-sent event listener. Returns a key for later removal. Listeners are automatically re-registered on reconnection. Throws if not connected.

##### `removeEventListenerAsync(key: string): Promise<void>`

Removes a previously registered event listener by key.

##### `emitAsync<T>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): Promise<void>`

Emits an event to matching listeners on the server.

##### `uploadFileAsync(files: File[] | FileList | { name: string; data: BlobPart }[]): Promise<ISdServiceUploadResult[]>`

Uploads files to the server. Requires prior authentication via `authAsync()`. Throws if not authenticated.

##### `downloadFileBufferAsync(relPath: string): Promise<Buffer>`

Downloads a file from the server as a Buffer.

#### Events

| Event               | Listener Signature                                           | Description              |
| ------------------- | ------------------------------------------------------------ | ------------------------ |
| `request-progress`  | `(state: ISdServiceProgressState) => void`                   | Upload progress          |
| `response-progress` | `(state: ISdServiceProgressState) => void`                   | Download progress        |
| `state`             | `(state: "connected" \| "closed" \| "reconnecting") => void` | Connection state changes |
| `reload`            | `(changedFileSet: Set<string>) => void`                      | Hot reload notification  |

---

### TRemoteService\<T\>

Type utility that wraps all methods of `T` so their return types become `Promise`-wrapped. Non-function properties are typed as `never`.

```typescript
import { TRemoteService } from "@simplysm/sd-service-client";

type RemoteMyService = TRemoteService<IMyService>;
// All methods return Promise<Awaited<ReturnType>>
```

```typescript
type TRemoteService<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
    : never;
};
```

---

### SdServiceEventClient

Internal client for managing server-sent event subscriptions. Used internally by `SdServiceClient`.

```typescript
import { SdServiceEventClient } from "@simplysm/sd-service-client";
```

#### Constructor

```typescript
new SdServiceEventClient(transport: SdServiceTransport)
```

#### Methods

##### `addListenerAsync<T>(eventListenerType: Type<T>, info: T["info"], cb: (data: T["data"]) => PromiseLike<void>): Promise<string>`

Register event listener on the server. Returns a unique key for removal.

##### `removeListenerAsync(key: string): Promise<void>`

Remove a registered event listener by key.

##### `emitAsync<T>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): Promise<void>`

Emit an event to all matching listeners on the server.

##### `reRegisterAllAsync(): Promise<void>`

Re-registers all locally stored listeners on the server. Called automatically on reconnection.

---

### SdServiceFileClient

Internal client for HTTP-based file upload/download. Used internally by `SdServiceClient`.

```typescript
import { SdServiceFileClient } from "@simplysm/sd-service-client";
```

#### Constructor

```typescript
new SdServiceFileClient(hostUrl: string, clientName: string)
```

#### Methods

##### `downloadAsync(relPath: string): Promise<Buffer>`

Download a file from the server via HTTP GET. The `relPath` may start with `/` or not.

##### `uploadAsync(files: File[] | FileList | { name: string; data: BlobPart }[], authToken: string): Promise<ISdServiceUploadResult[]>`

Upload files to the server via HTTP POST with multipart/form-data. Requires a valid auth token.

---

### ORM Integration

#### ISdOrmServiceConnectConfig\<T\>

Configuration for connecting to a database through the service layer.

```typescript
import { ISdOrmServiceConnectConfig } from "@simplysm/sd-service-client";
```

```typescript
interface ISdOrmServiceConnectConfig<T> {
  dbContextType: Type<T>;
  connOpt: TDbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
```

#### SdOrmServiceClientConnector

Manages ORM database connections through the service client.

```typescript
import { SdOrmServiceClientConnector } from "@simplysm/sd-service-client";

const connector = new SdOrmServiceClientConnector(client);
const result = await connector.connectAsync(config, async (db) => {
  return await db.myTable.select();
});
```

##### Constructor

```typescript
new SdOrmServiceClientConnector(serviceClient: SdServiceClient)
```

##### Methods

###### `connectAsync<T extends DbContext, R>(config: ISdOrmServiceConnectConfig<T>, callback: (conn: T) => Promise<R> | R): Promise<R>`

Connect with transaction support. The callback receives a `DbContext` instance. Foreign key constraint errors are automatically rewritten to a user-friendly message.

###### `connectWithoutTransactionAsync<T extends DbContext, R>(config: ISdOrmServiceConnectConfig<T>, callback: (conn: T) => Promise<R> | R): Promise<R>`

Connect without a transaction wrapper.

#### SdOrmServiceClientDbContextExecutor

Implements `IDbContextExecutor` for executing ORM operations through the service client. Used internally by `SdOrmServiceClientConnector`.

```typescript
import { SdOrmServiceClientDbContextExecutor } from "@simplysm/sd-service-client";
```

##### Constructor

```typescript
new SdOrmServiceClientDbContextExecutor(client: SdServiceClient, opt: TDbConnOptions & { configName: string })
```

##### Methods

- `getInfoAsync(): Promise<{ dialect: TDbConnConf["dialect"]; database?: string; schema?: string }>` — Get DB connection info
- `connectAsync(): Promise<void>` — Open connection
- `beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>` — Begin transaction
- `commitTransactionAsync(): Promise<void>` — Commit transaction
- `rollbackTransactionAsync(): Promise<void>` — Rollback transaction
- `closeAsync(): Promise<void>` — Close connection
- `executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]>` — Execute query definitions
- `executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>` — Execute parameterized query
- `bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` — Bulk insert
- `bulkUpsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` — Bulk upsert

---

### Protocol

#### SdServiceClientProtocolWrapper

Handles message encoding/decoding with automatic Worker thread offloading for large payloads (>30KB). Uses zero-copy buffer transfer for decode operations in the Worker thread.

```typescript
import { SdServiceClientProtocolWrapper } from "@simplysm/sd-service-client";
```

##### Methods

###### `encodeAsync(uuid: string, message: TSdServiceMessage): Promise<{ chunks: Buffer[]; totalSize: number }>`

Encode a service message into binary chunks. Automatically delegates to a Worker thread for large or complex payloads.

###### `decodeAsync(buffer: Buffer): Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>>`

Decode a received buffer back into a typed service message. Delegates to a Worker thread for buffers larger than 30KB, using zero-copy transfer.

---

### Transport

#### SdServiceTransport

Handles WebSocket message framing, request/response correlation, and progress tracking. Extends `EventEmitter`. Cancels all pending requests automatically when the socket closes.

```typescript
import { SdServiceTransport } from "@simplysm/sd-service-client";
```

##### Constructor

```typescript
new SdServiceTransport(socket: SdSocketProvider)
```

##### Methods

###### `sendAsync(message: TSdServiceClientMessage, progress?: ISdServiceProgress): Promise<any>`

Send a message and wait for the correlated response. Tracks upload/download progress via the optional `progress` callbacks.

##### Events

| Event    | Listener Signature                      | Description                    |
| -------- | --------------------------------------- | ------------------------------ |
| `reload` | `(changedFileSet: Set<string>) => void` | Server hot-reload notification |
| `event`  | `(keys: string[], data: any) => void`   | Server-sent event dispatch     |

#### SdSocketProvider

Low-level WebSocket connection manager with heartbeat monitoring (ping every 5s, timeout at 30s) and automatic reconnection. Extends `EventEmitter`.

```typescript
import { SdSocketProvider } from "@simplysm/sd-service-client";
```

##### Constructor

```typescript
new SdSocketProvider(url: string, clientName: string, maxReconnectCount: number)
```

##### Properties

| Property     | Type      | Description                   |
| ------------ | --------- | ----------------------------- |
| `connected`  | `boolean` | Whether the WebSocket is open |
| `clientName` | `string`  | Client identifier             |

##### Methods

- `connectAsync(): Promise<void>` — Establish WebSocket connection. Throws on initial connection failure.
- `closeAsync(): Promise<void>` — Gracefully close connection and wait for the socket to fully close.
- `sendAsync(data: Buffer | Uint8Array): Promise<void>` — Send binary data. Waits up to 5s for the connection to be ready.

##### Events

| Event     | Listener Signature                                           | Description             |
| --------- | ------------------------------------------------------------ | ----------------------- |
| `message` | `(data: Buffer) => void`                                     | Received binary message |
| `state`   | `(state: "connected" \| "closed" \| "reconnecting") => void` | Connection state change |

## Types

### ISdServiceConnectionConfig

```typescript
import { ISdServiceConnectionConfig } from "@simplysm/sd-service-client";
```

```typescript
interface ISdServiceConnectionConfig {
  port: number;
  host: string;
  ssl?: boolean;
  maxReconnectCount?: number; // 0 disables reconnection
}
```

### ISdServiceProgress

```typescript
import { ISdServiceProgress } from "@simplysm/sd-service-client";
```

```typescript
interface ISdServiceProgress {
  request?: (s: ISdServiceProgressState) => void;
  response?: (s: ISdServiceProgressState) => void;
}
```

### ISdServiceProgressState

```typescript
import { ISdServiceProgressState } from "@simplysm/sd-service-client";
```

```typescript
interface ISdServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```
