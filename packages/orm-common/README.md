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

### Schema Builders

| export | Description |
|--------|------|
| `Table(name)` | Table builder factory function |
| `TableBuilder` | Table schema definition (Fluent API) |
| `View(name)` | View builder factory function |
| `ViewBuilder` | View schema definition (Fluent API) |
| `Procedure(name)` | Procedure builder factory function |
| `ProcedureBuilder` | Procedure schema definition (Fluent API) |
| `ColumnBuilder` | Column definition builder |
| `createColumnFactory()` | Create column type factory |
| `IndexBuilder` | Index definition builder |
| `createIndexFactory()` | Create index factory |
| `ForeignKeyBuilder` | FK relationship builder (N:1, creates DB FK) |
| `ForeignKeyTargetBuilder` | FK reverse reference builder (1:N) |
| `RelationKeyBuilder` | Logical relationship builder (N:1, no DB FK) |
| `RelationKeyTargetBuilder` | Logical reverse reference builder (1:N) |
| `createRelationFactory()` | Create relation factory |

### Query Execution

| export | Description |
|--------|------|
| `Queryable` | Query builder class (SELECT/INSERT/UPDATE/DELETE) |
| `queryable(db, table)` | Create table Queryable from `DbContext` |
| `Executable` | Procedure execution wrapper class |
| `executable(db, proc)` | Create procedure Executable from `DbContext` |
| `DbContext` | Database context abstract class (connection, transaction, DDL) |

### Expressions

| export | Description |
|--------|------|
| `expr` | SQL expression builder object |
| `toExpr(value)` | Convert `ExprInput` to `Expr` AST |
| `ExprUnit` | Value expression wrapper class |
| `WhereExprUnit` | WHERE condition expression wrapper class |

### Query Builder (SQL Generation)

| export | Description |
|--------|------|
| `createQueryBuilder(dialect)` | Create dialect-specific query builder instance |
| `QueryBuilderBase` | Query builder abstract base class |
| `MysqlQueryBuilder` | MySQL SQL generator |
| `MssqlQueryBuilder` | MSSQL SQL generator |
| `PostgresqlQueryBuilder` | PostgreSQL SQL generator |
| `ExprRendererBase` | Expression renderer abstract base class |
| `MysqlExprRenderer` | MySQL expression renderer |
| `MssqlExprRenderer` | MSSQL expression renderer |
| `PostgresqlExprRenderer` | PostgreSQL expression renderer |

### Utilities

| export | Description |
|--------|------|
| `parseSearchQuery(text)` | Parse search string into SQL LIKE patterns |
| `parseQueryResult(rows, meta)` | Convert flat query results to nested objects |
| `getMatchedPrimaryKeys(fk, table)` | Match FK columns with target table PK |
| `SystemMigration` | Internal table for migration history management |

### Errors

| export | Description |
|--------|------|
| `DbTransactionError` | Transaction error (DBMS independent) |
| `DbErrorCode` | Error code enum (`NO_ACTIVE_TRANSACTION`, `DEADLOCK`, `LOCK_TIMEOUT`, etc.) |

### Types

| export | Description |
|--------|------|
| `Dialect` | `"mysql" \| "mssql" \| "postgresql"` |
| `dialects` | All Dialect array (for testing) |
| `IsolationLevel` | Transaction isolation level |
| `DbContextStatus` | `"ready" \| "connect" \| "transact"` |
| `DbContextExecutor` | Query executor interface |
| `Migration` | Migration definition interface |
| `ResultMeta` | Query result conversion metadata |
| `QueryBuildResult` | Built SQL + result set meta |
| `DataRecord` | Query result record (supports recursive nesting) |
| `DataType` | Column data type definition |
| `ColumnPrimitive` | Column primitive type union |
| `ColumnMeta` | Column metadata |
| `InferColumns<T>` | Infer value types from column builder |
| `InferInsertColumns<T>` | Infer types for INSERT (autoIncrement/nullable/default are optional) |
| `InferUpdateColumns<T>` | Infer types for UPDATE (all fields optional) |
| `InferDeepRelations<T>` | Deep type inference from relation definitions |
| `QueryableRecord<T>` | Queryable internal column record type |
| `PathProxy<T>` | Type-safe path proxy for `include()` |
| `QueryDef` | Query definition union type (DML + DDL) |
| `SelectQueryDef` | SELECT query definition |
| `Expr`, `WhereExpr` | Expression AST types |

