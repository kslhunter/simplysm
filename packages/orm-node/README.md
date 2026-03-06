# @simplysm/orm-node

Simplysm package - ORM module (node)

Provides Node.js database connection classes, a connection pool wrapper, and a top-level `createOrm` factory for running queries through `@simplysm/orm-common` `DbContext`.

Supports MSSQL, MySQL, and PostgreSQL. Database driver packages (`tedious`, `mysql2`, `pg`, `pg-copy-streams`) are optional peer dependencies — install only the ones you need.

## Installation

```bash
pnpm add @simplysm/orm-node

# Install driver(s) for the database(s) you use
pnpm add tedious          # MSSQL / Azure SQL
pnpm add mysql2           # MySQL
pnpm add pg pg-copy-streams  # PostgreSQL
```

## Types

### `DbConn`

Low-level database connection interface implemented by `MssqlDbConn`, `MysqlDbConn`, and `PostgresqlDbConn`. Extends `EventEmitter<{ close: void }>`.

```typescript
import type { DbConn } from "@simplysm/orm-node";
```

| Member | Type | Description |
|--------|------|-------------|
| `config` | `DbConnConfig` | Connection configuration |
| `isConnected` | `boolean` | Whether connected |
| `isInTransaction` | `boolean` | Whether a transaction is in progress |
| `connect()` | `Promise<void>` | Establish connection |
| `close()` | `Promise<void>` | Close connection |
| `beginTransaction(isolationLevel?)` | `Promise<void>` | Begin transaction |
| `commitTransaction()` | `Promise<void>` | Commit transaction |
| `rollbackTransaction()` | `Promise<void>` | Roll back transaction |
| `execute(queries)` | `Promise<Record<string, unknown>[][]>` | Execute SQL string array |
| `executeParametrized(query, params?)` | `Promise<Record<string, unknown>[][]>` | Execute parameterized query |
| `bulkInsert(tableName, columnMetas, records)` | `Promise<void>` | Bulk insert using native bulk API |

---

### `DbConnConfig`

Union type that selects the correct configuration shape based on `dialect`.

```typescript
import type { DbConnConfig } from "@simplysm/orm-node";

type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;
```

---

### `MysqlDbConnConfig`

```typescript
import type { MysqlDbConnConfig } from "@simplysm/orm-node";
```

| Property | Type | Description |
|----------|------|-------------|
| `dialect` | `"mysql"` | Dialect discriminant |
| `host` | `string` | Hostname |
| `port` | `number` (optional) | Port (default: 3306) |
| `username` | `string` | Username |
| `password` | `string` | Password |
| `database` | `string` (optional) | Database name |
| `defaultIsolationLevel` | `IsolationLevel` (optional) | Default isolation level |
| `pool` | `DbPoolConfig` (optional) | Connection pool settings |

---

### `MssqlDbConnConfig`

```typescript
import type { MssqlDbConnConfig } from "@simplysm/orm-node";
```

| Property | Type | Description |
|----------|------|-------------|
| `dialect` | `"mssql" \| "mssql-azure"` | Dialect discriminant (`mssql-azure` enables TLS encryption) |
| `host` | `string` | Hostname |
| `port` | `number` (optional) | Port (default: 1433) |
| `username` | `string` | Username |
| `password` | `string` | Password |
| `database` | `string` (optional) | Database name |
| `schema` | `string` (optional) | Schema name (default: `dbo`) |
| `defaultIsolationLevel` | `IsolationLevel` (optional) | Default isolation level |
| `pool` | `DbPoolConfig` (optional) | Connection pool settings |

---

### `PostgresqlDbConnConfig`

```typescript
import type { PostgresqlDbConnConfig } from "@simplysm/orm-node";
```

| Property | Type | Description |
|----------|------|-------------|
| `dialect` | `"postgresql"` | Dialect discriminant |
| `host` | `string` | Hostname |
| `port` | `number` (optional) | Port (default: 5432) |
| `username` | `string` | Username |
| `password` | `string` | Password |
| `database` | `string` (optional) | Database name |
| `schema` | `string` (optional) | Schema name (default: `public`) |
| `defaultIsolationLevel` | `IsolationLevel` (optional) | Default isolation level |
| `pool` | `DbPoolConfig` (optional) | Connection pool settings |

---

### `DbPoolConfig`

Connection pool settings shared by all configuration types.

```typescript
import type { DbPoolConfig } from "@simplysm/orm-node";
```

| Property | Type | Description |
|----------|------|-------------|
| `min` | `number` (optional) | Minimum connections in pool (default: `1`) |
| `max` | `number` (optional) | Maximum connections in pool (default: `10`) |
| `acquireTimeoutMillis` | `number` (optional) | Timeout to acquire a connection in ms (default: `30000`) |
| `idleTimeoutMillis` | `number` (optional) | Timeout before an idle connection is destroyed in ms (default: `30000`) |

