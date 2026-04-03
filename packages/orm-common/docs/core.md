# Core

DbContext abstract class, connection/transaction lifecycle, DDL execution, and initialization.

## DbContext

```typescript
abstract class DbContext implements DbContextBase {
  status: DbContextStatus;

  constructor(
    executor: DbContextExecutor,
    opt: { database: string; schema?: string },
  )

  // Registration
  protected queryable<T extends TableBuilder | ViewBuilder>(builder: T): () => Queryable<...>
  protected executable<T extends ProcedureBuilder>(builder: T): () => Executable<...>

  // Connection
  connect<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>
  connectWithoutTransaction<R>(fn: () => Promise<R>): Promise<R>
  transaction<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>

  // DDL execution (see DDL Execution Methods below)
  // DDL QueryDef generators (get*QueryDef methods)

  // Initialization
  initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void>

  // Override in subclass
  migrations: Migration[];
}
```

Base class for database contexts. Subclass to define tables, views, and procedures as class properties.

Each property registered via `queryable()` or `executable()` is independently serialized, avoiding TS7056 even with 40+ tables.

| Constructor Parameter | Type | Description |
|---|---|---|
| `executor` | `DbContextExecutor` | Query execution engine (e.g., `NodeDbContextExecutor`) |
| `opt.database` | `string` | Database name |
| `opt.schema` | `string?` | Schema name (MSSQL: dbo, PostgreSQL: public) |

```typescript
class MainDb extends DbContext {
  user = this.queryable(User);
  post = this.queryable(Post);
  getUserById = this.executable(GetUserById);

  migrations = [
    { name: "20260101_001_init", up: async (db) => { await db.createTable(User); } },
  ];
}

const db = new MainDb(executor, { database: "mydb", schema: "dbo" });
```

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

Each DDL method has a corresponding `get*QueryDef` method that returns a `QueryDef` without executing it. For example: `getCreateTableQueryDef(table)`, `getDropTableQueryDef(table)`, `getCreateObjectQueryDef(builder)`, etc.

### Initialize

```typescript
async initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void>
```

Code First database initialization. Creates all registered Table/View/Procedure objects and runs pending migrations.

- **force=true**: Clear schema, recreate all objects, register all migrations as applied
- **force=false** (default):
  - No `_Migration` table: Full creation + register all migrations
  - `_Migration` table exists: Run only pending migrations

## SD_BUILDER

```typescript
const SD_BUILDER: unique symbol
```

Internal symbol used to tag queryable/executable factory functions with their underlying builder. Used by `initialize()` to discover registered builders from DbContext instances.

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

## DbContextBase

```typescript
interface DbContextBase {
  status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
  getQueryDefObjectName(tableOrView: TableBuilder | ViewBuilder): QueryDefObjectName;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
}
```

Core interface implemented by DbContext. Used internally by Queryable, Executable, and ViewBuilder.

| Field | Type | Description |
|-------|------|-------------|
| `status` | `DbContextStatus` | Current connection status |
| `database` | `string \| undefined` | Database name |
| `schema` | `string \| undefined` | Schema name |
| `getNextAlias()` | `string` | Generate next table alias (T1, T2, ...) |
| `resetAliasCounter()` | `void` | Reset alias counter |
| `executeDefs()` | `Promise<T[][]>` | Execute QueryDef array, returns result per def |
| `getQueryDefObjectName()` | `QueryDefObjectName` | Resolve table/view to qualified name |
| `switchFk()` | `Promise<void>` | Enable/disable FK constraints |

## DbContextDdlMethods

```typescript
interface DbContextDdlMethods {
  createTable(table: TableBuilder): Promise<void>;
  dropTable(table: QueryDefObjectName): Promise<void>;
  // ... all DDL methods listed in DbContext DDL Execution Methods above
  // ... plus all get*QueryDef generator methods
}
```

Interface for DDL execution and QueryDef generation methods. DbContext implements this interface. Used by the `initialize()` function and `Migration.up()` callback parameter type.

## DbContextStatus

```typescript
type DbContextStatus = "ready" | "connect" | "transact";
```

| Value | Description |
|-------|-------------|
| `"ready"` | Not connected |
| `"connect"` | Connected, no active transaction |
| `"transact"` | Connected with active transaction |

## _Migration

```typescript
const _Migration: TableBuilder<{ code: ColumnBuilder<string, ...> }, {}>
```

System migration tracking table. Automatically registered in every DbContext as `_migration`. Has a single `code` column (VARCHAR(255)) as primary key, storing executed migration names.
