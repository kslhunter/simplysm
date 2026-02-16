import type { TableBuilder } from "../schema/table-builder";
import type { ViewBuilder } from "../schema/view-builder";
import type { ProcedureBuilder } from "../schema/procedure-builder";
import type { ColumnBuilder } from "../schema/factory/column-builder";
import type { ForeignKeyBuilder } from "../schema/factory/relation-builder";
import type { IndexBuilder } from "../schema/factory/index-builder";
import type { DataRecord, IsolationLevel, Migration, ResultMeta } from "./db";
import type { QueryDef, QueryDefObjectName } from "./query-def";

/**
 * DbContext core interface
 *
 * Internal interface used by Queryable, Executable, and ViewBuilder.
 * Both the old DbContext class and new createDbContext return objects
 * that satisfy this interface.
 */
export interface DbContextBase {
  status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
  getQueryDefObjectName(tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>): QueryDefObjectName;
  switchFk(table: QueryDefObjectName, switch_: "on" | "off"): Promise<void>;
}

export type DbContextStatus = "ready" | "connect" | "transact";

/**
 * DbContext definition (blueprint)
 *
 * Created by defineDbContext(). Contains schema metadata but no runtime state.
 */
export interface DbContextDef<
  TTables extends Record<string, TableBuilder<any, any>>,
  TViews extends Record<string, ViewBuilder<any, any, any>>,
  TProcedures extends Record<string, ProcedureBuilder<any, any>> = {},
> {
  readonly meta: {
    readonly tables: TTables;
    readonly views: TViews;
    readonly procedures: TProcedures;
    readonly migrations: Migration[];
  };
}

/**
 * Full DbContext instance type (created by createDbContext)
 *
 * Extends DbContextBase with queryable accessors, DDL methods,
 * and connection/transaction management.
 */
export type DbContextInstance<TDef extends DbContextDef<any, any, any>> = DbContextBase &
  DbContextConnectionMethods &
  DbContextDdlMethods & {
    // Auto-mapped table queryable accessors
    [K in keyof TDef["meta"]["tables"]]: () => import("../exec/queryable").Queryable<
      TDef["meta"]["tables"][K]["$infer"],
      TDef["meta"]["tables"][K]
    >;
  } & {
    // Auto-mapped view queryable accessors
    [K in keyof TDef["meta"]["views"]]: () => import("../exec/queryable").Queryable<
      TDef["meta"]["views"][K]["$infer"],
      never
    >;
  } & {
    // Auto-mapped procedure executable accessors
    [K in keyof TDef["meta"]["procedures"]]: () => import("../exec/executable").Executable<
      TDef["meta"]["procedures"][K]["$params"],
      TDef["meta"]["procedures"][K]["$returns"]
    >;
  } & {
    // System table
    _migration: () => import("../exec/queryable").Queryable<{ code: string }, any>;
    // Initialization
    initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void>;
  };

export interface DbContextConnectionMethods {
  connect<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
  connectWithoutTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult>;
  trans<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
}

export interface DbContextDdlMethods {
  createTable(table: TableBuilder<any, any>): Promise<void>;
  dropTable(table: QueryDefObjectName): Promise<void>;
  renameTable(table: QueryDefObjectName, newName: string): Promise<void>;
  createView(view: ViewBuilder<any, any, any>): Promise<void>;
  dropView(view: QueryDefObjectName): Promise<void>;
  createProc(procedure: ProcedureBuilder<any, any>): Promise<void>;
  dropProc(procedure: QueryDefObjectName): Promise<void>;
  addColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): Promise<void>;
  dropColumn(table: QueryDefObjectName, column: string): Promise<void>;
  modifyColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): Promise<void>;
  renameColumn(table: QueryDefObjectName, column: string, newName: string): Promise<void>;
  addPk(table: QueryDefObjectName, columns: string[]): Promise<void>;
  dropPk(table: QueryDefObjectName): Promise<void>;
  addFk(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder<any, any>): Promise<void>;
  addIdx(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): Promise<void>;
  dropFk(table: QueryDefObjectName, relationName: string): Promise<void>;
  dropIdx(table: QueryDefObjectName, columns: string[]): Promise<void>;
  clearSchema(params: { database: string; schema?: string }): Promise<void>;
  schemaExists(database: string, schema?: string): Promise<boolean>;
  truncate(table: QueryDefObjectName): Promise<void>;
  switchFk(table: QueryDefObjectName, switch_: "on" | "off"): Promise<void>;
  // QueryDef generators
  getCreateTableQueryDef(table: TableBuilder<any, any>): QueryDef;
  getCreateViewQueryDef(view: ViewBuilder<any, any, any>): QueryDef;
  getCreateProcQueryDef(procedure: ProcedureBuilder<any, any>): QueryDef;
  getCreateObjectQueryDef(
    builder: TableBuilder<any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>,
  ): QueryDef;
  getDropTableQueryDef(table: QueryDefObjectName): QueryDef;
  getRenameTableQueryDef(table: QueryDefObjectName, newName: string): QueryDef;
  getDropViewQueryDef(view: QueryDefObjectName): QueryDef;
  getDropProcQueryDef(procedure: QueryDefObjectName): QueryDef;
  getAddColumnQueryDef(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): QueryDef;
  getDropColumnQueryDef(table: QueryDefObjectName, column: string): QueryDef;
  getModifyColumnQueryDef(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): QueryDef;
  getRenameColumnQueryDef(table: QueryDefObjectName, column: string, newName: string): QueryDef;
  getAddPkQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
  getDropPkQueryDef(table: QueryDefObjectName): QueryDef;
  getAddFkQueryDef(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder<any, any>): QueryDef;
  getAddIdxQueryDef(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): QueryDef;
  getDropFkQueryDef(table: QueryDefObjectName, relationName: string): QueryDef;
  getDropIdxQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
  getClearSchemaQueryDef(params: { database: string; schema?: string }): QueryDef;
  getSchemaExistsQueryDef(database: string, schema?: string): QueryDef;
  getTruncateQueryDef(table: QueryDefObjectName): QueryDef;
  getSwitchFkQueryDef(table: QueryDefObjectName, switch_: "on" | "off"): QueryDef;
}
