# ORM Factory & Query Execution

High-level ORM instance creation and Node.js query execution.

## createOrm

```typescript
function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>
```

Creates an ORM instance that manages DbContext creation and database connections. Each `connect()` or `connectWithoutTransaction()` call creates a fresh DbContext and connection.

The `database` parameter is required -- it is resolved from `options.database` first, then `config.database`. An error is thrown if neither is provided.

| Parameter | Type | Description |
|-----------|------|-------------|
| `DbClass` | `new (executor, opt) => T` | DbContext subclass constructor |
| `config` | `DbConnConfig` | Database connection configuration |
| `options` | `OrmOptions?` | Optional overrides for database/schema |

```typescript
import { DbContext } from "@simplysm/orm-common";
import { createOrm } from "@simplysm/orm-node";

class MyDb extends DbContext {
  user = this.queryable(User);
  post = this.queryable(Post);
}

const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// Transaction mode
await orm.connect(async (db) => {
  const users = await db.user().execute();
  return users;
});

// No-transaction mode (for DDL, read-only)
await orm.connectWithoutTransaction(async (db) => {
  // ...
});
```

## Orm

```typescript
interface Orm<T extends DbContext> {
  readonly DbClass: new (
    executor: DbContextExecutor,
    opt: { database: string; schema?: string },
  ) => T;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;
  connect<R>(callback: (conn: T) => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  connectWithoutTransaction<R>(callback: (conn: T) => Promise<R>): Promise<R>;
}
```

ORM instance returned by `createOrm()`.

| Field | Type | Description |
|-------|------|-------------|
| `DbClass` | `new (executor, opt) => T` | The DbContext subclass constructor |
| `config` | `DbConnConfig` | The connection configuration |
| `options` | `OrmOptions?` | The ORM options |

| Method | Signature | Description |
|--------|-----------|-------------|
| `connect` | `<R>(callback: (conn: T) => Promise<R>, isolationLevel?) => Promise<R>` | Open connection, begin transaction, execute callback, commit (auto-rollback on error), close |
| `connectWithoutTransaction` | `<R>(callback: (conn: T) => Promise<R>) => Promise<R>` | Open connection, execute callback, close (no transaction) |

## OrmOptions

```typescript
interface OrmOptions {
  database?: string;
  schema?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string?` | Override the database name from `DbConnConfig` |
| `schema` | `string?` | Override the schema name (MSSQL: dbo, PostgreSQL: public) |

## NodeDbContextExecutor

```typescript
class NodeDbContextExecutor implements DbContextExecutor {
  constructor(config: DbConnConfig);
}
```

Node.js implementation of `DbContextExecutor`. Manages a single database connection and provides query execution capabilities.

| Method | Signature | Description |
|--------|-----------|-------------|
| `connect` | `() => Promise<void>` | Establish DB connection |
| `close` | `() => Promise<void>` | Close DB connection |
| `beginTransaction` | `(isolationLevel?: IsolationLevel) => Promise<void>` | Start transaction |
| `commitTransaction` | `() => Promise<void>` | Commit transaction |
| `rollbackTransaction` | `() => Promise<void>` | Rollback transaction |
| `executeParametrized` | `(query: string, params?: unknown[]) => Promise<Record<string, unknown>[][]>` | Execute parameterized SQL query |
| `bulkInsert` | `(tableName: string, columnMetas: Record<string, ColumnMeta>, records: DataRecord[]) => Promise<void>` | Bulk insert using native DB API |
| `executeDefs` | `<T>(defs: QueryDef[], resultMetas?: (ResultMeta \| undefined)[]) => Promise<T[][]>` | Execute QueryDef array (builds SQL via `createQueryBuilder`, parses results via `parseQueryResult`) |

The `executeDefs` method:
1. Builds SQL from each QueryDef using the dialect-specific QueryBuilder
2. If no resultMetas need data, combines all SQL into a single execution
3. Otherwise executes each QueryDef individually
4. Parses results using `parseQueryResult` when ResultMeta is provided
