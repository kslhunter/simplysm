# @simplysm/orm-node

The Node.js implementation module of Simplysm ORM, responsible for actual database connections, query execution, transaction management, and connection pooling for MySQL, MSSQL (SQL Server), and PostgreSQL. This is the layer that directly communicates with databases in a Node.js environment, based on the schemas and query builders defined in `@simplysm/orm-common`.

## Installation

```bash
npm install @simplysm/orm-node
# or
pnpm add @simplysm/orm-node
```

### Database-Specific Driver Installation

You must additionally install the driver for your database. Drivers not in use don't need to be installed.

```bash
# MySQL
npm install mysql2

# SQL Server (MSSQL)
npm install tedious

# PostgreSQL
npm install pg pg-copy-streams
```

## Architecture

```
createOrm() (top-level entry point)
  └── NodeDbContextExecutor (executor between DbContext and actual DB)
        └── createDbConn() (connection creation and pool management)
              └── PooledDbConn (connection pool wrapper)
                    └── MysqlDbConn / MssqlDbConn / PostgresqlDbConn (DBMS-specific low-level connections)
```

- `createOrm()` is the top-level factory function that takes a `DbContext` type and connection settings to manage transactions.
- `NodeDbContextExecutor` is the executor used by `DbContext`, converting `QueryDef` to SQL and executing it.
- `createDbConn()` is a factory function that acquires connections from the connection pool.
- `PooledDbConn` is a connection pool wrapper based on `generic-pool`, returning connections to the pool instead of closing them after use.
- Each DBMS-specific connection class (`MysqlDbConn`, `MssqlDbConn`, `PostgresqlDbConn`) directly uses low-level DB drivers.

## Main Modules

### Functions

| Function | Description |
|----------|-------------|
| `createOrm()` | ORM factory function. Takes `DbContext` type and connection settings to manage transaction-based connections. |
| `createDbConn()` | Connection factory function. Caches connection pools by configuration and returns `PooledDbConn`. |

### Classes

| Class | Description |
|--------|------|
| `NodeDbContextExecutor` | `DbContextExecutor` implementation. Converts `QueryDef` to SQL, executes it, and parses results. |
| `PooledDbConn` | Connection pool wrapper. Acquires/returns physical connections from `generic-pool`, implements `DbConn` interface. |
| `MysqlDbConn` | MySQL connection class. Uses `mysql2/promise` driver. |
| `MssqlDbConn` | MSSQL/Azure SQL connection class. Uses `tedious` driver. |
| `PostgresqlDbConn` | PostgreSQL connection class. Uses `pg` and `pg-copy-streams` drivers. |

### Interfaces and Types

| Type | Description |
|------|------|
| `DbConn` | Low-level DB connection interface. Implemented by all DBMS-specific connection classes. |
| `DbConnConfig` | DB connection config union type (`MysqlDbConnConfig \| MssqlDbConnConfig \| PostgresqlDbConnConfig`). |
| `MysqlDbConnConfig` | MySQL connection config. `dialect: "mysql"`. |
| `MssqlDbConnConfig` | MSSQL connection config. `dialect: "mssql" \| "mssql-azure"`. |
| `PostgresqlDbConnConfig` | PostgreSQL connection config. `dialect: "postgresql"`. |
| `DbPoolConfig` | Connection pool config (`min`, `max`, `acquireTimeoutMillis`, `idleTimeoutMillis`). |
| `OrmOptions` | `createOrm()` options. `database`, `schema` settings that override `DbConnConfig`. |

### Constants and Utility Functions

| Name | Description |
|------|------|
| `DB_CONN_DEFAULT_TIMEOUT` | DB connection default timeout (10 minutes, 600000ms). |
| `DB_CONN_ERRORS` | DB connection error message constants (`NOT_CONNECTED`, `ALREADY_CONNECTED`). |
| `getDialectFromConfig(config)` | Extract `Dialect` from `DbConnConfig`. `"mssql-azure"` is converted to `"mssql"`. |

## Usage

### Basic Usage with createOrm

`createOrm()` is the top-level factory function used with `DbContext`. It automatically handles transaction management.

```typescript
import { createOrm } from "@simplysm/orm-node";
import { DbContext, queryable, Table } from "@simplysm/orm-common";

// 1. Define table
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }))
  .primaryKey("id");

// 2. Define DbContext
class MyDb extends DbContext {
  readonly user = queryable(this, User);
}

// 3. Create ORM instance
const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// 4. Execute queries within transaction (commits on success, rolls back on failure)
const users = await orm.connect(async (db) => {
  return await db.user().result();
});
```

### Transaction Management

