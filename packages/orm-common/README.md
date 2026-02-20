# @simplysm/orm-common

The common module of Simplysm ORM, providing core ORM functionality including type-safe query builders, schema definitions, and SQL expressions.
It generates JSON AST instead of SQL strings, which are then converted to SQL for each DBMS (MySQL, MSSQL, PostgreSQL).

## Installation

```bash
npm install @simplysm/orm-common
# or
pnpm add @simplysm/orm-common
```

## Supported Databases

| Database | Dialect | Minimum Version |
|-------------|---------|----------|
| MySQL | `mysql` | 8.0.14+ |
| SQL Server | `mssql` | 2012+ |
| PostgreSQL | `postgresql` | 9.0+ |

## Main Modules

### Core

#### `defineDbContext(config)`

Creates a `DbContextDef` schema blueprint without any runtime state.

```typescript
import { defineDbContext } from "@simplysm/orm-common";

const MyDbDef = defineDbContext({
  tables: { user: User, post: Post },
  views: { activeUsers: ActiveUsers },
  procedures: { getUserById: GetUserById },
  migrations: [
    {
      name: "20260101_add_status",
      up: async (db) => {
        const c = createColumnFactory();
        await db.addColumn(
          { database: "mydb", name: "User" },
          "status",
          c.varchar(20).nullable(),
        );
      },
    },
  ],
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config.tables` | `Record<string, TableBuilder>` | Table builders |
| `config.views` | `Record<string, ViewBuilder>` | View builders (optional) |
| `config.procedures` | `Record<string, ProcedureBuilder>` | Procedure builders (optional) |
| `config.migrations` | `Migration[]` | Migration list (optional) |

Returns `DbContextDef<TTables, TViews, TProcedures>`.

Note: `defineDbContext` automatically adds an internal `_Migration` system table to `tables` to track applied migrations.

#### `createDbContext(def, executor, opt)`

Creates a fully functional `DbContextInstance` from a `DbContextDef`.

```typescript
import { createDbContext } from "@simplysm/orm-common";

const db = createDbContext(MyDbDef, executor, { database: "mydb" });

await db.connect(async () => {
  const users = await db.user().result();
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `def` | `DbContextDef` | Schema definition from `defineDbContext()` |
| `executor` | `DbContextExecutor` | Query executor (from `orm-node` or service client) |
| `opt.database` | `string` | Default database name |
| `opt.schema` | `string?` | Default schema name (MSSQL: `dbo`, PostgreSQL: `public`) |

Returns `DbContextInstance<TDef>`.

#### Type Definitions

| Type | Description |
|------|-------------|
| `DbContextDef<TTables, TViews, TProcedures>` | DbContext definition (schema blueprint) |
| `DbContextInstance<TDef>` | Full DbContext instance with queryable accessors and DDL methods |
| `DbContextBase` | Core interface used internally (status, executeDefs, etc.) |
| `DbContextConnectionMethods` | Interface for connection/transaction methods (`connect`, `connectWithoutTransaction`, `trans`) |
| `DbContextDdlMethods` | Interface for all DDL methods and QueryDef generator methods |
| `DbContextStatus` | `"ready" \| "connect" \| "transact"` — current connection status |

#### `DbTransactionError`

Database transaction error class. Wraps DBMS-native errors with a standardized `DbErrorCode`.

```typescript
import { DbTransactionError, DbErrorCode } from "@simplysm/orm-common";

try {
  await executor.rollbackTransaction();
} catch (err) {
  if (err instanceof DbTransactionError) {
    if (err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) {
      return; // Already rolled back, ignore
    }
  }
  throw err;
}
```

| `DbErrorCode` value | Description |
|---------------------|-------------|
| `NO_ACTIVE_TRANSACTION` | No active transaction (rollback when none exists) |
| `TRANSACTION_ALREADY_STARTED` | Transaction already started |
| `DEADLOCK` | Deadlock detected |
| `LOCK_TIMEOUT` | Lock wait timeout |

`DbTransactionError` properties:

| Property | Type | Description |
|----------|------|-------------|
| `code` | `DbErrorCode` | Standardized error code |
| `message` | `string` | Error message |
| `originalError` | `unknown?` | Original DBMS error (for debugging) |

---

### DbContext Instance API

The `DbContextInstance` returned by `createDbContext` exposes the following methods:

#### Connection Management

| Method | Description |
|--------|-------------|
| `connect(fn, isolationLevel?)` | Open connection → begin transaction → run callback → commit → close. Rolls back on error. |
| `connectWithoutTransaction(fn)` | Open connection → run callback → close. No transaction. Use for DDL or read-only operations. |
| `trans(fn, isolationLevel?)` | Start a transaction within an already-connected context. Use inside `connectWithoutTransaction` when partial transactions are needed. |

```typescript
// Default: with transaction
await db.connect(async () => {
  await db.user().insert([{ name: "Alice" }]);
  await db.post().insert([{ title: "Hello", userId: 1 }]);
});

// Without transaction (e.g., for DDL)
await db.connectWithoutTransaction(async () => {
  await db.createTable(User);
});

// Nested transaction inside connectWithoutTransaction
await db.connectWithoutTransaction(async () => {
  const report = await db.report().result();
  await db.trans(async () => {
    await db.log().insert([{ action: "read" }]);
  });
});
```

#### Queryable / Executable Accessors

Each table/view/procedure defined in `defineDbContext` becomes an accessor method on the instance:

```typescript
// Tables and views → returns () => Queryable
db.user()   // Queryable<UserData, typeof User>
db.post()   // Queryable<PostData, typeof Post>