## Usage

### Table Definition

Define table schema using the `Table()` factory function and Fluent API.

```typescript
import { Table } from "@simplysm/orm-common";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    isActive: c.boolean().default(true),
    createdAt: c.datetime(),
  }))
  .primaryKey("id")
  .indexes((i) => [
    i.index("email").unique(),
    i.index("name", "createdAt").orderBy("ASC", "DESC"),
  ]);
```

#### Column Types

| Factory Method | SQL Type | TypeScript Type |
|--------------|----------|----------------|
| `c.int()` | INT | `number` |
| `c.bigint()` | BIGINT | `number` |
| `c.float()` | FLOAT | `number` |
| `c.double()` | DOUBLE | `number` |
| `c.decimal(p, s)` | DECIMAL(p, s) | `number` |
| `c.varchar(n)` | VARCHAR(n) | `string` |
| `c.char(n)` | CHAR(n) | `string` |
| `c.text()` | TEXT | `string` |
| `c.boolean()` | BOOLEAN / BIT / TINYINT(1) | `boolean` |
| `c.datetime()` | DATETIME | `DateTime` |
| `c.date()` | DATE | `DateOnly` |
| `c.time()` | TIME | `Time` |
| `c.uuid()` | UUID / UNIQUEIDENTIFIER / BINARY(16) | `Uuid` |
| `c.binary()` | BLOB / VARBINARY(MAX) / BYTEA | `Bytes` |

#### Column Options

| Method | Description |
|--------|------|
| `.autoIncrement()` | Auto increment (optional on INSERT) |
| `.nullable()` | Allow NULL (adds `undefined` to type) |
| `.default(value)` | Set default value (optional on INSERT) |
| `.description(text)` | Column description (DDL comment) |

### Relationship Definition

Define relationships between tables to enable automatic JOINs via `include()`.

```typescript
const Post = Table("Post")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    authorId: c.bigint(),
    title: c.varchar(200),
    content: c.text(),
  }))
  .primaryKey("id")
  .relations((r) => ({
    // N:1 relationship - Post.authorId → User.id (creates DB FK)
    author: r.foreignKey(["authorId"], () => User),
  }));

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id")
  .relations((r) => ({
    // 1:N reverse reference - User ← Post.author
    posts: r.foreignKeyTarget(() => Post, "author"),

    // 1:1 relationship (single object)
    profile: r.foreignKeyTarget(() => Profile, "user").single(),
  }));
```

#### Relationship Builder Types

| Method | Cardinality | Creates DB FK | Available For |
|--------|-----------|-----------|--------------|
| `r.foreignKey(cols, targetFn)` | N:1 | Yes | Table |
| `r.foreignKeyTarget(targetFn, relName)` | 1:N | - | Table |
| `r.relationKey(cols, targetFn)` | N:1 | No | Table, View |
| `r.relationKeyTarget(targetFn, relName)` | 1:N | - | Table, View |

Calling `.single()` on `foreignKeyTarget` / `relationKeyTarget` establishes a 1:1 relationship (returns single object instead of array).

### DbContext Configuration

Register tables and procedures by extending `DbContext`.

```typescript
import { DbContext, queryable, executable, expr } from "@simplysm/orm-common";

class MyDb extends DbContext {
  readonly user = queryable(this, User);
  readonly post = queryable(this, Post);
  readonly getUserById = executable(this, GetUserById);

  // Migration definitions
  readonly migrations = [
    {
      name: "20260101_add_status",
      up: async (db: MyDb) => {
        const c = createColumnFactory();
        await db.addColumn(
          { database: "mydb", name: "User" },
          "status",
          c.varchar(20).nullable(),
        );
      },
    },
  ];
}
```

### Connection and Transactions

```typescript
// executor is NodeDbContextExecutor from orm-node package, etc.
const db = new MyDb(executor, { database: "mydb" });

// Execute within transaction (auto commit/rollback)
const users = await db.connect(async () => {
  const result = await db.user().result();
  await db.user().insert([{ name: "John Doe", createdAt: DateTime.now() }]);
  return result;
});

// Connect without transaction (for DDL operations)
await db.connectWithoutTransaction(async () => {
  await db.initialize(); // Code First initialization
});

// Specify isolation level
await db.connect(async () => {
  // ...
}, "SERIALIZABLE");
```

