# Core

## `defineDbContext`

Factory function that creates a DbContext definition (blueprint). Takes table, view, procedure builders and migration definitions. Automatically includes the `_migration` system table.

```typescript
function defineDbContext<
  TTables extends Record<string, TableBuilder<any, any>> = {},
  TViews extends Record<string, ViewBuilder<any, any, any>> = {},
  TProcedures extends Record<string, ProcedureBuilder<any, any>> = {},
>(config: {
  tables?: TTables;
  views?: TViews;
  procedures?: TProcedures;
  migrations?: Migration[];
}): DbContextDef<TTables & { _migration: typeof _Migration }, TViews, TProcedures>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config.tables` | `TTables` | Table builder definitions |
| `config.views` | `TViews` | View builder definitions |
| `config.procedures` | `TProcedures` | Procedure builder definitions |
| `config.migrations` | `Migration[]` | Migration definitions |

## `createDbContext`

DbContext instance factory. Takes a `DbContextDef` and `DbContextExecutor` and creates a complete DbContext instance with queryable accessors, DDL methods, and connection/transaction management.

```typescript
function createDbContext<TDef extends DbContextDef<any, any, any>>(
  def: TDef,
  executor: DbContextExecutor,
  opt: { database: string; schema?: string },
): DbContextInstance<TDef>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `def` | `TDef` | Definition object created by `defineDbContext()` |
| `executor` | `DbContextExecutor` | Query executor implementation |
| `opt.database` | `string` | Database name |
| `opt.schema` | `string` | Schema name (MSSQL: dbo, PostgreSQL: public) |

## `DbContextDef`

DbContext definition (blueprint). Created by `defineDbContext()`. Contains schema metadata but no runtime state.

```typescript
interface DbContextDef<
  TTables extends Record<string, TableBuilder<any, any>>,
  TViews extends Record<string, ViewBuilder<any, any, any>>,
  TProcedures extends Record<string, ProcedureBuilder<any, any>> = {},