// Procedures → returns () => Executable
db.getUserById()   // Executable<Params, Returns>
```

#### `initialize(options?)`

Applies all pending migrations in order.

```typescript
await db.connectWithoutTransaction(async () => {
  await db.initialize();
});
```

| Option | Type | Description |
|--------|------|-------------|
| `options.dbs` | `string[]?` | Restrict migration to specific databases |
| `options.force` | `boolean?` | Re-apply all migrations even if already applied |

#### DDL Methods

All DDL methods are available on the `DbContextInstance`. DDL cannot be called inside a `connect()` (transact) context — use `connectWithoutTransaction` instead.

| Method | Description |
|--------|-------------|
| `createTable(table)` | Create a table based on `TableBuilder` |
| `dropTable(table)` | Drop a table |
| `renameTable(table, newName)` | Rename a table |
| `createView(view)` | Create a view |
| `dropView(view)` | Drop a view |
| `createProc(procedure)` | Create a stored procedure |
| `dropProc(procedure)` | Drop a stored procedure |
| `addColumn(table, columnName, column)` | Add a column |
| `dropColumn(table, column)` | Drop a column |
| `modifyColumn(table, columnName, column)` | Modify a column definition |
| `renameColumn(table, column, newName)` | Rename a column |
| `addPk(table, columns)` | Add a primary key |
| `dropPk(table)` | Drop the primary key |
| `addFk(table, relationName, relationDef)` | Add a foreign key |
| `dropFk(table, relationName)` | Drop a foreign key |
| `addIdx(table, indexBuilder)` | Add an index |
| `dropIdx(table, columns)` | Drop an index |
| `clearSchema(params)` | Drop all objects in a schema |
| `schemaExists(database, schema?)` | Check if a schema/database exists |
| `truncate(table)` | Truncate a table |
| `switchFk(table, "on" \| "off")` | Toggle FK constraint checking |

DDL `QueryDef` generator equivalents (return `QueryDef` without executing):

| Method | Description |
|--------|-------------|
| `getCreateTableQueryDef(table)` | |
| `getCreateViewQueryDef(view)` | |
| `getCreateProcQueryDef(procedure)` | |
| `getCreateObjectQueryDef(builder)` | Unified for table, view, or procedure |
| `getDropTableQueryDef(table)` | |
| `getRenameTableQueryDef(table, newName)` | |
| `getDropViewQueryDef(view)` | |
| `getDropProcQueryDef(procedure)` | |
| `getAddColumnQueryDef(table, columnName, column)` | |
| `getDropColumnQueryDef(table, column)` | |
| `getModifyColumnQueryDef(table, columnName, column)` | |
| `getRenameColumnQueryDef(table, column, newName)` | |
| `getAddPkQueryDef(table, columns)` | |
| `getDropPkQueryDef(table)` | |
| `getAddFkQueryDef(table, relationName, relationDef)` | |
| `getAddIdxQueryDef(table, indexBuilder)` | |
| `getDropFkQueryDef(table, relationName)` | |
| `getDropIdxQueryDef(table, columns)` | |
| `getClearSchemaQueryDef(params)` | |
| `getSchemaExistsQueryDef(database, schema?)` | |
| `getTruncateQueryDef(table)` | |
| `getSwitchFkQueryDef(table, switch_)` | |

---

### Queryable / Executable

#### `Queryable<TData, TFrom>`

The main query builder class. All methods are immutable and return a new `Queryable`.

```typescript
import { Queryable } from "@simplysm/orm-common";
```

**Query building methods (return `Queryable`):**

| Method | SQL | Notes |
|--------|-----|-------|
| `.select(fn)` | SELECT | Map columns to new shape |
| `.distinct()` | DISTINCT | Remove duplicate rows |
| `.lock()` | FOR UPDATE | Row-level exclusive lock (must be inside `connect`) |
| `.top(count)` | TOP / LIMIT | First N rows |
| `.limit(skip, take)` | OFFSET / FETCH | Pagination — requires prior `orderBy()` |
| `.orderBy(fn, dir?)` | ORDER BY | Add sort; multiple calls chain in order |
| `.where(predicate)` | WHERE | Add condition; multiple calls AND together |
| `.search(fn, searchText)` | WHERE LIKE | Multi-column text search with special syntax |
| `.groupBy(fn)` | GROUP BY | Group rows |
| `.having(predicate)` | HAVING | Filter groups |
| `.join(as, fwd)` | LEFT JOIN | 1:N relationship → result as array property |
| `.joinSingle(as, fwd)` | LEFT JOIN | N:1 / 1:1 → result as single object property |
| `.include(fn)` | LEFT JOIN | Auto-join using `TableBuilder` relation definitions |
| `.wrap()` | Subquery | Wrap current query as subquery |
| `.recursive(fwd)` | WITH RECURSIVE | Recursive CTE for hierarchical data |

**Static method:**

| Method | Description |
|--------|-------------|
| `Queryable.union(...queries)` | UNION of 2+ queryables (deduplication) |

**Execution methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `.result()` | `Promise<TData[]>` | Execute SELECT, return all rows |
| `.single()` | `Promise<TData \| undefined>` | Return one row; throws if more than one |
| `.first()` | `Promise<TData \| undefined>` | Return first row only |
| `.count(fwd?)` | `Promise<number>` | Count rows; cannot use after `distinct()`/`groupBy()` without `wrap()` |
| `.exists()` | `Promise<boolean>` | Check if any rows match |
| `.insert(records, outputColumns?)` | `Promise<void \| Pick[]>` | INSERT; returns output if columns specified; auto-chunks at 1000 |
| `.insertIfNotExists(record, outputColumns?)` | `Promise<void \| Pick>` | INSERT if WHERE condition not matched |
| `.insertInto(targetTable, outputColumns?)` | `Promise<void \| Pick[]>` | INSERT INTO ... SELECT |
| `.update(recordFwd, outputColumns?)` | `Promise<void \| Pick[]>` | UPDATE |
| `.delete(outputColumns?)` | `Promise<void \| Pick[]>` | DELETE |
| `.upsert(updateFwd, insertFwd?, outputColumns?)` | `Promise<void \| Pick[]>` | UPDATE or INSERT |
| `.switchFk("on" \| "off")` | `Promise<void>` | Toggle FK for this table |

**QueryDef generator methods (for custom execution):**

| Method | Description |
|--------|-------------|
| `.getSelectQueryDef()` | Build SELECT `QueryDef` |
| `.getInsertQueryDef(records, outputColumns?)` | Build INSERT `QueryDef` |
| `.getInsertIfNotExistsQueryDef(record, outputColumns?)` | Build INSERT IF NOT EXISTS `QueryDef` |
| `.getInsertIntoQueryDef(targetTable, outputColumns?)` | Build INSERT INTO SELECT `QueryDef` |
| `.getUpdateQueryDef(recordFwd, outputColumns?)` | Build UPDATE `QueryDef` |
| `.getDeleteQueryDef(outputColumns?)` | Build DELETE `QueryDef` |
| `.getUpsertQueryDef(updateFwd, insertFwd, outputColumns?)` | Build UPSERT `QueryDef` |
| `.getResultMeta(outputColumns?)` | Build `ResultMeta` for result parsing |

**Examples:**

```typescript
// SELECT with WHERE and ORDER BY
const users = await db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .orderBy((u) => u.name)
  .result();

