# @simplysm/orm-common

> Simplysm Package - ORM Module (common)

A dialect-independent ORM framework for TypeScript that supports MySQL, MSSQL, and PostgreSQL. Provides type-safe schema definitions, fluent query building, expression AST generation, and automatic DDL/migration management -- all without writing raw SQL.

## Installation

```bash
npm install @simplysm/orm-common
```

## Key Concepts

- **Schema Builders** -- Define tables, views, and procedures with a fluent API (`Table`, `View`, `Procedure`)
- **DbContext** -- Central entry point that combines schema definitions with a database executor for connection/transaction management
- **Queryable** -- Chainable query builder for SELECT, INSERT, UPDATE, DELETE, JOIN, GROUP BY, UNION, and recursive CTE
- **Expression Builder (`expr`)** -- Dialect-independent expression AST generator for WHERE conditions, SELECT projections, aggregations, window functions, and more
- **Query Builder** -- Converts expression ASTs into dialect-specific SQL (MySQL, MSSQL, PostgreSQL)
- **Search Parser** -- Parses user search strings into structured SQL LIKE patterns

## Quick Start

```typescript
import {
  Table, View, Procedure,
  defineDbContext, createDbContext,
  expr,
} from "@simplysm/orm-common";

// 1. Define tables
const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()]);

const Post = Table("Post")
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

// 2. Define DbContext
const MyDb = defineDbContext({
  tables: { user: User, post: Post },
});

// 3. Create instance with executor
const db = createDbContext(MyDb, executor, { database: "mydb" });

// 4. Query
await db.connect(async () => {
  // SELECT with WHERE
  const activeUsers = await db.user()
    .where((u) => [expr.eq(u.status, "active")])
    .execute();

  // JOIN
  const postsWithAuthor = await db.post()
    .include((p) => p.author)
    .execute();

  // INSERT
  await db.user().insert([{ name: "Alice" }]);

  // UPDATE
  await db.user()
    .where((u) => [expr.eq(u.id, 1)])
    .update(() => ({ name: expr.val("string", "Bob") }));

  // DELETE
  await db.user()
    .where((u) => [expr.eq(u.id, 1)])
    .delete();
});
```

## Documentation

| Category | Description | File |
|----------|-------------|------|
| Schema Builders | Table, View, Procedure definitions and column/index/relation factories | [docs/schema-builders.md](docs/schema-builders.md) |
| DbContext | defineDbContext, createDbContext, connection/transaction management, DDL methods | [docs/db-context.md](docs/db-context.md) |
| Queryable | Chainable query builder for SELECT, INSERT, UPDATE, DELETE, JOIN, GROUP BY, etc. | [docs/queryable.md](docs/queryable.md) |
| Expression Builder | Dialect-independent expression AST (`expr.*`) for conditions, projections, aggregations | [docs/expressions.md](docs/expressions.md) |
| Query Builder | QueryDef to SQL rendering for MySQL, MSSQL, PostgreSQL | [docs/query-builder.md](docs/query-builder.md) |
| Types and Utilities | Column types, database types, error handling, search parsing, result parsing | [docs/types-and-utilities.md](docs/types-and-utilities.md) |

## Supported Dialects

| Dialect | Version | Notes |
|---------|---------|-------|
| MySQL | 8.0.14+ | `database.name` namespace |
| MSSQL | 2012+ | `database.schema.name` namespace (default schema: `dbo`) |
| PostgreSQL | 9.0+ | `schema.name` namespace (default schema: `public`) |
