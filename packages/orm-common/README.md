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

- **[Connection & Transactions](docs/queries.md#connection-and-transactions)** - `db.connect()`, `db.connectWithoutTransaction()`, `db.trans()`
- **[SELECT Queries](docs/queries.md#select-queries)** - `.where()`, `.select()`, `.distinct()`, `.orderBy()`, `.single()`, `.first()`, `.result()`, `.count()`, `.exists()`
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
- **[Window Functions](docs/expressions.md#window-functions)** - `expr.rowNumber()`, `expr.rank()`, `expr.denseRank()`, `expr.ntile()`, `expr.lag()`, `expr.lead()`, `expr.firstValue()`, `expr.lastValue()`, `expr.sumOver()`, `expr.avgOver()`, `expr.countOver()`, `expr.minOver()`, `expr.maxOver()`
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

#### `defineDbContext(config)`

Creates a `DbContextDef` schema blueprint without any runtime state.

| Parameter | Type | Description |
|-----------|------|-------------|
| `config.tables` | `Record<string, TableBuilder>` | Table builders |
| `config.views` | `Record<string, ViewBuilder>` | View builders |
| `config.procedures` | `Record<string, ProcedureBuilder>` | Procedure builders |
| `config.migrations` | `Migration[]` | Migration list |

Returns `DbContextDef<TTables, TViews, TProcedures>`.

#### `createDbContext(def, executor, opt)`

Creates a fully functional `DbContextInstance` from a `DbContextDef`.

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

### Class-based API (Removed)

The old class-based API has been removed. You must migrate to the functional API for better type safety and composability.

```typescript
// Old (no longer available):
// import { DbContext, queryable } from "@simplysm/orm-common";
// class MyDb extends DbContext { ... }  // This is no longer supported

// New (required):
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

## Low-Level Utilities

### `queryable(db, tableOrView, as?)`

Factory function that returns a `() => Queryable` accessor. Used internally by `createDbContext` to attach table/view accessors, but can also be used directly when building custom db context wrappers.

```typescript
import { queryable } from "@simplysm/orm-common";

const getUserQueryable = queryable(db, User);
const users = await getUserQueryable().where((u) => [expr.eq(u.isActive, true)]).result();
```

### `executable(db, procedureBuilder)`

Factory function that returns a `() => Executable` accessor. Used internally by `createDbContext`.

```typescript
import { executable } from "@simplysm/orm-common";

const getUser = executable(db, GetUserById);
const result = await getUser().execute({ userId: 1 });
```

### `parseQueryResult(rawResults, meta)`

Parses raw DB query results into typed TypeScript objects. Handles type coercion and JOIN result grouping/nesting.

```typescript
import { parseQueryResult } from "@simplysm/orm-common";

const meta = {
  columns: { id: "number", name: "string", createdAt: "DateTime" },
  joins: {},
};
const result = await parseQueryResult(rawResults, meta);
```

### `parseSearchQuery(searchText)`

Parses a search query string into SQL LIKE patterns for use with `.search()`.

```typescript
import { parseSearchQuery } from "@simplysm/orm-common";

const parsed = parseSearchQuery('apple "exact phrase" +required -excluded');
// { or: ["%apple%"], must: ["%exact phrase%", "%required%"], not: ["%excluded%"] }
```

Returns `ParsedSearchQuery`:

| Property | Type | Description |
|----------|------|-------------|
| `or` | `string[]` | OR conditions (LIKE patterns) |
| `must` | `string[]` | Required AND conditions (LIKE patterns) |
| `not` | `string[]` | NOT conditions (LIKE patterns) |

### `createQueryBuilder(dialect)`

Creates a dialect-specific `QueryBuilderBase` instance for converting `QueryDef` JSON AST to SQL strings.

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

const builder = createQueryBuilder("mysql"); // "mysql" | "mssql" | "postgresql"
const { sql } = builder.build(queryDef);
```

### `createColumnFactory()`

Creates a column type factory used in `TableBuilder.columns()` and `ProcedureBuilder.params()/returns()`. Can also be used standalone for DDL migrations.

```typescript
import { createColumnFactory } from "@simplysm/orm-common";

const c = createColumnFactory();
await db.addColumn({ database: "mydb", name: "User" }, "status", c.varchar(20).nullable());
```

## Expression Types

### `ExprUnit<TPrimitive>`

Type-safe expression wrapper. All `expr.*` methods return `ExprUnit`. The generic parameter tracks the TypeScript return type of the expression.

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

### `ExprInput<TPrimitive>`

Union type that accepts either an `ExprUnit<TPrimitive>` or a plain literal value. Most `expr.*` parameters accept `ExprInput` so you can pass raw values without wrapping in `expr.val()`.

```typescript
type ExprInput<TPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```

### `QueryableRecord<TData>`

Maps a data record type to its expression counterpart. Each primitive field becomes `ExprUnit`, each array field becomes `QueryableRecord[]`, and each nested object becomes `QueryableRecord`.

### `SwitchExprBuilder<TPrimitive>`

Builder interface returned by `expr.switch()`:

| Method | Description |
|--------|-------------|
| `.case(condition, then)` | Add WHEN ... THEN branch |
| `.default(value)` | Add ELSE and finalize to `ExprUnit` |

### `toExpr(value)`

Converts an `ExprInput` to a raw `Expr` JSON AST. Used internally; exposed for custom QueryBuilder extensions.

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
| `PathProxy<TObject>` | Type-safe path proxy for `.include()` navigation |

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
