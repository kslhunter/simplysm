# Context Executor

## `NodeDbContextExecutor`

A `DbContextExecutor` implementation for Node.js that bridges `@simplysm/orm-common` DbContext with actual database connections. Used internally by `createOrm`, but can also be used directly for lower-level control.

### Constructor

```typescript
new NodeDbContextExecutor(config: DbConnConfig)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `DbConnConfig` | Database connection configuration |

### Methods

#### `connect(): Promise<void>`

Acquires a connection from the pool and activates it.

#### `close(): Promise<void>`

Returns the connection to the pool.

#### `beginTransaction(isolationLevel?): Promise<void>`

Begins a transaction with an optional isolation level.

#### `commitTransaction(): Promise<void>`

Commits the current transaction.

#### `rollbackTransaction(): Promise<void>`

Rolls back the current transaction.

#### `executeParametrized(query, params?): Promise<Record<string, unknown>[][]>`

Executes a parameterized SQL query string.

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | SQL query string |
| `params` | `unknown[]` | Optional query parameters |

#### `bulkInsert(tableName, columnMetas, records): Promise<void>`

Performs bulk insert using the native driver API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tableName` | `string` | Target table name |
| `columnMetas` | `Record<string, ColumnMeta>` | Column metadata |
| `records` | `DataRecord[]` | Records to insert |

#### `executeDefs<T>(defs, resultMetas?): Promise<T[][]>`

Executes an array of `QueryDef` objects. Converts each `QueryDef` to SQL using the appropriate dialect query builder, executes it, and parses results using optional `ResultMeta`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `defs` | `QueryDef[]` | Query definitions to execute |
| `resultMetas` | `(ResultMeta \| undefined)[]` | Optional result parsing metadata per query |

**Optimization:** When all `resultMetas` are `undefined` (no result parsing needed), queries are combined into a single SQL batch for efficiency, returning empty arrays.

### Usage

```typescript
import { NodeDbContextExecutor } from "@simplysm/orm-node";

const executor = new NodeDbContextExecutor({
  dialect: "postgresql",
  host: "localhost",
  username: "postgres",
  password: "password",
  database: "mydb",
});

await executor.connect();
try {
  await executor.beginTransaction();
  const results = await executor.executeParametrized(
    "SELECT * FROM users WHERE id = $1",
    [1],
  );
  await executor.commitTransaction();
} finally {
  await executor.close();
}
```
