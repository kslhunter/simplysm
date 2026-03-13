# @simplysm/sd-orm-node

Node.js ORM module providing database connections and query execution for MSSQL, MySQL, and SQLite. Uses connection pooling (via `generic-pool`) for MSSQL and MySQL, and direct connections for SQLite.

## Installation

```bash
npm install @simplysm/sd-orm-node
# or
yarn add @simplysm/sd-orm-node
```

Install the driver for your target database (all are optional peer dependencies):

```bash
# MSSQL
npm install tedious

# MySQL
npm install mysql2

# SQLite
npm install sqlite3
```

## Quick Start

```typescript
import { SdOrm } from "@simplysm/sd-orm-node";
import { MyDbContext } from "./MyDbContext"; // your DbContext subclass

const orm = new SdOrm(MyDbContext, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "secret",
  database: "mydb",
});

// Execute within a transaction
const result = await orm.connectAsync(async (db) => {
  return await db.executeSingleAsync(/* ... */);
});

// Execute without a transaction
await orm.connectWithoutTransactionAsync(async (db) => {
  // read-only queries, etc.
});
```

## API Reference

### `SdOrm<T>`

High-level ORM entry point. Creates `DbContext` instances wired with `NodeDbContextExecutor` and manages connection lifecycle.

```typescript
const orm = new SdOrm(MyDbContext, config, dbContextOpt?);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dbContextType` | `Type<T>` | The `DbContext` subclass constructor |
| `config` | `TDbConnConf` | Database connection configuration |
| `dbContextOpt` | `Partial<TDbContextOption>` | Optional overrides for dialect, database, and schema |

#### `connectAsync(callback, isolationLevel?)`

Opens a connection, begins a transaction, executes the callback, then commits (or rolls back on error).

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(conn: T) => Promise<R>` | Callback receiving the connected `DbContext` instance |
| `isolationLevel` | `ISOLATION_LEVEL` | Optional transaction isolation level |

**Returns:** `Promise<R>` -- the value returned by the callback.

#### `connectWithoutTransactionAsync(callback)`

Opens a connection and executes the callback without wrapping it in a transaction. Useful for read-only operations.

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(conn: T) => Promise<R>` | Callback receiving the connected `DbContext` instance |

**Returns:** `Promise<R>` -- the value returned by the callback.

---

### `NodeDbContextExecutor`

Implements the `IDbContextExecutor` interface for Node.js. Uses `DbConnFactory` internally to acquire connections. Typically not used directly -- `SdOrm` creates it automatically.

```typescript
const executor = new NodeDbContextExecutor(config);
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `getInfoAsync` | `() => Promise<{ dialect, database?, schema? }>` | Returns dialect and database metadata from the config |
| `connectAsync` | `() => Promise<void>` | Creates a connection via `DbConnFactory` and connects |
| `beginTransactionAsync` | `(isolationLevel?) => Promise<void>` | Begins a transaction |
| `commitTransactionAsync` | `() => Promise<void>` | Commits the current transaction |
| `rollbackTransactionAsync` | `() => Promise<void>` | Rolls back the current transaction |
| `closeAsync` | `() => Promise<void>` | Closes the connection |
| `executeDefsAsync` | `(defs, options?) => Promise<any[][]>` | Builds SQL from query definitions and executes them |
| `executeParametrizedAsync` | `(query, params?) => Promise<any[][]>` | Executes a parameterized SQL query |
| `bulkInsertAsync` | `(tableName, columnDefs, records) => Promise<void>` | Bulk inserts records into a table |
| `bulkUpsertAsync` | `(tableName, columnDefs, records) => Promise<void>` | Bulk upserts records into a table |

---

### `DbConnFactory`

Static factory that creates `IDbConn` instances. For MySQL and MSSQL, connections are pooled (via `generic-pool`) and returned as `PooledDbConn` wrappers. SQLite connections are created directly without pooling.

#### `DbConnFactory.createAsync(config)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `TDbConnConf` | Database connection configuration |

**Returns:** `Promise<IDbConn>` -- a `PooledDbConn` for MySQL/MSSQL, or a `SqliteDbConn` for SQLite.

**Pool settings (MySQL / MSSQL):**
- Min connections: 1
- Max connections: 10
- Acquire timeout: 30s
- Idle timeout: 30s
- Validates connections on borrow

---

### `PooledDbConn`

Connection wrapper that borrows a physical connection from the pool on `connectAsync` and returns it on `closeAsync`. Implements `IDbConn` by delegating all operations to the underlying raw connection. Emits a `"close"` event when the connection is released or the underlying physical connection drops.

