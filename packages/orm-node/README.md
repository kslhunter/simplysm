# @simplysm/orm-node

Simplysm package - ORM module (node). Provides database connection implementations for MySQL, MSSQL, and PostgreSQL, plus a high-level ORM factory for managing DbContext instances with transaction support.

## Installation

```bash
npm install @simplysm/orm-node
```

Database drivers are loaded lazily. Install only the driver(s) you need:

```bash
npm install mysql2          # for MySQL
npm install tedious         # for MSSQL / Azure SQL
npm install pg pg-copy-streams  # for PostgreSQL
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `DbConn` | interface | Low-level DB connection interface |
| `DbConnConfig` | type | Union of all connection config types |
| `MysqlDbConnConfig` | interface | MySQL connection configuration |
| `MssqlDbConnConfig` | interface | MSSQL connection configuration |
| `PostgresqlDbConnConfig` | interface | PostgreSQL connection configuration |
| `DB_CONN_CONNECT_TIMEOUT` | const | Connection timeout (10 seconds) |
| `DB_CONN_DEFAULT_TIMEOUT` | const | Query default timeout (10 minutes) |
| `DB_CONN_ERRORS` | const | Error message constants |
| `getDialectFromConfig` | function | Extract Dialect from DbConnConfig |

### Connections

| API | Type | Description |
|-----|------|-------------|
| `MysqlDbConn` | class | MySQL connection (uses mysql2/promise) |
| `MssqlDbConn` | class | MSSQL/Azure SQL connection (uses tedious) |
| `PostgresqlDbConn` | class | PostgreSQL connection (uses pg) |
| `createDbConn` | function | DB connection factory function |

### Core

| API | Type | Description |
|-----|------|-------------|
| `NodeDbContextExecutor` | class | DbContextExecutor for Node.js |
| `createOrm` | function | ORM factory function |
| `Orm` | interface | ORM instance type |
| `OrmOptions` | interface | ORM options (database/schema override) |

---

### `DbConnConfig`

```typescript
type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;
```

### `MysqlDbConnConfig`

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"mysql"` | Dialect identifier |
| `host` | `string` | Server hostname |
| `port` | `number?` | Server port |
| `username` | `string` | Username |
| `password` | `string` | Password |
| `database` | `string?` | Database name |
| `defaultIsolationLevel` | `IsolationLevel?` | Default transaction isolation level |

### `MssqlDbConnConfig`

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"mssql" \| "mssql-azure"` | Dialect identifier |
| `host` | `string` | Server hostname |
| `port` | `number?` | Server port |
| `username` | `string` | Username |
| `password` | `string` | Password |
| `database` | `string?` | Database name |
| `schema` | `string?` | Schema name |
| `defaultIsolationLevel` | `IsolationLevel?` | Default transaction isolation level |

### `PostgresqlDbConnConfig`

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"postgresql"` | Dialect identifier |
| `host` | `string` | Server hostname |
| `port` | `number?` | Server port |
| `username` | `string` | Username |
| `password` | `string` | Password |
| `database` | `string?` | Database name |
| `schema` | `string?` | Schema name |
| `defaultIsolationLevel` | `IsolationLevel?` | Default transaction isolation level |

### `DbConn`

Interface extending `EventEmitter<{ close: void }>`. Implemented by `MysqlDbConn`, `MssqlDbConn`, and `PostgresqlDbConn`.