```typescript
// Execute within transaction (auto commit/rollback)
await orm.connect(async (db) => {
  await db.user().insert([
    { name: "John Doe", email: "john@example.com" },
    { name: "Jane Smith", email: "jane@example.com" },
  ]);
  // Commits if callback completes successfully
  // Auto rollback if exception occurs
});

// Specify isolation level
await orm.connect(async (db) => {
  const users = await db.user().result();
  return users;
}, "SERIALIZABLE");

// Execute without transaction (for DDL operations, etc.)
await orm.connectWithoutTransaction(async (db) => {
  const users = await db.user().result();
  return users;
});
```

Supported isolation levels (`IsolationLevel`):
- `"READ_UNCOMMITTED"`
- `"READ_COMMITTED"`
- `"REPEATABLE_READ"`
- `"SERIALIZABLE"`

### Overriding database/schema via OrmOptions

Using `OrmOptions`, you can use different values instead of the `database`/`schema` set in `DbConnConfig`.

```typescript
const orm = createOrm(MyDb, {
  dialect: "postgresql",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "default_db",    // Default DB used for connection
  schema: "public",
}, {
  database: "app_db",        // DB to use in DbContext (takes precedence)
  schema: "app_schema",      // Schema to use in DbContext (takes precedence)
});
```

### Connection Pool Configuration

Configure connection pool via the `pool` field in `DbConnConfig`. The pool is based on the `generic-pool` library, and pools are automatically cached for identical configurations.

```typescript
const orm = createOrm(MyDb, {
  dialect: "mssql",
  host: "localhost",
  port: 1433,
  username: "sa",
  password: "password",
  database: "mydb",
  pool: {
    min: 2,                      // Minimum connections (default: 1)
    max: 20,                     // Maximum connections (default: 10)
    acquireTimeoutMillis: 60000, // Connection acquisition timeout (default: 30000ms)
    idleTimeoutMillis: 60000,    // Idle connection timeout (default: 30000ms)
  },
});
```

### Low-Level Connection with createDbConn

You can connect directly to the DB and execute SQL without `createOrm`/`DbContext`. `createDbConn()` returns `PooledDbConn` from the connection pool.

```typescript
import { createDbConn } from "@simplysm/orm-node";

// Create connection (acquire from pool)
const conn = await createDbConn({
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// Connect
await conn.connect();

try {
  // Execute SQL
  const results = await conn.execute(["SELECT * FROM User WHERE id = 1"]);
  console.log(results); // [[{ id: 1, name: "John Doe", ... }]]

  // Manual transaction management
  await conn.beginTransaction("READ_COMMITTED");
  await conn.execute(["INSERT INTO User (name) VALUES ('Jane Smith')"]);
  await conn.commitTransaction();
} catch (err) {
  if (conn.isOnTransaction) {
    await conn.rollbackTransaction();
  }
  throw err;
} finally {
  // Return connection (returns to pool, not actual close)
  await conn.close();
}
```

### Parameterized Query Execution

Each connection class supports parameter binding via the `executeParametrized()` method.

```typescript
const conn = await createDbConn({
  dialect: "postgresql",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "mydb",
});

await conn.connect();

// Parameterized query (uses DBMS-specific placeholders like $1, $2)
const results = await conn.executeParametrized(
  "SELECT * FROM \"User\" WHERE name = $1",
  ["John Doe"],
);

await conn.close();
```

### Bulk INSERT

Supports bulk data insertion using native bulk APIs for each DBMS.

| DBMS | Bulk Method |
|------|----------|
| MySQL | `LOAD DATA LOCAL INFILE` (temporary CSV file) |
| MSSQL | tedious `BulkLoad` API |
| PostgreSQL | `COPY FROM STDIN` (pg-copy-streams) |

```typescript
import type { ColumnMeta } from "@simplysm/orm-common";

const conn = await createDbConn({
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

await conn.connect();

// Define column metadata
const columnMetas: Record<string, ColumnMeta> = {
  name: { dataType: { type: "varchar", length: 100 } },
  email: { dataType: { type: "varchar", length: 200 }, nullable: true },
  age: { dataType: { type: "int" } },
};

// Insert bulk records
const records = [
  { name: "John Doe", email: "john@example.com", age: 30 },
  { name: "Jane Smith", email: "jane@example.com", age: 25 },
  // ... thousands of records
];

await conn.bulkInsert("mydb.User", columnMetas, records);
await conn.close();
```

### DBMS-Specific Connection Configuration

#### MySQL

```typescript
const mysqlConfig: MysqlDbConnConfig = {
  dialect: "mysql",
  host: "localhost",
  port: 3306,                                  // Optional (default: 3306)
  username: "root",
  password: "password",
  database: "mydb",                            // Optional
  defaultIsolationLevel: "READ_UNCOMMITTED",   // Optional (default isolation level)
  pool: { min: 1, max: 10 },                   // Optional (connection pool)
};
```

