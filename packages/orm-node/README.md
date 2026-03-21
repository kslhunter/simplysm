# @simplysm/orm-node

ORM module (node) -- database connections and ORM integration for MySQL, PostgreSQL, and MSSQL on Node.js.

## Installation

```bash
npm install @simplysm/orm-node
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `DB_CONN_CONNECT_TIMEOUT` | const | Connection establishment timeout (10 seconds) |
| `DB_CONN_DEFAULT_TIMEOUT` | const | Query default timeout (10 minutes) |
| `DB_CONN_ERRORS` | const | Error message constants (`NOT_CONNECTED`, `ALREADY_CONNECTED`) |
| `DbConn` | interface | Low-level DB connection interface |
| `DbConnConfig` | type | Union of all DB connection configs |
| `MysqlDbConnConfig` | interface | MySQL connection configuration |
| `MssqlDbConnConfig` | interface | MSSQL/Azure SQL connection configuration |
| `PostgresqlDbConnConfig` | interface | PostgreSQL connection configuration |
| `getDialectFromConfig` | function | Extract `Dialect` from a `DbConnConfig` |

### Connections

| API | Type | Description |
|-----|------|-------------|
| `createDbConn` | function | Factory function to create a DB connection from config |
| `MysqlDbConn` | class | MySQL connection implementation (mysql2) |
| `PostgresqlDbConn` | class | PostgreSQL connection implementation (pg) |
| `MssqlDbConn` | class | MSSQL connection implementation (tedious) |

### Core

| API | Type | Description |
|-----|------|-------------|
| `OrmOptions` | interface | ORM options (database name, schema override) |
| `Orm` | interface | ORM instance with `connect` and `connectWithoutTransaction` |
| `createOrm` | function | Create an ORM instance from a DbContext definition and config |
| `NodeDbContextExecutor` | class | DbContextExecutor for Node.js environment |

## `DbConnConfig`

```typescript
type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;
```

## `MysqlDbConnConfig`

```typescript
interface MysqlDbConnConfig {
  dialect: "mysql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

## `MssqlDbConnConfig`

```typescript
interface MssqlDbConnConfig {
  dialect: "mssql" | "mssql-azure";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

## `PostgresqlDbConnConfig`

```typescript
interface PostgresqlDbConnConfig {
  dialect: "postgresql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

## `DbConn`

```typescript
interface DbConn extends EventEmitter<{ close: void }> {
  config: DbConnConfig;
  isConnected: boolean;
  isInTransaction: boolean;
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  execute(queries: string[]): Promise<Record<string, unknown>[][]>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

## `getDialectFromConfig`

```typescript
function getDialectFromConfig(config: DbConnConfig): Dialect;
```

Returns the `Dialect` for a given config. Maps `"mssql-azure"` to `"mssql"`.

## `createDbConn`

```typescript
async function createDbConn(config: DbConnConfig): Promise<DbConn>;
```

Factory function that creates a DB connection. Driver modules (mysql2, pg, tedious) are lazy-loaded. Returns an unconnected instance -- call `connect()` separately.

## `OrmOptions`

```typescript
interface OrmOptions {
  database?: string;
  schema?: string;
}
```

## `Orm`

```typescript
interface Orm<TDef extends DbContextDef<any, any, any>> {
  readonly dbContextDef: TDef;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;
  connect<R>(
    callback: (conn: DbContextInstance<TDef>) => Promise<R>,
    isolationLevel?: IsolationLevel,
  ): Promise<R>;
  connectWithoutTransaction<R>(
    callback: (conn: DbContextInstance<TDef>) => Promise<R>,
  ): Promise<R>;
}
```

## `createOrm`

```typescript
function createOrm<TDef extends DbContextDef<any, any, any>>(
  dbContextDef: TDef,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<TDef>;
```

Node.js ORM factory. Creates an instance that manages DbContext and DB connections with automatic transaction handling.

## `NodeDbContextExecutor`

```typescript
class NodeDbContextExecutor implements DbContextExecutor {
  constructor(config: DbConnConfig);
  async connect(): Promise<void>;
  async close(): Promise<void>;
  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  async commitTransaction(): Promise<void>;
  async rollbackTransaction(): Promise<void>;
  async executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  async bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: DataRecord[],
  ): Promise<void>;
  async executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}
```

DbContextExecutor for Node.js. Handles actual DB connections and query execution including QueryDef-to-SQL conversion.

## Usage Examples

### Create ORM and run queries in a transaction

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

const users = await orm.connect(async (db) => {
  return await db.user().execute();
});
```

### Use low-level DB connection

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

### Run without transaction

```typescript
const result = await orm.connectWithoutTransaction(async (db) => {
  return await db.user().execute();
});
```
