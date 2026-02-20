# Query Operations

## Connection and Transactions

```typescript
import { defineDbContext, createDbContext } from "@simplysm/orm-common";

const MyDbDef = defineDbContext({ tables: { user: User } });
const db = createDbContext(MyDbDef, executor, { database: "mydb" });

// Execute within transaction (auto commit/rollback)
const users = await db.connect(async () => {
  const result = await db.user().result();
  await db.user().insert([{ name: "John Doe", createdAt: DateTime.now() }]);
  return result;
});

// Connect without transaction (for DDL operations or read-only queries)
await db.connectWithoutTransaction(async () => {
  await db.initialize(); // Code First initialization
});

// Partial transaction within connectWithoutTransaction
await db.connectWithoutTransaction(async () => {
  const report = await db.report().result(); // read without transaction
  await db.trans(async () => {
    await db.log().insert([{ message: "accessed" }]); // write with transaction
  });
});

// Specify isolation level
await db.connect(async () => {
  // ...
}, "SERIALIZABLE");
```

### Connection Methods

| Method | Description |
|--------|-------------|
| `db.connect(fn, isolationLevel?)` | Open connection, begin transaction, run fn, commit. Auto-rollback on error. |
| `db.connectWithoutTransaction(fn)` | Open connection without transaction, run fn, close. |
| `db.trans(fn, isolationLevel?)` | Begin transaction on an already-connected db. Must be called inside `connectWithoutTransaction`. |

## SELECT Queries

```typescript
// Basic query
const users = await db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .orderBy((u) => u.name)
  .result();

// Column selection
const names = await db.user()
  .select((u) => ({
    userName: u.name,
    userEmail: u.email,
  }))
  .result();

// Distinct rows
const uniqueNames = await db.user()
  .select((u) => ({ name: u.name }))
  .distinct()
  .result();

// Single result (error if 2 or more)
const user = await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .single();

// First result only
const latest = await db.user()
  .orderBy((u) => u.createdAt, "DESC")
  .first();

// Row count
const count = await db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .count();

// Existence check
const hasAdmin = await db.user()
  .where((u) => [expr.eq(u.role, "admin")])
  .exists();
```

### Queryable Method Reference

| Method | Description |
|--------|-------------|
| `.select(fn)` | Map columns to a new shape |
| `.distinct()` | Remove duplicate rows |
| `.where(fn)` | Add WHERE condition (multiple calls = AND) |
| `.orderBy(fn, dir?)` | Add ORDER BY (`"ASC"` or `"DESC"`, default `"ASC"`) |
| `.top(n)` | Return at most n rows |
| `.limit(skip, take)` | Paginate (requires `orderBy` first) |
| `.result()` | Execute and return all rows |
| `.single()` | Execute, return first row, error if > 1 row |
| `.first()` | Execute, return first row only |
| `.count(fn?)` | Execute COUNT query |
| `.exists()` | Return true if any row matches |

## JOIN Queries

```typescript
// Manual JOIN (1:N - array)
const usersWithPosts = await db.user()
  .join("posts", (qr, u) =>
    qr.from(Post).where((p) => [expr.eq(p.authorId, u.id)])
  )
  .result();
// Result: { id, name, posts: [{ id, title }, ...] }

// Manual JOIN (N:1 - single object)
const postsWithUser = await db.post()
  .joinSingle("author", (qr, p) =>
    qr.from(User).where((u) => [expr.eq(u.id, p.authorId)])
  )
  .result();
// Result: { id, title, author: { id, name } | undefined }

// include (auto JOIN based on relationship definition)
const postWithAuthor = await db.post()
  .include((p) => p.author)
  .single();

// Nested include
const postWithAuthorCompany = await db.post()
  .include((p) => p.author.company)
  .result();

// Multiple includes
const userWithAll = await db.user()
  .include((u) => u.posts)
  .include((u) => u.profile)
  .result();
```

## Grouping and Aggregation

```typescript
const stats = await db.order()
  .select((o) => ({
    userId: o.userId,
    totalAmount: expr.sum(o.amount),
    orderCount: expr.count(),
  }))
  .groupBy((o) => [o.userId])
  .having((o) => [expr.gte(o.totalAmount, 10000)])
  .result();
```

