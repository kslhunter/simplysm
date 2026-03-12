# @simplysm/orm-node

Node.js ORM module supporting MySQL, MSSQL (including Azure SQL), and PostgreSQL. Provides connection pooling, transaction management, bulk insert, and a high-level ORM factory that integrates with `@simplysm/orm-common` DbContext.

## Installation

```bash
npm install @simplysm/orm-node
```

Install the peer dependency for your target database:

| Database   | Peer dependency                  |
|------------|----------------------------------|
| MySQL      | `mysql2`                         |
| MSSQL      | `tedious`                        |
| PostgreSQL | `pg` + `pg-copy-streams`         |

## Quick Start

```typescript
import { defineDbContext, queryable } from "@simplysm/orm-common";
import { createOrm } from "@simplysm/orm-node";

// 1. Define a DbContext
const MyDb = defineDbContext({
  user: (db) => queryable(db, User),
});

// 2. Create an ORM instance
const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// 3. Execute queries within a transaction
const users = await orm.connect(async (db) => {
  return await db.user().execute();
});

// 4. Execute queries without a transaction
const users2 = await orm.connectWithoutTransaction(async (db) => {
  return await db.user().execute();
});
```

## Documentation

| Category | File | Description |
|----------|------|-------------|
| ORM Factory | [docs/create-orm.md](docs/create-orm.md) | `createOrm` factory function, `Orm` and `OrmOptions` types |
| Connections | [docs/connections.md](docs/connections.md) | `DbConn` interface, `MysqlDbConn`, `MssqlDbConn`, `PostgresqlDbConn` |
| Connection Factory & Pooling | [docs/pooling.md](docs/pooling.md) | `createDbConn`, `PooledDbConn`, connection pool management |
| Configuration | [docs/configuration.md](docs/configuration.md) | `DbConnConfig`, `DbPoolConfig`, dialect-specific config types |
| Context Executor | [docs/context-executor.md](docs/context-executor.md) | `NodeDbContextExecutor` for DbContext integration |
| Constants | [docs/constants.md](docs/constants.md) | Timeout values and error message constants |
