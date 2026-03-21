# @simplysm/orm-common

ORM Module (common) -- dialect-independent ORM for MySQL, MSSQL, and PostgreSQL.

Provides schema definition, type-safe query building, expression construction, and query rendering without any direct database dependency. Actual database execution is handled by `@simplysm/orm-node`.

## Installation

```bash
npm install @simplysm/orm-common
```

## API Reference

### Core

Define and create database contexts with connection/transaction management.

| Export | Kind | Description |
|--------|------|-------------|
| `defineDbContext` | function | Create a DbContext definition (blueprint) from tables, views, procedures, and migrations |
| `createDbContext` | function | Create a runtime DbContext instance from a definition and executor |
| `DbContextBase` | interface | Internal interface used by Queryable/Executable (status, database, schema, executeDefs) |
| `DbContextDef` | interface | DbContext definition holding schema metadata (tables, views, procedures, migrations) |
| `DbContextInstance` | type | Full runtime instance with queryable accessors, DDL methods, and connection management |
| `DbContextStatus` | type | `"ready" \| "connect" \| "transact"` |
| `DbTransactionError` | class | Standardized transaction error with `DbErrorCode` |
| `DbErrorCode` | enum | `NO_ACTIVE_TRANSACTION`, `TRANSACTION_ALREADY_STARTED`, `DEADLOCK`, `LOCK_TIMEOUT` |

[Detailed documentation](docs/core.md)

### Queryable / Executable

Build and execute SELECT, INSERT, UPDATE, DELETE, and UPSERT queries with full type safety.

| Export | Kind | Description |
|--------|------|-------------|
| `Queryable` | class | Chaining query builder (select, where, join, include, orderBy, limit, groupBy, etc.) |
| `queryable` | function | Factory that creates a Queryable getter for a table or view |
| `getMatchedPrimaryKeys` | function | Match FK columns to target table PK columns |
| `Executable` | class | Stored procedure execution wrapper |
| `executable` | function | Factory that creates an Executable getter for a procedure |
| `parseSearchQuery` | function | Parse search text into LIKE patterns (OR / +must / -not) |
| `ParsedSearchQuery` | interface | Result of `parseSearchQuery` with `or`, `must`, `not` arrays |

[Detailed documentation](docs/queryable.md)

### Expression

Dialect-independent SQL expression builder producing JSON AST.

| Export | Kind | Description |
|--------|------|-------------|
| `expr` | const | Expression builder with 70+ methods (comparisons, string, math, date, aggregate, window) |
| `ExprUnit` | class | Type-safe expression wrapper tracking return type via generics |
| `WhereExprUnit` | class | WHERE clause expression wrapper |
| `ExprInput` | type | Accepts `ExprUnit<T>` or literal `T` |
| `SwitchExprBuilder` | interface | CASE WHEN builder returned by `expr.switch()` |

[Detailed documentation](docs/expression.md)

### Schema Builders

Define tables, views, procedures, columns, indexes, and relations via fluent API.

| Export | Kind | Description |
|--------|------|-------------|
| `Table` | function | Create a `TableBuilder` for a table |
| `TableBuilder` | class | Fluent builder: `.database()`, `.columns()`, `.primaryKey()`, `.indexes()`, `.relations()` |
| `View` | function | Create a `ViewBuilder` for a view |
| `ViewBuilder` | class | Fluent builder: `.database()`, `.query()`, `.relations()` |
| `Procedure` | function | Create a `ProcedureBuilder` for a stored procedure |
| `ProcedureBuilder` | class | Fluent builder: `.database()`, `.params()`, `.returns()`, `.body()` |
| `ColumnBuilder` | class | Column definition: `.autoIncrement()`, `.nullable()`, `.default()`, `.description()` |
| `createColumnFactory` | function | Returns column type methods (int, bigint, varchar, text, datetime, etc.) |
| `IndexBuilder` | class | Index definition: `.name()`, `.unique()`, `.orderBy()`, `.description()` |
| `createIndexFactory` | function | Returns `{ index(...columns) }` |
| `ForeignKeyBuilder` | class | N:1 FK relation (creates DB constraint) |
| `ForeignKeyTargetBuilder` | class | 1:N FK reverse-reference with `.single()` |
| `RelationKeyBuilder` | class | N:1 logical relation (no DB constraint) |
| `RelationKeyTargetBuilder` | class | 1:N logical reverse-reference with `.single()` |
| `createRelationFactory` | function | Returns FK + RelationKey methods (table gets both, view gets RelationKey only) |
| `_Migration` | const | Built-in system migration table (`_migration` with `code` column) |

[Detailed documentation](docs/schema-builders.md)

### Query Builder

Render `QueryDef` JSON AST to dialect-specific SQL strings.

| Export | Kind | Description |
|--------|------|-------------|
| `createQueryBuilder` | function | Create a dialect-specific QueryBuilder (`"mysql"`, `"mssql"`, `"postgresql"`) |
| `QueryBuilderBase` | abstract class | Base class with dispatch and common render methods |
| `ExprRendererBase` | abstract class | Base class for expression-to-SQL rendering |
| `MysqlQueryBuilder` | class | MySQL implementation |
| `MysqlExprRenderer` | class | MySQL expression renderer |
| `MssqlQueryBuilder` | class | MSSQL implementation |
| `MssqlExprRenderer` | class | MSSQL expression renderer |
| `PostgresqlQueryBuilder` | class | PostgreSQL implementation |
| `PostgresqlExprRenderer` | class | PostgreSQL expression renderer |

