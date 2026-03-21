# Features

## `EventClient`

Client-side event management interface. Handles event listener registration, removal, emission, and auto-recovery on reconnect.

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

| Method | Description |
|--------|-------------|
| `addListener()` | Register an event listener on the server, returns listener key |
| `removeListener()` | Remove an event listener by key |
| `emit()` | Emit an event to matching listeners (server-side filtering) |
| `resubscribeAll()` | Re-register all listeners on reconnect |

## `createEventClient`

Create an event client instance.

```typescript
function createEventClient(transport: ServiceTransport): EventClient;
```

## `FileClient`

File upload/download client interface.

```typescript
interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(
    files: File[] | FileList | { name: string; data: BlobPart }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]>;
}
```

| Method | Description |
|--------|-------------|
| `download()` | Download a file by relative path, returns binary data |
| `upload()` | Upload files via multipart form, returns upload results |

## `createFileClient`

Create a file client instance.

```typescript
function createFileClient(hostUrl: string, clientName: string): FileClient;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `hostUrl` | `string` | Server base URL (http:// or https://) |
| `clientName` | `string` | Client name for request headers |

## `OrmConnectOptions`

ORM connection options for client-side database access.

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

| Field | Type | Description |
|-------|------|-------------|
| `dbContextDef` | `TDef` | DbContext definition |
| `connOpt` | `DbConnOptions & { configName: string }` | Connection options with config name |
| `dbContextOpt` | `{ database: string; schema: string }` | Override database/schema from server config |

## `OrmClientConnector`

Client-side ORM connector interface. Creates DbContext instances that execute queries via the service protocol.

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

| Method | Description |
|--------|-------------|
| `connect()` | Connect with transaction (auto commit/rollback) |
| `connectWithoutTransaction()` | Connect without transaction |

## `createOrmClientConnector`

Create an ORM client connector.

```typescript
function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector;
```

## `OrmClientDbContextExecutor`

Client-side DbContext executor. Implements `DbContextExecutor` by delegating to the ORM service over the service protocol.

```typescript
class OrmClientDbContextExecutor implements DbContextExecutor {
  constructor(
    private readonly _client: ServiceClient,
    private readonly _opt: DbConnOptions & { configName: string },
  );

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
