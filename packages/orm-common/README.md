# @simplysm/orm-common

Platform-neutral ORM module for the Simplysm framework. Provides type-safe query building, schema definition, expression building, and DDL generation for MySQL, MSSQL, and PostgreSQL.

## Installation

```bash
npm install @simplysm/orm-common
# or
pnpm add @simplysm/orm-common
```

## API Overview

### Core

| Export | Type | Description |
|--------|------|-------------|
| [`defineDbContext`](./docs/core.md#definedbcontext) | Function | Create a DbContext definition (blueprint) with tables, views, procedures, and migrations |
| [`createDbContext`](./docs/core.md#createdbcontext) | Function | Create a DbContext instance from a definition and executor |
| [`DbTransactionError`](./docs/core.md#dbtransactionerror) | Class | Standardized database transaction error with DBMS-independent error codes |
| [`DbErrorCode`](./docs/core.md#dberrorcode) | Enum | Transaction error codes |
| [`_Migration`](./docs/core.md#_migration) | Constant | System migration table definition (TableBuilder) |

### Queryable / Executable

| Export | Type | Description |
|--------|------|-------------|
| [`Queryable`](./docs/queryable.md#queryable) | Class | Fluent query builder for SELECT, INSERT, UPDATE, DELETE, UPSERT |
| [`queryable`](./docs/queryable.md#queryable-factory) | Function | Factory to create Queryable accessors for tables/views |
| [`Executable`](./docs/queryable.md#executable) | Class | Stored procedure execution wrapper |
| [`executable`](./docs/queryable.md#executable-factory) | Function | Factory to create Executable accessors for procedures |
| [`parseSearchQuery`](./docs/queryable.md#parsesearchquery) | Function | Parse search query string into SQL LIKE patterns |
| [`ParsedSearchQuery`](./docs/queryable.md#parsedsearchquery) | Interface | Parsed search query result |
| [`getMatchedPrimaryKeys`](./docs/queryable.md#getmatchedprimarykeys) | Function | Match FK columns with target table PK columns |
| [`QueryableRecord`](./docs/queryable.md#queryablerecord) | Type | Maps DataRecord fields to ExprUnit proxies |
| [`QueryableWriteRecord`](./docs/queryable.md#queryablewriterecord) | Type | Maps DataRecord fields to ExprInput for writes |
| [`NullableQueryableRecord`](./docs/queryable.md#nullablequeryablerecord) | Type | QueryableRecord with nullable primitives (for LEFT JOIN) |
| [`UnwrapQueryableRecord`](./docs/queryable.md#unwrapqueryablerecord) | Type | Reverse-map QueryableRecord to DataRecord |
| [`PathProxy`](./docs/queryable.md#pathproxy) | Type | Type-safe path proxy for `include()` |

### Expression Builder

| Export | Type | Description |
|--------|------|-------------|
| [`expr`](./docs/expression.md#expr-object) | Object | Dialect-independent SQL expression builder (100+ methods) |
| [`ExprUnit`](./docs/expression.md#exprunit) | Class | Type-safe expression wrapper |
| [`WhereExprUnit`](./docs/expression.md#whereexprunit) | Class | WHERE clause expression wrapper |
| [`ExprInput`](./docs/expression.md#exprinput) | Type | Union of ExprUnit or literal values |
| [`SwitchExprBuilder`](./docs/expression.md#switchexprbuilder) | Interface | CASE WHEN builder (fluent API) |
| [`toExpr`](./docs/expression.md#toexpr) | Function | Convert ExprInput to Expr JSON AST |

### Schema Builders

| Export | Type | Description |
|--------|------|-------------|
| [`Table`](./docs/schema-builders.md#table-function) | Function | Create a TableBuilder |
| [`TableBuilder`](./docs/schema-builders.md#tablebuilder) | Class | Fluent API for table definitions |
| [`View`](./docs/schema-builders.md#view-function) | Function | Create a ViewBuilder |
| [`ViewBuilder`](./docs/schema-builders.md#viewbuilder) | Class | Fluent API for view definitions |
| [`Procedure`](./docs/schema-builders.md#procedure-function) | Function | Create a ProcedureBuilder |
| [`ProcedureBuilder`](./docs/schema-builders.md#procedurebuilder) | Class | Fluent API for stored procedure definitions |
| [`ColumnBuilder`](./docs/schema-builders.md#columnbuilder) | Class | Column definition builder |
| [`createColumnFactory`](./docs/schema-builders.md#createcolumnfactory) | Function | Column type factory |
| [`IndexBuilder`](./docs/schema-builders.md#indexbuilder) | Class | Index definition builder |
| [`createIndexFactory`](./docs/schema-builders.md#createindexfactory) | Function | Index factory |
| [`ForeignKeyBuilder`](./docs/schema-builders.md#foreignkeybuilder) | Class | FK relation builder (N:1, configured via factory opts) |
| [`ForeignKeyTargetBuilder`](./docs/schema-builders.md#foreignkeytargetbuilder) | Class | FK reverse-reference builder (1:N/1:1, configured via factory opts) |
| [`RelationKeyBuilder`](./docs/schema-builders.md#relationkeybuilder) | Class | Logical relation builder (no DB FK, configured via factory opts) |
| [`RelationKeyTargetBuilder`](./docs/schema-builders.md#relationkeytargetbuilder) | Class | Logical reverse-reference builder (configured via factory opts) |
| [`createRelationFactory`](./docs/schema-builders.md#createrelationfactory) | Function | Relation factory |

### Query Builder & Result Parsing

| Export | Type | Description |
|--------|------|-------------|
| [`createQueryBuilder`](./docs/query-builder.md#createquerybuilder) | Function | Create a dialect-specific QueryBuilder |
| [`QueryBuilderBase`](./docs/query-builder.md#querybuilderbase) | Abstract Class | Base for QueryDef to SQL rendering |
| [`MysqlQueryBuilder`](./docs/query-builder.md#dialect-specific-query-builders) | Class | MySQL query builder |
| [`MssqlQueryBuilder`](./docs/query-builder.md#dialect-specific-query-builders) | Class | MSSQL query builder |
| [`PostgresqlQueryBuilder`](./docs/query-builder.md#dialect-specific-query-builders) | Class | PostgreSQL query builder |
| [`ExprRendererBase`](./docs/query-builder.md#exprrendererbase) | Abstract Class | Base for Expr to SQL rendering |
| [`MysqlExprRenderer`](./docs/query-builder.md#dialect-specific-expression-renderers) | Class | MySQL expression renderer |
| [`MssqlExprRenderer`](./docs/query-builder.md#dialect-specific-expression-renderers) | Class | MSSQL expression renderer |
| [`PostgresqlExprRenderer`](./docs/query-builder.md#dialect-specific-expression-renderers) | Class | PostgreSQL expression renderer |
| [`parseQueryResult`](./docs/query-builder.md#parsequeryresult) | Function | Parse raw DB results into typed objects |

### Types

See [Types documentation](./docs/types.md) for all type exports including:
- Database: `Dialect`, `dialects`, `IsolationLevel`, `DataRecord`, `DbContextExecutor`, `ResultMeta`, `Migration`, `QueryBuildResult`
- DbContext: `DbContextDef`, `DbContextBase`, `DbContextStatus`, `DbContextInstance`, `DbContextConnectionMethods`, `DbContextDdlMethods`
- Column: `DataType`, `ColumnPrimitive`, `ColumnPrimitiveStr`, `ColumnPrimitiveMap`, `ColumnMeta`, `dataTypeStrToColumnPrimitiveStr`, `inferColumnPrimitiveStr`, `InferColumnPrimitiveFromDataType`
- Column Builder: `ColumnBuilderRecord`, `InferColumns`, `InferColumnExprs`, `InferInsertColumns`, `InferUpdateColumns`, `RequiredInsertKeys`, `OptionalInsertKeys`, `DataToColumnBuilderRecord`
- Relation: `RelationBuilderRecord`, `InferDeepRelations`, `ExtractRelationTarget`, `ExtractRelationTargetResult`
- Expression: `Expr` (50+ variants), `WhereExpr`, `DateUnit`, `WinFn`, `WinSpec`, all `Expr*` interfaces
- QueryDef: `QueryDef` (30+ variants), `QueryDefObjectName`, `DDL_TYPES`, `DdlType`, all `*QueryDef` interfaces

## Usage Examples

### Define Schema and DbContext

```typescript
import { Table, defineDbContext, createDbContext, expr } from "@simplysm/orm-common";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    companyId: c.bigint(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({
    company: r.foreignKey(["companyId"], () => Company, { description: "소속회사" }),
    posts: r.foreignKeyTarget(() => Post, "author"),
    topPost: r.foreignKeyTarget(() => Post, "author", { single: true, description: "Top post" }),
  }));

const MyDb = defineDbContext({ tables: { user: User, post: Post, company: Company } });
const db = createDbContext(MyDb, executor, { database: "mydb" });
```

### Query Data

```typescript
await db.connect(async () => {
  const users = await db.user()
    .where((u) => [expr.eq(u.status, "active")])
    .orderBy((u) => u.name)
    .execute();

  const posts = await db.post().include((p) => p.author).execute();

  await db.user().insert([{ name: "New User", companyId: 1 }]);

  await db.user()
    .where((u) => [expr.eq(u.id, 1)])
    .update(() => ({ name: expr.val("string", "Updated") }));
});
```

### Expression Builder

```typescript
// Window functions
db.order().select((o) => ({
  ...o,
  rowNum: expr.rowNumber({ partitionBy: [o.userId], orderBy: [[o.createdAt, "DESC"]] }),
}));

// CASE WHEN
db.user().select((u) => ({
  grade: expr.switch<string>()
    .case(expr.gte(u.score, 90), "A")
    .default("C"),
}));

// Raw SQL
db.user().select((u) => ({
  data: expr.raw("string")`JSON_EXTRACT(${u.metadata}, '$.email')`,
}));
```
