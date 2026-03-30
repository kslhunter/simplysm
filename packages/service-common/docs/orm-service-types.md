# ORM Service Types

## `OrmService`

ORM service interface providing database connection, transaction management, and query execution. Supports MySQL, MSSQL, and PostgreSQL.

```typescript
export interface OrmService {
  getInfo(opt: DbConnOptions & { configName: string }): Promise<{
    dialect: Dialect;
    database?: string;
    schema?: string;
  }>;
  connect(opt: DbConnOptions & { configName: string }): Promise<number>;
  close(connId: number): Promise<void>;
  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;
  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  executeDefs(
    connId: number,
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<unknown[][]>;
  bulkInsert(
    connId: number,
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getInfo` | `opt: DbConnOptions & { configName: string }` | `Promise<{ dialect: Dialect; database?: string; schema?: string }>` | Gets database connection info |
| `connect` | `opt: DbConnOptions & { configName: string }` | `Promise<number>` | Opens a connection, returns connection ID |
| `close` | `connId: number` | `Promise<void>` | Closes a connection |
| `beginTransaction` | `connId: number, isolationLevel?: IsolationLevel` | `Promise<void>` | Begins a transaction |
| `commitTransaction` | `connId: number` | `Promise<void>` | Commits a transaction |
| `rollbackTransaction` | `connId: number` | `Promise<void>` | Rolls back a transaction |
| `executeParametrized` | `connId: number, query: string, params?: unknown[]` | `Promise<unknown[][]>` | Executes a parameterized query |
| `executeDefs` | `connId: number, defs: QueryDef[], options?: (ResultMeta \| undefined)[]` | `Promise<unknown[][]>` | Executes query definitions |
| `bulkInsert` | `connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]` | `Promise<void>` | Performs bulk insert |

## `DbConnOptions`

Database connection options.

```typescript
export type DbConnOptions = { configName?: string; config?: Record<string, unknown> };
```

| Field | Type | Description |
|-------|------|-------------|
| `configName` | `string?` | Configuration name to look up from server config |
| `config` | `Record<string, unknown>?` | Additional configuration overrides |