// JOIN (1:N)
const usersWithPosts = await db.user()
  .join("posts", (qr, u) =>
    qr.from(Post).where((p) => [expr.eq(p.userId, u.id)])
  )
  .result();
// Result: { id, name, posts?: Post[] }

// INCLUDE (using relation definitions)
const posts = await db.post()
  .include((p) => p.author)
  .result();

// Pagination
const page = await db.user()
  .orderBy((u) => u.id)
  .limit(0, 20)
  .result();

// INSERT and get returned ID
const [inserted] = await db.user().insert(
  [{ name: "Alice" }],
  ["id"],
);

// UPSERT
await db.user()
  .where((u) => [expr.eq(u.email, "alice@example.com")])
  .upsert(
    () => ({ loginCount: expr.val("number", 1) }),
    (update) => ({ ...update, email: expr.val("string", "alice@example.com") }),
  );

// Recursive CTE (hierarchical query)
const tree = await db.employee()
  .where((e) => [expr.null(e.managerId)])
  .recursive((cte) =>
    cte.from(Employee)
      .where((e) => [expr.eq(e.managerId, e.self[0].id)])
  )
  .result();
```

#### `Executable<TParams, TReturns>`

Wrapper class for stored procedure execution.

```typescript
import { Executable } from "@simplysm/orm-common";
```

| Method | Returns | Description |
|--------|---------|-------------|
| `.execute(params)` | `Promise<InferColumnExprs<TReturns>[][]>` | Execute the stored procedure |
| `.getExecProcQueryDef(params?)` | `QueryDef` | Build EXEC PROC `QueryDef` |

```typescript
const result = await db.getUserById().execute({ userId: 1 });
```

---

### Schema Builders

#### `Table(name)` / `TableBuilder`

Factory function and builder class for defining database tables.

```typescript
import { Table } from "@simplysm/orm-common";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
    createdAt: c.datetime(),
  }))
  .primaryKey("id")
  .indexes((i) => [
    i.index("email").unique(),
    i.index("name", "createdAt").orderBy("ASC", "DESC"),
  ])
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
    profile: r.foreignKeyTarget(() => Profile, "user").single(),
  }));
```

`TableBuilder` fluent methods:

| Method | Description |
|--------|-------------|
| `.database(db)` | Set database name |
| `.schema(schema)` | Set schema name (MSSQL/PostgreSQL) |
| `.description(desc)` | Set table description (DDL comment) |
| `.columns(fn)` | Define columns via column factory |
| `.primaryKey(...columns)` | Set primary key (supports composite PK) |
| `.indexes(fn)` | Define indexes via index factory |
| `.relations(fn)` | Define relationships via relation factory |

`TableBuilder` type inference properties:

| Property | Description |
|----------|-------------|
| `$infer` | Full row type (columns + relations) |
| `$inferColumns` | Columns-only type |
| `$inferInsert` | INSERT type (required fields required, autoIncrement/nullable/default optional) |
| `$inferUpdate` | UPDATE type (all fields optional) |
| `$columns` | Raw `ColumnBuilderRecord` |
| `$relations` | Raw `RelationBuilderRecord` |

#### `View(name)` / `ViewBuilder`

Factory function and builder class for defining database views.

```typescript
import { View } from "@simplysm/orm-common";

const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MyDb) =>
    db.user()
      .where((u) => [expr.eq(u.status, "active")])
      .select((u) => ({ id: u.id, name: u.name }))
  );
