# Core

Database context definition, creation, and lifecycle management.

Source: `src/define-db-context.ts`, `src/create-db-context.ts`, `src/types/db-context-def.ts`, `src/errors/db-transaction-error.ts`

## defineDbContext

Create a `DbContextDef` blueprint from tables, views, procedures, and migrations. Automatically includes the `_migration` system table.

```typescript
function defineDbContext<
  TTables extends Record<string, TableBuilder<any, any>>,
  TViews extends Record<string, ViewBuilder<any, any, any>>,
  TProcedures extends Record<string, ProcedureBuilder<any, any>>,
>(config: {
  tables?: TTables;
  views?: TViews;
  procedures?: TProcedures;
  migrations?: Migration[];
}): DbContextDef<TTables & { _migration: typeof _Migration }, TViews, TProcedures>;
```

**Example:**

```typescript
const MyDb = defineDbContext({
  tables: { user: User, post: Post },
  views: { userSummary: UserSummary },
  procedures: { getUserById: GetUserById },
  migrations: [
    { name: "20260101_001_init", up: async (db) => { await db.createTable(User); } },
  ],
});
```

## createDbContext

Create a runtime `DbContextInstance` from a definition and executor. This is the main entry point for database operations.

```typescript
/**
 * @param def - Definition object created by defineDbContext()
 * @param executor - Query executor (NodeDbContextExecutor, ServiceDbContextExecutor, etc.)
 * @param opt - Database options
 * @param opt.database - Database name
 * @param opt.schema - Schema name (MSSQL: dbo, PostgreSQL: public)
 * @returns A complete DbContext instance
 */
function createDbContext<TDef extends DbContextDef<any, any, any>>(
  def: TDef,
  executor: DbContextExecutor,
  opt: { database: string; schema?: string },
): DbContextInstance<TDef>;
```

The returned instance provides:

- **Queryable accessors** -- one per table/view (e.g., `db.user()` returns a `Queryable`)
- **Executable accessors** -- one per procedure (e.g., `db.getUserById()` returns an `Executable`)
- **Connection management** -- `connect()`, `connectWithoutTransaction()`, `transaction()`
- **DDL methods** -- `createTable()`, `dropTable()`, `addColumn()`, `addIndex()`, etc.
- **Initialization** -- `initialize()` to run migrations

**Example:**

```typescript
const db = createDbContext(MyDb, executor, { database: "mydb" });

await db.connect(async () => {
  const users = await db.user().execute();
});
```

## DbContextBase

Internal interface satisfied by the DbContext instance. Used by `Queryable`, `Executable`, and `ViewBuilder`.

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

## DbContextDef

Definition (blueprint) created by `defineDbContext()`. Contains schema metadata but no runtime state.

```typescript
interface DbContextDef<
  TTables extends Record<string, TableBuilder<any, any>>,
  TViews extends Record<string, ViewBuilder<any, any, any>>,
  TProcedures extends Record<string, ProcedureBuilder<any, any>>,
> {
  readonly meta: {
    readonly tables: TTables;
    readonly views: TViews;
    readonly procedures: TProcedures;
    readonly migrations: Migration[];
  };
}
```

## DbContextInstance

Full runtime type created by `createDbContext`. Combines `DbContextBase`, connection methods, DDL methods, and auto-mapped queryable/executable accessors.

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

### Connection Methods

```typescript
interface DbContextConnectionMethods {
  /** Execute within a transaction (auto commit/rollback) */
  connect<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;

  /** Connect without transaction (for DDL or read-only operations) */
  connectWithoutTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult>;

  /** Start a transaction within an already-connected state */
  transaction<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
}
```

### DDL Methods

The instance exposes DDL execution methods and their corresponding QueryDef generators:

| Method | Description |
|--------|-------------|
| `createTable(table)` | CREATE TABLE |
| `dropTable(table)` | DROP TABLE |
| `renameTable(table, newName)` | RENAME TABLE |
| `createView(view)` | CREATE VIEW |
| `dropView(view)` | DROP VIEW |
| `createProc(procedure)` | CREATE PROCEDURE |
| `dropProc(procedure)` | DROP PROCEDURE |
| `addColumn(table, name, column)` | ADD COLUMN |
| `dropColumn(table, column)` | DROP COLUMN |
| `modifyColumn(table, name, column)` | MODIFY COLUMN |
| `renameColumn(table, column, newName)` | RENAME COLUMN |
| `addPrimaryKey(table, columns)` | ADD PRIMARY KEY |
| `dropPrimaryKey(table)` | DROP PRIMARY KEY |
| `addForeignKey(table, name, def)` | ADD FOREIGN KEY |
| `dropForeignKey(table, name)` | DROP FOREIGN KEY |
| `addIndex(table, indexBuilder)` | CREATE INDEX |
| `dropIndex(table, columns)` | DROP INDEX |
| `clearSchema(params)` | Clear all objects in schema |
| `schemaExists(database, schema?)` | Check schema existence |
| `truncate(table)` | TRUNCATE TABLE |
| `switchFk(table, enabled)` | Enable/disable FK constraints |

## DbContextStatus

```typescript
type DbContextStatus = "ready" | "connect" | "transact";
```

Lifecycle: `ready` -> `connect` -> `transact` -> `connect` -> `ready`

## DbTransactionError

Standardized transaction error wrapping DBMS-specific native errors.

```typescript
class DbTransactionError extends Error {
  readonly name = "DbTransactionError";
  constructor(
    public readonly code: DbErrorCode,
    message: string,
    public readonly originalError?: unknown,
  );
}
```

## DbErrorCode

```typescript
enum DbErrorCode {
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",
  DEADLOCK = "DEADLOCK",
  LOCK_TIMEOUT = "LOCK_TIMEOUT",
}
```

**Example:**

```typescript
try {
  await executor.rollbackTransaction();
} catch (err) {
  if (err instanceof DbTransactionError) {
    if (err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) {
      return; // Already rolled back
    }
  }
  throw err;
}
```
