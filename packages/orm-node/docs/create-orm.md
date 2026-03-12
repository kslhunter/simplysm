# ORM Factory

High-level factory for creating ORM instances that manage DbContext lifecycle and transactions.

## `createOrm(dbContextDef, config, options?)`

Creates an `Orm` instance that binds a DbContext definition to a database connection configuration.

```typescript
import { defineDbContext, queryable } from "@simplysm/orm-common";
import { createOrm } from "@simplysm/orm-node";

const MyDb = defineDbContext({
  user: (db) => queryable(db, User),
  order: (db) => queryable(db, Order),
});

const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `dbContextDef` | `DbContextDef` | DbContext definition created with `defineDbContext` |
| `config` | `DbConnConfig` | Database connection configuration |
| `options` | `OrmOptions` | Optional overrides for database/schema |

**Returns:** `Orm<TDef>`

## `Orm<TDef>`

The object returned by `createOrm`.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `dbContextDef` | `TDef` | The DbContext definition |
| `config` | `DbConnConfig` | The connection configuration |
| `options` | `OrmOptions \| undefined` | Optional overrides |

### `orm.connect(callback, isolationLevel?)`

Executes a callback within a transaction. The transaction is automatically committed on success and rolled back on error.

```typescript
const result = await orm.connect(async (db) => {
  const users = await db.user().execute();
  return users;
}, "READ_COMMITTED");
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(conn: DbContextInstance<TDef>) => Promise<R>` | Callback receiving the DbContext instance |
| `isolationLevel` | `IsolationLevel` | Optional transaction isolation level |

**Returns:** `Promise<R>` -- the callback's return value.

### `orm.connectWithoutTransaction(callback)`

Executes a callback without wrapping in a transaction.

```typescript
const result = await orm.connectWithoutTransaction(async (db) => {
  const users = await db.user().execute();
  return users;
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(conn: DbContextInstance<TDef>) => Promise<R>` | Callback receiving the DbContext instance |

**Returns:** `Promise<R>` -- the callback's return value.

## `OrmOptions`

Options that override values from `DbConnConfig`.

| Property | Type | Description |
|----------|------|-------------|
| `database` | `string \| undefined` | Database name (overrides config's `database`) |
| `schema` | `string \| undefined` | Schema name (e.g., `dbo` for MSSQL, `public` for PostgreSQL) |

```typescript
const orm = createOrm(MyDb, config, {
  database: "other_db",
  schema: "custom_schema",
});
```