```

`ViewBuilder` fluent methods:

| Method | Description |
|--------|-------------|
| `.database(db)` | Set database name |
| `.schema(schema)` | Set schema name |
| `.description(desc)` | Set view description |
| `.query(viewFn)` | Define the view SELECT query; takes a `DbContextBase` and returns `Queryable` |
| `.relations(fn)` | Define relationships (only `relationKey`/`relationKeyTarget`, not FK) |

`ViewBuilder` type inference properties:

| Property | Description |
|----------|-------------|
| `$infer` | View row type |
| `$relations` | Raw `RelationBuilderRecord` |

#### `Procedure(name)` / `ProcedureBuilder`

Factory function and builder class for defining stored procedures.

```typescript
import { Procedure } from "@simplysm/orm-common";

const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({
    userId: c.bigint(),
  }))
  .returns((c) => ({
    id: c.bigint(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }))
  .body("SELECT id, name, email FROM User WHERE id = userId");
```

`ProcedureBuilder` fluent methods:

| Method | Description |
|--------|-------------|
| `.database(db)` | Set database name |
| `.schema(schema)` | Set schema name |
| `.description(desc)` | Set procedure description |
| `.params(fn)` | Define input parameters |
| `.returns(fn)` | Define result columns |
| `.body(sql)` | Set procedure body SQL (DBMS-specific syntax) |

`ProcedureBuilder` type inference properties:

| Property | Description |
|----------|-------------|
| `$params` | Raw parameter `ColumnBuilderRecord` |
| `$returns` | Raw returns `ColumnBuilderRecord` |

### Column Types (`createColumnFactory`)

Used inside `.columns()`, `.params()`, and `.returns()`, and also directly in migrations.

```typescript
import { createColumnFactory } from "@simplysm/orm-common";

const c = createColumnFactory();
// Used in migrations:
await db.addColumn({ database: "mydb", name: "User" }, "status", c.varchar(20).nullable());
```

Available column type methods:

| Method | SQL Type | TypeScript Type |
|--------|----------|-----------------|
| `c.int()` | INT | `number` |
| `c.bigint()` | BIGINT | `number` |
| `c.float()` | FLOAT | `number` |
| `c.double()` | DOUBLE | `number` |
| `c.decimal(precision, scale?)` | DECIMAL | `number` |
| `c.varchar(length)` | VARCHAR | `string` |
| `c.char(length)` | CHAR | `string` |
| `c.text()` | TEXT | `string` |
| `c.binary()` | LONGBLOB/VARBINARY(MAX)/BYTEA | `Bytes` (Uint8Array) |
| `c.boolean()` | TINYINT(1)/BIT/BOOLEAN | `boolean` |
| `c.datetime()` | DATETIME | `DateTime` |
| `c.date()` | DATE | `DateOnly` |
| `c.time()` | TIME | `Time` |
| `c.uuid()` | BINARY(16)/UNIQUEIDENTIFIER/UUID | `Uuid` |

`ColumnBuilder` modifier methods:

| Method | Description |
|--------|-------------|
| `.autoIncrement()` | Auto-increment; excluded from INSERT required fields |
| `.nullable()` | Allow NULL; adds `undefined` to the TypeScript type |
| `.default(value)` | Default value; makes the field optional in INSERT |
| `.description(desc)` | Column description (DDL comment) |

### Relation Builders

Used inside `.relations()`:

#### `r.foreignKey(columns, targetFn)` → `ForeignKeyBuilder`

N:1 relationship with DB FK constraint.

```typescript
const Post = Table("Post")
  .columns((c) => ({ id: c.bigint().autoIncrement(), authorId: c.bigint() }))
  .primaryKey("id")
  .relations((r) => ({
    author: r.foreignKey(["authorId"], () => User),
  }));
```

#### `r.foreignKeyTarget(targetTableFn, relationName)` → `ForeignKeyTargetBuilder`

1:N reverse reference. Results in an array by default; call `.single()` for 1:1.

```typescript
const User = Table("User")
  .columns((c) => ({ id: c.bigint().autoIncrement() }))
  .primaryKey("id")
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),      // 1:N → Post[]
    profile: r.foreignKeyTarget(() => Profile, "user").single(),  // 1:1 → Profile
  }));
```

#### `r.relationKey(columns, targetFn)` → `RelationKeyBuilder`

N:1 logical relationship without a DB FK constraint. Available for both tables and views.

#### `r.relationKeyTarget(targetTableFn, relationName)` → `RelationKeyTargetBuilder`

1:N logical reverse reference without a DB FK constraint. Call `.single()` for 1:1.

#### `IndexBuilder` / `createIndexFactory`

Index builder, used inside `.indexes()`.

```typescript
Table("User")
  .indexes((i) => [
    i.index("email").unique(),
    i.index("name").name("IX_User_Name"),
    i.index("createdAt").orderBy("DESC"),
    i.index("status", "createdAt").orderBy("ASC", "DESC"),
  ]);
```

`IndexBuilder` methods:

| Method | Description |
|--------|-------------|
| `.unique()` | Create a unique index |
| `.name(name)` | Set index name |
| `.orderBy(...dirs)` | Set sort direction per column (`"ASC"` or `"DESC"`) |
| `.description(desc)` | Index description |

---

### SQL Expressions (`expr`)

The `expr` object provides all SQL expression builders. All methods return `ExprUnit` (SELECT expressions) or `WhereExprUnit` (WHERE conditions).

```typescript
import { expr } from "@simplysm/orm-common";
```

#### Value / Column Creation

| Method | Description |
|--------|-------------|
| `expr.val(dataType, value)` | Wrap a literal value as `ExprUnit` |
| `expr.col(dataType, ...path)` | Create a column reference (internal use) |
| `expr.raw(dataType)\`SQL ${interpolation}\`` | Raw SQL with interpolated `ExprUnit` values |

