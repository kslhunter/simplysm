# @simplysm/orm-common

The common module of Simplysm ORM, providing core ORM functionality including type-safe query builders, schema definitions, and SQL expressions.
It generates JSON AST instead of SQL strings, which are then converted to SQL for each DBMS (MySQL, MSSQL, PostgreSQL).

## Installation

```bash
npm install @simplysm/orm-common
# or
pnpm add @simplysm/orm-common
```

### Dependencies

| Package | Description |
|--------|------|
| `@simplysm/core-common` | Common utilities, `DateTime`, `DateOnly`, `Time`, `Uuid` types |

## Supported Databases

| Database | Dialect | Minimum Version |
|-------------|---------|----------|
| MySQL | `mysql` | 8.0.14+ |
| SQL Server | `mssql` | 2012+ |
| PostgreSQL | `postgresql` | 9.0+ |

## Core Modules

### Schema Definition

See [docs/schema.md](docs/schema.md) for full documentation.

- **[Table(name)](docs/schema.md#table-definition)** - Table builder factory function
- **[View(name)](docs/schema.md#view-definition)** - View builder factory function
- **[Procedure(name)](docs/schema.md#procedure-definition)** - Procedure builder factory function
- **[Column Types](docs/schema.md#column-types)** - `c.int()`, `c.varchar()`, `c.datetime()`, etc.
- **[Column Options](docs/schema.md#column-options)** - `.nullable()`, `.autoIncrement()`, `.default()`, `.description()`
- **[Relationships](docs/schema.md#relationship-definition)** - `r.foreignKey()`, `r.foreignKeyTarget()`, `r.relationKey()`, `r.relationKeyTarget()`
- **[DbContext](docs/schema.md#dbcontext-configuration)** - Database context class for connection, transactions, and migrations
- **[Type Inference](docs/schema.md#type-inference)** - `$infer`, `$inferInsert`, `$inferUpdate`

### Query Execution

See [docs/queries.md](docs/queries.md) for full documentation.

- **[Connection & Transactions](docs/queries.md#connection-and-transactions)** - `db.connect()`, `db.connectWithoutTransaction()`
- **[SELECT Queries](docs/queries.md#select-queries)** - `.where()`, `.select()`, `.single()`, `.first()`, `.result()`, `.count()`, `.exists()`
- **[JOIN Queries](docs/queries.md#join-queries)** - `.join()`, `.joinSingle()`, `.include()`
- **[Grouping & Aggregation](docs/queries.md#grouping-and-aggregation)** - `.groupBy()`, `.having()`
- **[Pagination](docs/queries.md#pagination)** - `.top()`, `.limit()`
- **[Text Search](docs/queries.md#text-search)** - `.search()` with structured search syntax
- **[UNION](docs/queries.md#union)** - `Queryable.union()`
- **[Subquery Wrapping](docs/queries.md#subquery-wrapping-wrap)** - `.wrap()`
- **[Recursive CTE](docs/queries.md#recursive-cte-recursive)** - `.recursive()`
- **[INSERT](docs/queries.md#insert)** - `.insert()`, `.insertIfNotExists()`, `.insertInto()`
- **[UPDATE](docs/queries.md#update)** - `.update()`
- **[DELETE](docs/queries.md#delete)** - `.delete()`
- **[UPSERT](docs/queries.md#upsert)** - `.upsert()`
- **[Row Locking](docs/queries.md#row-locking-for-update)** - `.lock()` (FOR UPDATE)
- **[DDL Operations](docs/queries.md#ddl-operations)** - `db.initialize()`, `db.addColumn()`, `db.modifyColumn()`, etc.
- **[Query Builder](docs/queries.md#query-builder-sql-generation)** - `createQueryBuilder()` for converting QueryDef to SQL
- **[Error Handling](docs/queries.md#error-handling)** - `DbTransactionError`, `DbErrorCode`

### SQL Expressions

See [docs/expressions.md](docs/expressions.md) for full documentation.

- **[Comparison Expressions](docs/expressions.md#comparison-expressions-where)** - `expr.eq()`, `expr.gt()`, `expr.lt()`, `expr.between()`, `expr.in()`, `expr.like()`, `expr.regexp()`, `expr.exists()`
- **[Logical Expressions](docs/expressions.md#logical-expressions-where)** - `expr.and()`, `expr.or()`, `expr.not()`
- **[String Expressions](docs/expressions.md#string-expressions)** - `expr.concat()`, `expr.trim()`, `expr.substring()`, `expr.upper()`, `expr.lower()`, `expr.length()`
- **[Numeric Expressions](docs/expressions.md#numeric-expressions)** - `expr.abs()`, `expr.round()`, `expr.ceil()`, `expr.floor()`
- **[Date Expressions](docs/expressions.md#date-expressions)** - `expr.year()`, `expr.month()`, `expr.day()`, `expr.dateDiff()`, `expr.dateAdd()`, `expr.formatDate()`
- **[Conditional Expressions](docs/expressions.md#conditional-expressions)** - `expr.ifNull()`, `expr.nullIf()`, `expr.if()`, `expr.switch()`
- **[Aggregate Expressions](docs/expressions.md#aggregate-expressions)** - `expr.count()`, `expr.sum()`, `expr.avg()`, `expr.max()`, `expr.min()`, `expr.greatest()`, `expr.least()`
- **[Window Functions](docs/expressions.md#window-functions)** - `expr.rowNumber()`, `expr.rank()`, `expr.denseRank()`, `expr.lag()`, `expr.lead()`, `expr.sumOver()`, `expr.avgOver()`
- **[Other Expressions](docs/expressions.md#other-expressions)** - `expr.val()`, `expr.raw()`, `expr.cast()`, `expr.subquery()`, `expr.random()`

## DbContext API

### Functional API (Recommended)

The functional API uses `defineDbContext` + `createDbContext` for better type safety and composability.

```typescript
import { defineDbContext, createDbContext, createColumnFactory } from "@simplysm/orm-common";

// Step 1: Define DbContext schema
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

// Step 2: Create instance with executor
const db = createDbContext(MyDbDef, executor, { database: "mydb" });

// Use queryable accessors
await db.connect(async () => {
  const users = await db.user().result();
  const posts = await db.post().result();
});
```

#### Type Definitions

| Type | Description |
|------|-------------|
| `DbContextDef<TTables, TViews, TProcedures>` | DbContext definition (schema blueprint) |
| `DbContextInstance<TDef>` | Full DbContext instance with queryable accessors and DDL methods |
| `DbContextBase` | Core interface used internally (status, executeDefs, etc.) |

### Class-based API (Deprecated)

The old class-based API is deprecated. Migrate to the functional API for better type safety.

```typescript
// Old (deprecated):
import { DbContext, queryable } from "@simplysm/orm-common";

class MyDb extends DbContext {
  readonly user = queryable(this, User);
  readonly migrations = [...];
}
const db = new MyDb(executor, { database: "mydb" });

// New (recommended):
const MyDbDef = defineDbContext({
  tables: { user: User },
  migrations: [...],
});
const db = createDbContext(MyDbDef, executor, { database: "mydb" });
```

### Migration Guide

To migrate from class-based to functional API:

**Step 1: Replace class definition**

```typescript
// Before:
class MyDb extends DbContext {
  readonly user = queryable(this, User);
  readonly post = queryable(this, Post);
  readonly getUserById = executable(this, GetUserById);

  readonly migrations = [
    { name: "...", up: async (db: MyDb) => { ... } }
  ];
}

// After:
const MyDbDef = defineDbContext({
  tables: { user: User, post: Post },
  procedures: { getUserById: GetUserById },
  migrations: [
    { name: "...", up: async (db) => { ... } }
  ],
});
```

**Step 2: Replace instantiation**

```typescript
// Before:
const db = new MyDb(executor, { database: "mydb" });

// After:
const db = createDbContext(MyDbDef, executor, { database: "mydb" });
```

**Step 3: Update usage (no changes needed)**

```typescript
// Both APIs use the same queryable accessors:
await db.connect(async () => {
  const users = await db.user().result();  // Same syntax
});
```

**Type inference:**

```typescript
// Extract instance type:
type MyDb = DbContextInstance<typeof MyDbDef>;

// Use in function parameters:
async function doSomething(db: MyDb) {
  await db.user().result();
}
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
    .update(() => ({ name: expr.val("string", "Jane") }));
});
```

## License

Apache-2.0