---

### `getDialectFromConfig`

Utility function that normalizes `"mssql-azure"` to `"mssql"` and returns the `Dialect` value from a `DbConnConfig`.

```typescript
import { getDialectFromConfig } from "@simplysm/orm-node";

const dialect = getDialectFromConfig({ dialect: "mssql-azure", ... }); // "mssql"
```

**Signature**

```typescript
function getDialectFromConfig(config: DbConnConfig): Dialect
```

---

### Constants

| Name | Value | Description |
|------|-------|-------------|
| `DB_CONN_CONNECT_TIMEOUT` | `10000` | Connection establishment timeout in ms (10 seconds) |
| `DB_CONN_DEFAULT_TIMEOUT` | `600000` | Query default timeout in ms (10 minutes) |
| `DB_CONN_ERRORS` | `{ NOT_CONNECTED, ALREADY_CONNECTED }` | Standard connection error message strings |

```typescript
import { DB_CONN_CONNECT_TIMEOUT, DB_CONN_DEFAULT_TIMEOUT, DB_CONN_ERRORS } from "@simplysm/orm-node";
```

---

### `Orm<TDef>`

Type of the object returned from `createOrm`.

```typescript
import type { Orm } from "@simplysm/orm-node";
```

| Member | Type | Description |
|--------|------|-------------|
| `dbContextDef` | `TDef` | DbContext definition |
| `config` | `DbConnConfig` | Connection configuration |
| `options` | `OrmOptions \| undefined` | ORM options |
| `connect(callback, isolationLevel?)` | `Promise<R>` | Execute callback within a transaction |
| `connectWithoutTransaction(callback)` | `Promise<R>` | Execute callback without a transaction |

---

### `OrmOptions`

Options passed to `createOrm` to override connection-level database/schema settings.

```typescript
import type { OrmOptions } from "@simplysm/orm-node";
```

| Property | Type | Description |
|----------|------|-------------|
| `database` | `string` (optional) | Override database name from `DbConnConfig` |
| `schema` | `string` (optional) | Override schema name (MSSQL: `dbo`, PostgreSQL: `public`) |

---

## Connections

### `MssqlDbConn`

MSSQL / Azure SQL database connection. Uses the `tedious` library. Requires `tedious` as a peer dependency.

```typescript
import { MssqlDbConn } from "@simplysm/orm-node";
import tedious from "tedious";

const conn = new MssqlDbConn(tedious, {
  dialect: "mssql",
  host: "localhost",
  username: "sa",
  password: "Password1",
  database: "mydb",
});

await conn.connect();
const results = await conn.execute(["SELECT 1 AS val"]);
await conn.close();
```

**Constructor**

```typescript
new MssqlDbConn(
  tedious: typeof import("tedious"),
  config: MssqlDbConnConfig,
)
```

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `config` | `MssqlDbConnConfig` | Connection configuration |
| `isConnected` | `boolean` | Whether connected |
| `isInTransaction` | `boolean` | Whether transaction is in progress |

**Methods** — implements `DbConn` (see interface above)

---

### `MysqlDbConn`

MySQL database connection. Uses the `mysql2/promise` library. Requires `mysql2` as a peer dependency.

```typescript
import { MysqlDbConn } from "@simplysm/orm-node";
import mysql2 from "mysql2/promise";

const conn = new MysqlDbConn(mysql2, {
  dialect: "mysql",
  host: "localhost",
  username: "root",
  password: "password",
  database: "mydb",
});

await conn.connect();
const results = await conn.execute(["SELECT 1 AS val"]);
await conn.close();
```

**Constructor**

```typescript
new MysqlDbConn(
  mysql2: typeof import("mysql2/promise"),
  config: MysqlDbConnConfig,
)
```

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `config` | `MysqlDbConnConfig` | Connection configuration |
| `isConnected` | `boolean` | Whether connected |
| `isInTransaction` | `boolean` | Whether transaction is in progress |

**Methods** — implements `DbConn` (see interface above)

---

### `PostgresqlDbConn`

PostgreSQL database connection. Uses the `pg` library and `pg-copy-streams` for bulk insert. Requires `pg` and `pg-copy-streams` as peer dependencies.

```typescript
import { PostgresqlDbConn } from "@simplysm/orm-node";
import pg from "pg";
import pgCopyStreams from "pg-copy-streams";

const conn = new PostgresqlDbConn(pg, pgCopyStreams, {
  dialect: "postgresql",
  host: "localhost",
  username: "postgres",
  password: "secret",
  database: "mydb",
});

await conn.connect();
const results = await conn.execute(["SELECT 1 AS val"]);
await conn.close();
```

