# Connection

Low-level database connection management for MySQL, MSSQL, and PostgreSQL.

## createDbConn

```typescript
async function createDbConn(config: DbConnConfig): Promise<DbConn>
```

Factory function that creates a dialect-specific database connection. The connection is **not yet established** -- call `connect()` on the returned object.

Driver modules are lazily loaded and cached:
- `mysql`: `mysql2/promise`
- `mssql`/`mssql-azure`: `tedious`
- `postgresql`: `pg` + `pg-copy-streams`

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `DbConnConfig` | Database connection configuration |

Returns `MysqlDbConn`, `MssqlDbConn`, or `PostgresqlDbConn`.

```typescript
const conn = await createDbConn({
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

await conn.connect();
try {
  const results = await conn.execute(["SELECT * FROM users"]);
} finally {
  await conn.close();
}
```

## DbConn

```typescript
interface DbConn extends EventEmitter<{ close: void }> {
  config: DbConnConfig;
  isConnected: boolean;
  isInTransaction: boolean;
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  execute(queries: string[]): Promise<Record<string, unknown>[][]>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(tableName: string, columnMetas: Record<string, ColumnMeta>, records: Record<string, unknown>[]): Promise<void>;
}
```

Low-level database connection interface. Extends `EventEmitter` from `@simplysm/core-common` and emits `close` events.

| Field | Type | Description |
|-------|------|-------------|
| `config` | `DbConnConfig` | Connection configuration |
| `isConnected` | `boolean` | Whether connection is established |
| `isInTransaction` | `boolean` | Whether a transaction is active |

| Method | Signature | Description |
|--------|-----------|-------------|
| `connect` | `() => Promise<void>` | Establish database connection |
| `close` | `() => Promise<void>` | Close database connection |
| `beginTransaction` | `(isolationLevel?) => Promise<void>` | Start transaction |
| `commitTransaction` | `() => Promise<void>` | Commit transaction |
| `rollbackTransaction` | `() => Promise<void>` | Rollback transaction |
| `execute` | `(queries: string[]) => Promise<Record<string, unknown>[][]>` | Execute SQL query strings |
| `executeParametrized` | `(query: string, params?: unknown[]) => Promise<Record<string, unknown>[][]>` | Execute parameterized query |
| `bulkInsert` | `(tableName, columnMetas, records) => Promise<void>` | Native bulk insert |

### Bulk Insert Implementation by Dialect

| Dialect | Mechanism |
|---------|-----------|
| MySQL | `LOAD DATA LOCAL INFILE` (temporary CSV file) |
| MSSQL | tedious `BulkLoad` API |
| PostgreSQL | `COPY FROM STDIN` via pg-copy-streams |

## MysqlDbConn

```typescript
class MysqlDbConn extends EventEmitter<{ close: void }> implements DbConn
```

MySQL connection implementation using the `mysql2/promise` library. Constructor:

```typescript
constructor(mysql: typeof import("mysql2/promise"), config: MysqlDbConnConfig)
```

## MssqlDbConn

```typescript
class MssqlDbConn extends EventEmitter<{ close: void }> implements DbConn
```

MSSQL/Azure SQL connection implementation using the `tedious` library. Constructor:

```typescript
constructor(tedious: typeof import("tedious"), config: MssqlDbConnConfig)
```

## PostgresqlDbConn

```typescript
class PostgresqlDbConn extends EventEmitter<{ close: void }> implements DbConn
```

PostgreSQL connection implementation using the `pg` and `pg-copy-streams` libraries. Constructor:

```typescript
constructor(pg: typeof import("pg"), pgCopyStreams: typeof import("pg-copy-streams"), config: PostgresqlDbConnConfig)
```

## DbConnConfig

```typescript
type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;
```

Union type of all dialect-specific connection configurations.

## MysqlDbConnConfig

```typescript
interface MysqlDbConnConfig {
  dialect: "mysql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dialect` | `"mysql"` | Required | Must be `"mysql"` |
| `host` | `string` | Required | Server hostname |
| `port` | `number?` | `3306` | Server port |
| `username` | `string` | Required | Login username |
| `password` | `string` | Required | Login password |
| `database` | `string?` | - | Default database name |
| `defaultIsolationLevel` | `IsolationLevel?` | - | Default transaction isolation level |

## MssqlDbConnConfig

```typescript
interface MssqlDbConnConfig {
  dialect: "mssql" | "mssql-azure";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dialect` | `"mssql" \| "mssql-azure"` | Required | `"mssql"` for on-premises, `"mssql-azure"` for Azure SQL |
| `host` | `string` | Required | Server hostname |
| `port` | `number?` | `1433` | Server port |
| `username` | `string` | Required | Login username |
| `password` | `string` | Required | Login password |
| `database` | `string?` | - | Default database name |
| `schema` | `string?` | `"dbo"` | Default schema |
| `defaultIsolationLevel` | `IsolationLevel?` | - | Default transaction isolation level |

## PostgresqlDbConnConfig

```typescript
interface PostgresqlDbConnConfig {
  dialect: "postgresql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dialect` | `"postgresql"` | Required | Must be `"postgresql"` |
| `host` | `string` | Required | Server hostname |
| `port` | `number?` | `5432` | Server port |
| `username` | `string` | Required | Login username |
| `password` | `string` | Required | Login password |
| `database` | `string?` | - | Default database name |
| `schema` | `string?` | `"public"` | Default schema |
| `defaultIsolationLevel` | `IsolationLevel?` | - | Default transaction isolation level |

## DB_CONN_CONNECT_TIMEOUT

```typescript
const DB_CONN_CONNECT_TIMEOUT = 10 * 1000; // 10,000ms (10 seconds)
```

Timeout for establishing a database connection.

## DB_CONN_DEFAULT_TIMEOUT

```typescript
const DB_CONN_DEFAULT_TIMEOUT = 10 * 60 * 1000; // 600,000ms (10 minutes)
```

Default timeout for query execution.

## DB_CONN_ERRORS

```typescript
const DB_CONN_ERRORS = {
  NOT_CONNECTED: "'Connection'이 연결되어 있지 않습니다.",
  ALREADY_CONNECTED: "'Connection'이 이미 연결되어 있습니다.",
} as const;
```

Error message constants for connection state validation.

| Key | Value | Description |
|-----|-------|-------------|
| `NOT_CONNECTED` | Connection is not established | Thrown when operating on a closed connection |
| `ALREADY_CONNECTED` | Connection is already established | Thrown when connecting an already-connected instance |

## getDialectFromConfig

```typescript
function getDialectFromConfig(config: DbConnConfig): Dialect
```

Extracts the `Dialect` type from a connection config. Maps `"mssql-azure"` to `"mssql"`, passes through others unchanged.

| Input `config.dialect` | Output `Dialect` |
|------------------------|------------------|
| `"mysql"` | `"mysql"` |
| `"mssql"` | `"mssql"` |
| `"mssql-azure"` | `"mssql"` |
| `"postgresql"` | `"postgresql"` |
