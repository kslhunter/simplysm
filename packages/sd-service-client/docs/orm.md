# ORM

## ISdOrmServiceConnectConfig\<T\>

Configuration interface for connecting to a database through the server-side ORM service.

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

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `dbContextType` | `Type<T>` | The `DbContext` subclass to instantiate |
| `connOpt` | `TDbConnOptions & { configName: string }` | Database connection options including the server config section name |
| `dbContextOpt` | `{ database: string; schema: string }` | Optional database/schema override (defaults to values from server config) |

---

## SdOrmServiceClientConnector

High-level connector that establishes ORM database sessions through the service client. Manages `DbContext` lifecycle including transaction support.

### Constructor

```typescript
constructor(private readonly _serviceClient: SdServiceClient)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_serviceClient` | `SdServiceClient` | The connected service client |

### Methods

#### `connectAsync(config, callback)`

```typescript
async connectAsync<T extends DbContext, R>(
  config: ISdOrmServiceConnectConfig<T>,
  callback: (conn: T) => Promise<R> | R,
): Promise<R>
```

Opens a transactional database connection, invokes the callback with the `DbContext` instance, and commits/rolls back automatically.

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `ISdOrmServiceConnectConfig<T>` | Database connection configuration |
| `callback` | `(conn: T) => Promise<R> \| R` | Function receiving the connected `DbContext` |

**Returns:** `Promise<R>` -- the callback's return value.

#### `connectWithoutTransactionAsync(config, callback)`

```typescript
async connectWithoutTransactionAsync<T extends DbContext, R>(
  config: ISdOrmServiceConnectConfig<T>,
  callback: (conn: T) => Promise<R> | R,
): Promise<R>
```

Same as `connectAsync` but without wrapping the callback in a transaction.

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `ISdOrmServiceConnectConfig<T>` | Database connection configuration |
| `callback` | `(conn: T) => Promise<R> \| R` | Function receiving the connected `DbContext` |

**Returns:** `Promise<R>` -- the callback's return value.

---

## SdOrmServiceClientDbContextExecutor

Low-level `IDbContextExecutor` implementation that delegates all database operations to the server-side `SdOrmService` via the service client RPC layer.

### Constructor

```typescript
constructor(
  private readonly _client: SdServiceClient,
  private readonly _opt: TDbConnOptions & { configName: string },
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_client` | `SdServiceClient` | The connected service client |
| `_opt` | `TDbConnOptions & { configName: string }` | Database connection options with config name |

### Methods

#### `getInfoAsync()`

```typescript
async getInfoAsync(): Promise<{
  dialect: TDbConnConf["dialect"];
  database?: string;
  schema?: string;
}>
```

Retrieves database dialect and connection info from the server.

#### `connectAsync()`

```typescript
async connectAsync(): Promise<void>
```

Opens a database connection on the server and stores the connection ID.

#### `beginTransactionAsync(isolationLevel?)`

```typescript
async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>
```

Begins a transaction on the server-side connection.

| Parameter | Type | Description |
|-----------|------|-------------|
| `isolationLevel` | `ISOLATION_LEVEL` | Optional transaction isolation level |

#### `commitTransactionAsync()`

```typescript
async commitTransactionAsync(): Promise<void>
```

Commits the current transaction.

#### `rollbackTransactionAsync()`

```typescript
async rollbackTransactionAsync(): Promise<void>
```

Rolls back the current transaction.

#### `closeAsync()`

```typescript
async closeAsync(): Promise<void>
```

Closes the server-side database connection.

#### `executeDefsAsync(defs, options?)`

```typescript
async executeDefsAsync(
  defs: TQueryDef[],
  options?: (IQueryResultParseOption | undefined)[],
): Promise<any[][]>
```

Executes query definitions on the server.

| Parameter | Type | Description |
|-----------|------|-------------|
| `defs` | `TQueryDef[]` | Query definitions to execute |
| `options` | `(IQueryResultParseOption \| undefined)[]` | Optional parse options for each query result |

#### `executeParametrizedAsync(query, params?)`

```typescript
async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>
```

Executes a parameterized SQL query on the server.

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | SQL query string |
| `params` | `any[]` | Optional query parameters |

#### `bulkInsertAsync(tableName, columnDefs, records)`

```typescript
async bulkInsertAsync(
  tableName: string,
  columnDefs: IQueryColumnDef[],
  records: Record<string, any>[],
): Promise<void>
```

Performs a bulk insert operation on the server.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tableName` | `string` | Target table name |
| `columnDefs` | `IQueryColumnDef[]` | Column definitions |
| `records` | `Record<string, any>[]` | Records to insert |

#### `bulkUpsertAsync(tableName, columnDefs, records)`

```typescript
async bulkUpsertAsync(
  tableName: string,
  columnDefs: IQueryColumnDef[],
  records: Record<string, any>[],
): Promise<void>
```

Performs a bulk upsert (insert or update) operation on the server.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tableName` | `string` | Target table name |
| `columnDefs` | `IQueryColumnDef[]` | Column definitions |
| `records` | `Record<string, any>[]` | Records to upsert |