> {
  readonly meta: {
    readonly tables: TTables;
    readonly views: TViews;
    readonly procedures: TProcedures;
    readonly migrations: Migration[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `meta.tables` | `TTables` | Table builder definitions |
| `meta.views` | `TViews` | View builder definitions |
| `meta.procedures` | `TProcedures` | Procedure builder definitions |
| `meta.migrations` | `Migration[]` | Migration definitions |

## `DbContextBase`

Internal interface used by Queryable, Executable, and ViewBuilder.

```typescript
interface DbContextBase {
  status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
  getQueryDefObjectName(
    tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>,
  ): QueryDefObjectName;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `DbContextStatus` | Current connection status |
| `database` | `string \| undefined` | Database name |
| `schema` | `string \| undefined` | Schema name |
| `getNextAlias()` | `() => string` | Generate next table alias |
| `resetAliasCounter()` | `() => void` | Reset alias counter |
| `executeDefs()` | `(defs, resultMetas?) => Promise<T[][]>` | Execute query definitions |
| `getQueryDefObjectName()` | `(tableOrView) => QueryDefObjectName` | Get qualified object name |
| `switchFk()` | `(table, enabled) => Promise<void>` | Enable/disable FK constraints |

## `DbContextStatus`

Connection status type.

```typescript
type DbContextStatus = "ready" | "connect" | "transact";
```

## `DbContextInstance`

Full DbContext instance type created by `createDbContext`. Extends `DbContextBase` with queryable accessors for tables/views, executable accessors for procedures, DDL methods, and connection/transaction management.

```typescript
type DbContextInstance<TDef extends DbContextDef<any, any, any>> = DbContextBase &
  DbContextConnectionMethods &
  DbContextDdlMethods & {
    [K in keyof TDef["meta"]["tables"]]: () => Queryable<...>;
  } & {
    [K in keyof TDef["meta"]["views"]]: () => Queryable<...>;
  } & {
    [K in keyof TDef["meta"]["procedures"]]: () => Executable<...>;
  } & {
    _migration: () => Queryable<{ code: string }, any>;
    initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void>;
  };
```

## `DbContextConnectionMethods`

Connection and transaction management methods.

```typescript
interface DbContextConnectionMethods {
  connect<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
  connectWithoutTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult>;
  transaction<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
}
```

| Method | Description |
|--------|-------------|
| `connect()` | Execute callback within a transaction (auto commit/rollback) |
| `connectWithoutTransaction()` | Connect without transaction, execute callback, auto-close |
| `transaction()` | Start transaction in already-connected state (auto commit/rollback) |

## `DbContextDdlMethods`

DDL execution methods and QueryDef generators for tables, views, procedures, columns, indexes, foreign keys, and schema operations.

```typescript
interface DbContextDdlMethods {
  createTable(table: TableBuilder<any, any>): Promise<void>;
  dropTable(table: QueryDefObjectName): Promise<void>;
  renameTable(table: QueryDefObjectName, newName: string): Promise<void>;
  createView(view: ViewBuilder<any, any, any>): Promise<void>;
  dropView(view: QueryDefObjectName): Promise<void>;
  createProc(procedure: ProcedureBuilder<any, any>): Promise<void>;
  dropProc(procedure: QueryDefObjectName): Promise<void>;
  addColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): Promise<void>;
  dropColumn(table: QueryDefObjectName, column: string): Promise<void>;
  modifyColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): Promise<void>;
  renameColumn(table: QueryDefObjectName, column: string, newName: string): Promise<void>;
  addPrimaryKey(table: QueryDefObjectName, columns: string[]): Promise<void>;
  dropPrimaryKey(table: QueryDefObjectName): Promise<void>;
  addForeignKey(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder<any, any>): Promise<void>;
  addIndex(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): Promise<void>;
  dropForeignKey(table: QueryDefObjectName, relationName: string): Promise<void>;
  dropIndex(table: QueryDefObjectName, columns: string[]): Promise<void>;
  clearSchema(params: { database: string; schema?: string }): Promise<void>;
  schemaExists(database: string, schema?: string): Promise<boolean>;
  truncate(table: QueryDefObjectName): Promise<void>;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
  // QueryDef generators (get*QueryDef methods for each DDL operation)
  getCreateTableQueryDef(table: TableBuilder<any, any>): QueryDef;
  getCreateViewQueryDef(view: ViewBuilder<any, any, any>): QueryDef;
  getCreateProcQueryDef(procedure: ProcedureBuilder<any, any>): QueryDef;
  getCreateObjectQueryDef(builder: TableBuilder | ViewBuilder | ProcedureBuilder): QueryDef;
  getDropTableQueryDef(table: QueryDefObjectName): QueryDef;
  getRenameTableQueryDef(table: QueryDefObjectName, newName: string): QueryDef;
  getDropViewQueryDef(view: QueryDefObjectName): QueryDef;
  getDropProcQueryDef(procedure: QueryDefObjectName): QueryDef;
  getAddColumnQueryDef(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): QueryDef;
  getDropColumnQueryDef(table: QueryDefObjectName, column: string): QueryDef;
  getModifyColumnQueryDef(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): QueryDef;
  getRenameColumnQueryDef(table: QueryDefObjectName, column: string, newName: string): QueryDef;
  getAddPrimaryKeyQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
  getDropPrimaryKeyQueryDef(table: QueryDefObjectName): QueryDef;
  getAddForeignKeyQueryDef(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder<any, any>): QueryDef;
  getAddIndexQueryDef(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): QueryDef;
  getDropForeignKeyQueryDef(table: QueryDefObjectName, relationName: string): QueryDef;
  getDropIndexQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
  getClearSchemaQueryDef(params: { database: string; schema?: string }): QueryDef;
  getSchemaExistsQueryDef(database: string, schema?: string): QueryDef;
  getTruncateQueryDef(table: QueryDefObjectName): QueryDef;
  getSwitchFkQueryDef(table: QueryDefObjectName, enabled: boolean): QueryDef;
}
```

## `DbTransactionError`

Database transaction error with standardized error codes for DBMS-independent error handling.

```typescript
class DbTransactionError extends Error {
  override readonly name = "DbTransactionError";
  constructor(
    public readonly code: DbErrorCode,
    message: string,
    public readonly originalError?: unknown,
  );
}
```

| Property | Type | Description |
|----------|------|-------------|
| `code` | `DbErrorCode` | Standardized error code |
| `originalError` | `unknown` | Original DBMS error (for debugging) |

## `DbErrorCode`

Transaction-related error codes.

```typescript
enum DbErrorCode {
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",
  DEADLOCK = "DEADLOCK",
  LOCK_TIMEOUT = "LOCK_TIMEOUT",
}
```
