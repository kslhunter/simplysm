# DbContext

Central entry point for database operations. Combines schema definitions with an executor for connection management, transaction handling, DDL operations, and schema initialization.

## API Reference

### `defineDbContext(config)`

Creates a `DbContextDef` (blueprint) containing schema metadata but no runtime state.

```typescript
function defineDbContext<TTables, TViews, TProcedures>(config: {
  tables?: TTables;
  views?: TViews;
  procedures?: TProcedures;
  migrations?: Migration[];
}): DbContextDef<TTables & { _migration: typeof _Migration }, TViews, TProcedures>
```

A `_migration` system table is automatically added to track applied migrations.

---

### `createDbContext(def, executor, opt)`

Creates a complete `DbContextInstance` from a definition and executor.

```typescript
function createDbContext<TDef extends DbContextDef<any, any, any>>(
  def: TDef,
  executor: DbContextExecutor,
  opt: { database: string; schema?: string },
): DbContextInstance<TDef>
```

**Parameters:**
- `def` -- Definition created by `defineDbContext()`
- `executor` -- Query executor implementation (e.g., `NodeDbContextExecutor`, `ServiceDbContextExecutor`)
- `opt.database` -- Database name
- `opt.schema` -- Schema name (MSSQL: `dbo`, PostgreSQL: `public`)

The returned instance automatically maps:
- Each table key to a `() => Queryable` accessor
- Each view key to a `() => Queryable` accessor
- Each procedure key to a `() => Executable` accessor

---

### Connection Management

#### `db.connect(fn, isolationLevel?)`

Execute callback within a managed connection and transaction. Automatically commits on success or rolls back on error.

```typescript
connect<TResult>(
  fn: () => Promise<TResult>,
  isolationLevel?: IsolationLevel
): Promise<TResult>
```

#### `db.connectWithoutTransaction(fn)`

Connect without a transaction. Used for DDL operations or read-only operations.

```typescript
connectWithoutTransaction<TResult>(
  fn: () => Promise<TResult>
): Promise<TResult>
```

#### `db.transaction(fn, isolationLevel?)`

Start a nested transaction within an already connected state (`connectWithoutTransaction`).

```typescript
transaction<TResult>(
  fn: () => Promise<TResult>,
  isolationLevel?: IsolationLevel
): Promise<TResult>
```

**IsolationLevel values:** `"READ_UNCOMMITTED"` | `"READ_COMMITTED"` | `"REPEATABLE_READ"` | `"SERIALIZABLE"`

**DbContextStatus lifecycle:** `"ready"` -> `"connect"` -> `"transact"` -> `"connect"` -> `"ready"`

---

### DDL Methods

All DDL methods are available on the `DbContextInstance`. They cannot be executed inside a transaction.

#### Table Operations

| Method | Description |
|--------|-------------|
| `createTable(table)` | CREATE TABLE from a TableBuilder |
| `dropTable(table)` | DROP TABLE |
| `renameTable(table, newName)` | RENAME TABLE |
| `createView(view)` | CREATE VIEW from a ViewBuilder |
| `dropView(view)` | DROP VIEW |
| `createProc(procedure)` | CREATE PROCEDURE from a ProcedureBuilder |
| `dropProc(procedure)` | DROP PROCEDURE |

#### Column Operations

| Method | Description |
|--------|-------------|
| `addColumn(table, name, column)` | ADD COLUMN |
| `dropColumn(table, column)` | DROP COLUMN |
| `modifyColumn(table, name, column)` | MODIFY COLUMN (type/properties) |
| `renameColumn(table, column, newName)` | RENAME COLUMN |

#### Constraint Operations

| Method | Description |
|--------|-------------|
| `addPrimaryKey(table, columns)` | ADD PRIMARY KEY |
| `dropPrimaryKey(table)` | DROP PRIMARY KEY |
| `addForeignKey(table, name, fkBuilder)` | ADD FOREIGN KEY |
| `dropForeignKey(table, name)` | DROP FOREIGN KEY |
| `addIndex(table, indexBuilder)` | CREATE INDEX |
| `dropIndex(table, columns)` | DROP INDEX |

#### Schema Operations

| Method | Description |
|--------|-------------|
| `clearSchema(params)` | Drop all objects in a schema |
| `schemaExists(database, schema?)` | Check if schema/database exists |
| `truncate(table)` | TRUNCATE TABLE |
| `switchFk(table, enabled)` | Enable/disable FK constraints |

Each DDL method also has a corresponding `get*QueryDef()` method that returns the raw `QueryDef` without executing it.

---

### `db.initialize(options?)`

Run all pending migrations and create missing tables/views/procedures.

```typescript
initialize(options?: {
  dbs?: string[];    // Limit to specific databases
  force?: boolean;   // Force re-create (drop and recreate)
}): Promise<void>
```

---

### DbContextExecutor Interface

Implement this interface to connect the ORM to a specific database driver.

```typescript
interface DbContextExecutor {
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}
```

---

### Migration

Define schema migrations for version control.

```typescript
interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
```

---

## Usage Examples

### Basic Setup and Query

```typescript
const MyDb = defineDbContext({
  tables: { user: User, post: Post },
  views: { activeUsers: ActiveUsers },
  procedures: { getUserById: GetUserById },
  migrations: [
    {
      name: "20260101_001_add_status_column",
      up: async (db) => {
        await db.addColumn(
          { database: "mydb", name: "User" },
          "status",
          createColumnFactory().varchar(20).default("active"),
        );
      },
    },
  ],
});

const db = createDbContext(MyDb, executor, { database: "mydb" });

// Transactional query
await db.connect(async () => {
  const users = await db.user().execute();
  const activeUsers = await db.activeUsers().execute();
});

// DDL operations (no transaction)
await db.connectWithoutTransaction(async () => {
  await db.initialize();
});

// Execute procedure
await db.connect(async () => {
  const result = await db.getUserById().execute({ userId: 1n });
});
```

### Nested Transaction

```typescript
await db.connectWithoutTransaction(async () => {
  // DDL first (no transaction needed)
  await db.createTable(NewTable);

  // Then transactional DML
  await db.transaction(async () => {
    await db.user().insert([{ name: "Alice" }]);
  });
});
```
