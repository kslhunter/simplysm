# Core

DbContext definition, creation, and lifecycle management.

## defineDbContext

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
}): DbContextDef<TTables & { _migration: typeof _Migration }, TViews, TProcedures>
```

Creates a DbContext definition (blueprint) containing schema metadata. Automatically adds the `_migration` system table. The definition itself has no runtime state.

| Parameter | Type | Description |
|-----------|------|-------------|
| `config.tables` | `Record<string, TableBuilder>` | Table definitions |
| `config.views` | `Record<string, ViewBuilder>` | View definitions |
| `config.procedures` | `Record<string, ProcedureBuilder>` | Procedure definitions |
| `config.migrations` | `Migration[]` | Migration definitions |

```typescript
const MyDb = defineDbContext({
  tables: { user: User, post: Post },
  views: { activeUsers: ActiveUsersView },
  procedures: { getUserById: GetUserById },
  migrations: [
    { name: "20260101_001_init", up: async (db) => { await db.createTable(User); } },
  ],
});
```

## createDbContext

```typescript
function createDbContext<TDef extends DbContextDef<any, any, any>>(
  def: TDef,
  executor: DbContextExecutor,
  opt: { database: string; schema?: string },
): DbContextInstance<TDef>
```

Creates a full DbContext instance from a definition and executor. The returned object provides:

- **Queryable accessors** for each table/view (e.g., `db.user()` returns a `Queryable`)
- **Executable accessors** for each procedure (e.g., `db.getUserById()` returns an `Executable`)
- **Connection management**: `connect()`, `connectWithoutTransaction()`, `transaction()`
- **DDL methods**: `createTable()`, `dropTable()`, `addColumn()`, etc. (see `DbContextDdlMethods`)
- **DDL QueryDef generators**: `getCreateTableQueryDef()`, etc.
- **Initialize**: `initialize()` runs migrations

| Parameter | Type | Description |
|-----------|------|-------------|
| `def` | `DbContextDef` | Definition from `defineDbContext()` |
| `executor` | `DbContextExecutor` | Query execution engine (e.g., `NodeDbContextExecutor`) |
| `opt.database` | `string` | Database name |
| `opt.schema` | `string?` | Schema name (MSSQL: dbo, PostgreSQL: public) |

### Connection Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `connect` | `<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel) => Promise<R>` | Connect, begin transaction, execute callback, commit (auto-rollback on error) |
| `connectWithoutTransaction` | `<R>(fn: () => Promise<R>) => Promise<R>` | Connect without transaction, execute callback, close |
| `transaction` | `<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel) => Promise<R>` | Begin transaction within existing connection (for use inside `connectWithoutTransaction`) |

### DDL Execution Methods

| Method | Signature |
|--------|-----------|
| `createTable` | `(table: TableBuilder) => Promise<void>` |
| `dropTable` | `(table: QueryDefObjectName) => Promise<void>` |
| `renameTable` | `(table: QueryDefObjectName, newName: string) => Promise<void>` |
| `createView` | `(view: ViewBuilder) => Promise<void>` |
| `dropView` | `(view: QueryDefObjectName) => Promise<void>` |
| `createProc` | `(procedure: ProcedureBuilder) => Promise<void>` |
| `dropProc` | `(procedure: QueryDefObjectName) => Promise<void>` |
| `addColumn` | `(table: QueryDefObjectName, columnName: string, column: ColumnBuilder) => Promise<void>` |
| `dropColumn` | `(table: QueryDefObjectName, column: string) => Promise<void>` |
| `modifyColumn` | `(table: QueryDefObjectName, columnName: string, column: ColumnBuilder) => Promise<void>` |
| `renameColumn` | `(table: QueryDefObjectName, column: string, newName: string) => Promise<void>` |
| `addPrimaryKey` | `(table: QueryDefObjectName, columns: string[]) => Promise<void>` |
| `dropPrimaryKey` | `(table: QueryDefObjectName) => Promise<void>` |
| `addForeignKey` | `(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder) => Promise<void>` |
| `addIndex` | `(table: QueryDefObjectName, indexBuilder: IndexBuilder) => Promise<void>` |
| `dropForeignKey` | `(table: QueryDefObjectName, relationName: string) => Promise<void>` |
| `dropIndex` | `(table: QueryDefObjectName, columns: string[]) => Promise<void>` |
| `clearSchema` | `(params: { database: string; schema?: string }) => Promise<void>` |
| `schemaExists` | `(database: string, schema?: string) => Promise<boolean>` |
| `truncate` | `(table: QueryDefObjectName) => Promise<void>` |
| `switchFk` | `(table: QueryDefObjectName, enabled: boolean) => Promise<void>` |

### DDL QueryDef Generators

Each DDL method has a corresponding `get*QueryDef` method that returns a `QueryDef` without executing it. For example: `getCreateTableQueryDef(table)`, `getDropTableQueryDef(table)`, etc.

### Initialize

```typescript
async initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void>
```

Runs pending migrations. If `force` is true, drops and recreates the schema.

## DbTransactionError

```typescript
class DbTransactionError extends Error {
  readonly name = "DbTransactionError";
  constructor(
    public readonly code: DbErrorCode,
    message: string,
    public readonly originalError?: unknown,
  )
}
```

Wraps DBMS-native transaction errors into standardized error codes.

| Field | Type | Description |
|-------|------|-------------|
| `code` | `DbErrorCode` | Standardized error code |
| `message` | `string` | Error message |
| `originalError` | `unknown?` | Original DBMS error (for debugging) |

## DbErrorCode

```typescript
enum DbErrorCode {
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",
  DEADLOCK = "DEADLOCK",
  LOCK_TIMEOUT = "LOCK_TIMEOUT",
}
```

| Value | Description |
|-------|-------------|
| `NO_ACTIVE_TRANSACTION` | No active transaction (e.g., rollback when no transaction) |
| `TRANSACTION_ALREADY_STARTED` | Transaction already started |
| `DEADLOCK` | Deadlock detected |
| `LOCK_TIMEOUT` | Lock timeout exceeded |

## _Migration

```typescript
const _Migration: TableBuilder<{ code: ColumnBuilder<string, ...> }, {}>
```

System migration tracking table. Automatically added to every DbContext via `defineDbContext()`. Has a single `code` column (VARCHAR(255)) as primary key, storing executed migration names.
