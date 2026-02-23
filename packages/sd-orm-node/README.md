# @simplysm/sd-orm-node

Node.js ORM implementation for the Simplysm framework. Provides database connection classes for MSSQL (via Tedious), MySQL (via mysql2), and SQLite (via sqlite3), along with a connection factory, connection pooling, and a high-level `SdOrm` entry point for running database contexts.

## Installation

```bash
yarn add @simplysm/sd-orm-node
# Install the driver(s) for the database(s) you use:
yarn add tedious        # MSSQL / MSSQL Azure
yarn add mysql2         # MySQL
yarn add sqlite3        # SQLite
```

## Main Modules

### Connection Classes

The three concrete `IDbConn` implementations each accept the corresponding native driver as a constructor argument. The drivers are optional peer dependencies — only install the one(s) you need.

> **Note:** When using `DbConnFactory.createAsync()`, you do not need to pass the driver module manually — the factory performs dynamic `import()` internally. The constructors below are for direct instantiation only.

---

#### `MssqlDbConn`

Low-level MSSQL connection backed by the [Tedious](https://tediousjs.github.io/tedious/) driver.

```typescript
import { MssqlDbConn } from "@simplysm/sd-orm-node";
import * as tedious from "tedious";

const conn = new MssqlDbConn(tedious, {
  dialect: "mssql", // or "mssql-azure"
  host: "localhost",
  port: 1433,
  username: "sa",
  password: "secret",
  database: "MyDb",
  defaultIsolationLevel: "READ_COMMITTED",
});

await conn.connectAsync();
const results = await conn.executeAsync(["SELECT 1 AS val"]);
await conn.closeAsync();
```

**Constructor**

```typescript
new MssqlDbConn(
  tedious: typeof import("tedious"),
  config: IDefaultDbConnConf,
)
```

| Parameter | Type                       | Description                                                    |
| --------- | -------------------------- | -------------------------------------------------------------- |
| `tedious` | `typeof import("tedious")` | The Tedious module (must be installed separately)              |
| `config`  | `IDefaultDbConnConf`       | Connection configuration (`dialect: "mssql" \| "mssql-azure"`) |

**Properties**

| Property          | Type                 | Description                                         |
| ----------------- | -------------------- | --------------------------------------------------- |
| `config`          | `IDefaultDbConnConf` | The configuration passed at construction            |
| `isConnected`     | `boolean`            | Whether the underlying Tedious connection is active |
| `isOnTransaction` | `boolean`            | Whether an open transaction is in progress          |

**Methods**

| Method                     | Signature                                                                                           | Description                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `connectAsync`             | `(): Promise<void>`                                                                                 | Opens the MSSQL connection                         |
| `closeAsync`               | `(): Promise<void>`                                                                                 | Cancels pending requests and closes the connection |
| `beginTransactionAsync`    | `(isolationLevel?: ISOLATION_LEVEL): Promise<void>`                                                 | Begins a transaction (default: `READ_COMMITTED`)   |
| `commitTransactionAsync`   | `(): Promise<void>`                                                                                 | Commits the current transaction                    |
| `rollbackTransactionAsync` | `(): Promise<void>`                                                                                 | Rolls back the current transaction                 |
| `executeAsync`             | `(queries: string[]): Promise<any[][]>`                                                             | Executes one or more SQL strings as a batch        |
| `executeParametrizedAsync` | `(query: string, params?: any[]): Promise<any[][]>`                                                 | Executes a parameterized query (`@p0`, `@p1`, ...) |
| `bulkInsertAsync`          | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` | Performs a native Tedious bulk-load insert         |
| `bulkUpsertAsync`          | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` | Not supported on MSSQL — always throws an error    |

**Events**

| Event     | Description                                 |
| --------- | ------------------------------------------- |
| `"close"` | Emitted when the underlying connection ends |

> **Note:** `bulkUpsertAsync` is not supported on MSSQL and always throws. Use parameterized queries via `executeParametrizedAsync` with a `MERGE` statement for upsert behavior.

---

#### `MysqlDbConn`

Low-level MySQL connection backed by the [mysql2](https://sidorares.github.io/node-mysql2/) driver.

```typescript
import { MysqlDbConn } from "@simplysm/sd-orm-node";
import * as mysql2 from "mysql2/promise";

const conn = new MysqlDbConn(mysql2, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "secret",
  database: "MyDb",
  defaultIsolationLevel: "REPEATABLE_READ",
});

await conn.connectAsync();
await conn.beginTransactionAsync();
await conn.executeAsync(["INSERT INTO foo (bar) VALUES (1)"]);
await conn.commitTransactionAsync();
await conn.closeAsync();
```

**Constructor**

```typescript
new MysqlDbConn(
  mysql2: typeof import("mysql2/promise"),
  config: IDefaultDbConnConf,
)
```

| Parameter | Type                              | Description                                              |
| --------- | --------------------------------- | -------------------------------------------------------- |
| `mysql2`  | `typeof import("mysql2/promise")` | The mysql2 promise module (must be installed separately) |
| `config`  | `IDefaultDbConnConf`              | Connection configuration (`dialect: "mysql"`)            |

**Properties**

| Property          | Type                 | Description                                        |
| ----------------- | -------------------- | -------------------------------------------------- |
| `config`          | `IDefaultDbConnConf` | The configuration passed at construction           |
| `isConnected`     | `boolean`            | Whether the underlying mysql2 connection is active |
| `isOnTransaction` | `boolean`            | Whether an open transaction is in progress         |

**Methods**

| Method                     | Signature                                                                                           | Description                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connectAsync`             | `(): Promise<void>`                                                                                 | Opens the MySQL connection (charset: utf8mb4, multipleStatements enabled). When `username` is `"root"`, `database` is not set on the underlying connection. |
| `closeAsync`               | `(): Promise<void>`                                                                                 | Closes the connection gracefully                                                                                                                            |
| `beginTransactionAsync`    | `(isolationLevel?: ISOLATION_LEVEL): Promise<void>`                                                 | Begins a transaction and sets the session isolation level (default: `REPEATABLE_READ`)                                                                      |
| `commitTransactionAsync`   | `(): Promise<void>`                                                                                 | Commits the current transaction                                                                                                                             |
| `rollbackTransactionAsync` | `(): Promise<void>`                                                                                 | Rolls back the current transaction                                                                                                                          |
| `executeAsync`             | `(queries: string[]): Promise<any[][]>`                                                             | Executes one or more SQL strings                                                                                                                            |
| `executeParametrizedAsync` | `(query: string, params?: any[]): Promise<any[][]>`                                                 | Executes a parameterized query using mysql2 `?` placeholders                                                                                                |
| `bulkInsertAsync`          | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` | Performs a multi-row `INSERT`                                                                                                                               |
| `bulkUpsertAsync`          | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` | Performs a multi-row `INSERT ... ON DUPLICATE KEY UPDATE`                                                                                                   |

**Events**

| Event     | Description                                 |
| --------- | ------------------------------------------- |
| `"close"` | Emitted when the underlying connection ends |

---

#### `SqliteDbConn`

Low-level SQLite connection backed by the [sqlite3](https://github.com/TryGhost/node-sqlite3) driver.

```typescript
import { SqliteDbConn } from "@simplysm/sd-orm-node";
import * as sqlite3 from "sqlite3";

const conn = new SqliteDbConn(sqlite3, {
  dialect: "sqlite",
  filePath: "./my-database.db",
});

await conn.connectAsync();
const results = await conn.executeAsync(["SELECT 1 AS val"]);
await conn.closeAsync();
```

**Constructor**

```typescript
new SqliteDbConn(
  sqlite3: typeof import("sqlite3"),
  config: ISqliteDbConnConf,
)
```

| Parameter | Type                       | Description                                                |
| --------- | -------------------------- | ---------------------------------------------------------- |
| `sqlite3` | `typeof import("sqlite3")` | The sqlite3 module (must be installed separately)          |
| `config`  | `ISqliteDbConnConf`        | Connection configuration (`dialect: "sqlite"`, `filePath`) |

**Properties**

| Property          | Type                | Description                                |
| ----------------- | ------------------- | ------------------------------------------ |
| `config`          | `ISqliteDbConnConf` | The configuration passed at construction   |
| `isConnected`     | `boolean`           | Whether the SQLite database file is open   |
| `isOnTransaction` | `boolean`           | Whether an open transaction is in progress |

**Methods**

| Method                     | Signature                                                                                           | Description                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `connectAsync`             | `(): Promise<void>`                                                                                 | Opens the SQLite database file                                        |
| `closeAsync`               | `(): Promise<void>`                                                                                 | Closes the database file                                              |
| `beginTransactionAsync`    | `(_isolationLevel?: ISOLATION_LEVEL): Promise<void>`                                                | Executes `BEGIN;` (isolation level parameter is accepted but ignored) |
| `commitTransactionAsync`   | `(): Promise<void>`                                                                                 | Executes `COMMIT;`                                                    |
| `rollbackTransactionAsync` | `(): Promise<void>`                                                                                 | Executes `ROLLBACK;`                                                  |
| `executeAsync`             | `(queries: string[]): Promise<any[][]>`                                                             | Executes one or more SQL strings                                      |
| `executeParametrizedAsync` | `(query: string, params?: any[]): Promise<any[][]>`                                                 | Executes a parameterized query using sqlite3 positional parameters    |
| `bulkInsertAsync`          | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` | Performs a multi-row `INSERT`                                         |
| `bulkUpsertAsync`          | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` | Performs a multi-row `INSERT ... ON DUPLICATE KEY UPDATE`             |

**Events**

| Event     | Description                              |
| --------- | ---------------------------------------- |
| `"close"` | Emitted when the database file is closed |

---

### `DbConnFactory`

Static factory that creates the appropriate `IDbConn` for the given configuration. Drivers are loaded dynamically via `import()` — no need to pass the module manually. For MSSQL and MySQL it manages connection pools (via `generic-pool`) automatically; SQLite always returns a fresh connection.

```typescript
import { DbConnFactory } from "@simplysm/sd-orm-node";

// Get a pooled MySQL connection
const conn = await DbConnFactory.createAsync({
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "myuser",
  password: "secret",
  database: "MyDb",
});

await conn.connectAsync();
// use conn ...
await conn.closeAsync(); // returns the physical connection to the pool
```

**Static Methods**

| Method        | Signature                                 | Description                                                                                                                                                    |
| ------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createAsync` | `(config: TDbConnConf): Promise<IDbConn>` | Creates and returns an `IDbConn`. MSSQL and MySQL connections are drawn from a per-config pool (min: 1, max: 10). SQLite connections are always new instances. |

**Pool behavior**

- Pool size: min 1, max 10 connections per unique config (keyed by JSON-serialized config).
- Acquire timeout: 30 seconds.
- Idle timeout: 30 seconds.
- `testOnBorrow: true` — the pool validates the connection before lending it. Dead connections are discarded and replaced automatically.
- Calling `closeAsync()` on a pooled connection releases it back to the pool rather than closing the underlying socket.

---

### `PooledDbConn`

A pool-aware `IDbConn` wrapper returned by `DbConnFactory.createAsync()` for MSSQL and MySQL. It transparently delegates all operations to the physical connection acquired from the pool and returns it to the pool on `closeAsync()`. You do not normally need to instantiate this class directly.

```typescript
import { PooledDbConn } from "@simplysm/sd-orm-node";
import { createPool } from "generic-pool";

// Typically obtained via DbConnFactory.createAsync(), not constructed directly.
const pool = createPool({ create: ..., destroy: ... }, { min: 1, max: 5 });
const conn = new PooledDbConn(pool, config);
```

**Constructor**

```typescript
new PooledDbConn(
  pool: Pool<IDbConn>,       // generic-pool Pool instance
  initialConfig: TDbConnConf,
)
```

**Properties**

| Property          | Type          | Description                                                                                        |
| ----------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `config`          | `TDbConnConf` | Returns the config of the acquired physical connection, or the initial config if not yet connected |
| `isConnected`     | `boolean`     | `true` when a physical connection has been acquired from the pool                                  |
| `isOnTransaction` | `boolean`     | Delegates to the physical connection's `isOnTransaction`                                           |

**Methods**

All methods delegate to the underlying physical connection acquired from the pool.

| Method                     | Signature                                                                                           | Description                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `connectAsync`             | `(): Promise<void>`                                                                                 | Acquires a connection from the pool and registers a close listener on it              |
| `closeAsync`               | `(): Promise<void>`                                                                                 | Removes the close listener, releases the connection back to the pool, emits `"close"` |
| `beginTransactionAsync`    | `(isolationLevel?: ISOLATION_LEVEL): Promise<void>`                                                 | Delegates to physical connection                                                      |
| `commitTransactionAsync`   | `(): Promise<void>`                                                                                 | Delegates to physical connection                                                      |
| `rollbackTransactionAsync` | `(): Promise<void>`                                                                                 | Delegates to physical connection                                                      |
| `executeAsync`             | `(queries: string[]): Promise<any[][]>`                                                             | Delegates to physical connection                                                      |
| `executeParametrizedAsync` | `(query: string, params?: any[]): Promise<any[][]>`                                                 | Delegates to physical connection                                                      |
| `bulkInsertAsync`          | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` | Delegates to physical connection                                                      |
| `bulkUpsertAsync`          | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` | Delegates to physical connection                                                      |

**Events**

| Event     | Description                                                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"close"` | Emitted when the connection is released back to the pool via `closeAsync()`, or when the underlying physical connection drops unexpectedly (e.g., idle timeout) |

---

### `NodeDbContextExecutor`

Implements `IDbContextExecutor` from `@simplysm/sd-orm-common`. It connects to the database through `DbConnFactory` and executes query definitions (`TQueryDef`) produced by the ORM query builder. This is the bridge between the ORM's `DbContext` abstraction and the physical Node.js connections.

You typically pass an instance of this class to a `DbContext` constructor, but the `SdOrm` class handles that for you.

```typescript
import { NodeDbContextExecutor } from "@simplysm/sd-orm-node";
import { MyDbContext } from "./MyDbContext";

const executor = new NodeDbContextExecutor({
  dialect: "mssql",
  host: "localhost",
  username: "sa",
  password: "secret",
  database: "MyDb",
});

const db = new MyDbContext(executor, { dialect: "mssql", database: "MyDb" });
await db.connectAsync(async () => {
  const rows = await db.myTable.select().resultAsync();
});
```

**Constructor**

```typescript
new NodeDbContextExecutor(config: TDbConnConf)
```

**Methods**

| Method                     | Signature                                                                                           | Description                                                                                                                                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getInfoAsync`             | `(): Promise<{ dialect, database?, schema? }>`                                                      | Returns the dialect and (for non-SQLite) database/schema from the config                                                                                                                                                                           |
| `connectAsync`             | `(): Promise<void>`                                                                                 | Creates and connects an `IDbConn` via `DbConnFactory`                                                                                                                                                                                              |
| `beginTransactionAsync`    | `(isolationLevel?: ISOLATION_LEVEL): Promise<void>`                                                 | Begins a transaction on the underlying connection                                                                                                                                                                                                  |
| `commitTransactionAsync`   | `(): Promise<void>`                                                                                 | Commits the current transaction                                                                                                                                                                                                                    |
| `rollbackTransactionAsync` | `(): Promise<void>`                                                                                 | Rolls back the current transaction                                                                                                                                                                                                                 |
| `closeAsync`               | `(): Promise<void>`                                                                                 | Closes the underlying connection                                                                                                                                                                                                                   |
| `executeParametrizedAsync` | `(query: string, params?: any[]): Promise<any[][]>`                                                 | Executes a parameterized query directly on the underlying connection                                                                                                                                                                               |
| `bulkInsertAsync`          | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` | Bulk-inserts records via the underlying connection                                                                                                                                                                                                 |
| `bulkUpsertAsync`          | `(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` | Bulk-upserts records via the underlying connection                                                                                                                                                                                                 |
| `executeDefsAsync`         | `(defs: TQueryDef[], options?: (IQueryResultParseOption \| undefined)[]): Promise<any[][]>`         | Converts ORM query definitions to SQL via `QueryBuilder`, executes them, and parses results via `SdOrmUtils.parseQueryResultAsync`. When all `options` entries are `undefined`, all defs are batched into a single query execution for efficiency. |

---

### `SdOrm`

High-level entry point that wraps a `DbContext` subclass with connection lifecycle management. It is the recommended way to run database operations in application code.

```typescript
import { SdOrm } from "@simplysm/sd-orm-node";
import { MyDbContext } from "./MyDbContext";

const orm = new SdOrm(MyDbContext, {
  dialect: "mssql",
  host: "localhost",
  username: "sa",
  password: "secret",
  database: "MyDb",
});

// With transaction (default)
const result = await orm.connectAsync(async (db) => {
  return await db.myTable.select().resultAsync();
});

// Without transaction
const result2 = await orm.connectWithoutTransactionAsync(async (db) => {
  return await db.myTable.select().resultAsync();
});
```

**Constructor**

```typescript
new SdOrm<T extends DbContext>(
  dbContextType: Type<T>,
  config: TDbConnConf,
  dbContextOpt?: Partial<TDbContextOption>,
)
```

| Parameter       | Type                                   | Description                                                                                                                                           |
| --------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dbContextType` | `Type<T>`                              | The `DbContext` subclass constructor                                                                                                                  |
| `config`        | `TDbConnConf`                          | Database connection configuration                                                                                                                     |
| `dbContextOpt`  | `Partial<TDbContextOption>` (optional) | Overrides for `dialect`, `database`, or `schema` used when constructing the `DbContext`. Falls back to the values from `config` if not provided here. |

**Properties**

| Property        | Type                                     | Description                                         |
| --------------- | ---------------------------------------- | --------------------------------------------------- |
| `dbContextType` | `Type<T>`                                | The `DbContext` class passed at construction        |
| `config`        | `TDbConnConf`                            | The connection configuration passed at construction |
| `dbContextOpt`  | `Partial<TDbContextOption> \| undefined` | Optional context options passed at construction     |

**Methods**

| Method                           | Signature                                                                              | Description                                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `connectAsync`                   | `<R>(callback: (conn: T) => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R>` | Instantiates the `DbContext`, connects with a transaction, executes `callback`, then commits and closes. Rolls back on error.                 |
| `connectWithoutTransactionAsync` | `<R>(callback: (conn: T) => Promise<R>): Promise<R>`                                   | Same as `connectAsync` but without starting a transaction. Suitable for read-only operations or when transaction control is handled manually. |

## Types

The types below are defined in `@simplysm/sd-orm-common` and re-used by this package. They are listed here for reference.

### `TDbConnConf`

Union type for all supported connection configurations.

```typescript
type TDbConnConf = IDefaultDbConnConf | ISqliteDbConnConf;
```

### `IDefaultDbConnConf`

Configuration for MSSQL and MySQL connections.

```typescript
interface IDefaultDbConnConf {
  dialect: "mysql" | "mssql" | "mssql-azure";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: ISOLATION_LEVEL;
}
```

### `ISqliteDbConnConf`

Configuration for SQLite connections.

```typescript
interface ISqliteDbConnConf {
  dialect: "sqlite";
  filePath: string;
}
```

### `ISOLATION_LEVEL`

Transaction isolation levels supported by the connection implementations.

```typescript
type ISOLATION_LEVEL = "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE";
```

> Default isolation levels: MSSQL uses `READ_COMMITTED`; MySQL uses `REPEATABLE_READ`; SQLite ignores the isolation level.

### `IQueryColumnDef`

Column definition used in `bulkInsertAsync` and `bulkUpsertAsync`. Defined in `@simplysm/sd-orm-common`.

```typescript
interface IQueryColumnDef {
  name: string;
  dataType?: Type<TQueryValue> | TSdOrmDataType | string;
  nullable?: boolean;
  autoIncrement?: boolean;
}
```