[Detailed documentation](docs/query-builder.md)

### Types

TypeScript types for dialects, queries, expressions, columns, and results.

| Export | Kind | Description |
|--------|------|-------------|
| `Dialect` | type | `"mysql" \| "mssql" \| "postgresql"` |
| `dialects` | const | `["mysql", "mssql", "postgresql"]` |
| `QueryBuildResult` | interface | `{ sql, resultSetIndex?, resultSetStride? }` |
| `IsolationLevel` | type | `"READ_UNCOMMITTED" \| "READ_COMMITTED" \| "REPEATABLE_READ" \| "SERIALIZABLE"` |
| `DataRecord` | type | Recursive record type for query results |
| `DbContextExecutor` | interface | Executor interface (connect, close, beginTransaction, executeDefs, etc.) |
| `ResultMeta` | interface | Metadata for result type transformation and JOIN nesting |
| `Migration` | interface | `{ name, up }` migration definition |
| `DataType` | type | SQL type union (int, bigint, varchar, decimal, datetime, etc.) |
| `ColumnPrimitive` | type | All column value types (string, number, boolean, DateTime, DateOnly, Time, Uuid, Bytes, undefined) |
| `ColumnPrimitiveStr` | type | Type name keys: `"string" \| "number" \| "boolean" \| "DateTime" \| ...` |
| `ColumnMeta` | interface | Column metadata (type, dataType, autoIncrement, nullable, default, description) |
| `Expr` | type | Discriminated union of 40+ expression AST node types |
| `WhereExpr` | type | Subset of Expr for WHERE clauses (comparison + logical) |
| `QueryDef` | type | Union of all query definition types (DML + DDL + Utils + Meta) |
| `SelectQueryDef` | interface | SELECT query definition |
| `InsertQueryDef` | interface | INSERT query definition |
| `UpdateQueryDef` | interface | UPDATE query definition |
| `DeleteQueryDef` | interface | DELETE query definition |
| `UpsertQueryDef` | interface | UPSERT query definition |
| `QueryDefObjectName` | interface | `{ database?, schema?, name }` |

[Detailed documentation](docs/types.md)

### Utilities

Result parsing helpers.

| Export | Kind | Description |
|--------|------|-------------|
| `parseQueryResult` | function | Transform flat DB results to typed nested objects via `ResultMeta` |

[Detailed documentation](docs/utilities.md)

## Usage Examples

### 1. Define Schema and DbContext

```typescript
import { Table, defineDbContext, createDbContext, expr } from "@simplysm/orm-common";

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
  .indexes((i) => [i.index("email").unique()]);

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
    author: r.foreignKey(["authorId"], () => User),
  }));

const MyDb = defineDbContext({
  tables: { user: User, post: Post },
});

// createDbContext requires an executor (from @simplysm/orm-node or service-client)
const db = createDbContext(MyDb, executor, { database: "mydb" });
```

### 2. Query with Filters, Joins, and Aggregation

```typescript
await db.connect(async () => {
  // Basic query with WHERE
  const activeUsers = await db.user()
    .where((u) => [expr.eq(u.status, "active")])
    .orderBy((u) => u.name)
    .execute();

  // JOIN with include
  const postsWithAuthor = await db.post()
    .include((p) => p.author)
    .execute();

  // Aggregation
  const stats = await db.post()
    .select((p) => ({
      authorId: p.authorId,
      postCount: expr.count(p.id),
    }))
    .groupBy((p) => [p.authorId])
    .execute();
});
```

### 3. Insert, Update, Delete

```typescript
await db.connect(async () => {
  // Insert with output
  const [inserted] = await db.user().insert(
    [{ name: "Alice", createdAt: DateTime.now() }],
    ["id"],
  );

  // Update
  await db.user()
    .where((u) => [expr.eq(u.id, inserted.id)])
    .update((u) => ({
      status: expr.val("string", "verified"),
    }));

  // Delete
  await db.user()
    .where((u) => [expr.eq(u.status, "deleted")])
    .delete();

  // Upsert
  await db.user()
    .where((u) => [expr.eq(u.email, "alice@test.com")])
    .upsert(() => ({
      name: expr.val("string", "Alice"),
      email: expr.val("string", "alice@test.com"),
      createdAt: expr.val("DateTime", DateTime.now()),
    }));
});
```

### 4. Text Search

```typescript
await db.connect(async () => {
  // Search with OR, +must, -exclude syntax
  const results = await db.user()
    .search((u) => [u.name, u.email], "alice +active -deleted")
    .execute();
});
```

### 5. Recursive CTE

```typescript
await db.connect(async () => {
  const hierarchy = await db.employee()
    .where((e) => [expr.null(e.managerId)])
    .recursive((cte) =>
      cte.from(Employee)
        .where((e) => [expr.eq(e.managerId, e.self![0].id)])
    )
    .execute();
});
```
