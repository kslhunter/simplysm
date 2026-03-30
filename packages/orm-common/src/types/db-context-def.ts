import type { TableBuilder } from "../schema/table-builder";
import type { ViewBuilder } from "../schema/view-builder";
import type { ProcedureBuilder } from "../schema/procedure-builder";
import type { ColumnBuilder } from "../schema/factory/column-builder";
import type { ForeignKeyBuilder } from "../schema/factory/relation-builder";
import type { IndexBuilder } from "../schema/factory/index-builder";
import type { DataRecord, IsolationLevel, Migration, ResultMeta } from "./db";
import type { QueryDef, QueryDefObjectName } from "./query-def";

/**
 * DbContext 핵심 인터페이스
 *
 * Queryable, Executable, ViewBuilder에서 사용하는 내부 인터페이스.
 * 기존 DbContext 클래스와 새로운 createDbContext 반환 객체 모두
 * 이 인터페이스를 만족함.
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
    tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>,
  ): QueryDefObjectName;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
}

export type DbContextStatus = "ready" | "connect" | "transact";

/**
 * DbContext 정의 (blueprint)
 *
 * defineDbContext()로 생성됨. Schema 메타데이터만 포함하며 런타임 상태는 없음.
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
 * 전체 DbContext 인스턴스 타입 (createDbContext로 생성)
 *
 * DbContextBase를 queryable 접근자, DDL 메서드,
 * 연결/트랜잭션 관리로 확장.
 */
export type DbContextInstance<TDef extends DbContextDef<any, any, any>> = DbContextBase &
  DbContextConnectionMethods &
  DbContextDdlMethods & {
    // 자동 매핑된 table queryable 접근자
    [K in keyof TDef["meta"]["tables"]]: () => import("../exec/queryable").Queryable<
      TDef["meta"]["tables"][K]["$inferSelect"],
      TDef["meta"]["tables"][K]
    >;
  } & {
    // 자동 매핑된 view queryable 접근자
    [K in keyof TDef["meta"]["views"]]: () => import("../exec/queryable").Queryable<
      TDef["meta"]["views"][K]["$inferSelect"],
      never
    >;
  } & {
    // 자동 매핑된 procedure executable 접근자
    [K in keyof TDef["meta"]["procedures"]]: () => import("../exec/executable").Executable<
      TDef["meta"]["procedures"][K]["$params"],
      TDef["meta"]["procedures"][K]["$returns"]
    >;
  } & {
    // 시스템 table
    _migration: () => import("../exec/queryable").Queryable<{ code: string }, any>;
    // 초기화
    initialize(options?: { dbs?: string[]; force?: boolean }): Promise<void>;
  };

export interface DbContextConnectionMethods {
  connect<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
  connectWithoutTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult>;
  transaction<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
}

export interface DbContextDdlMethods {
  createTable(table: TableBuilder<any, any>): Promise<void>;
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