MySQL connection characteristics:
- `multipleStatements: true` -- Can execute multiple SQL statements in one request
- `charset: "utf8mb4"` -- Supports 4-byte characters like emojis
- `LOAD DATA LOCAL INFILE` support (for bulk INSERT)
- `root` user can connect without binding to a specific database and access all DBs

#### MSSQL / Azure SQL

```typescript
const mssqlConfig: MssqlDbConnConfig = {
  dialect: "mssql",               // Or "mssql-azure" (for Azure SQL Database)
  host: "localhost",
  port: 1433,                     // Optional
  username: "sa",
  password: "password",
  database: "mydb",               // Optional
  schema: "dbo",                  // Optional (MSSQL schema)
  defaultIsolationLevel: "READ_UNCOMMITTED",  // Optional
  pool: { min: 1, max: 10 },     // Optional
};
```

MSSQL connection characteristics:
- `encrypt: true` automatically set when using `"mssql-azure"` dialect
- `trustServerCertificate: true` default setting
- `useUTC: false` -- Uses local timezone

#### PostgreSQL

```typescript
const pgConfig: PostgresqlDbConnConfig = {
  dialect: "postgresql",
  host: "localhost",
  port: 5432,                     // Optional (default: 5432)
  username: "postgres",
  password: "password",
  database: "mydb",               // Optional
  schema: "public",               // Optional (PostgreSQL schema)
  defaultIsolationLevel: "READ_UNCOMMITTED",  // Optional
  pool: { min: 1, max: 10 },     // Optional
};
```

## DbConn Interface

The common interface implemented by all DBMS-specific connection classes (`MysqlDbConn`, `MssqlDbConn`, `PostgresqlDbConn`) and `PooledDbConn`.

| Method/Property | Signature | Description |
|------------|----------|------|
| `config` | `DbConnConfig` | Connection config (read-only) |
| `isConnected` | `boolean` | Connection status |
| `isOnTransaction` | `boolean` | Transaction in progress |
| `connect()` | `() => Promise<void>` | Establish DB connection |
| `close()` | `() => Promise<void>` | Close DB connection (PooledDbConn returns to pool) |
| `beginTransaction()` | `(isolationLevel?: IsolationLevel) => Promise<void>` | Start transaction |
| `commitTransaction()` | `() => Promise<void>` | Commit transaction |
| `rollbackTransaction()` | `() => Promise<void>` | Rollback transaction |
| `execute()` | `(queries: string[]) => Promise<unknown[][]>` | Execute SQL query array |
| `executeParametrized()` | `(query: string, params?: unknown[]) => Promise<unknown[][]>` | Execute parameterized query |
| `bulkInsert()` | `(tableName: string, columnMetas: Record<string, ColumnMeta>, records: Record<string, unknown>[]) => Promise<void>` | Native bulk INSERT |

`DbConn` extends `EventEmitter<{ close: void }>`, so you can listen for connection close events with `on("close", handler)` / `off("close", handler)`.

## Supported Databases

| Database | Driver Package | dialect Value | Minimum Version |
|-------------|----------------|------------|----------|
| MySQL | `mysql2` | `"mysql"` | 8.0.14+ |
| SQL Server | `tedious` | `"mssql"` | 2012+ |
| Azure SQL Database | `tedious` | `"mssql-azure"` | - |
| PostgreSQL | `pg`, `pg-copy-streams` | `"postgresql"` | 9.0+ |

## Caveats

### Timeouts

- Default connection timeout is 10 minutes (`DB_CONN_DEFAULT_TIMEOUT = 600000ms`).
- Connections are automatically closed if idle for more than twice the timeout (20 minutes).
- Connection pool's `acquireTimeoutMillis` (default 30s) and `idleTimeoutMillis` (default 30s) operate separately.

### SQL Injection Security

`@simplysm/orm-common` uses string escaping instead of parameter binding due to its dynamic query nature. Therefore, when passing user input to ORM queries, you must perform input validation at the application level. Refer to the "ORM Security Guide" in `CLAUDE.md` at the project root for details.

### Driver Lazy Loading

DBMS-specific drivers (`mysql2`, `tedious`, `pg`) are lazy-loaded within `createDbConn()`. Therefore, import errors won't occur even if unused drivers are not installed.

### PooledDbConn close Behavior

`PooledDbConn.close()` returns the connection to the pool instead of closing the actual physical connection. If `close()` is called while a transaction is in progress, it automatically attempts to rollback before returning to the pool.

## Dependencies

| Package | Purpose |
|--------|------|
| `mysql2` | MySQL driver |
| `tedious` | MSSQL driver |
| `pg` | PostgreSQL driver |
| `pg-copy-streams` | PostgreSQL bulk COPY support |

## License

Apache-2.0