### SELECT Queries

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

### JOIN Queries

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

### Grouping and Aggregation

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

### Pagination

```typescript
// TOP (no ORDER BY required)
const topUsers = await db.user().top(10).result();

// LIMIT/OFFSET (ORDER BY required)
const page = await db.user()
  .orderBy((u) => u.createdAt, "DESC")
  .limit(0, 20) // skip 0, take 20
  .result();
```

### Text Search

The `search()` method supports structured search syntax.

```typescript
const users = await db.user()
  .search((u) => [u.name, u.email], "John -deleted")
  .result();
```

#### Search Syntax

| Syntax | Description | Example |
|------|------|------|
| Space | OR combination | `apple banana` |
| `""` | Phrase search (required) | `"delicious apple"` |
| `+` | Required (AND) | `+apple +banana` |
| `-` | Exclude (NOT) | `apple -banana` |
| `*` | Wildcard | `app*` |
| `\*` | Escape | `app\*` (literal `*`) |

### UNION

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

### Subquery Wrapping (wrap)

To use `count()` after `distinct()` or `groupBy()`, wrap the query with `wrap()`.

```typescript
const count = await db.user()
  .select((u) => ({ name: u.name }))
  .distinct()
  .wrap()
  .count();
```

### Recursive CTE (recursive)

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

### INSERT

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

### UPDATE

```typescript
// Simple update
await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .update((u) => ({
    name: expr.val("string", "New Name"),
  }));

// Reference existing value
await db.product()
  .update((p) => ({
    viewCount: expr.val("number", p.viewCount + 1),
  }));
```

### DELETE

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

### UPSERT

```typescript
// Same data for UPDATE/INSERT
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(() => ({
    name: expr.val("string", "Test"),
    email: expr.val("string", "test@test.com"),
  }));

// Different data for UPDATE/INSERT
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(
    () => ({ loginCount: expr.val("number", 1) }),
    (update) => ({ ...update, email: expr.val("string", "test@test.com") }),
  );
```

### Row Locking (FOR UPDATE)

```typescript
await db.connect(async () => {
  const user = await db.user()
    .where((u) => [expr.eq(u.id, 1)])
    .lock()
    .single();
});
```

## Expressions (expr)

The `expr` object generates Dialect-independent SQL expressions. It creates JSON AST instead of SQL strings, which the `QueryBuilder` converts for each DBMS.

### Comparison Expressions (WHERE)

| Method | SQL | Description |
|--------|-----|------|
| `expr.eq(a, b)` | `a = b` (NULL-safe) | Equality comparison |
| `expr.gt(a, b)` | `a > b` | Greater than |
| `expr.lt(a, b)` | `a < b` | Less than |
| `expr.gte(a, b)` | `a >= b` | Greater than or equal |
| `expr.lte(a, b)` | `a <= b` | Less than or equal |
| `expr.between(a, from, to)` | `a BETWEEN from AND to` | Range (unbounded in direction if undefined) |
| `expr.null(a)` | `a IS NULL` | NULL check |
| `expr.like(a, pattern)` | `a LIKE pattern` | Pattern matching |
| `expr.regexp(a, pattern)` | `a REGEXP pattern` | Regex matching |
| `expr.in(a, values)` | `a IN (v1, v2, ...)` | Value list comparison |
| `expr.inQuery(a, query)` | `a IN (SELECT ...)` | Subquery comparison |
| `expr.exists(query)` | `EXISTS (SELECT ...)` | Subquery existence |

### Logical Expressions (WHERE)

| Method | SQL | Description |
|--------|-----|------|
| `expr.and(conditions)` | `(c1 AND c2 AND ...)` | All conditions met |
| `expr.or(conditions)` | `(c1 OR c2 OR ...)` | At least one condition met |
| `expr.not(condition)` | `NOT (condition)` | Negate condition |

