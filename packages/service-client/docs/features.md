# Features

Higher-level feature modules for events, file operations, and ORM database access.

## Event Client

### `EventClient`

**Interface** -- manages server-sent event subscriptions with automatic recovery on reconnect.

```typescript
interface EventClient {
  addListener<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    info: TInfo,
    cb: (data: TData) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emit<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
  resubscribeAll(): Promise<void>;
}
```

### Methods

#### `addListener(eventDef, info, cb)`

Registers an event listener on the server and stores it locally for reconnect recovery.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventDef` | `ServiceEventDef<TInfo, TData>` | Event definition (from `@simplysm/service-common`) |
| `info` | `TInfo` | Metadata attached to this listener (used for filtering) |
| `cb` | `(data: TData) => PromiseLike<void>` | Callback invoked when the event fires |

**Returns:** A unique key string for removing this listener later.

#### `removeListener(key)`

Removes a listener locally and notifies the server. Safe to call even when disconnected (the server auto-cleans on disconnect).

#### `emit(eventDef, infoSelector, data)`

Emits an event to other connected clients. Queries the server for registered listeners matching `eventDef`, filters them with `infoSelector`, and sends data to the matching subset.

#### `resubscribeAll()`

Re-registers all locally stored listeners with the server. Called automatically by `ServiceClient` on reconnection.

### `createEventClient()`

```typescript
function createEventClient(transport: ServiceTransport): EventClient
```

---

## File Client

### `FileClient`

**Interface** -- HTTP-based file upload and download.

```typescript
interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(
    files: File[] | FileList | { name: string; data: BlobPart }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]>;
}
```

### Methods

#### `download(relPath)`

Downloads a file from the server via HTTP GET.

| Parameter | Type | Description |
|-----------|------|-------------|
| `relPath` | `string` | Relative file path on the server |

**Returns:** `Uint8Array` containing the file contents.

#### `upload(files, authToken)`

Uploads one or more files via HTTP POST (`multipart/form-data`). Accepts browser `File` objects, a `FileList`, or plain objects with `name` and `data` properties.

| Parameter | Type | Description |
|-----------|------|-------------|
| `files` | `File[] \| FileList \| { name: string; data: BlobPart }[]` | Files to upload |
| `authToken` | `string` | Bearer token sent in the `Authorization` header |

**Returns:** `ServiceUploadResult[]` -- array of `{ path, filename, size }` for each uploaded file.

### `createFileClient()`

```typescript
function createFileClient(hostUrl: string, clientName: string): FileClient
```

---

## ORM Client

Utilities for accessing databases through the service server's ORM service.

### `OrmConnectOptions<TDef>`

**Interface** -- configuration for an ORM connection via the service client.

```typescript
interface OrmConnectOptions<TDef extends DbContextDef<any, any, any>> {
  dbContextDef: TDef;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
```

| Property | Type | Description |
|----------|------|-------------|
| `dbContextDef` | `TDef` | Database context definition (from `@simplysm/orm-common`) |
| `connOpt` | `DbConnOptions & { configName: string }` | Connection options including the named config |
| `dbContextOpt` | `{ database: string; schema: string }` | Optional database/schema overrides |

---

### `OrmClientConnector`

**Interface** -- high-level API for executing ORM operations through the service client.

```typescript
interface OrmClientConnector {
  connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectOptions<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
  connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectOptions<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
}
```

#### `connect(config, callback)`

Opens a transactional database connection, executes the callback, and automatically commits or rolls back.

Foreign key constraint violations are caught and re-thrown with a user-friendly message.

#### `connectWithoutTransaction(config, callback)`

Same as `connect()` but without transaction wrapping. Useful for read-only operations or when manual transaction control is needed.

### `createOrmClientConnector()`

```typescript
function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector
```

---

### `OrmClientDbContextExecutor`

**Class** -- implements `DbContextExecutor` from `@simplysm/orm-common` by delegating all database operations to the server's `OrmService` via RPC.

```typescript
class OrmClientDbContextExecutor implements DbContextExecutor {
  constructor(client: ServiceClient, opt: DbConnOptions & { configName: string });
  getInfo(): Promise<{ dialect: Dialect; database?: string; schema?: string }>;
  connect(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  close(): Promise<void>;
  executeDefs<T>(defs: QueryDef[], options?: (ResultMeta | undefined)[]): Promise<T[][]>;
  executeParametrized(query: string, params?: unknown[]): Promise<unknown[][]>;
  bulkInsert(tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]): Promise<void>;
}
```

All methods require an active connection (obtained via `connect()`). Calling any method before connecting throws an error.
