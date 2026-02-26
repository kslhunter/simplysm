# @simplysm/orm-common

Simplysm Package - ORM Module (common)

## Installation

pnpm add @simplysm/orm-common

**Peer Dependencies:** `@simplysm/core-common`

## Source Index

### Core

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/define-db-context.ts` | `defineDbContext` | Define a database context with tables, views, and migrations | `tests/db-context/define-db-context.spec.ts` |
| `src/create-db-context.ts` | `createDbContext` | Create a database context instance from a definition | `tests/db-context/create-db-context.spec.ts` |
| `src/types/db-context-def.ts` | `DbContextBase`, `DbContextStatus`, `DbContextDef`, `DbContextInstance`, `DbContextConnectionMethods`, `DbContextDdlMethods` | Database context type definitions and connection interfaces | `-` |
| `src/errors/db-transaction-error.ts` | `DbErrorCode`, `DbTransactionError` | Transaction error codes and error class for DB operations | `-` |

### Queryable / Executable

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/exec/queryable.ts` | `Queryable`, `getMatchedPrimaryKeys`, `QueryableRecord`, `QueryableWriteRecord`, `NullableQueryableRecord`, `UnwrapQueryableRecord`, `PathProxy`, `queryable` | Core queryable builder for SELECT, JOIN, WHERE, and aggregation | `tests/select/`, `tests/dml/`, `tests/errors/` |
| `src/exec/executable.ts` | `Executable`, `executable` | Executable builder for INSERT, UPDATE, DELETE, and DDL operations | `tests/executable/basic.spec.ts` |
| `src/exec/search-parser.ts` | `ParsedSearchQuery`, `parseSearchQuery` | Parse search query strings into structured filter objects | `tests/exec/search-parser.spec.ts` |

### Expression

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/expr/expr.ts` | `SwitchExprBuilder`, `expr`, `toExpr` | Expression builder with switch/case and conversion helpers | `tests/expr/` |
| `src/expr/expr-unit.ts` | `ExprUnit`, `WhereExprUnit`, `ExprInput` | Expression unit types for building type-safe query expressions | `-` |

### Schema Builders

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/schema/table-builder.ts` | `TableBuilder`, `Table` | Table schema builder with columns, indexes, and relations | `tests/ddl/table-builder.spec.ts` |
| `src/schema/view-builder.ts` | `ViewBuilder`, `View` | View schema builder for defining SQL views | `tests/ddl/view-builder.spec.ts` |
| `src/schema/procedure-builder.ts` | `ProcedureBuilder`, `Procedure` | Procedure schema builder for stored procedures | `tests/ddl/procedure-builder.spec.ts` |
| `src/schema/factory/column-builder.ts` | `ColumnBuilder`, `createColumnFactory`, `ColumnBuilderRecord`, `InferColumns`, `InferColumnExprs`, `RequiredInsertKeys`, `OptionalInsertKeys`, `InferInsertColumns`, `InferUpdateColumns`, `DataToColumnBuilderRecord` | Column definition builder with data types and constraints | `tests/ddl/column-builder.spec.ts` |
| `src/schema/factory/index-builder.ts` | `IndexBuilder`, `createIndexFactory` | Index definition builder for table indexes | `tests/ddl/index-builder.spec.ts` |
| `src/schema/factory/relation-builder.ts` | `ForeignKeyBuilder`, `ForeignKeyTargetBuilder`, `RelationKeyBuilder`, `RelationKeyTargetBuilder`, `createRelationFactory`, `RelationBuilderRecord`, `ExtractRelationTarget`, `ExtractRelationTargetResult`, `InferDeepRelations` | Foreign key and relation builder for table relationships | `tests/ddl/relation-builder.spec.ts` |

### Models

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/models/system-migration.ts` | `_Migration` | Built-in migration tracking table model | `-` |

### Query Builder

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/query-builder/query-builder.ts` | `createQueryBuilder` | Factory to create dialect-specific query builders | `-` |
| `src/query-builder/base/query-builder-base.ts` | `QueryBuilderBase` | Abstract base class for SQL query generation | `-` |
| `src/query-builder/base/expr-renderer-base.ts` | `ExprRendererBase` | Abstract base class for SQL expression rendering | `-` |
| `src/query-builder/mysql/mysql-query-builder.ts` | `MysqlQueryBuilder` | MySQL-specific SQL query builder | `-` |
| `src/query-builder/mysql/mysql-expr-renderer.ts` | `MysqlExprRenderer` | MySQL-specific expression renderer | `-` |
| `src/query-builder/mssql/mssql-query-builder.ts` | `MssqlQueryBuilder` | MSSQL-specific SQL query builder | `-` |
| `src/query-builder/mssql/mssql-expr-renderer.ts` | `MssqlExprRenderer` | MSSQL-specific expression renderer | `-` |
| `src/query-builder/postgresql/postgresql-query-builder.ts` | `PostgresqlQueryBuilder` | PostgreSQL-specific SQL query builder | `-` |
| `src/query-builder/postgresql/postgresql-expr-renderer.ts` | `PostgresqlExprRenderer` | PostgreSQL-specific expression renderer | `-` |