### String Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.concat(...args)` | `CONCAT(a, b, ...)` | String concatenation |
| `expr.left(s, n)` | `LEFT(s, n)` | Extract n chars from left |
| `expr.right(s, n)` | `RIGHT(s, n)` | Extract n chars from right |
| `expr.trim(s)` | `TRIM(s)` | Trim whitespace from both sides |
| `expr.padStart(s, n, fill)` | `LPAD(s, n, fill)` | Left padding |
| `expr.replace(s, from, to)` | `REPLACE(s, from, to)` | String replacement |
| `expr.upper(s)` | `UPPER(s)` | Convert to uppercase |
| `expr.lower(s)` | `LOWER(s)` | Convert to lowercase |
| `expr.length(s)` | `CHAR_LENGTH(s)` | Character count |
| `expr.byteLength(s)` | `OCTET_LENGTH(s)` | Byte count |
| `expr.substring(s, start, len)` | `SUBSTRING(s, start, len)` | Substring extraction (1-based) |
| `expr.indexOf(s, search)` | `LOCATE(search, s)` | Find position (1-based, 0 if not found) |

### Numeric Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.abs(n)` | `ABS(n)` | Absolute value |
| `expr.round(n, digits)` | `ROUND(n, digits)` | Round |
| `expr.ceil(n)` | `CEILING(n)` | Ceiling |
| `expr.floor(n)` | `FLOOR(n)` | Floor |

### Date Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.year(d)` | `YEAR(d)` | Extract year |
| `expr.month(d)` | `MONTH(d)` | Extract month (1~12) |
| `expr.day(d)` | `DAY(d)` | Extract day (1~31) |
| `expr.hour(d)` | `HOUR(d)` | Extract hour (0~23) |
| `expr.minute(d)` | `MINUTE(d)` | Extract minute (0~59) |
| `expr.second(d)` | `SECOND(d)` | Extract second (0~59) |
| `expr.isoWeek(d)` | `WEEK(d, 3)` | ISO week (1~53) |
| `expr.isoWeekStartDate(d)` | - | ISO week start date (Monday) |
| `expr.isoYearMonth(d)` | - | First day of the month |
| `expr.dateDiff(sep, from, to)` | `DATEDIFF(sep, from, to)` | Date difference |
| `expr.dateAdd(sep, source, value)` | `DATEADD(sep, value, source)` | Add to date |
| `expr.formatDate(d, format)` | `DATE_FORMAT(d, format)` | Date formatting |

`DateSeparator`: `"year"`, `"month"`, `"day"`, `"hour"`, `"minute"`, `"second"`

### Conditional Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.ifNull(a, b, ...)` | `COALESCE(a, b, ...)` | Return first non-null value |
| `expr.nullIf(a, b)` | `NULLIF(a, b)` | NULL if `a === b` |
| `expr.is(condition)` | `(condition)` | Convert WHERE to boolean |
| `expr.if(cond, then, else)` | `IF(cond, then, else)` | Ternary condition |
| `expr.switch()` | `CASE WHEN ... END` | Multiple condition branching |

```typescript
// CASE WHEN usage example
db.user().select((u) => ({
  grade: expr.switch<string>()
    .case(expr.gte(u.score, 90), "A")
    .case(expr.gte(u.score, 80), "B")
    .case(expr.gte(u.score, 70), "C")
    .default("F"),
}))
```

### Aggregate Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.count(col?, distinct?)` | `COUNT(*)` / `COUNT(DISTINCT col)` | Row count |
| `expr.sum(col)` | `SUM(col)` | Sum |
| `expr.avg(col)` | `AVG(col)` | Average |
| `expr.max(col)` | `MAX(col)` | Maximum |
| `expr.min(col)` | `MIN(col)` | Minimum |
| `expr.greatest(...args)` | `GREATEST(a, b, ...)` | Greatest among multiple values |
| `expr.least(...args)` | `LEAST(a, b, ...)` | Least among multiple values |

### Window Functions

