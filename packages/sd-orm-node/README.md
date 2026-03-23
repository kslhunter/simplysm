# @simplysm/sd-orm-node

Node.js ORM module providing database connections and query execution for MSSQL, MySQL, and SQLite. Uses connection pooling (via `generic-pool`) for MSSQL and MySQL, and direct connections for SQLite.

## Installation

```bash
npm install @simplysm/sd-orm-node
```

Optional peer dependencies (install based on your database):
- `tedious` -- for MSSQL/Azure SQL
- `mysql2` -- for MySQL
- `sqlite3` -- for SQLite

## API Overview

| API | Type | Description |
|-----|------|-------------|
| `MssqlDbConn` | Class | MSSQL database connection using `tedious` |
| `MysqlDbConn` | Class | MySQL database connection using `mysql2` |
| `SqliteDbConn` | Class | SQLite database connection using `sqlite3` |
| `DbConnFactory` | Class | Factory that creates pooled or direct connections |
| `NodeDbContextExecutor` | Class | Implements `IDbContextExecutor` for Node.js |
| `PooledDbConn` | Class | Connection pool wrapper implementing `IDbConn` |
| `SdOrm` | Class | High-level ORM entry point for typed database access |

## API Reference

### `MssqlDbConn`

MSSQL database connection implementing `IDbConn`. Extends `EventEmitter`. Uses the `tedious` driver with configurable timeout (default: 10 minutes).

```typescript
class MssqlDbConn extends EventEmitter implements IDbConn {
  isConnected: boolean;
  isOnTransaction: boolean;
  readonly config: IDefaultDbConnConf;

  constructor(tedious: typeof import("tedious"), config: IDefaultDbConnConf);

  async connectAsync(): Promise<void>;
  async closeAsync(): Promise<void>;
  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;
  async commitTransactionAsync(): Promise<void>;
  async rollbackTransactionAsync(): Promise<void>;
  async executeAsync(queries: string[]): Promise<any[][]>;
  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>;
  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `connectAsync()` | Establishes a connection to the MSSQL server |
| `closeAsync()` | Closes the connection and waits for pending requests |
| `beginTransactionAsync(isolationLevel?)` | Begins a transaction with optional isolation level (default: `READ_COMMITTED`) |
| `commitTransactionAsync()` | Commits the current transaction |
| `rollbackTransactionAsync()` | Rolls back the current transaction |
| `executeAsync(queries)` | Executes multiple SQL query strings |
| `executeParametrizedAsync(query, params?)` | Executes a parameterized query with `@p0`, `@p1`, ... placeholders |
| `bulkInsertAsync(tableName, columnDefs, records)` | Bulk inserts records using `tedious` BulkLoad |
| `bulkUpsertAsync(...)` | Not supported on MSSQL -- throws an error |

### `MysqlDbConn`

MySQL database connection implementing `IDbConn`. Extends `EventEmitter`. Uses `mysql2/promise` with configurable timeout (default: 5 minutes).

```typescript
class MysqlDbConn extends EventEmitter implements IDbConn {
  isConnected: boolean;
  isOnTransaction: boolean;
  readonly config: IDefaultDbConnConf;

  constructor(mysql2: typeof import("mysql2/promise"), config: IDefaultDbConnConf);

