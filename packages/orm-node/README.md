# @simplysm/orm-node

Node.js ORM module for the Simplysm framework. Provides database connections, query execution, and a high-level ORM factory for MySQL, MSSQL, and PostgreSQL.

## Installation

```bash
npm install @simplysm/orm-node
# or
pnpm add @simplysm/orm-node
```

Peer dependencies (install the driver for your DBMS):
- MySQL: `mysql2`
- MSSQL: `tedious`
- PostgreSQL: `pg`, `pg-copy-streams`

## API Overview

### ORM Factory

| Export | Type | Description |
|--------|------|-------------|
| [`createOrm`](./docs/orm-factory.md#createorm) | Function | Create an ORM instance with connection management |
| [`Orm`](./docs/orm-factory.md#orm) | Interface | ORM instance type with `connect` and `connectWithoutTransaction` |
| [`OrmOptions`](./docs/orm-factory.md#ormoptions) | Interface | ORM options (database/schema override) |

### Query Execution

| Export | Type | Description |
|--------|------|-------------|
| [`NodeDbContextExecutor`](./docs/orm-factory.md#nodedbcontextexecutor) | Class | Node.js `DbContextExecutor` implementation |

### Connection

| Export | Type | Description |
|--------|------|-------------|
| [`createDbConn`](./docs/connection.md#createdbconn) | Function | Create a low-level DB connection |
| [`DbConn`](./docs/connection.md#dbconn) | Interface | Low-level DB connection interface |
| [`MysqlDbConn`](./docs/connection.md#mysqldbconn) | Class | MySQL connection implementation |
| [`MssqlDbConn`](./docs/connection.md#mssqldbconn) | Class | MSSQL connection implementation |
| [`PostgresqlDbConn`](./docs/connection.md#postgresqldbconn) | Class | PostgreSQL connection implementation |

### Config Types

| Export | Type | Description |
|--------|------|-------------|
| [`DbConnConfig`](./docs/connection.md#dbconnconfig) | Type | Union of all dialect-specific configs |
| [`MysqlDbConnConfig`](./docs/connection.md#mysqldbconnconfig) | Interface | MySQL connection config |
| [`MssqlDbConnConfig`](./docs/connection.md#mssqldbconnconfig) | Interface | MSSQL connection config |
| [`PostgresqlDbConnConfig`](./docs/connection.md#postgresqldbconnconfig) | Interface | PostgreSQL connection config |

### Constants & Utilities

| Export | Type | Description |
|--------|------|-------------|
| [`DB_CONN_CONNECT_TIMEOUT`](./docs/connection.md#db_conn_connect_timeout) | Constant | Connection timeout: 10,000ms (10s) |
| [`DB_CONN_DEFAULT_TIMEOUT`](./docs/connection.md#db_conn_default_timeout) | Constant | Query timeout: 600,000ms (10min) |
| [`DB_CONN_ERRORS`](./docs/connection.md#db_conn_errors) | Constant | Error message constants |
| [`getDialectFromConfig`](./docs/connection.md#getdialectfromconfig) | Function | Extract `Dialect` from config (`mssql-azure` -> `mssql`) |

## Usage Examples

### Basic ORM Usage

```typescript
import { defineDbContext } from "@simplysm/orm-common";
import { createOrm } from "@simplysm/orm-node";

const MyDb = defineDbContext({
  tables: { user: User, post: Post },
});

const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// With transaction (auto commit/rollback)
const users = await orm.connect(async (db) => {
  return db.user().execute();
});

// Without transaction (for DDL or read-only)
await orm.connectWithoutTransaction(async (db) => {
  await db.initialize();
});
```

### Low-Level Connection

```typescript
import { createDbConn } from "@simplysm/orm-node";

const conn = await createDbConn({
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

### With OrmOptions Override

```typescript
const orm = createOrm(MyDb, config, {
  database: "other_db",  // Override config.database
  schema: "custom",      // Override config.schema
});
```