| Property/Method | Signature | Description |
|-----------------|-----------|-------------|
| `config` | `DbConnConfig` | Connection configuration |
| `isConnected` | `boolean` | Whether connected |
| `isInTransaction` | `boolean` | Whether transaction is in progress |
| `connect` | `() => Promise<void>` | Establish DB connection |
| `close` | `() => Promise<void>` | Close DB connection |
| `beginTransaction` | `(isolationLevel?: IsolationLevel) => Promise<void>` | Begin transaction |
| `commitTransaction` | `() => Promise<void>` | Commit transaction |
| `rollbackTransaction` | `() => Promise<void>` | Rollback transaction |
| `execute` | `(queries: string[]) => Promise<Record<string, unknown>[][]>` | Execute SQL query array |
| `executeParametrized` | `(query: string, params?: unknown[]) => Promise<Record<string, unknown>[][]>` | Execute parameterized query |
| `bulkInsert` | `(tableName: string, columnMetas: Record<string, ColumnMeta>, records: Record<string, unknown>[]) => Promise<void>` | Bulk INSERT using native API |

### `createDbConn`

```typescript
function createDbConn(config: DbConnConfig): Promise<DbConn>
```

Factory function that creates a DB connection instance. The returned connection is **not yet connected** -- call `connect()` separately. Database drivers are lazily loaded.

### `getDialectFromConfig`

```typescript
function getDialectFromConfig(config: DbConnConfig): Dialect
```

Extracts the `Dialect` from a config. Maps `"mssql-azure"` to `"mssql"`.

### `OrmOptions`

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string?` | Database name (overrides DbConnConfig's database) |
| `schema` | `string?` | Schema name (MSSQL: dbo, PostgreSQL: public) |

### `Orm<TDef>`

| Property/Method | Signature | Description |
|-----------------|-----------|-------------|
| `dbContextDef` | `TDef` | DbContext definition |
| `config` | `DbConnConfig` | Connection configuration |
| `options` | `OrmOptions?` | ORM options |
| `connect` | `<R>(callback: (conn: DbContextInstance<TDef>) => Promise<R>, isolationLevel?: IsolationLevel) => Promise<R>` | Execute callback within a transaction |
| `connectWithoutTransaction` | `<R>(callback: (conn: DbContextInstance<TDef>) => Promise<R>) => Promise<R>` | Execute callback without a transaction |

### `createOrm`

```typescript
function createOrm<TDef extends DbContextDef<any, any, any>>(
  dbContextDef: TDef,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<TDef>
```

### `NodeDbContextExecutor`

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(config: DbConnConfig)` | Create executor with connection config |
| `connect` | `() => Promise<void>` | Establish DB connection |
| `close` | `() => Promise<void>` | Close DB connection |
| `beginTransaction` | `(isolationLevel?: IsolationLevel) => Promise<void>` | Begin transaction |
| `commitTransaction` | `() => Promise<void>` | Commit transaction |
| `rollbackTransaction` | `() => Promise<void>` | Rollback transaction |
| `executeParametrized` | `(query: string, params?: unknown[]) => Promise<Record<string, unknown>[][]>` | Execute parameterized query |
| `bulkInsert` | `(tableName: string, columnMetas: Record<string, ColumnMeta>, records: DataRecord[]) => Promise<void>` | Bulk insert |
| `executeDefs` | `<T>(defs: QueryDef[], resultMetas?: (ResultMeta \| undefined)[]) => Promise<T[][]>` | Execute QueryDef array |

## Usage Examples

### Using createOrm (recommended)

```typescript
import { createOrm } from "@simplysm/orm-node";
import { defineDbContext, queryable } from "@simplysm/orm-common";

const MyDb = defineDbContext({
  user: (db) => queryable(db, User),
});

const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// Execute within a transaction
await orm.connect(async (db) => {
  const users = await db.user().execute();
  return users;
});

// Execute without a transaction
await orm.connectWithoutTransaction(async (db) => {
  const users = await db.user().execute();
  return users;
});
```

### Using low-level connection

```typescript
import { createDbConn } from "@simplysm/orm-node";

const conn = await createDbConn({
  dialect: "postgresql",
  host: "localhost",
  username: "admin",
  password: "secret",
  database: "testdb",
});

await conn.connect();
try {
  const results = await conn.execute(["SELECT * FROM users"]);
} finally {
  await conn.close();
}
```