All `IDbConn` methods (transaction management, query execution, bulk operations) are delegated to the pooled raw connection.

---

### `MssqlDbConn`

MSSQL/Azure SQL connection implementation using [tedious](https://www.npmjs.com/package/tedious). Implements `IDbConn`.

```typescript
const conn = new MssqlDbConn(tedious, config);
```

| Feature | Details |
|---------|---------|
| Dialect | `"mssql"` or `"mssql-azure"` (enables TLS encryption) |
| Default timeout | 10 minutes |
| Auto-close timeout | 20 minutes of inactivity |
| Bulk insert | Supported via tedious `BulkLoad` |
| Bulk upsert | Not supported (throws error) |
| Parameterized queries | Uses `@p0`, `@p1`, ... naming with type inference |

---

### `MysqlDbConn`

MySQL connection implementation using [mysql2](https://www.npmjs.com/package/mysql2). Implements `IDbConn`.

```typescript
const conn = new MysqlDbConn(mysql2, config);
```

| Feature | Details |
|---------|---------|
| Dialect | `"mysql"` |
| Default timeout | 5 minutes |
| Auto-close timeout | 10 minutes of inactivity |
| Charset | `utf8mb4` |
| Multiple statements | Enabled |
| Bulk insert | Supported via multi-row `INSERT INTO ... VALUES` |
| Bulk upsert | Supported via `INSERT ... ON DUPLICATE KEY UPDATE` |
| Default isolation level | `REPEATABLE_READ` |

---

### `SqliteDbConn`

SQLite connection implementation using [sqlite3](https://www.npmjs.com/package/sqlite3). Implements `IDbConn`.

```typescript
const conn = new SqliteDbConn(sqlite3, config);
```

| Feature | Details |
|---------|---------|
| Dialect | `"sqlite"` |
| Default timeout | 5 minutes |
| Auto-close timeout | 10 minutes of inactivity |
| Connection mode | Serialized (sequential query execution) |
| Bulk insert | Supported via multi-row `INSERT INTO ... VALUES` |
| Bulk upsert | Supported via `INSERT ... ON DUPLICATE KEY UPDATE` |
| Connection pooling | Not used (direct file-based connections) |

---

## Configuration Types

### `TDbConnConf`

Union type: `IDefaultDbConnConf | ISqliteDbConnConf`

### `IDefaultDbConnConf` (MSSQL / MySQL)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `dialect` | `"mysql" \| "mssql" \| "mssql-azure"` | Yes | Database dialect |
| `host` | `string` | Yes | Server hostname or IP |
| `port` | `number` | No | Server port |
| `username` | `string` | Yes | Database username |
| `password` | `string` | Yes | Database password |
| `database` | `string` | No | Database name |
| `schema` | `string` | No | Default schema |
| `defaultIsolationLevel` | `ISOLATION_LEVEL` | No | Default transaction isolation level |

### `ISqliteDbConnConf` (SQLite)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `dialect` | `"sqlite"` | Yes | Must be `"sqlite"` |
| `filePath` | `string` | Yes | Path to the SQLite database file |

### `ISOLATION_LEVEL`

`"READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE"`

## Usage Examples

### MSSQL with transaction

```typescript
import { SdOrm } from "@simplysm/sd-orm-node";

const orm = new SdOrm(MyDbContext, {
  dialect: "mssql",
  host: "db.example.com",
  port: 1433,
  username: "sa",
  password: "password",
  database: "mydb",
  schema: "dbo",
});

const rows = await orm.connectAsync(async (db) => {
  return await db.executeSingleAsync(/* query def */);
}, "READ_COMMITTED");
```

### SQLite without transaction

```typescript
import { SdOrm } from "@simplysm/sd-orm-node";

const orm = new SdOrm(MyDbContext, {
  dialect: "sqlite",
  filePath: "./data/local.db",
});

await orm.connectWithoutTransactionAsync(async (db) => {
  // perform read-only queries
});
```

### Direct connection usage

When you need low-level access to a database connection:

```typescript
import { DbConnFactory } from "@simplysm/sd-orm-node";

const conn = await DbConnFactory.createAsync({
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "secret",
});

await conn.connectAsync();
try {
  await conn.beginTransactionAsync("REPEATABLE_READ");
  await conn.executeAsync(["INSERT INTO users (name) VALUES ('Alice')"]);
  await conn.commitTransactionAsync();
} catch (err) {
  await conn.rollbackTransactionAsync();
  throw err;
} finally {
  await conn.closeAsync();
}
```