```typescript
expr.val("string", "active")
expr.val("number", 100)
expr.val("DateOnly", DateOnly.today())
expr.raw("number")`ARRAY_LENGTH(${u.tags}, 1)`
```

#### Comparison Expressions (WHERE)

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.eq(source, target)` | `<=>` / IS NULL | NULL-safe equality |
| `expr.gt(source, target)` | `>` | Greater than |
| `expr.lt(source, target)` | `<` | Less than |
| `expr.gte(source, target)` | `>=` | Greater than or equal |
| `expr.lte(source, target)` | `<=` | Less than or equal |
| `expr.between(source, from?, to?)` | `BETWEEN` | Range; `undefined` means unbounded |
| `expr.null(source)` | `IS NULL` | Null check |
| `expr.like(source, pattern)` | `LIKE` | Pattern matching (`%`, `_`) |
| `expr.regexp(source, pattern)` | `REGEXP` | Regular expression matching |
| `expr.in(source, values)` | `IN (...)` | Value list match |
| `expr.inQuery(source, query)` | `IN (SELECT ...)` | Subquery match (single-column SELECT) |
| `expr.exists(query)` | `EXISTS (...)` | Subquery existence check |

```typescript
db.user()
  .where((u) => [
    expr.eq(u.status, "active"),
    expr.gte(u.age, 18),
    expr.between(u.score, 0, 100),
    expr.null(u.deletedAt),
    expr.in(u.role, ["admin", "manager"]),
    expr.like(u.name, "John%"),
  ])
```

#### Logical Expressions (WHERE)

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.not(arg)` | `NOT (...)` | Negate a condition |
| `expr.and(conditions)` | `(... AND ...)` | All conditions must be true |
| `expr.or(conditions)` | `(... OR ...)` | At least one condition must be true |

#### String Expressions

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.concat(...args)` | `CONCAT(...)` | Concatenate strings; NULL treated as empty string |
| `expr.left(source, length)` | `LEFT(...)` | Extract N characters from left |
| `expr.right(source, length)` | `RIGHT(...)` | Extract N characters from right |
| `expr.trim(source)` | `TRIM(...)` | Remove surrounding whitespace |
| `expr.padStart(source, length, fillString)` | `LPAD(...)` | Left-pad to target length |
| `expr.replace(source, from, to)` | `REPLACE(...)` | Replace all occurrences |
| `expr.upper(source)` | `UPPER(...)` | Uppercase |
| `expr.lower(source)` | `LOWER(...)` | Lowercase |
| `expr.length(source)` | `CHAR_LENGTH(...)` | Character length |
| `expr.byteLength(source)` | `OCTET_LENGTH(...)` | Byte length (UTF-8: Korean = 3 bytes) |
| `expr.substring(source, start, length?)` | `SUBSTRING(...)` | Extract substring (1-based index) |
| `expr.indexOf(source, search)` | `LOCATE(...)` | Find position (1-based; 0 if not found) |

#### Numeric Expressions

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.abs(source)` | `ABS(...)` | Absolute value |
| `expr.round(source, digits)` | `ROUND(...)` | Round to N decimal places |
| `expr.ceil(source)` | `CEILING(...)` | Round up |
| `expr.floor(source)` | `FLOOR(...)` | Round down |

#### Date Expressions

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.year(source)` | `YEAR(...)` | Extract year (4-digit) |
| `expr.month(source)` | `MONTH(...)` | Extract month (1–12) |
| `expr.day(source)` | `DAY(...)` | Extract day (1–31) |
| `expr.hour(source)` | `HOUR(...)` | Extract hour (0–23) |
| `expr.minute(source)` | `MINUTE(...)` | Extract minute (0–59) |
| `expr.second(source)` | `SECOND(...)` | Extract second (0–59) |
| `expr.isoWeek(source)` | `WEEK(..., 3)` | ISO 8601 week number (1–53, Mon start) |
| `expr.isoWeekStartDate(source)` | — | Monday of the week containing the date |
| `expr.isoYearMonth(source)` | — | First day of the month (YYYY-MM-01) |
| `expr.dateDiff(separator, from, to)` | `DATEDIFF(...)` | Date difference in specified unit |
| `expr.dateAdd(separator, source, value)` | `DATEADD(...)` | Add an interval to a date |
| `expr.formatDate(source, format)` | `DATE_FORMAT(...)` | Format date as string (DBMS-specific format strings) |

`DateSeparator` values: `"year"`, `"month"`, `"day"`, `"hour"`, `"minute"`, `"second"`

#### Conditional Expressions

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.ifNull(...args)` | `COALESCE(...)` | Return first non-null value |
| `expr.nullIf(source, value)` | `NULLIF(...)` | Return NULL if source equals value |
| `expr.is(condition)` | — | Convert WHERE expression to boolean `ExprUnit` |
| `expr.if(condition, then, else_)` | `IF(...)` / `CASE` | Ternary conditional |
| `expr.switch<T>().case(...).default(...)` | `CASE WHEN ... END` | Multi-branch conditional |

```typescript
// COALESCE
expr.ifNull(u.nickname, u.name, "Guest")

// Ternary
expr.if(expr.gte(u.age, 18), "adult", "minor")

// CASE WHEN
expr.switch<string>()
  .case(expr.gte(u.score, 90), "A")
  .case(expr.gte(u.score, 80), "B")
  .default("F")

// Boolean from condition
db.user().select((u) => ({
  isActive: expr.is(expr.eq(u.status, "active")),
}))
```