  async connectAsync(): Promise<void>;
  async closeAsync(): Promise<void>;
  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;
  async commitTransactionAsync(): Promise<void>;
  async rollbackTransactionAsync(): Promise<void>;
  async executeAsync(queries: string[]): Promise<any[][]>;
  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>;
  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `connectAsync()` | Connects to MySQL with `utf8mb4` charset and multiple statements enabled |
| `closeAsync()` | Closes the MySQL connection |
| `beginTransactionAsync(isolationLevel?)` | Begins a transaction (default: `REPEATABLE_READ`) |
| `commitTransactionAsync()` | Commits the current transaction |
| `rollbackTransactionAsync()` | Rolls back the current transaction |
| `executeAsync(queries)` | Executes multiple SQL query strings |
| `executeParametrizedAsync(query, params?)` | Executes a parameterized query |
| `bulkInsertAsync(tableName, columnDefs, records)` | Bulk inserts using generated `INSERT INTO ... VALUES` |
| `bulkUpsertAsync(tableName, columnDefs, records)` | Bulk upserts using `ON DUPLICATE KEY UPDATE` |

### `SqliteDbConn`

SQLite database connection implementing `IDbConn`. Extends `EventEmitter`. Uses `sqlite3` with configurable timeout (default: 5 minutes).

```typescript
class SqliteDbConn extends EventEmitter implements IDbConn {
  isConnected: boolean;
  isOnTransaction: boolean;
  readonly config: ISqliteDbConnConf;

  constructor(sqlite3: typeof import("sqlite3"), config: ISqliteDbConnConf);

  async connectAsync(): Promise<void>;
  async closeAsync(): Promise<void>;
  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;
  async commitTransactionAsync(): Promise<void>;
  async rollbackTransactionAsync(): Promise<void>;
  async executeAsync(queries: string[]): Promise<any[][]>;
  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>;
  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `connectAsync()` | Opens the SQLite database file in serialized mode |
| `closeAsync()` | Closes the database file |
| `beginTransactionAsync(isolationLevel?)` | Begins a transaction (isolation level is ignored for SQLite) |
| `commitTransactionAsync()` | Commits the current transaction |
| `rollbackTransactionAsync()` | Rolls back the current transaction |
| `executeAsync(queries)` | Executes multiple SQL query strings |
| `executeParametrizedAsync(query, params?)` | Executes a parameterized query |
| `bulkInsertAsync(tableName, columnDefs, records)` | Bulk inserts using generated `INSERT INTO ... VALUES` |
| `bulkUpsertAsync(tableName, columnDefs, records)` | Bulk upserts using `ON DUPLICATE KEY UPDATE` |

### `DbConnFactory`

Factory class that creates database connections with automatic pooling for MSSQL and MySQL. SQLite connections are created directly (no pooling).

```typescript
class DbConnFactory {
  static async createAsync(config: TDbConnConf): Promise<IDbConn>;
}
```

#### `DbConnFactory.createAsync(config)`

Creates and returns a database connection. For MSSQL and MySQL, returns a `PooledDbConn` backed by a `generic-pool` pool (min: 1, max: 10 connections, 30s acquire/idle timeout). For SQLite, returns a direct `SqliteDbConn`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `TDbConnConf` | Database connection configuration |

**Returns**: `Promise<IDbConn>` -- a connection (pooled or direct).

### `NodeDbContextExecutor`

Implements `IDbContextExecutor` for server-side Node.js usage. Wraps `DbConnFactory` to provide the executor interface expected by `DbContext`.

```typescript
class NodeDbContextExecutor implements IDbContextExecutor {
  constructor(config: TDbConnConf);

  async getInfoAsync(): Promise<{
    dialect: TDbContextOption["dialect"];
    database?: string;
    schema?: string;
  }>;
  async connectAsync(): Promise<void>;
  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;
  async commitTransactionAsync(): Promise<void>;
  async rollbackTransactionAsync(): Promise<void>;
  async closeAsync(): Promise<void>;
  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>;
  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
  async executeDefsAsync(
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]>;
}
```

### `PooledDbConn`

Connection pool wrapper that implements `IDbConn`. Acquires a raw connection from the pool on `connectAsync()` and releases it on `closeAsync()`. Automatically detects physical connection drops and emits `"close"` events.

```typescript
class PooledDbConn extends EventEmitter implements IDbConn {
  get config(): TDbConnConf;
  get isConnected(): boolean;
  get isOnTransaction(): boolean;

  constructor(pool: Pool<IDbConn>, initialConfig: TDbConnConf);

  async connectAsync(): Promise<void>;
  async closeAsync(): Promise<void>;
  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;
  async commitTransactionAsync(): Promise<void>;
  async rollbackTransactionAsync(): Promise<void>;
  async executeAsync(queries: string[]): Promise<any[][]>;
  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>;
  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
}
```

### `SdOrm`

High-level ORM entry point providing typed access to a `DbContext` subclass. Manages connection lifecycle and transaction handling.

```typescript
class SdOrm<T extends DbContext> {
  readonly dbContextType: Type<T>;
  readonly config: TDbConnConf;
  readonly dbContextOpt?: Partial<TDbContextOption>;

  constructor(
    dbContextType: Type<T>,
    config: TDbConnConf,
    dbContextOpt?: Partial<TDbContextOption>,
  );

  async connectAsync<R>(
    callback: (conn: T) => Promise<R>,
    isolationLevel?: ISOLATION_LEVEL,
  ): Promise<R>;

  async connectWithoutTransactionAsync<R>(
    callback: (conn: T) => Promise<R>,
  ): Promise<R>;
}
```

| Method | Description |
|--------|-------------|
| `connectAsync(callback, isolationLevel?)` | Opens a connection with a transaction, executes the callback, and commits/rolls back |
| `connectWithoutTransactionAsync(callback)` | Opens a connection without a transaction and executes the callback |

## Usage Examples

### Using SdOrm (recommended)

```typescript
import { SdOrm } from "@simplysm/sd-orm-node";
import { MyDbContext } from "./MyDbContext";

const orm = new SdOrm(MyDbContext, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// With transaction
const users = await orm.connectAsync(async (db) => {
  return await db.user.resultAsync();
});

// Without transaction
await orm.connectWithoutTransactionAsync(async (db) => {
  const count = await db.user.countAsync();
});
```

### Using DbConnFactory directly

```typescript
import { DbConnFactory } from "@simplysm/sd-orm-node";

const conn = await DbConnFactory.createAsync({
  dialect: "mysql",
  host: "localhost",
  username: "root",
  password: "password",
  database: "mydb",
});

await conn.connectAsync();
await conn.beginTransactionAsync();
const result = await conn.executeAsync(["SELECT * FROM users"]);
await conn.commitTransactionAsync();
await conn.closeAsync();
```
