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
- [Query Builder](#query-builder)
- [Types](#types)

---

## Core

Define and instantiate database contexts. [`docs/core.md`](docs/core.md)

| Symbol | Description |
|---|---|
| [`defineDbContext(config)`](docs/core.md#definedbcontextconfig) | Create a `DbContextDef` blueprint from tables, views, procedures, and migrations |
| [`createDbContext(def, executor, opt)`](docs/core.md#createdbcontextdef-executor-opt) | Instantiate a fully operational `DbContextInstance` |
| [`_Migration`](docs/core.md#_migration) | Built-in system table for tracking applied migrations |

---

## Queryable / Executable

Type-safe query and procedure execution. [`docs/queryable.md`](docs/queryable.md)

| Symbol | Description |
|---|---|
| [`Queryable<TData, TFrom>`](docs/queryable.md#queryabletdata-tfrom) | Fluent SELECT / INSERT / UPDATE / DELETE / UPSERT builder |
| [`queryable(db, tableOrView, alias?)`](docs/queryable.md#queryabledb-tableorview-alias) | Factory returning a `() => Queryable` accessor |
| [`Executable<TParams, TReturns>`](docs/queryable.md#executabletparams-treturns) | Stored procedure execution wrapper |
| [`executable(db, builder)`](docs/queryable.md#executabledb-builder) | Factory returning a `() => Executable` accessor |
| [`parseSearchQuery(searchText)`](docs/queryable.md#parsesearchquerysearchtext) | Parse a user search string into SQL LIKE pattern groups |
| [`parseQueryResult(rawResults, meta)`](docs/queryable.md#parsequeryresultrawresults-meta) | Transform flat DB rows into nested TypeScript objects |

---

## Expressions

Dialect-independent SQL expression DSL. [`docs/expressions.md`](docs/expressions.md)

| Symbol | Description |
|---|---|
| [`expr`](docs/expressions.md#expr) | Expression builder — comparisons, string/number/date functions, aggregates, window functions |
| [`ExprUnit<TPrimitive>`](docs/expressions.md#exprunittprimitive) | Type-safe AST wrapper for a SQL expression |
| [`WhereExprUnit`](docs/expressions.md#whereexprunit) | AST wrapper for WHERE/HAVING boolean expressions |
| [`ExprInput<TPrimitive>`](docs/expressions.md#exprinputtprimitive) | `ExprUnit<T> | T` — accepts raw values alongside expression nodes |

---

## Schema Builders

Fluent builders for tables, views, procedures, columns, indexes, and relationships. [`docs/schema.md`](docs/schema.md)

| Symbol | Description |
|---|---|
| [`Table(name)`](docs/schema.md#tablename) | Create a `TableBuilder` |
| [`TableBuilder`](docs/schema.md#tablebuildertcolumns-trelations) | Immutable table schema definition with type-inference properties |
| [`View(name)`](docs/schema.md#viewname) | Create a `ViewBuilder` |
| [`ViewBuilder`](docs/schema.md#viewbuilder) | Immutable view schema definition |
| [`Procedure(name)`](docs/schema.md#procedurename) | Create a `ProcedureBuilder` |
| [`ProcedureBuilder`](docs/schema.md#procedurebuildertparams-treturns) | Immutable stored procedure schema definition |
| [`ColumnBuilder`](docs/schema.md#columnbuildertvalue-tmeta) | Column definition with `nullable()`, `default()`, `autoIncrement()` |
| [`createColumnFactory()`](docs/schema.md#createcolumnfactory) | Returns column factory (`c.int()`, `c.varchar()`, `c.datetime()`, …) |
| [`IndexBuilder`](docs/schema.md#indexbuilder) | Index definition with `unique()`, `orderBy()` |
| [`createIndexFactory()`](docs/schema.md#createindexfactory) | Returns index factory used in `indexes()` callbacks |
| [`ForeignKeyBuilder`](docs/schema.md#foreignkeybuildertowner-ttargetfn) | N:1 FK relationship (creates DB constraint) |
| [`ForeignKeyTargetBuilder`](docs/schema.md#foreignkeytargetbuilder) | 1:N FK back-reference |
| [`RelationKeyBuilder`](docs/schema.md#relationkeybuildertowner-ttargetfn) | N:1 logical relationship (no DB constraint) |
| [`RelationKeyTargetBuilder`](docs/schema.md#relationkeytargetbuilder) | 1:N logical back-reference |
| [`createRelationFactory()`](docs/schema.md#createrelationfactorytowner-tcolumnkeyownerfn) | Returns relation factory used in `relations()` callbacks |

---

## Query Builder

Multi-dialect SQL generator from `QueryDef` AST nodes. [`docs/query-builder.md`](docs/query-builder.md)

| Symbol | Description |
|---|---|
| [`createQueryBuilder(dialect)`](docs/query-builder.md#createquerybuilderdialect) | Create a dialect-specific `QueryBuilderBase` |
| [`QueryBuilderBase`](docs/query-builder.md#querybuilderbase) | Abstract base — `build(def): QueryBuildResult` |
| [`ExprRendererBase`](docs/query-builder.md#exprrendererbase) | Abstract base for expression-to-SQL rendering |
| [`MysqlQueryBuilder`](docs/query-builder.md#mysqlquerybuilder) | MySQL implementation |
| [`MysqlExprRenderer`](docs/query-builder.md#mysqlexprrenderer) | MySQL expression renderer |
| [`MssqlQueryBuilder`](docs/query-builder.md#mssqlquerybuilder) | MSSQL implementation |
| [`MssqlExprRenderer`](docs/query-builder.md#mssqlexprrenderer) | MSSQL expression renderer |
| [`PostgresqlQueryBuilder`](docs/query-builder.md#postgresqlquerybuilder) | PostgreSQL implementation |
| [`PostgresqlExprRenderer`](docs/query-builder.md#postgresqlexprrenderer) | PostgreSQL expression renderer |

---

## Types

All type definitions, error types, and utility types. [`docs/types.md`](docs/types.md)

**Database types**: [`Dialect`](docs/types.md#dialect), [`dialects`](docs/types.md#dialects), [`QueryBuildResult`](docs/types.md#querybuildresult), [`IsolationLevel`](docs/types.md#isolationlevel), [`DataRecord`](docs/types.md#datarecord), [`DbContextExecutor`](docs/types.md#dbcontextexecutor), [`ResultMeta`](docs/types.md#resultmeta), [`Migration`](docs/types.md#migration)

**Column types**: [`DataType`](docs/types.md#datatype), [`ColumnPrimitive`](docs/types.md#columnprimitive), [`ColumnPrimitiveStr`](docs/types.md#columnprimitivestr), [`ColumnPrimitiveMap`](docs/types.md#columnprimitivemap), [`ColumnMeta`](docs/types.md#columnmeta), [`ColumnBuilderRecord`](docs/types.md#columnbuilderrecord), [`InferColumns`](docs/types.md#infercolumns), [`InferInsertColumns`](docs/types.md#inferinsertcolumns), [`InferUpdateColumns`](docs/types.md#inferupdatecolumns), [`dataTypeStrToColumnPrimitiveStr`](docs/types.md#datatypestrtoColumnprimitivestr), [`inferColumnPrimitiveStr`](docs/types.md#infercolumnprimitivestr), [`InferColumnPrimitiveFromDataType`](docs/types.md#infercolumnprimitivefromdatatype)

**Expression types**: [`Expr`](docs/types.md#expression-types), [`WhereExpr`](docs/types.md#expression-types), [`WinFn`](docs/types.md#expression-types), [`WinSpec`](docs/types.md#expression-types), [`DateSeparator`](docs/types.md#expression-types), and all individual `Expr*` / `WinFn*` node types

**QueryDef types**: [`QueryDef`](docs/types.md#querydef-types), [`SelectQueryDef`](docs/types.md#querydef-types), [`InsertQueryDef`](docs/types.md#querydef-types), and all DDL/DML query definition types, [`DDL_TYPES`](docs/types.md#querydef-types), [`DdlType`](docs/types.md#querydef-types)

**Relation types**: [`RelationBuilderRecord`](docs/types.md#relationbuilderrecord), [`ExtractRelationTarget`](docs/types.md#extractrelationtarget), [`ExtractRelationTargetResult`](docs/types.md#extractrelationtargetresult), [`InferDeepRelations`](docs/types.md#inferdeeprelations)

**DbContext types**: [`DbContextBase`](docs/types.md#dbcontextbase), [`DbContextStatus`](docs/types.md#dbcontextstatus), [`DbContextDef`](docs/types.md#dbcontextdef), [`DbContextInstance`](docs/types.md#dbcontextinstance), [`DbContextConnectionMethods`](docs/types.md#dbcontextconnectionmethods), [`DbContextDdlMethods`](docs/types.md#dbcontextddlmethods)

**Error types**: [`DbTransactionError`](docs/types.md#dbtransactionerror), [`DbErrorCode`](docs/types.md#dberrorcode)