#### Aggregate Expressions

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.count(arg?, distinct?)` | `COUNT(...)` | Row count; omit arg for `COUNT(*)` |
| `expr.sum(arg)` | `SUM(...)` | Sum; NULL if all values are NULL |
| `expr.avg(arg)` | `AVG(...)` | Average; NULL if all values are NULL |
| `expr.max(arg)` | `MAX(...)` | Maximum; NULL if all values are NULL |
| `expr.min(arg)` | `MIN(...)` | Minimum; NULL if all values are NULL |
| `expr.greatest(...args)` | `GREATEST(...)` | Largest among multiple values |
| `expr.least(...args)` | `LEAST(...)` | Smallest among multiple values |

#### Window Functions

All window functions accept a `WinSpecInput`:

```typescript
interface WinSpecInput {
  partitionBy?: ExprInput<ColumnPrimitive>[];
  orderBy?: [ExprInput<ColumnPrimitive>, ("ASC" | "DESC")?][];
}
```

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.rowNumber(spec)` | `ROW_NUMBER() OVER (...)` | Sequential row number within partition |
| `expr.rank(spec)` | `RANK() OVER (...)` | Rank; ties get same rank, next skipped |
| `expr.denseRank(spec)` | `DENSE_RANK() OVER (...)` | Dense rank; ties get same rank, no skipping |
| `expr.ntile(n, spec)` | `NTILE(n) OVER (...)` | Split partition into N buckets |
| `expr.lag(column, spec, options?)` | `LAG(...) OVER (...)` | Previous row value |
| `expr.lead(column, spec, options?)` | `LEAD(...) OVER (...)` | Next row value |
| `expr.firstValue(column, spec)` | `FIRST_VALUE(...) OVER (...)` | First value in window |
| `expr.lastValue(column, spec)` | `LAST_VALUE(...) OVER (...)` | Last value in window |
| `expr.sumOver(column, spec)` | `SUM(...) OVER (...)` | Cumulative/windowed sum |
| `expr.avgOver(column, spec)` | `AVG(...) OVER (...)` | Windowed average |
| `expr.countOver(spec, column?)` | `COUNT(*) OVER (...)` | Windowed row count |
| `expr.minOver(column, spec)` | `MIN(...) OVER (...)` | Windowed minimum |
| `expr.maxOver(column, spec)` | `MAX(...) OVER (...)` | Windowed maximum |

```typescript
db.order().select((o) => ({
  ...o,
  rowNum: expr.rowNumber({
    partitionBy: [o.userId],
    orderBy: [[o.createdAt, "DESC"]],
  }),
  runningTotal: expr.sumOver(o.amount, {
    partitionBy: [o.userId],
    orderBy: [[o.createdAt, "ASC"]],
  }),
}))
```

#### Other Expressions

| Method | SQL | Description |
|--------|-----|-------------|
| `expr.cast(source, targetType)` | `CAST(... AS ...)` | Type conversion |
| `expr.subquery(dataType, queryable)` | `(SELECT ...)` | Scalar subquery in SELECT |
| `expr.random()` | `RAND()` / `RANDOM()` | Random number 0–1 |
| `expr.rowNum()` | — | Row number without window spec |
| `expr.toExpr(value)` | — | Convert `ExprInput` to raw `Expr` AST |

```typescript
// CAST
expr.cast(o.id, { type: "varchar", length: 20 })

// Scalar subquery
expr.subquery(
  "number",
  db.post().where((p) => [expr.eq(p.userId, u.id)]).select(() => ({ cnt: expr.count() }))
)

// Random sort
db.user().orderBy(() => expr.random()).limit(0, 10)
```

---

### Models

#### `_Migration` (internal)

The internal system table used by `initialize()` to track applied migrations. It is automatically added to every `DbContextDef` by `defineDbContext` as `_migration`.

```typescript
// Accessible via the db instance (read-only, internal use)
const applied = await db._migration().result();
// Returns: { code: string }[]
```

---

### Query Builder (SQL Generation)

#### `createQueryBuilder(dialect)`

Creates a dialect-specific `QueryBuilderBase` for converting `QueryDef` JSON AST to SQL strings.

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

const builder = createQueryBuilder("mysql"); // "mysql" | "mssql" | "postgresql"
const { sql, resultSetIndex, resultSetStride } = builder.build(queryDef);
```

The `build(def)` method accepts any `QueryDef` and returns `QueryBuildResult`:

| Property | Type | Description |
|----------|------|-------------|
| `sql` | `string` | Generated SQL string |
| `resultSetIndex` | `number?` | Which result set to extract (0-based) |
| `resultSetStride` | `number?` | For multi-INSERT: extract every N-th result set |

Available builders (exposed for extension):

| Class | Description |
|-------|-------------|
| `QueryBuilderBase` | Abstract base class |
| `ExprRendererBase` | Abstract expression renderer base |
| `MysqlQueryBuilder` | MySQL implementation |
| `MysqlExprRenderer` | MySQL expression renderer |
| `MssqlQueryBuilder` | MSSQL implementation |
| `MssqlExprRenderer` | MSSQL expression renderer |
| `PostgresqlQueryBuilder` | PostgreSQL implementation |
| `PostgresqlExprRenderer` | PostgreSQL expression renderer |

---

### Low-Level Utilities

#### `queryable(db, tableOrView, as?)`

Factory that returns a `() => Queryable` accessor. Used internally by `createDbContext`. Available for building custom db context wrappers.

```typescript
import { queryable } from "@simplysm/orm-common";