## Pagination

```typescript
// TOP (no ORDER BY required)
const topUsers = await db.user().top(10).result();

// LIMIT/OFFSET (ORDER BY required)
const page = await db.user()
  .orderBy((u) => u.createdAt, "DESC")
  .limit(0, 20) // skip 0, take 20
  .result();
```

## Text Search

The `search()` method supports structured search syntax.

```typescript
const users = await db.user()
  .search((u) => [u.name, u.email], "John -deleted")
  .result();
```

### Search Syntax

| Syntax | Description | Example |
|------|------|------|
| Space | OR combination | `apple banana` |
| `""` | Phrase search (required) | `"delicious apple"` |
| `+` | Required (AND) | `+apple +banana` |
| `-` | Exclude (NOT) | `apple -banana` |
| `*` | Wildcard | `app*` |
| `\*` | Escape | `app\*` (literal `*`) |

## UNION

```typescript
const allItems = await Queryable.union(
  db.user()
    .where((u) => [expr.eq(u.type, "admin")])
    .select((u) => ({ name: u.name })),
  db.user()
    .where((u) => [expr.eq(u.type, "manager")])
    .select((u) => ({ name: u.name })),
).result();
```

## Subquery Wrapping (wrap)

To use `count()` after `distinct()` or `groupBy()`, wrap the query with `wrap()`.

```typescript
const count = await db.user()
  .select((u) => ({ name: u.name }))
  .distinct()
  .wrap()
  .count();
```

## Recursive CTE (recursive)

Use for querying hierarchical data (org charts, category trees, etc.).

```typescript
const employees = await db.employee()
  .where((e) => [expr.null(e.managerId)]) // Root node
  .recursive((cte) =>
    cte.from(Employee)
      .where((e) => [expr.eq(e.managerId, e.self[0].id)])
  )
  .result();
```

## INSERT

```typescript
// Simple insert
await db.user().insert([
  { name: "John Doe", createdAt: DateTime.now() },
  { name: "Jane Smith", createdAt: DateTime.now() },
]);

// Insert with ID return (outputColumns)
const [inserted] = await db.user().insert(
  [{ name: "John Doe", createdAt: DateTime.now() }],
  ["id"],
);
// inserted.id is available

// Conditional insert (insert if not exists)
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .insertIfNotExists({ name: "Test", email: "test@test.com", createdAt: DateTime.now() });

// INSERT INTO ... SELECT
await db.user()
  .select((u) => ({ name: u.name, createdAt: u.createdAt }))
  .where((u) => [expr.eq(u.isArchived, false)])
  .insertInto(ArchivedUser);
```

## UPDATE

```typescript
// Plain values (recommended)
await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .update(() => ({
    name: "새이름",
    updatedAt: DateTime.now(),
  }));

// Column reference (use ExprUnit from callback parameter)
await db.product()
  .update((p) => ({
    price: expr.mul(p.price, 1.1),
  }));

// Mixed: plain values + expressions
await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .update((u) => ({
    name: "새이름",
    loginCount: expr.raw("number")`${u.loginCount} + 1`,
  }));
```

## DELETE

```typescript
// Simple delete
await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .delete();

// Return deleted data
const deleted = await db.user()
  .where((u) => [expr.eq(u.isExpired, true)])
  .delete(["id", "name"]);
```

## UPSERT

```typescript
// Same data for UPDATE/INSERT
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(() => ({
    name: "Test",
    email: "test@test.com",
  }));

// Different data for UPDATE/INSERT
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(
    () => ({ loginCount: 1 }),
    (update) => ({ ...update, email: "test@test.com" }),
  );
```

## Row Locking (FOR UPDATE)

```typescript
await db.connect(async () => {
  const user = await db.user()
    .where((u) => [expr.eq(u.id, 1)])
    .lock()
    .single();
});
```

## DDL Operations

`DbContextInstance` supports Code First DDL operations.

