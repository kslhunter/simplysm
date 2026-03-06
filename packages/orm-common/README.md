# @simplysm/orm-common

Shared ORM infrastructure for the Simplysm framework. Provides schema builders, a type-safe query builder (`Queryable`), a dialect-independent expression DSL (`expr`), a multi-dialect SQL generator, and supporting utilities. Used by both server-side (`orm-node`) and client-side ORM packages.

## Installation

```bash
pnpm add @simplysm/orm-common
```

---

## Table of Contents

- [Core](#core)
- [Queryable / Executable](#queryable--executable)
- [Expressions](#expressions)
- [Schema Builders](#schema-builders)
- [Models](#models)
- [Query Builder](#query-builder)
- [Types](#types)

---

## Core

Define and instantiate database contexts.

| Symbol | Description |
|---|---|
| `defineDbContext(config)` | Create a `DbContextDef` blueprint from tables, views, procedures, and migrations |
| `createDbContext(def, executor, opt)` | Instantiate a fully operational `DbContextInstance` |

### `defineDbContext(config)`

```typescript
import { defineDbContext } from "@simplysm/orm-common";

const MyDb = defineDbContext({
  tables: { user: User, post: Post },
  views: { userSummary: UserSummary },
  procedures: { getUserById: GetUserById },
  migrations: [...],
});
```

- `config.tables` — `Record<string, TableBuilder>` (optional)
- `config.views` — `Record<string, ViewBuilder>` (optional)
- `config.procedures` — `Record<string, ProcedureBuilder>` (optional)
- `config.migrations` — `Migration[]` (optional)
- Returns `DbContextDef` — always includes the built-in `_migration` table

### `createDbContext(def, executor, opt)`

```typescript
import { createDbContext } from "@simplysm/orm-common";

const db = createDbContext(MyDb, executor, { database: "mydb", schema: "dbo" });

await db.connect(async () => {
  const users = await db.user().execute();
});
```

- `def` — `DbContextDef` created by `defineDbContext()`
- `executor` — `DbContextExecutor` (e.g. `NodeDbContextExecutor`, `ServiceDbContextExecutor`)
- `opt.database` — database name (required)
- `opt.schema` — schema name for MSSQL/PostgreSQL (optional)
- Returns `DbContextInstance<TDef>` — includes typed queryable/executable accessors, DDL methods, and connection management

**Connection / Transaction methods on the returned instance:**

| Method | Description |
|---|---|
| `connect(fn, isolationLevel?)` | Open connection, start transaction, run `fn`, commit; rollback on error |
| `connectWithoutTransaction(fn)` | Open connection without a transaction, run `fn`, close |
| `transaction(fn, isolationLevel?)` | Start a transaction within an already-connected context |
| `initialize(options?)` | Run pending migrations (`options.dbs`, `options.force`) |

**DDL execution methods** (requires `connectWithoutTransaction`):

`createTable`, `dropTable`, `renameTable`, `createView`, `dropView`, `createProc`, `dropProc`, `addColumn`, `dropColumn`, `modifyColumn`, `renameColumn`, `addPrimaryKey`, `dropPrimaryKey`, `addForeignKey`, `addIndex`, `dropForeignKey`, `dropIndex`, `clearSchema`, `schemaExists`, `truncate`, `switchFk`

**DDL `QueryDef` generator methods** (return `QueryDef` without executing):

`getCreateTableQueryDef`, `getCreateViewQueryDef`, `getCreateProcQueryDef`, `getCreateObjectQueryDef`, `getDropTableQueryDef`, `getRenameTableQueryDef`, `getDropViewQueryDef`, `getDropProcQueryDef`, `getAddColumnQueryDef`, `getDropColumnQueryDef`, `getModifyColumnQueryDef`, `getRenameColumnQueryDef`, `getAddPrimaryKeyQueryDef`, `getDropPrimaryKeyQueryDef`, `getAddForeignKeyQueryDef`, `getAddIndexQueryDef`, `getDropForeignKeyQueryDef`, `getDropIndexQueryDef`, `getClearSchemaQueryDef`, `getSchemaExistsQueryDef`, `getTruncateQueryDef`, `getSwitchFkQueryDef`

---

## Queryable / Executable

Type-safe query and procedure execution.

| Symbol | Description |
|---|---|
| `Queryable<TData, TFrom>` | Fluent SELECT / INSERT / UPDATE / DELETE / UPSERT builder |
| `queryable(db, tableOrView, alias?)` | Factory returning a `() => Queryable` accessor |
| `Executable<TParams, TReturns>` | Stored procedure execution wrapper |
| `executable(db, builder)` | Factory returning a `() => Executable` accessor |
| `parseSearchQuery(searchText)` | Parse a user search string into SQL LIKE pattern groups |
| `parseQueryResult(rawResults, meta)` | Transform flat DB rows into nested TypeScript objects |
| `QueryableRecord<TData>` | Maps `DataRecord` fields to `ExprUnit` counterparts (used in callbacks) |
| `QueryableWriteRecord<TData>` | Maps `DataRecord` fields to `ExprInput` counterparts (used in write callbacks) |
| `NullableQueryableRecord<TData>` | Like `QueryableRecord` but all primitives include `\| undefined` (LEFT JOIN propagation) |
| `UnwrapQueryableRecord<R>` | Reverses `QueryableRecord` — `ExprUnit<T>` → `T` |
| `PathProxy<TObject>` | Type-safe relation-path proxy used by `include()` |
| `ParsedSearchQuery` | Return type of `parseSearchQuery` |
| `getMatchedPrimaryKeys(fkCols, targetTable)` | Match FK column array to target table PK columns |

### `Queryable<TData, TFrom>`

The central query builder. Constructed via `queryable()` and the table/view accessors on a `DbContextInstance`.

**Query shaping methods** (all return a new `Queryable`):

| Method | Description |
|---|---|
| `.select(fn)` | Map columns to a new shape |
| `.distinct()` | Apply DISTINCT |
| `.lock()` | Apply FOR UPDATE row lock |
| `.top(count)` | Limit to first N rows (no ORDER BY required) |
| `.limit(skip, take)` | Paginate (requires `.orderBy()` first) |
| `.orderBy(fn, dir?)` | Add ORDER BY column (stackable, default ASC) |
| `.where(predicate)` | Add WHERE condition (stackable, AND-combined) |
| `.search(fn, searchText)` | Full-text LIKE search against multiple columns |
| `.groupBy(fn)` | Add GROUP BY |
| `.having(predicate)` | Add HAVING condition (stackable, AND-combined) |
| `.join(as, fn)` | LEFT OUTER JOIN — result added as array (`1:N`) |
| `.joinSingle(as, fn)` | LEFT OUTER JOIN — result added as single object (`N:1` / `1:1`) |
| `.include(fn)` | Auto-JOIN a defined relation by path (uses `PathProxy`) |
| `.wrap()` | Wrap current query as subquery |
| `Queryable.union(...queries)` | Static UNION ALL of multiple queryables |
| `.recursive(fn)` | Build a recursive CTE (WITH RECURSIVE) |

**Execution methods:**

| Method | Returns | Description |
|---|---|---|
| `.execute()` | `Promise<TData[]>` | Run SELECT, return all rows |
| `.single()` | `Promise<TData \| undefined>` | Return single row (throws if > 1) |
| `.first()` | `Promise<TData \| undefined>` | Return first row |
| `.count(fn?)` | `Promise<number>` | Return row count |
| `.exists()` | `Promise<boolean>` | Return whether any rows match |
| `.insert(records, outputColumns?)` | `Promise<void \| Pick[]>` | INSERT (chunked at 1000) |
| `.insertIfNotExists(record, outputColumns?)` | `Promise<void \| Pick>` | INSERT if WHERE finds no match |
| `.insertInto(targetTable, outputColumns?)` | `Promise<void \| Pick[]>` | INSERT INTO … SELECT |
| `.update(recordFwd, outputColumns?)` | `Promise<void \| Pick[]>` | UPDATE matched rows |
| `.delete(outputColumns?)` | `Promise<void \| Pick[]>` | DELETE matched rows |
| `.upsert(updateFn, insertFn?, outputColumns?)` | `Promise<void \| Pick[]>` | INSERT or UPDATE (MERGE pattern) |
| `.switchFk(enabled)` | `Promise<void>` | Enable/disable FK constraints on this table |

**`QueryDef` generator methods** (without executing):

`getSelectQueryDef()`, `getResultMeta(outputColumns?)`, `getInsertQueryDef(records, outputColumns?)`, `getInsertIfNotExistsQueryDef(record, outputColumns?)`, `getInsertIntoQueryDef(targetTable, outputColumns?)`, `getUpdateQueryDef(recordFwd, outputColumns?)`, `getDeleteQueryDef(outputColumns?)`, `getUpsertQueryDef(updateFn, insertFn, outputColumns?)`

```typescript
import { queryable, expr } from "@simplysm/orm-common";

// In a DbContext definition (createDbContext handles this automatically)
const userAccessor = queryable(db, User);

// Using the accessor
const activeUsers = await userAccessor()
  .where((u) => [expr.eq(u.isActive, true)])
  .orderBy((u) => u.name)
  .execute();
```

### `Executable<TParams, TReturns>`

```typescript
import { executable } from "@simplysm/orm-common";

// Factory used internally by createDbContext
const proc = executable(db, GetUserById);
const result = await proc().execute({ userId: 1n });
```

Methods on `Executable`:
- `.execute(params)` — run the stored procedure, returns `Promise<InferColumnExprs<TReturns>[][]>`
- `.getExecProcQueryDef(params?)` — return `ExecProcQueryDef` without executing

### `parseSearchQuery(searchText)`

Parse a user-entered search string into SQL LIKE patterns.

```typescript
import { parseSearchQuery } from "@simplysm/orm-common";

parseSearchQuery('apple "delicious fruit" -banana +strawberry');
// { or: ["%apple%"], must: ["%delicious fruit%", "%strawberry%"], not: ["%banana%"] }
```

Returns `ParsedSearchQuery`:

```typescript
interface ParsedSearchQuery {
  or: string[];   // OR conditions — LIKE patterns
  must: string[]; // AND conditions (+ prefix or quoted)
  not: string[];  // NOT conditions (- prefix)
}
```

Search syntax:

| Syntax | Meaning |
|---|---|
| `term1 term2` | OR — one of them matches |
| `+term` | Required (AND) |
| `-term` | Excluded (NOT) |
| `"exact phrase"` | Exact match (required) |
| `*` | Wildcard → `%` |

### `parseQueryResult(rawResults, meta)`

Transform flat DB rows (with dot-notation keys) into nested TypeScript objects.

```typescript
import { parseQueryResult } from "@simplysm/orm-common";

const raw = [
  { id: 1, name: "User1", "posts.id": 10, "posts.title": "Post1" },
  { id: 1, name: "User1", "posts.id": 11, "posts.title": "Post2" },
];
const meta = {
  columns: { id: "number", name: "string", "posts.id": "number", "posts.title": "string" },
  joins: { posts: { isSingle: false } }
};
const result = await parseQueryResult(raw, meta);
// [{ id: 1, name: "User1", posts: [{ id: 10, title: "Post1" }, { id: 11, title: "Post2" }] }]
```

- Returns `Promise<TRecord[] | undefined>` — `undefined` if input is empty or all parsed records are empty

---

## Expressions

Dialect-independent SQL expression DSL.

| Symbol | Description |
|---|---|
| `expr` | Expression builder object — comparisons, string/number/date functions, aggregates, window functions |
| `ExprUnit<TPrimitive>` | Type-safe AST wrapper for a SQL expression |
| `WhereExprUnit` | AST wrapper for WHERE/HAVING boolean expressions |
| `ExprInput<TPrimitive>` | `ExprUnit<T> \| T` — accepts raw values alongside expression nodes |
| `SwitchExprBuilder<TPrimitive>` | Builder returned by `expr.switch()` for constructing CASE WHEN chains |

### `expr`

The `expr` object provides methods to build SQL expressions as JSON AST nodes. `QueryBuilderBase` then converts these to dialect-specific SQL.

**Value creation:**

| Method | SQL equivalent |
|---|---|
| `expr.val(dataType, value)` | Literal value |
| `expr.col(dataType, ...path)` | Column reference |
| `expr.raw(sql, ...params)` | Raw SQL fragment |

**Comparison (return `WhereExprUnit`):**

`expr.eq(a, b)`, `expr.gt(a, b)`, `expr.lt(a, b)`, `expr.gte(a, b)`, `expr.lte(a, b)`, `expr.between(src, from, to)`, `expr.null(arg)`, `expr.like(src, pattern)`, `expr.regexp(src, pattern)`, `expr.in(src, values)`, `expr.inQuery(src, query)`, `expr.exists(query)`

**Logic (return `WhereExprUnit`):**

`expr.not(cond)`, `expr.and(conditions)`, `expr.or(conditions)`

**String functions:**

`expr.concat(...args)`, `expr.left(src, len)`, `expr.right(src, len)`, `expr.trim(arg)`, `expr.padStart(src, len, fill)`, `expr.replace(src, from, to)`, `expr.upper(arg)`, `expr.lower(arg)`, `expr.length(arg)`, `expr.byteLength(arg)`, `expr.substring(src, start, len?)`, `expr.indexOf(src, search)`

**Number functions:**

`expr.abs(arg)`, `expr.round(arg, digits)`, `expr.ceil(arg)`, `expr.floor(arg)`

**Date functions:**

`expr.year(arg)`, `expr.month(arg)`, `expr.day(arg)`, `expr.hour(arg)`, `expr.minute(arg)`, `expr.second(arg)`, `expr.isoWeek(arg)`, `expr.isoWeekStartDate(arg)`, `expr.isoYearMonth(arg)`, `expr.dateDiff(unit, from, to)`, `expr.dateAdd(unit, src, value)`, `expr.formatDate(src, format)`

**Condition functions:**

`expr.coalesce(...args)`, `expr.nullIf(src, value)`, `expr.is(condition)`, `expr.switch(dataType)` → `SwitchExprBuilder`, `expr.if(condition, then, else?)`

**Aggregate functions:**

`expr.count(arg?, distinct?)`, `expr.sum(arg)`, `expr.avg(arg)`, `expr.max(arg)`, `expr.min(arg)`, `expr.greatest(...args)`, `expr.least(...args)`

**Other:**

`expr.rowNum()`, `expr.random()`, `expr.cast(src, targetType)`, `expr.toExpr(value)`, `expr.subquery(queryable, fn)`

**Window functions:**

`expr.window(fn, spec)` — takes a `WinFn` and `WinSpec`

```typescript
import { expr } from "@simplysm/orm-common";

// WHERE condition
db.user().where((u) => [
  expr.eq(u.status, "active"),
  expr.gt(u.age, 18),
])

// SELECT expression
db.user().select((u) => ({
  fullName: expr.concat(u.firstName, " ", u.lastName),
  age: expr.dateDiff("year", u.birthDate, expr.val("DateOnly", DateOnly.today())),
}))

// Aggregate
db.order().groupBy((o) => [o.userId]).select((o) => ({
  userId: o.userId,
  total: expr.sum(o.amount),
}))
```

### `ExprUnit<TPrimitive>`

Type-safe wrapper around an `Expr` AST node.

```typescript
class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly $infer: TPrimitive;
  readonly dataType: ColumnPrimitiveStr;
  readonly expr: Expr;
  get n(): ExprUnit<NonNullable<TPrimitive>>; // strip undefined from type
}
```

### `WhereExprUnit`

Wrapper around a `WhereExpr` AST node. Used in `.where()` and `.having()` callbacks.

```typescript
class WhereExprUnit {
  readonly expr: WhereExpr;
}
```

### `SwitchExprBuilder<TPrimitive>`

Builder for CASE WHEN expressions, returned by `expr.switch(dataType)`.

```typescript
interface SwitchExprBuilder<TPrimitive extends ColumnPrimitive> {
  case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): SwitchExprBuilder<TPrimitive>;
  default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive>;
}
```

---

## Schema Builders

Fluent builders for tables, views, procedures, columns, indexes, and relationships.

| Symbol | Description |
|---|---|
| `Table(name)` | Create a `TableBuilder` |
| `TableBuilder<TColumns, TRelations>` | Immutable table schema definition with type-inference properties |
| `View(name)` | Create a `ViewBuilder` |
| `ViewBuilder<TDbContext, TData, TRelations>` | Immutable view schema definition |
| `Procedure(name)` | Create a `ProcedureBuilder` |
| `ProcedureBuilder<TParams, TReturns>` | Immutable stored procedure schema definition |
| `ColumnBuilder<TValue, TMeta>` | Column definition with `nullable()`, `default()`, `autoIncrement()`, `description()` |
| `createColumnFactory()` | Returns column factory (`c.int()`, `c.varchar()`, `c.datetime()`, …) |
| `IndexBuilder<TKeys>` | Index definition with `unique()`, `orderBy()`, `name()`, `description()` |
| `createIndexFactory<TColumnKey>()` | Returns index factory used in `indexes()` callbacks |
| `ForeignKeyBuilder<TOwner, TTargetFn>` | N:1 FK relationship (creates DB constraint) |
| `ForeignKeyTargetBuilder<TTargetTableFn, TIsSingle>` | 1:N FK back-reference |
| `RelationKeyBuilder<TOwner, TTargetFn>` | N:1 logical relationship (no DB constraint) |
| `RelationKeyTargetBuilder<TTargetTableFn, TIsSingle>` | 1:N logical back-reference |
| `createRelationFactory<TOwner, TColumnKey>(ownerFn)` | Returns relation factory used in `relations()` callbacks |

### `Table(name)` / `TableBuilder`

```typescript
import { Table } from "@simplysm/orm-common";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
    createdAt: c.datetime().description("Record creation timestamp"),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
  }));
```

`TableBuilder` methods: `.database(db)`, `.schema(schema)`, `.description(desc)`, `.columns(fn)`, `.primaryKey(...cols)`, `.indexes(fn)`, `.relations(fn)`

Type inference properties: `$inferSelect`, `$inferColumns`, `$inferInsert`, `$inferUpdate`, `$columns`, `$relations`

### `View(name)` / `ViewBuilder`

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

`ViewBuilder` methods: `.database(db)`, `.schema(schema)`, `.description(desc)`, `.query(viewFn)`, `.relations(fn)`

### `Procedure(name)` / `ProcedureBuilder`

```typescript
import { Procedure } from "@simplysm/orm-common";

const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");
```

`ProcedureBuilder` methods: `.database(db)`, `.schema(schema)`, `.description(desc)`, `.params(fn)`, `.returns(fn)`, `.body(sql)`

### `createColumnFactory()`

Returns an object with typed column factory methods:

| Factory method | SQL type | TypeScript type |
|---|---|---|
| `c.int()` | INT | `number` |
| `c.bigint()` | BIGINT | `number` |
| `c.float()` | FLOAT | `number` |
| `c.double()` | DOUBLE | `number` |
| `c.decimal(precision, scale?)` | DECIMAL | `number` |
| `c.varchar(length)` | VARCHAR | `string` |
| `c.char(length)` | CHAR | `string` |
| `c.text()` | TEXT | `string` |
| `c.binary()` | BLOB/VARBINARY/BYTEA | `Bytes` |
| `c.boolean()` | TINYINT/BIT/BOOLEAN | `boolean` |
| `c.datetime()` | DATETIME | `DateTime` |
| `c.date()` | DATE | `DateOnly` |
| `c.time()` | TIME | `Time` |
| `c.uuid()` | BINARY/UNIQUEIDENTIFIER/UUID | `Uuid` |

`ColumnBuilder` modifier methods: `.autoIncrement()`, `.nullable()`, `.default(value)`, `.description(desc)`

### `createIndexFactory<TColumnKey>()`

Returns `{ index(...columns) }`. The resulting `IndexBuilder` has: `.name(name)`, `.unique()`, `.orderBy(...dirs)`, `.description(desc)`

### `createRelationFactory<TOwner, TColumnKey>(ownerFn)`

Returns a factory with methods:
- `r.foreignKey(columns, targetFn)` → `ForeignKeyBuilder` (Tables only — creates DB FK constraint)
- `r.foreignKeyTarget(targetTableFn, relationName)` → `ForeignKeyTargetBuilder` (Tables only)
- `r.relationKey(columns, targetFn)` → `RelationKeyBuilder` (Tables and Views — no DB FK)
- `r.relationKeyTarget(targetTableFn, relationName)` → `RelationKeyTargetBuilder` (Tables and Views)

`ForeignKeyTargetBuilder` and `RelationKeyTargetBuilder` both have a `.single()` method to mark the relationship as 1:1 (returns a single object instead of an array).

---

## Models

| Symbol | Description |
|---|---|
| `_Migration` | Built-in system table for tracking applied migrations |

The `_Migration` table is always automatically included in every context created by `defineDbContext()`. It has a single `code: varchar(255)` primary-key column.

---

## Query Builder

Multi-dialect SQL generator from `QueryDef` AST nodes.

| Symbol | Description |
|---|---|
| `createQueryBuilder(dialect)` | Create a dialect-specific `QueryBuilderBase` |
| `QueryBuilderBase` | Abstract base — `build(def): QueryBuildResult` |
| `ExprRendererBase` | Abstract base for expression-to-SQL rendering |
| `MysqlQueryBuilder` | MySQL implementation |
| `MysqlExprRenderer` | MySQL expression renderer |
| `MssqlQueryBuilder` | MSSQL implementation |
| `MssqlExprRenderer` | MSSQL expression renderer |
| `PostgresqlQueryBuilder` | PostgreSQL implementation |
| `PostgresqlExprRenderer` | PostgreSQL expression renderer |

### `createQueryBuilder(dialect)`

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

const builder = createQueryBuilder("mysql");
const { sql } = builder.build(selectQueryDef);
```

- `dialect` — `"mysql" | "mssql" | "postgresql"`
- Returns a `QueryBuilderBase` instance

### `QueryBuilderBase`

Abstract class. Key public member:

```typescript
abstract class QueryBuilderBase {
  build(def: QueryDef): QueryBuildResult;
}
```

### `ExprRendererBase`

Abstract class for rendering `Expr` AST nodes to SQL strings. Key public members:

```typescript
abstract class ExprRendererBase {
  abstract wrap(name: string): string;           // identifier quoting
  abstract escapeString(value: string): string;  // string literal escaping
  abstract escapeValue(value: unknown): string;  // value to SQL literal
  render(expr: Expr | WhereExpr): string;
  renderWhere(exprs: WhereExpr[]): string;
}
```

---

## Types

All type definitions and utility types.

### Database types

| Symbol | Description |
|---|---|
| `Dialect` | `"mysql" \| "mssql" \| "postgresql"` |
| `dialects` | `Dialect[]` — array of all supported dialects |
| `QueryBuildResult` | `{ sql: string; resultSetIndex?: number; resultSetStride?: number }` |
| `IsolationLevel` | `"READ_UNCOMMITTED" \| "READ_COMMITTED" \| "REPEATABLE_READ" \| "SERIALIZABLE"` |
| `DataRecord` | `{ [key: string]: ColumnPrimitive \| DataRecord \| DataRecord[] }` — recursive result record |
| `DbContextExecutor` | Interface for DB connection/execution: `connect`, `close`, `beginTransaction`, `commitTransaction`, `rollbackTransaction`, `executeDefs` |
| `ResultMeta` | `{ columns: Record<string, ColumnPrimitiveStr>; joins: Record<string, { isSingle: boolean }> }` |
| `Migration` | `{ name: string; up: (db) => Promise<void> }` — migration definition |

### Column types

| Symbol | Description |
|---|---|
| `DataType` | SQL data type union: `{ type: "int" }`, `{ type: "varchar"; length }`, `{ type: "decimal"; precision; scale? }`, … |
| `ColumnPrimitive` | `string \| number \| boolean \| DateTime \| DateOnly \| Time \| Uuid \| Bytes \| undefined` |
| `ColumnPrimitiveStr` | `"string" \| "number" \| "boolean" \| "DateTime" \| "DateOnly" \| "Time" \| "Uuid" \| "Bytes"` |
| `ColumnPrimitiveMap` | Map from `ColumnPrimitiveStr` to the actual TypeScript type |
| `ColumnMeta` | `{ type, dataType, autoIncrement?, nullable?, default?, description? }` — column metadata |
| `ColumnBuilderRecord` | `Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>` |
| `InferColumns<T>` | Infer value types from a `ColumnBuilderRecord` |
| `InferInsertColumns<T>` | Infer INSERT-time type (required/optional based on autoIncrement/nullable/default) |
| `InferUpdateColumns<T>` | Infer UPDATE-time type (all fields optional) |
| `InferColumnExprs<T>` | Map `ColumnBuilderRecord` fields to `ExprInput<V>` |
| `RequiredInsertKeys<T>` | Keys without autoIncrement, nullable, or default |
| `OptionalInsertKeys<T>` | Keys with autoIncrement, nullable, or default |
| `DataToColumnBuilderRecord<TData>` | Convert a `DataRecord` type to a `ColumnBuilderRecord` |
| `dataTypeStrToColumnPrimitiveStr` | Constant map from SQL type name to `ColumnPrimitiveStr` |
| `inferColumnPrimitiveStr(value)` | Runtime function — infer `ColumnPrimitiveStr` from a value |
| `InferColumnPrimitiveFromDataType<T>` | Compile-time infer TypeScript type from a `DataType` |

### Expression types

**Union types:**

| Symbol | Description |
|---|---|
| `Expr` | All value/string/number/date/condition/aggregate/window expression nodes |
| `WhereExpr` | Comparison and logical expression nodes (for WHERE/HAVING) |
| `WinFn` | Window function nodes union |
| `WinSpec` | `{ partitionBy?: Expr[]; orderBy?: [Expr, ("ASC" \| "DESC")?][] }` |
| `DateUnit` | `"year" \| "month" \| "day" \| "hour" \| "minute" \| "second"` |

**Individual `Expr*` node types** (all exported):

`ExprColumn`, `ExprValue`, `ExprRaw`, `ExprEq`, `ExprGt`, `ExprLt`, `ExprGte`, `ExprLte`, `ExprBetween`, `ExprIsNull`, `ExprLike`, `ExprRegexp`, `ExprIn`, `ExprInQuery`, `ExprExists`, `ExprNot`, `ExprAnd`, `ExprOr`, `ExprConcat`, `ExprLeft`, `ExprRight`, `ExprTrim`, `ExprPadStart`, `ExprReplace`, `ExprUpper`, `ExprLower`, `ExprLength`, `ExprByteLength`, `ExprSubstring`, `ExprIndexOf`, `ExprAbs`, `ExprRound`, `ExprCeil`, `ExprFloor`, `ExprYear`, `ExprMonth`, `ExprDay`, `ExprHour`, `ExprMinute`, `ExprSecond`, `ExprIsoWeek`, `ExprIsoWeekStartDate`, `ExprIsoYearMonth`, `ExprDateDiff`, `ExprDateAdd`, `ExprFormatDate`, `ExprCoalesce`, `ExprNullIf`, `ExprIs`, `ExprSwitch`, `ExprIf`, `ExprCount`, `ExprSum`, `ExprAvg`, `ExprMax`, `ExprMin`, `ExprGreatest`, `ExprLeast`, `ExprRowNum`, `ExprRandom`, `ExprCast`, `ExprWindow`, `ExprSubquery`

**Individual `WinFn*` node types** (all exported):

`WinFnRowNumber`, `WinFnRank`, `WinFnDenseRank`, `WinFnNtile`, `WinFnLag`, `WinFnLead`, `WinFnFirstValue`, `WinFnLastValue`, `WinFnSum`, `WinFnAvg`, `WinFnCount`, `WinFnMin`, `WinFnMax`

### QueryDef types

**Union type:**

| Symbol | Description |
|---|---|
| `QueryDef` | Union of all DML + DDL + Util + Meta query definition types |
| `DDL_TYPES` | Readonly array of DDL type string literals (used to block DDL inside transactions) |
| `DdlType` | Union of all DDL type string literals |

**Individual `QueryDef` types** (all exported):

`QueryDefObjectName`, `CudOutputDef`, `SelectQueryDef`, `SelectQueryDefJoin`, `InsertQueryDef`, `InsertIfNotExistsQueryDef`, `InsertIntoQueryDef`, `UpdateQueryDef`, `DeleteQueryDef`, `UpsertQueryDef`, `SwitchFkQueryDef`, `ClearSchemaQueryDef`, `CreateTableQueryDef`, `DropTableQueryDef`, `RenameTableQueryDef`, `TruncateQueryDef`, `AddColumnQueryDef`, `DropColumnQueryDef`, `ModifyColumnQueryDef`, `RenameColumnQueryDef`, `DropPrimaryKeyQueryDef`, `AddPrimaryKeyQueryDef`, `AddForeignKeyQueryDef`, `DropForeignKeyQueryDef`, `AddIndexQueryDef`, `DropIndexQueryDef`, `CreateViewQueryDef`, `DropViewQueryDef`, `CreateProcQueryDef`, `DropProcQueryDef`, `ExecProcQueryDef`, `SchemaExistsQueryDef`

### Relation types

| Symbol | Description |
|---|---|
| `RelationBuilderRecord` | `Record<string, ForeignKeyBuilder \| ForeignKeyTargetBuilder \| RelationKeyBuilder \| RelationKeyTargetBuilder>` |
| `ExtractRelationTarget<TRelation>` | Extract the referenced record type from a FK/RelationKey builder (N:1 — single object) |
| `ExtractRelationTargetResult<TRelation>` | Extract the referenced record type from a FKTarget/RelationKeyTarget builder (1:N — array or single) |
| `InferDeepRelations<TRelations>` | Map all relations to optional properties for `include()`-based loading |

### DbContext types

| Symbol | Description |
|---|---|
| `DbContextBase` | Internal interface used by `Queryable`, `Executable`, and `ViewBuilder` |
| `DbContextStatus` | `"ready" \| "connect" \| "transact"` |
| `DbContextDef<TTables, TViews, TProcedures>` | Blueprint created by `defineDbContext()` |
| `DbContextInstance<TDef>` | Full instance type returned by `createDbContext()` |
| `DbContextConnectionMethods` | `connect`, `connectWithoutTransaction`, `transaction` |
| `DbContextDdlMethods` | All DDL execution + `QueryDef` generator methods |

### Error types

| Symbol | Description |
|---|---|
| `DbTransactionError` | Error class wrapping DBMS-specific transaction errors with a standardized `code` |
| `DbErrorCode` | Enum: `NO_ACTIVE_TRANSACTION`, `TRANSACTION_ALREADY_STARTED`, `DEADLOCK`, `LOCK_TIMEOUT` |

```typescript
import { DbTransactionError, DbErrorCode } from "@simplysm/orm-common";

try {
  await executor.rollbackTransaction();
} catch (err) {
  if (err instanceof DbTransactionError) {
    if (err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) {
      return; // already rolled back — ignore
    }
  }
  throw err;
}
```
