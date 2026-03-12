# Connections

Low-level database connection classes implementing the `DbConn` interface. Each class wraps a native driver for a specific DBMS.

## `DbConn` Interface

All connection classes implement this interface, which extends `EventEmitter<{ close: void }>`.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `config` | `DbConnConfig` | Connection configuration |
| `isConnected` | `boolean` | Whether the connection is active |
| `isInTransaction` | `boolean` | Whether a transaction is in progress |

### Methods

#### `connect(): Promise<void>`

Establishes the database connection.

#### `close(): Promise<void>`

Closes the database connection.

#### `beginTransaction(isolationLevel?): Promise<void>`

Begins a transaction with an optional isolation level. Defaults to `READ_UNCOMMITTED` if not specified in the method call or in the connection config's `defaultIsolationLevel`.

#### `commitTransaction(): Promise<void>`

Commits the current transaction.

#### `rollbackTransaction(): Promise<void>`

Rolls back the current transaction.

#### `execute(queries): Promise<Record<string, unknown>[][]>`

Executes an array of SQL query strings. Returns an array of result sets (one per query). Empty strings are skipped.

| Parameter | Type | Description |
|-----------|------|-------------|
| `queries` | `string[]` | SQL query strings |

#### `executeParametrized(query, params?): Promise<Record<string, unknown>[][]>`

Executes a single parameterized SQL query.

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | SQL query string |
| `params` | `unknown[]` | Optional binding parameters |

#### `bulkInsert(tableName, columnMetas, records): Promise<void>`

Performs a high-performance bulk insert using native DBMS mechanisms.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tableName` | `string` | Target table (e.g., `database.table` or `database.schema.table`) |
| `columnMetas` | `Record<string, ColumnMeta>` | Column name to metadata mapping |
| `records` | `Record<string, unknown>[]` | Records to insert |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | `void` | Emitted when the connection is closed |

---

## `MysqlDbConn`

MySQL connection using the `mysql2/promise` library.

- **Bulk insert** uses `LOAD DATA LOCAL INFILE` with a temporary CSV file.
- UUID and binary columns are stored via `UNHEX()` conversion.
- Root user (`root`) connects without binding to a specific database.
- Connection timeout: 10 minutes (auto-close after 20 minutes idle).

```typescript
import { MysqlDbConn } from "@simplysm/orm-node";

const mysql = await import("mysql2/promise");
const conn = new MysqlDbConn(mysql, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

await conn.connect();
const results = await conn.execute(["SELECT * FROM users"]);
await conn.close();
```

---

## `MssqlDbConn`

MSSQL / Azure SQL connection using the `tedious` library.

- **Bulk insert** uses tedious `BulkLoad` API.
- Supports `mssql-azure` dialect for Azure SQL with encryption enabled.
- Connection timeout: 10 seconds, query timeout: 10 minutes.
- Auto-close after 20 minutes idle.

```typescript
import { MssqlDbConn } from "@simplysm/orm-node";

const tedious = await import("tedious");
const conn = new MssqlDbConn(tedious, {
  dialect: "mssql",
  host: "localhost",
  port: 1433,
  username: "sa",
  password: "password",
  database: "mydb",
});

await conn.connect();
const results = await conn.execute(["SELECT * FROM users"]);
await conn.close();
```

---

## `PostgresqlDbConn`

PostgreSQL connection using the `pg` library with `pg-copy-streams` for bulk operations.

- **Bulk insert** uses `COPY FROM STDIN` with CSV format.
- Binary columns use PostgreSQL `bytea` hex format (`\x...`).
- Default port: 5432.
- Connection timeout: 10 seconds, query timeout: 10 minutes.

```typescript
import { PostgresqlDbConn } from "@simplysm/orm-node";

const pg = await import("pg");
const pgCopyStreams = await import("pg-copy-streams");
const conn = new PostgresqlDbConn(pg, pgCopyStreams, {
  dialect: "postgresql",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "mydb",
});

await conn.connect();
const results = await conn.execute(["SELECT * FROM users"]);
await conn.close();
```