| Method | SQL | Description |
|--------|-----|------|
| `expr.rowNumber(spec)` | `ROW_NUMBER() OVER (...)` | Row number |
| `expr.rank(spec)` | `RANK() OVER (...)` | Rank (gaps on ties) |
| `expr.denseRank(spec)` | `DENSE_RANK() OVER (...)` | Dense rank (consecutive) |
| `expr.ntile(n, spec)` | `NTILE(n) OVER (...)` | Split into n groups |
| `expr.lag(col, spec, opts?)` | `LAG(col, offset) OVER (...)` | Previous row value |
| `expr.lead(col, spec, opts?)` | `LEAD(col, offset) OVER (...)` | Next row value |
| `expr.firstValue(col, spec)` | `FIRST_VALUE(col) OVER (...)` | First value |
| `expr.lastValue(col, spec)` | `LAST_VALUE(col) OVER (...)` | Last value |
| `expr.sumOver(col, spec)` | `SUM(col) OVER (...)` | Window sum |
| `expr.avgOver(col, spec)` | `AVG(col) OVER (...)` | Window average |
| `expr.countOver(spec, col?)` | `COUNT(*) OVER (...)` | Window count |
| `expr.minOver(col, spec)` | `MIN(col) OVER (...)` | Window minimum |
| `expr.maxOver(col, spec)` | `MAX(col) OVER (...)` | Window maximum |

`WinSpec`: `{ partitionBy?: [...], orderBy?: [[col, "ASC"|"DESC"], ...] }`

```typescript
// Window function usage example
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

### Other Expressions

| Method | SQL | Description |
|--------|-----|------|
| `expr.val(dataType, value)` | Literal | Wrap typed value |
| `expr.col(dataType, ...path)` | Column reference | Create column reference (internal) |
| `expr.raw(dataType)\`sql\`` | Raw SQL | Escape hatch for DBMS-specific functions |
| `expr.rowNum()` | - | Total row number |
| `expr.random()` | `RAND()` / `RANDOM()` | Random number 0~1 |
| `expr.cast(source, type)` | `CAST(source AS type)` | Type conversion |
| `expr.subquery(dataType, qr)` | `(SELECT ...)` | Scalar subquery |

```typescript
// Raw SQL (using DBMS-specific functions)
db.user().select((u) => ({
  name: u.name,
  data: expr.raw("string")`JSON_EXTRACT(${u.metadata}, '$.email')`,
}))

// Scalar subquery
db.user().select((u) => ({
  id: u.id,
  postCount: expr.subquery(
    "number",
    db.post()
      .where((p) => [expr.eq(p.userId, u.id)])
      .select(() => ({ cnt: expr.count() }))
  ),
}))
```

## View Definition

```typescript
import { View, expr } from "@simplysm/orm-common";

const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MyDb) =>
    db.user()
      .where((u) => [expr.eq(u.isActive, true)])
      .select((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
      }))
  );

// Define logical relationships on views (no DB FK)
const UserSummary = View("UserSummary")
  .database("mydb")
  .query((db: MyDb) =>
    db.user().select((u) => ({
      id: u.id,
      name: u.name,
      companyId: u.companyId,
    }))
  )
  .relations((r) => ({
    company: r.relationKey(["companyId"], () => Company),
  }));
```

## Procedure Definition

```typescript
import { Procedure, executable } from "@simplysm/orm-common";

const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({
    userId: c.bigint(),
  }))
  .returns((c) => ({
    id: c.bigint(),
    name: c.varchar(100),
    email: c.varchar(200),
  }))
  .body("SELECT id, name, email FROM User WHERE id = userId");

// Register in DbContext
class MyDb extends DbContext {
  readonly getUserById = executable(this, GetUserById);
}

// Invoke
const result = await db.getUserById().execute({ userId: 1 });
```

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

## DDL Operations

`DbContext` supports Code First DDL operations.

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
});
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
| `NO_ACTIVE_TRANSACTION` | No active transaction |
| `TRANSACTION_ALREADY_STARTED` | Transaction already started |
| `DEADLOCK` | Deadlock occurred |
| `LOCK_TIMEOUT` | Lock timeout |

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

## Type Inference

`TableBuilder` automatically infers types from column definitions.

```typescript
const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
  }))
  .primaryKey("id");

// $infer: Full type (columns + relations)
type UserData = typeof User.$infer;
// { id: number; name: string; email: string | undefined; status: string; }

// $inferInsert: For INSERT (autoIncrement/nullable/default are optional)
type UserInsert = typeof User.$inferInsert;
// { name: string; } & { id?: number; email?: string; status?: string; }

// $inferUpdate: For UPDATE (all fields optional)
type UserUpdate = typeof User.$inferUpdate;
// { id?: number; name?: string; email?: string; status?: string; }
```

## License

Apache-2.0
