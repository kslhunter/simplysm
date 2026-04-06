# Event/File/ORM Client

## `EventClient`

Event subscription client for the service event system.

```typescript
export interface EventClient {
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

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `addListener` | `eventDef: ServiceEventDef<TInfo, TData>, info: TInfo, cb: (data: TData) => PromiseLike<void>` | `Promise<string>` | Subscribes to an event. Returns a listener key (UUID) for later removal |
| `removeListener` | `key: string` | `Promise<void>` | Unsubscribes by listener key |
| `emit` | `eventDef: ServiceEventDef<TInfo, TData>, infoSelector: (item: TInfo) => boolean, data: TData` | `Promise<void>` | Queries matching listeners from the server, then emits the event to them |
| `resubscribeAll` | none | `Promise<void>` | Re-registers all local listeners on the server (used after reconnection) |

## `createEventClient`

```typescript
export function createEventClient(transport: ServiceTransport): EventClient;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `transport` | `ServiceTransport` | The service transport for sending event messages |

## `FileClient`

File upload and download client using HTTP `fetch`.

```typescript
export interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(
    files: File[] | FileCollection | { name: string; data: BlobInput }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]>;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `download` | `relPath: string` | `Promise<Bytes>` | Downloads a file by relative path as `Uint8Array` |
| `upload` | `files: File[] \| FileCollection \| { name: string; data: BlobInput }[], authToken: string` | `Promise<ServiceUploadResult[]>` | Uploads files via multipart form data with Bearer token authentication |

## `createFileClient`

```typescript
export function createFileClient(hostUrl: string, clientName: string): FileClient;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `hostUrl` | `string` | Full host URL (e.g., `http://localhost:3000`) |
| `clientName` | `string` | Client identifier sent in `x-sd-client-name` header |

## `OrmConnectOptions`

ORM connection options for client-side database context usage.

```typescript
export interface OrmConnectOptions<T extends DbContext> {
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `DbClass` | `new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T` | DbContext subclass constructor |
| `connOpt` | `DbConnOptions & { configName: string }` | Connection options with required config name |
| `dbContextOpt` | `{ database: string; schema: string }?` | Optional database/schema override |

## `OrmClientConnector`

ORM client connector that opens a database context over the service RPC layer.

```typescript
export interface OrmClientConnector {
  connect<T extends DbContext, R>(
    config: OrmConnectOptions<T>,
    callback: (db: T) => Promise<R> | R,
  ): Promise<R>;
  connectWithoutTransaction<T extends DbContext, R>(
    config: OrmConnectOptions<T>,
    callback: (db: T) => Promise<R> | R,
  ): Promise<R>;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `connect` | `config: OrmConnectOptions<T>, callback: (db: T) => Promise<R> \| R` | `Promise<R>` | Opens a DB context with automatic transaction (begin/commit/rollback). Wraps foreign key constraint errors with a user-friendly message |
| `connectWithoutTransaction` | `config: OrmConnectOptions<T>, callback: (db: T) => Promise<R> \| R` | `Promise<R>` | Opens a DB context without automatic transaction management |

## `createOrmClientConnector`

```typescript
export function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `serviceClient` | `ServiceClient` | The service client instance for RPC communication |

## `OrmClientDbContextExecutor`

Implements `DbContextExecutor` (from `@simplysm/orm-common`) for client-side ORM usage over the service RPC layer. Proxies all database operations through the remote `OrmService`.

```typescript
export class OrmClientDbContextExecutor implements DbContextExecutor {
  constructor(
    client: ServiceClient,
    opt: DbConnOptions & { configName: string },
  );
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getInfo` | none | `Promise<{ dialect: Dialect; database?: string; schema?: string }>` | Gets database info via remote ORM service |
| `connect` | none | `Promise<void>` | Opens a remote connection |
| `beginTransaction` | `isolationLevel?: IsolationLevel` | `Promise<void>` | Begins a remote transaction |
| `commitTransaction` | none | `Promise<void>` | Commits the remote transaction |
| `rollbackTransaction` | none | `Promise<void>` | Rolls back the remote transaction |
| `close` | none | `Promise<void>` | Closes the remote connection |
| `executeDefs` | `defs: QueryDef[], options?: (ResultMeta \| undefined)[]` | `Promise<T[][]>` | Executes query definitions via remote ORM service |
| `executeParametrized` | `query: string, params?: unknown[]` | `Promise<unknown[][]>` | Executes a parameterized query via remote ORM service |
| `bulkInsert` | `tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]` | `Promise<void>` | Performs bulk insert via remote ORM service |