### Types

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/types/db.ts` | `Dialect`, `dialects`, `QueryBuildResult`, `IsolationLevel`, `DataRecord`, `DbContextExecutor`, `ResultMeta`, `Migration` | Core database types (Dialect, IsolationLevel, QueryBuildResult, Migration) | `-` |
| `src/utils/result-parser.ts` | `parseQueryResult` | Parse raw DB query results into typed JavaScript objects | `tests/utils/result-parser.spec.ts` |
| `src/types/column.ts` | `DataType`, `ColumnPrimitiveMap`, `ColumnPrimitiveStr`, `ColumnPrimitive`, `dataTypeStrToColumnPrimitiveStr`, `InferColumnPrimitiveFromDataType`, `inferColumnPrimitiveStr`, `ColumnMeta` | Column data type definitions and primitive type mapping | `-` |
| `src/types/expr.ts` | `DateSeparator`, `ExprColumn`, `ExprValue`, `ExprRaw`, `ExprEq`, `ExprGt`, `ExprLt`, `ExprGte`, `ExprLte`, `ExprBetween`, `ExprIsNull`, `ExprLike`, `ExprRegexp`, `ExprIn`, `ExprInQuery`, `ExprExists`, `ExprNot`, `ExprAnd`, `ExprOr`, `ExprConcat`, `ExprLeft`, `ExprRight`, `ExprTrim`, `ExprPadStart`, `ExprReplace`, `ExprUpper`, `ExprLower`, `ExprLength`, `ExprByteLength`, `ExprSubstring`, `ExprIndexOf`, `ExprAbs`, `ExprRound`, `ExprCeil`, `ExprFloor`, `ExprYear`, `ExprMonth`, `ExprDay`, `ExprHour`, `ExprMinute`, `ExprSecond`, `ExprIsoWeek`, `ExprIsoWeekStartDate`, `ExprIsoYearMonth`, `ExprDateDiff`, `ExprDateAdd`, `ExprFormatDate`, `ExprIfNull`, `ExprNullIf`, `ExprIs`, `ExprSwitch`, `ExprIf`, `ExprCount`, `ExprSum`, `ExprAvg`, `ExprMax`, `ExprMin`, `ExprGreatest`, `ExprLeast`, `ExprRowNum`, `ExprRandom`, `ExprCast`, `WinFnRowNumber`, `WinFnRank`, `WinFnDenseRank`, `WinFnNtile`, `WinFnLag`, `WinFnLead`, `WinFnFirstValue`, `WinFnLastValue`, `WinFnSum`, `WinFnAvg`, `WinFnCount`, `WinFnMin`, `WinFnMax`, `WinFn`, `WinSpec`, `ExprWindow`, `ExprSubquery`, `WhereExpr`, `Expr` | All expression AST node types for the query builder | `-` |
| `src/types/query-def.ts` | `QueryDefObjectName`, `CudOutputDef`, `SelectQueryDef`, `SelectQueryDefJoin`, `InsertQueryDef`, `InsertIfNotExistsQueryDef`, `InsertIntoQueryDef`, `UpdateQueryDef`, `DeleteQueryDef`, `UpsertQueryDef`, `SwitchFkQueryDef`, `ClearSchemaQueryDef`, `CreateTableQueryDef`, `DropTableQueryDef`, `RenameTableQueryDef`, `TruncateQueryDef`, `AddColumnQueryDef`, `DropColumnQueryDef`, `ModifyColumnQueryDef`, `RenameColumnQueryDef`, `DropPkQueryDef`, `AddPkQueryDef`, `AddFkQueryDef`, `DropFkQueryDef`, `AddIdxQueryDef`, `DropIdxQueryDef`, `CreateViewQueryDef`, `DropViewQueryDef`, `CreateProcQueryDef`, `DropProcQueryDef`, `ExecProcQueryDef`, `SchemaExistsQueryDef`, `DDL_TYPES`, `DdlType`, `QueryDef` | Query definition types for all SQL statement kinds (SELECT, INSERT, DDL, etc.) | `-` |

## License

Apache-2.0