```typescript
await db.connectWithoutTransaction(async () => {
  // Initialize database (create tables/views/procedures/FKs/indexes)
  await db.initialize();

  // Force initialize (drop and recreate existing data)
  await db.initialize({ force: true });

  // Individual DDL operations
  const c = createColumnFactory();
  await db.addColumn({ database: "mydb", name: "User" }, "status", c.varchar(20).nullable());
  await db.modifyColumn({ database: "mydb", name: "User" }, "status", c.varchar(50).nullable());
  await db.renameColumn({ database: "mydb", name: "User" }, "status", "userStatus");
  await db.dropColumn({ database: "mydb", name: "User" }, "userStatus");

  await db.renameTable({ database: "mydb", name: "User" }, "Member");
  await db.truncate({ database: "mydb", name: "User" });

  // Table existence / schema check
  const exists = await db.schemaExists("mydb");

  // FK management
  await db.switchFk({ database: "mydb", name: "User" }, "off");
  await db.switchFk({ database: "mydb", name: "User" }, "on");
});
```

### DDL Method Reference

| Method | Description |
|--------|-------------|
| `db.initialize(opts?)` | Create all tables, views, procedures, FKs, indexes per schema. `opts.force` drops before recreating. |
| `db.createTable(table)` | CREATE TABLE |
| `db.dropTable(name)` | DROP TABLE |
| `db.renameTable(name, newName)` | Rename table |
| `db.createView(view)` | CREATE VIEW |
| `db.dropView(name)` | DROP VIEW |
| `db.createProc(proc)` | CREATE PROCEDURE |
| `db.dropProc(name)` | DROP PROCEDURE |
| `db.addColumn(table, col, builder)` | ALTER TABLE ADD COLUMN |
| `db.dropColumn(table, col)` | ALTER TABLE DROP COLUMN |
| `db.modifyColumn(table, col, builder)` | ALTER TABLE MODIFY COLUMN |
| `db.renameColumn(table, col, newName)` | Rename column |
| `db.addPk(table, cols)` | Add primary key constraint |
| `db.dropPk(table)` | Drop primary key constraint |
| `db.addFk(table, relName, fkBuilder)` | Add foreign key constraint |
| `db.dropFk(table, relName)` | Drop foreign key constraint |
| `db.addIdx(table, idxBuilder)` | Add index |
| `db.dropIdx(table, cols)` | Drop index |
| `db.clearSchema(params)` | Drop all objects in schema |
| `db.schemaExists(database, schema?)` | Check if schema exists |
| `db.truncate(table)` | TRUNCATE TABLE |
| `db.switchFk(table, "on"\|"off")` | Enable/disable FK constraints |

## Query Builder (SQL Generation)

Converts `QueryDef` JSON AST to DBMS-specific SQL strings.

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

const mysqlBuilder = createQueryBuilder("mysql");
const mssqlBuilder = createQueryBuilder("mssql");
const postgresqlBuilder = createQueryBuilder("postgresql");

// Convert QueryDef to SQL
const queryDef = db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .getSelectQueryDef();

const { sql } = mysqlBuilder.build(queryDef);
```

`QueryBuilderBase.build(def)` accepts any `QueryDef` and returns `QueryBuildResult`:

```typescript
interface QueryBuildResult {
  sql: string;
  resultSetIndex?: number;   // which result set index to use (for multi-result queries)
  resultSetStride?: number;  // stride for multi-result queries (MySQL INSERT with OUTPUT)
}
```

## Error Handling

```typescript
import { DbTransactionError, DbErrorCode } from "@simplysm/orm-common";

try {
  await db.connect(async () => {
    // ...
  });
} catch (err) {
  if (err instanceof DbTransactionError) {
    switch (err.code) {
      case DbErrorCode.DEADLOCK:
        // Deadlock retry logic
        break;
      case DbErrorCode.LOCK_TIMEOUT:
        // Timeout handling
        break;
    }
  }
}
```

### DbErrorCode

| Code | Description |
|------|------|
| `NO_ACTIVE_TRANSACTION` | No active transaction (e.g. rollback with no transaction open) |
| `TRANSACTION_ALREADY_STARTED` | Transaction already started |
| `DEADLOCK` | Deadlock occurred |
| `LOCK_TIMEOUT` | Lock timeout |
