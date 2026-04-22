import type { TableBuilder } from "../schema/table-builder";
import type { ViewBuilder } from "../schema/view-builder";
import type { ProcedureBuilder } from "../schema/procedure-builder";
import type { ColumnBuilder } from "../schema/factory/column-builder";
import type { ForeignKeyBuilder } from "../schema/factory/relation-builder";
import type { IndexBuilder } from "../schema/factory/index-builder";
import type { DataRecord, ResultMeta } from "./db";
import type { QueryDef, QueryDefObjectName } from "./query-def";

/**
 * DbContext 핵심 인터페이스
 *
 * Queryable, Executable, ViewBuilder에서 사용하는 내부 인터페이스.
 * DbContext class가 이 인터페이스를 구현한다.
 */
export interface DbContextBase {
  status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
  getQueryDefObjectName(
    tableOrView: TableBuilder<any, any, any> | ViewBuilder<any, any, any>,
  ): QueryDefObjectName;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
}

export type DbContextStatus = "ready" | "connect" | "transact";

export interface DbContextDdlMethods {
  createTable(table: TableBuilder<any, any, any>): Promise<void>;
  dropTable(table: QueryDefObjectName): Promise<void>;
  renameTable(table: QueryDefObjectName, newName: string): Promise<void>;
  createView(view: ViewBuilder<any, any, any>): Promise<void>;
  dropView(view: QueryDefObjectName): Promise<void>;
  createProc(procedure: ProcedureBuilder<any, any>): Promise<void>;
  dropProc(procedure: QueryDefObjectName): Promise<void>;
  addColumn(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): Promise<void>;
  dropColumn(table: QueryDefObjectName, column: string): Promise<void>;
  modifyColumn(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): Promise<void>;
  renameColumn(table: QueryDefObjectName, column: string, newName: string): Promise<void>;
  addPrimaryKey(table: QueryDefObjectName, columns: string[]): Promise<void>;
  dropPrimaryKey(table: QueryDefObjectName): Promise<void>;
  addForeignKey(
    table: QueryDefObjectName,
    relationName: string,
    relationDef: ForeignKeyBuilder<any, any>,
  ): Promise<void>;
  addIndex(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): Promise<void>;
  dropForeignKey(table: QueryDefObjectName, relationName: string): Promise<void>;
  dropIndex(table: QueryDefObjectName, columns: string[]): Promise<void>;
  clearSchema(params: { database: string; schema?: string }): Promise<void>;
  schemaExists(database: string, schema?: string): Promise<boolean>;
  truncate(table: QueryDefObjectName): Promise<void>;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
  // QueryDef 생성기
  getCreateTableQueryDef(table: TableBuilder<any, any, any>): QueryDef;
  getCreateViewQueryDef(view: ViewBuilder<any, any, any>): QueryDef;
  getCreateProcQueryDef(procedure: ProcedureBuilder<any, any>): QueryDef;
  getCreateObjectQueryDef(
    builder: TableBuilder<any, any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>,
  ): QueryDef;
  getDropTableQueryDef(table: QueryDefObjectName): QueryDef;
  getRenameTableQueryDef(table: QueryDefObjectName, newName: string): QueryDef;
  getDropViewQueryDef(view: QueryDefObjectName): QueryDef;
  getDropProcQueryDef(procedure: QueryDefObjectName): QueryDef;
  getAddColumnQueryDef(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): QueryDef;
  getDropColumnQueryDef(table: QueryDefObjectName, column: string): QueryDef;
  getModifyColumnQueryDef(
    table: QueryDefObjectName,
    columnName: string,
    column: ColumnBuilder<any, any>,
  ): QueryDef;
  getRenameColumnQueryDef(table: QueryDefObjectName, column: string, newName: string): QueryDef;
  getAddPrimaryKeyQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
  getDropPrimaryKeyQueryDef(table: QueryDefObjectName): QueryDef;
  getAddForeignKeyQueryDef(
    table: QueryDefObjectName,
    relationName: string,
    relationDef: ForeignKeyBuilder<any, any>,
  ): QueryDef;
  getAddIndexQueryDef(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): QueryDef;
  getDropForeignKeyQueryDef(table: QueryDefObjectName, relationName: string): QueryDef;
  getDropIndexQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
  getClearSchemaQueryDef(params: { database: string; schema?: string }): QueryDef;
  getSchemaExistsQueryDef(database: string, schema?: string): QueryDef;
  getTruncateQueryDef(table: QueryDefObjectName): QueryDef;
  getSwitchFkQueryDef(table: QueryDefObjectName, enabled: boolean): QueryDef;
}