**Constructor**

```typescript
new PostgresqlDbConn(
  pg: typeof import("pg"),
  pgCopyStreams: typeof import("pg-copy-streams"),
  config: PostgresqlDbConnConfig,
)
```

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `config` | `PostgresqlDbConnConfig` | Connection configuration |
| `isConnected` | `boolean` | Whether connected |
| `isInTransaction` | `boolean` | Whether transaction is in progress |

**Methods** — implements `DbConn` (see interface above)

---

## Core

### `createOrm`

Node.js ORM factory function. Creates an `Orm` instance that binds a `DbContextDef` to a connection configuration and provides `connect` / `connectWithoutTransaction` helpers.

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
const users = await orm.connect(async (db) => {
  return db.user().result();
});

// Execute without a transaction
const users2 = await orm.connectWithoutTransaction(async (db) => {
  return db.user().result();
});
```

**Signature**

```typescript
function createOrm<TDef extends DbContextDef<any, any, any>>(
  dbContextDef: TDef,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<TDef>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dbContextDef` | `TDef` | DbContext definition created with `defineDbContext` |
| `config` | `DbConnConfig` | Database connection configuration |
| `options` | `OrmOptions` (optional) | Override `database` or `schema` from config |

---

### `createDbConn`

Low-level DB connection factory. Acquires a `PooledDbConn` from the internal connection pool for the given configuration. Creates a new pool on first call; reuses the same pool on subsequent calls with the same configuration.

```typescript
import { createDbConn } from "@simplysm/orm-node";

const conn = await createDbConn({
  dialect: "postgresql",
  host: "localhost",
  username: "postgres",
  password: "secret",
  database: "mydb",
});

await conn.connect();
await conn.beginTransaction();
// ... execute queries ...
await conn.commitTransaction();
await conn.close(); // returns connection to pool
```

**Signature**

```typescript
function createDbConn(config: DbConnConfig): Promise<DbConn>
```

---

### `NodeDbContextExecutor`

`DbContextExecutor` implementation for the Node.js environment. Used internally by `createOrm`. Can be passed directly to `createDbContext` from `@simplysm/orm-common` when fine-grained control is needed.

```typescript
import { NodeDbContextExecutor } from "@simplysm/orm-node";
import { createDbContext } from "@simplysm/orm-common";

const executor = new NodeDbContextExecutor({
  dialect: "mssql",
  host: "localhost",
  username: "sa",
  password: "Password1",
  database: "mydb",
});

const db = createDbContext(MyDb, executor, { database: "mydb" });
await db.connect(async () => {
  const rows = await db.user().result();
});
```

**Constructor**

```typescript
new NodeDbContextExecutor(config: DbConnConfig)
```

**Methods** (all delegate to the underlying `DbConn`)

| Method | Description |
|--------|-------------|
| `connect()` | Acquire connection from pool and open it |
| `close()` | Close connection and return it to pool |
| `beginTransaction(isolationLevel?)` | Begin a transaction |
| `commitTransaction()` | Commit the current transaction |
| `rollbackTransaction()` | Roll back the current transaction |
| `executeParametrized(query, params?)` | Execute a parameterized SQL query |
| `bulkInsert(tableName, columnMetas, records)` | Bulk insert using the native bulk API |
| `executeDefs<T = DataRecord>(defs, resultMetas?)` | Build and execute `QueryDef` array, parse results |

---

### `PooledDbConn`

`DbConn` wrapper that manages connection pool lifecycle. Returned by `createDbConn`. Calling `close()` returns the underlying physical connection to the pool rather than terminating it.

```typescript
import { createDbConn } from "@simplysm/orm-node";

const conn = await createDbConn(config); // returns PooledDbConn
await conn.connect();       // acquires physical connection from pool
await conn.close();         // releases physical connection back to pool
```

**Constructor**

```typescript
new PooledDbConn(
  pool: Pool<DbConn>,
  initialConfig: DbConnConfig,
  getLastCreateError?: () => Error | undefined,
)
```

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `config` | `DbConnConfig` | Active connection configuration |
| `isConnected` | `boolean` | Whether a physical connection is currently held |
| `isInTransaction` | `boolean` | Whether a transaction is in progress |

**Methods**

| Method | Description |
|--------|-------------|
| `connect()` | Acquire connection from pool |
| `close()` | Roll back pending transaction (if any) and release connection to pool |
| `beginTransaction(isolationLevel?)` | Begin a transaction |
| `commitTransaction()` | Commit the current transaction |
| `rollbackTransaction()` | Roll back the current transaction |
| `execute(queries)` | Execute SQL string array |
| `executeParametrized(query, params?)` | Execute parameterized SQL query |
| `bulkInsert(tableName, columnMetas, records)` | Bulk insert using native bulk API |
