import type {
  AddForeignKeyQueryDef,
  ClearDatabaseQueryDef,
  CreateDatabaseQueryDef,
  CreateIndexQueryDef,
  CreateProcedureQueryDef,
  CreateTableQueryDef,
  CreateViewQueryDef,
  DeleteQueryDef,
  ExecuteProcedureQueryDef,
  GetDatabaseInfoDef,
  GetTableColumnInfosDef,
  GetTableForeignKeysDef,
  GetTableIndexesDef,
  GetTableInfoDef,
  GetTableInfosDef,
  GetTablePrimaryKeysDef,
  InsertIfNotExistsQueryDef,
  InsertIntoQueryDef,
  InsertQueryDef,
  SelectQuery,
  TruncateTableQueryDef,
  UpdateQueryDef,
  UpsertQueryDef,
} from "../query-def";
import type { TDataType } from "../../types";
import type { Expr, WhereExpr } from "../../expr/expr.types";

export abstract class BaseQueryBuilder {
  // ============================================
  // Expr 렌더링 (dialect별 구현)
  // ============================================

  protected abstract _renderExpr(expr: Expr): string;
  protected abstract _renderWhereExpr(expr: WhereExpr): string;

  // ============================================
  // 공통 헬퍼
  // ============================================

  protected _isSubQuery(value: unknown): value is SelectQuery {
    return typeof value === "object" && value !== null && "from" in value;
  }

  // ============================================
  // Abstract - QueryBuilder 메서드들
  // ============================================

  // DML
  abstract select(def: SelectQuery): string;
  abstract insert(def: InsertQueryDef): string;
  abstract update(def: UpdateQueryDef): string;
  abstract delete(def: DeleteQueryDef): string;
  abstract upsert(def: UpsertQueryDef): string;
  abstract insertInto(def: InsertIntoQueryDef): string;
  abstract insertIfNotExists(def: InsertIfNotExistsQueryDef): string;
  abstract truncate(def: TruncateTableQueryDef): string;

  // DDL - Database
  abstract createDatabase(def: CreateDatabaseQueryDef): string;
  abstract clearDatabase(def: ClearDatabaseQueryDef): string;

  // DDL - Table
  abstract createTable(def: CreateTableQueryDef): string;

  // DDL - Constraints
  abstract addForeignKey(def: AddForeignKeyQueryDef): string;

  // DDL - Index
  abstract createIndex(def: CreateIndexQueryDef): string;

  // DDL - View/Procedure
  abstract createView(def: CreateViewQueryDef): string;
  abstract createProcedure(def: CreateProcedureQueryDef): string;
  abstract executeProcedure(def: ExecuteProcedureQueryDef): string;

  // Meta
  abstract getDatabaseInfo(def: GetDatabaseInfoDef): string;
  abstract getTableInfos(def: GetTableInfosDef): string;
  abstract getTableInfo(def: GetTableInfoDef): string;
  abstract getTableColumnInfos(def: GetTableColumnInfosDef): string;
  abstract getTablePrimaryKeys(def: GetTablePrimaryKeysDef): string;
  abstract getTableForeignKeys(def: GetTableForeignKeysDef): string;
  abstract getTableIndexes(def: GetTableIndexesDef): string;

  // Utils
  abstract getDataTypeString(dataType: TDataType): string;
}

export type TQueryDef = {
  [K in keyof BaseQueryBuilder]: { type: K } & Parameters<BaseQueryBuilder[K]>[0];
}[keyof BaseQueryBuilder];
