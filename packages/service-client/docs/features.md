# Features

## EventClient

Client-side event subscription manager. Handles adding/removing event listeners and auto-resubscription on reconnect.

### `EventClient`

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

### `createEventClient`

```typescript
function createEventClient(transport: ServiceTransport): EventClient;
```

**Behavior:**
- `addListener` registers on the server and stores locally for reconnect recovery
- `removeListener` removes from local map and sends removal request to server
- `emit` queries the server for matching listener infos, then sends event to matching keys
- `resubscribeAll` re-registers all local listeners on the server (called on reconnect)

---

## FileClient

HTTP-based file upload/download client.

### `FileClient`

```typescript
interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(
    files: File[] | FileList | { name: string; data: BlobPart }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]>;
}
```

### `createFileClient`

```typescript
function createFileClient(hostUrl: string, clientName: string): FileClient;
```

**Behavior:**
- `download` fetches a file via HTTP GET and returns it as `Uint8Array`
- `upload` sends files via multipart form POST to `/upload` with auth token in headers

---

## ORM Features

### `OrmConnectOptions`

Configuration for ORM database connections via the service client.

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

### `OrmClientConnector`

Manages ORM database connections through the service client.

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

### `createOrmClientConnector`

```typescript
function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector;
```

**Behavior:**
- `connect` creates a database context and executes the callback within a transaction
- `connectWithoutTransaction` creates a database context without transaction wrapping
- Foreign key constraint violations are caught and re-thrown with a user-friendly message

### `OrmClientDbContextExecutor`

Implements `DbContextExecutor` by delegating all database operations to the remote `OrmService` via WebSocket.

```typescript
class OrmClientDbContextExecutor implements DbContextExecutor {
  constructor(client: ServiceClient, opt: DbConnOptions & { configName: string });

  async getInfo(): Promise<{ dialect: Dialect; database?: string; schema?: string }>;
  async connect(): Promise<void>;
  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  async commitTransaction(): Promise<void>;
  async rollbackTransaction(): Promise<void>;
  async close(): Promise<void>;
  async executeDefs<T = Record<string, unknown>>(
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
  async executeParametrized(query: string, params?: unknown[]): Promise<unknown[][]>;
  async bulkInsert(
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```