const getUserQueryable = queryable(db, User);
const users = await getUserQueryable().where((u) => [expr.eq(u.isActive, true)]).result();
```

#### `executable(db, procedureBuilder)`

Factory that returns a `() => Executable` accessor. Used internally by `createDbContext`.

```typescript
import { executable } from "@simplysm/orm-common";

const getUser = executable(db, GetUserById);
const result = await getUser().execute({ userId: 1 });
```

#### `parseQueryResult(rawResults, meta)`

Parses raw DB query results into typed TypeScript objects. Handles type coercion (e.g., `"1"` → `number`) and JOIN result grouping/nesting. Returns `undefined` for empty or all-null results.

```typescript
import { parseQueryResult } from "@simplysm/orm-common";

const meta = {
  columns: { id: "number", name: "string", createdAt: "DateTime" },
  joins: {},
};
const result = await parseQueryResult(rawResults, meta);
// Returns TRecord[] | undefined
```

#### `parseSearchQuery(searchText)`

Parses a search query string into SQL LIKE patterns for use with `.search()`.

```typescript
import { parseSearchQuery } from "@simplysm/orm-common";

const parsed = parseSearchQuery('apple "exact phrase" +required -excluded app*');
// {
//   or: ["%apple%", "app%"],
//   must: ["%exact phrase%", "%required%"],
//   not: ["%excluded%"]
// }
```

Search syntax:

| Syntax | Meaning |
|--------|---------|
| `term` | OR: contains term |
| `+term` | MUST: must contain term (AND) |
| `-term` | NOT: must not contain term |
| `"exact phrase"` | MUST: exact phrase match |
| `term*` | Starts with (wildcard) |
| `*term` | Ends with |
| `\*`, `\+`, `\-`, `\%`, `\"`, `\\` | Escape special characters |

Returns `ParsedSearchQuery`:

| Property | Type | Description |
|----------|------|-------------|
| `or` | `string[]` | OR conditions (LIKE patterns) |
| `must` | `string[]` | Required AND conditions (LIKE patterns) |
| `not` | `string[]` | NOT conditions (LIKE patterns) |

#### `getMatchedPrimaryKeys(fkCols, targetTable)`

Matches FK column array against the target table's primary key and returns the PK column name array. Used internally by `include()` and custom JOIN logic.

```typescript
import { getMatchedPrimaryKeys } from "@simplysm/orm-common";

const pkCols = getMatchedPrimaryKeys(["userId"], User);
// Returns: ["id"]
```

---

## Expression Types

### `ExprUnit<TPrimitive>`

Type-safe expression wrapper. All `expr.*` SELECT/value methods return `ExprUnit`.

```typescript
import { ExprUnit } from "@simplysm/orm-common";
```

| Member | Type | Description |
|--------|------|-------------|
| `dataType` | `ColumnPrimitiveStr` | Runtime type name |
| `expr` | `Expr` | Raw JSON AST |
| `n` | `ExprUnit<NonNullable<TPrimitive>>` | Non-nullable accessor (strips `undefined`) |

### `WhereExprUnit`

Wrapper for WHERE condition expressions. All comparison and logical `expr.*` methods return `WhereExprUnit`.

```typescript
import { WhereExprUnit } from "@simplysm/orm-common";
```

### `ExprInput<TPrimitive>`

Union type that accepts either an `ExprUnit<TPrimitive>` or a plain literal value. Most `expr.*` parameters accept `ExprInput` so you can pass raw values without wrapping in `expr.val()`.

```typescript
type ExprInput<TPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```

### `SwitchExprBuilder<TPrimitive>`

Builder returned by `expr.switch()`:

| Method | Description |
|--------|-------------|
| `.case(condition, then)` | Add WHEN ... THEN branch |
| `.default(value)` | Add ELSE and finalize to `ExprUnit` |

### `QueryableRecord<TData>`

Maps a data record type to its expression counterpart. Each primitive field becomes `ExprUnit`, array relations become `QueryableRecord[]`, and nested objects become `QueryableRecord`.

### `NullableQueryableRecord<TData>`

Like `QueryableRecord` but all primitive fields have `| undefined` added (representing LEFT JOIN NULL propagation).

### `QueryableWriteRecord<TData>`

Write-side record type for `update()`/`upsert()` callbacks. Each field accepts `ExprInput<T>` (either `ExprUnit<T>` or a plain value).

### `UnwrapQueryableRecord<R>`

Reverse mapping from a `QueryableRecord` shape back to a plain `DataRecord`. Used to infer the result type of `select()`.

### `PathProxy<TObject>`

Type-safe path proxy used by `.include()`. Only non-primitive (relation) fields are accessible.

```typescript
// TypeScript will error if you try to access a primitive column
db.post().include((p) => p.author)       // OK
db.post().include((p) => p.author.company)  // OK (chained)
// db.post().include((p) => p.title)     // Error: title is ColumnPrimitive
```

### `toExpr(value)`

Converts an `ExprInput` to a raw `Expr` JSON AST. Exposed for custom `QueryBuilder` extensions.

```typescript
import { toExpr } from "@simplysm/orm-common";
```

---

## Type Reference

### Column Types

