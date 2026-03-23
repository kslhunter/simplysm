# Connections

Database connection interfaces, configuration types, and executor abstractions.

## Interface: IDbConn

**Source:** `src/IDbConn.ts`

Low-level database connection interface. Extends `EventEmitter`.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `config` | `TDbConnConf` | Connection configuration |
| `isConnected` | `boolean` | Whether the connection is currently open |
| `isOnTransaction` | `boolean` | Whether a transaction is active |

### Events

| Event | Listener | Description |
|-------|----------|-------------|
| `"close"` | `() => void` | Emitted when the connection is closed |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `connectAsync` | `() => Promise<void>` | Open the database connection |
| `closeAsync` | `() => Promise<void>` | Close the database connection |
| `beginTransactionAsync` | `(isolationLevel?: ISOLATION_LEVEL) => Promise<void>` | Begin a transaction with optional isolation level |
| `commitTransactionAsync` | `() => Promise<void>` | Commit the current transaction |
| `rollbackTransactionAsync` | `() => Promise<void>` | Roll back the current transaction |
| `executeAsync` | `(queries: string[]) => Promise<any[][]>` | Execute multiple SQL queries |
| `executeParametrizedAsync` | `(query: string, params?: any[]) => Promise<any[][]>` | Execute a parameterized SQL query |
| `bulkInsertAsync` | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]) => Promise<void>` | Bulk insert records |
| `bulkUpsertAsync` | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]) => Promise<void>` | Bulk upsert records |

## Type: TDbConnConf

Discriminated union of connection configuration types.

```typescript
type TDbConnConf = IDefaultDbConnConf | ISqliteDbConnConf;
```

## Interface: IDefaultDbConnConf

Connection configuration for MySQL, MSSQL, or MSSQL-Azure.

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"mysql" \| "mssql" \| "mssql-azure"` | Database dialect |
| `host` | `string` | Server hostname or IP address |
| `port` | `number \| undefined` | Server port (optional, uses dialect default) |
| `username` | `string` | Authentication username |
| `password` | `string` | Authentication password |
| `database` | `string \| undefined` | Default database name |
| `schema` | `string \| undefined` | Default schema name |
| `defaultIsolationLevel` | `ISOLATION_LEVEL \| undefined` | Default transaction isolation level |

## Interface: ISqliteDbConnConf

Connection configuration for SQLite.

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"sqlite"` | Database dialect (always `"sqlite"`) |
| `filePath` | `string` | Path to the SQLite database file |

## Type: ISOLATION_LEVEL

Transaction isolation level options.

```typescript
type ISOLATION_LEVEL =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";
```

| Value | Description |
|-------|-------------|
| `"READ_UNCOMMITTED"` | Allows dirty reads, non-repeatable reads, and phantom reads |
| `"READ_COMMITTED"` | Prevents dirty reads; non-repeatable and phantom reads possible |
| `"REPEATABLE_READ"` | Prevents dirty and non-repeatable reads; phantom reads possible |
| `"SERIALIZABLE"` | Strictest level; prevents all read anomalies |

## Interface: IDbContextExecutor

**Source:** `src/IDbContextExecutor.ts`

Abstraction layer that `DbContext` delegates to for executing database operations. Implementations exist in `sd-orm-node` for each dialect.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getInfoAsync` | `() => Promise<{dialect: TDbContextOption["dialect"], database?: string, schema?: string}>` | Get connection info (dialect, database, schema) |
| `connectAsync` | `() => Promise<void>` | Open the database connection |
| `beginTransactionAsync` | `(isolationLevel?: ISOLATION_LEVEL) => Promise<void>` | Begin a transaction |
| `commitTransactionAsync` | `() => Promise<void>` | Commit the current transaction |
| `rollbackTransactionAsync` | `() => Promise<void>` | Roll back the current transaction |
| `executeDefsAsync` | `(defs: TQueryDef[], options?: (IQueryResultParseOption \| undefined)[]) => Promise<any[][]>` | Execute query definitions and return parsed results |
| `executeParametrizedAsync` | `(query: string, params?: any[]) => Promise<any[][]>` | Execute a parameterized SQL query |
| `bulkInsertAsync` | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]) => Promise<void>` | Bulk insert records |
| `bulkUpsertAsync` | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]) => Promise<void>` | Bulk upsert records |
| `closeAsync` | `() => Promise<void>` | Close the database connection |

## Interface: IQueryResultParseOption

Options controlling how raw query results are parsed into typed objects.

| Field | Type | Description |
|-------|------|-------------|
| `columns` | `Record<string, { dataType: string \| undefined }> \| undefined` | Maps column names to their data type for type conversion (e.g., `"DateTime"`, `"DateOnly"`, `"Boolean"`) |
| `joins` | `Record<string, { isSingle: boolean }> \| undefined` | Maps join keys to their multiplicity. Used to nest JOIN results into objects (single) or arrays (multi) |
