// ============================================
// orm-common 패키지 진입점
// ============================================

//#region ========== Core ==========

// Functional API (recommended)
export { defineDbContext } from "./define-db-context";
export { createDbContext } from "./create-db-context";
export type {
  DbContextBase,
  DbContextDef,
  DbContextInstance,
  DbContextConnectionMethods,
  DbContextDdlMethods,
  DbContextStatus,
} from "./types/db-context-def";

// Legacy class-based API (deprecated, use defineDbContext + createDbContext instead)
export type { DbContext } from "./db-context";

export { DbTransactionError, DbErrorCode } from "./errors/db-transaction-error";

//#endregion

//#region ========== Queryable / Executable ==========

export { Queryable, queryable, getMatchedPrimaryKeys } from "./exec/queryable";
export type { QueryableRecord, PathProxy } from "./exec/queryable";

export { Executable, executable } from "./exec/executable";

export { parseSearchQuery, type ParsedSearchQuery } from "./exec/search-parser";

//#endregion

//#region ========== Expression ==========

export { expr, toExpr, type SwitchExprBuilder } from "./expr/expr";
export { ExprUnit, WhereExprUnit, type ExprInput } from "./expr/expr-unit";

//#endregion

//#region ========== Schema Builders ==========

export { TableBuilder, Table } from "./schema/table-builder";
export { ViewBuilder, View } from "./schema/view-builder";
export { ProcedureBuilder, Procedure } from "./schema/procedure-builder";

export {
  ColumnBuilder,
  createColumnFactory,
  type ColumnBuilderRecord,
  type InferColumns,
  type InferInsertColumns,
  type InferUpdateColumns,
  type InferColumnExprs,
  type DataToColumnBuilderRecord,
} from "./schema/factory/column-builder";

export { IndexBuilder, createIndexFactory } from "./schema/factory/index-builder";

export {
  ForeignKeyBuilder,
  ForeignKeyTargetBuilder,
  RelationKeyBuilder,
  RelationKeyTargetBuilder,
  createRelationFactory,
  type RelationBuilderRecord,
  type InferDeepRelations,
} from "./schema/factory/relation-builder";

//#endregion

//#region ========== Models ==========

export { SystemMigration } from "./models/system-migration";

//#endregion

//#region ========== Query Builder ==========

export { createQueryBuilder } from "./query-builder/query-builder";
export { QueryBuilderBase } from "./query-builder/base/query-builder-base";
export { ExprRendererBase } from "./query-builder/base/expr-renderer-base";
export { MysqlQueryBuilder } from "./query-builder/mysql/mysql-query-builder";
export { MysqlExprRenderer } from "./query-builder/mysql/mysql-expr-renderer";
export { MssqlQueryBuilder } from "./query-builder/mssql/mssql-query-builder";
export { MssqlExprRenderer } from "./query-builder/mssql/mssql-expr-renderer";
export { PostgresqlQueryBuilder } from "./query-builder/postgresql/postgresql-query-builder";
export { PostgresqlExprRenderer } from "./query-builder/postgresql/postgresql-expr-renderer";

//#endregion

//#region ========== Types ==========

// Database types
export type {
  Dialect,
  IsolationLevel,
  DataRecord,
  DbContextExecutor,
  ResultMeta,
  Migration,
  QueryBuildResult,
} from "./types/db";
export { dialects } from "./types/db";

// Result parsing
export { parseQueryResult } from "./utils/result-parser";

// Column types
export type {
  DataType,
  ColumnPrimitiveMap,
  ColumnPrimitiveStr,
  ColumnPrimitive,
  ColumnMeta,
  InferColumnPrimitiveFromDataType,
} from "./types/column";
export { dataTypeStrToColumnPrimitiveStr, inferColumnPrimitiveStr } from "./types/column";

// Expression types
export type {
  Expr,
  WhereExpr,
  DateSeparator,
  WinSpec,
  // Value expressions
  ExprColumn,
  ExprValue,
  ExprRaw,
  // Comparison expressions
  ExprEq,
  ExprGt,
  ExprLt,
  ExprGte,
  ExprLte,
  ExprBetween,
  ExprIsNull,
  ExprLike,
  ExprRegexp,
  ExprIn,
  ExprInQuery,
  ExprExists,
  // Logical expressions
  ExprNot,
  ExprAnd,
  ExprOr,
  // String expressions
  ExprConcat,
  ExprLeft,
  ExprRight,
  ExprTrim,
  ExprPadStart,
  ExprReplace,
  ExprUpper,
  ExprLower,
  ExprLength,
  ExprByteLength,
  ExprSubstring,
  ExprIndexOf,
  // Numeric expressions
  ExprAbs,
  ExprRound,
  ExprCeil,
  ExprFloor,
  // Date expressions
  ExprYear,
  ExprMonth,
  ExprDay,
  ExprHour,
  ExprMinute,
  ExprSecond,
  ExprIsoWeek,
  ExprIsoWeekStartDate,
  ExprIsoYearMonth,
  ExprDateDiff,
  ExprDateAdd,
  ExprFormatDate,
  // Conditional expressions
  ExprIfNull,
  ExprNullIf,
  ExprIs,
  ExprSwitch,
  ExprIf,
  // Aggregate expressions
  ExprCount,
  ExprSum,
  ExprAvg,
  ExprMax,
  ExprMin,
  ExprGreatest,
  ExprLeast,
  // Utility expressions
  ExprRowNum,
  ExprRandom,
  ExprCast,
  ExprWindow,
  ExprSubquery,
} from "./types/expr";

// QueryDef types
export type {
  QueryDef,
  QueryDefObjectName,
  CudOutputDef,
  // DML
  SelectQueryDef,
  SelectQueryDefJoin,
  InsertQueryDef,
  InsertIfNotExistsQueryDef,
  InsertIntoQueryDef,
  UpdateQueryDef,
  DeleteQueryDef,
  UpsertQueryDef,
  // DDL - Table
  CreateTableQueryDef,
  DropTableQueryDef,
  RenameTableQueryDef,
  TruncateQueryDef,
  // DDL - Column
  AddColumnQueryDef,
  DropColumnQueryDef,
  ModifyColumnQueryDef,
  RenameColumnQueryDef,
  // DDL - Index/Constraints
  AddPkQueryDef,
  DropPkQueryDef,
  AddFkQueryDef,
  DropFkQueryDef,
  SwitchFkQueryDef,
  AddIdxQueryDef,
  DropIdxQueryDef,
  // DDL - View/Procedure
  CreateViewQueryDef,
  DropViewQueryDef,
  CreateProcQueryDef,
  DropProcQueryDef,
  ExecProcQueryDef,
  // DDL - Schema
  ClearSchemaQueryDef,
  SchemaExistsQueryDef,
  // DDL 타입 상수
  DDL_TYPES,
  DdlType,
} from "./types/query-def";

//#endregion