| Type | Description |
|------|-------------|
| `ColumnPrimitive` | Union of all column-storable TypeScript types (`string \| number \| boolean \| DateTime \| DateOnly \| Time \| Uuid \| Bytes \| undefined`) |
| `ColumnPrimitiveStr` | String key of `ColumnPrimitiveMap` — `"string" \| "number" \| "boolean" \| "DateTime" \| "DateOnly" \| "Time" \| "Uuid" \| "Bytes"` |
| `ColumnPrimitiveMap` | Mapping from `ColumnPrimitiveStr` → TypeScript type |
| `DataType` | SQL data type discriminated union (`{ type: "int" }`, `{ type: "varchar"; length: number }`, etc.) |
| `ColumnMeta` | Column metadata stored inside `ColumnBuilder` |
| `InferColumnPrimitiveFromDataType<T>` | TypeScript type from a `DataType` |
| `dataTypeStrToColumnPrimitiveStr` | Constant object mapping SQL type name → `ColumnPrimitiveStr` |
| `inferColumnPrimitiveStr(value)` | Runtime function: infer `ColumnPrimitiveStr` from a value |

#### SQL Type to TypeScript Type Mapping

| SQL Type | TypeScript Type | Notes |
|----------|----------------|-------|
| `int`, `bigint`, `float`, `double`, `decimal` | `number` | `bigint` means SQL BIGINT (8 bytes), not JS `BigInt` |
| `varchar`, `char`, `text` | `string` | |
| `boolean` | `boolean` | MySQL: TINYINT(1), MSSQL: BIT |
| `datetime` | `DateTime` | From `@simplysm/core-common` |
| `date` | `DateOnly` | From `@simplysm/core-common` |
| `time` | `Time` | From `@simplysm/core-common` |
| `uuid` | `Uuid` | From `@simplysm/core-common` |
| `binary` | `Bytes` | `Uint8Array` |

### Database Types

| Type/Const | Description |
|------------|-------------|
| `Dialect` | `"mysql" \| "mssql" \| "postgresql"` |
| `dialects` | `Dialect[]` constant — all supported dialects |
| `IsolationLevel` | `"READ_UNCOMMITTED" \| "READ_COMMITTED" \| "REPEATABLE_READ" \| "SERIALIZABLE"` |
| `DataRecord` | Recursive query result type: `{ [key: string]: ColumnPrimitive \| DataRecord \| DataRecord[] }` |
| `DbContextExecutor` | Interface that actual DB connectors implement |
| `ResultMeta` | Metadata for converting raw query results (`{ columns, joins }`) |
| `Migration` | `{ name: string; up: (db) => Promise<void> }` |
| `QueryBuildResult` | `{ sql: string; resultSetIndex?: number; resultSetStride?: number }` |

### Schema Builder Types

| Type | Description |
|------|-------------|
| `ColumnBuilderRecord` | `Record<string, ColumnBuilder<...>>` |
| `RelationBuilderRecord` | Union record of all relation builder types |
| `InferColumns<T>` | Infer column value types from a `ColumnBuilderRecord` |
| `InferInsertColumns<T>` | INSERT type (required + optional fields) |
| `InferUpdateColumns<T>` | UPDATE type (all optional) |
| `InferColumnExprs<T>` | Expression input type from a `ColumnBuilderRecord` |
| `InferDeepRelations<T>` | Infer relation types (all optional) |
| `QueryableWriteRecord<TData>` | Write-side record type for update/upsert callbacks (accepts `ExprInput<T>`) |
| `PathProxy<TObject>` | Type-safe path proxy for `.include()` navigation |
| `DataToColumnBuilderRecord<TData>` | Convert `DataRecord` to `ColumnBuilderRecord` (for `insertInto` type checking) |
| `RequiredInsertKeys<T>` | Keys that are required in INSERT (no autoIncrement, nullable, or default) |
| `OptionalInsertKeys<T>` | Keys that are optional in INSERT |
| `ExtractRelationTarget<T>` | Extract the TypeScript type of an FK/RelationKey target |
| `ExtractRelationTargetResult<T>` | Extract the TypeScript type of an FKTarget/RelationKeyTarget (array or single) |

---

## Quick Start

```typescript
import { Table, defineDbContext, createDbContext, expr, DateTime } from "@simplysm/orm-common";

// Define table schema
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    createdAt: c.datetime(),
  }))
  .primaryKey("id");

// Define DbContext
const MyDbDef = defineDbContext({
  tables: { user: User },
});

// Create DbContext instance with executor (from orm-node package)
const db = createDbContext(MyDbDef, executor, { database: "mydb" });

// Execute queries
await db.connect(async () => {
  // INSERT
  await db.user().insert([
    { name: "John", createdAt: DateTime.now() }
  ]);

  // SELECT
  const users = await db.user()
    .where((u) => [expr.eq(u.email, "john@example.com")])
    .result();

  // UPDATE
  await db.user()
    .where((u) => [expr.eq(u.id, 1)])
    .update(() => ({ name: "Jane" }));
});
```

## Security Notes

orm-common uses **enhanced string escaping** instead of parameter binding due to its dynamic query nature.
Always perform input validation at the application level.

```typescript
// Bad: Direct user input
const userInput = req.query.name; // e.g. malicious SQL payload
await db.user().where((u) => [expr.eq(u.name, userInput)]).result();

// Good: Validate before use
const userName = validateUserName(req.query.name);
await db.user().where((u) => [expr.eq(u.name, userName)]).result();

// Better: Type coercion
const userId = Number(req.query.id);
if (Number.isNaN(userId)) throw new Error("Invalid ID");
await db.user().where((u) => [expr.eq(u.id, userId)]).result();
```

## License

Apache-2.0
