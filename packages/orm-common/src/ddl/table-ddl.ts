import { TableBuilder } from "../schema/table-builder";
import { ViewBuilder } from "../schema/view-builder";
import { ProcedureBuilder } from "../schema/procedure-builder";
import type { ColumnBuilderRecord } from "../schema/factory/column-builder";
import type {
  QueryDef,
  QueryDefObjectName,
  DropTableQueryDef,
  RenameTableQueryDef,
  DropViewQueryDef,
  DropProcQueryDef,
} from "../types/query-def";
import type { DbContextBase } from "../types/db-context-def";
import { objClearUndefined } from "@simplysm/core-common";

/**
 * Builder를 CREATE QueryDef로 변환
 *
 * @param db - DbContext 인스턴스
 * @param builder - Table/View/Procedure 빌더
 * @returns CREATE TABLE/VIEW/PROCEDURE QueryDef
 * @throws {Error} 알 수 없는 빌더 타입일 때
 */
export function getCreateObjectQueryDef(
  db: DbContextBase,
  builder: TableBuilder<any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>,
): QueryDef {
  if (builder instanceof TableBuilder) {
    return getCreateTableQueryDef(db, builder);
  } else if (builder instanceof ViewBuilder) {
    return getCreateViewQueryDef(db, builder);
  } else if (builder instanceof ProcedureBuilder) {
    return getCreateProcQueryDef(db, builder);
  }

  throw new Error(`알 수 없는 빌더 타입: ${typeof builder}`);
}

/**
 * CREATE TABLE QueryDef 생성
 *
 * @param db - DbContext 인스턴스
 * @param table - 테이블 빌더
 * @returns CREATE TABLE QueryDef
 * @throws {Error} 테이블에 컬럼이 없을 때
 */
export function getCreateTableQueryDef(db: DbContextBase, table: TableBuilder<any, any>): QueryDef {
  const columns = table.meta.columns as ColumnBuilderRecord | undefined;
  if (columns == null) {
    throw new Error(`테이블 '${table.meta.name}'에 컬럼이 없습니다.`);
  }

  return {
    type: "createTable",
    table: getQueryDefObjectName(db, table),
    columns: Object.entries(columns).map(([key, col]) => ({
      name: key,
      dataType: col.meta.dataType,
      autoIncrement: col.meta.autoIncrement,
      nullable: col.meta.nullable,
      default: col.meta.default,
    })),
    primaryKey: table.meta.primaryKey,
  };
}

/**
 * CREATE VIEW QueryDef 생성
 *
 * @param db - DbContext 인스턴스
 * @param view - 뷰 빌더
 * @returns CREATE VIEW QueryDef
 * @throws {Error} 뷰에 viewFn이 없을 때
 */
export function getCreateViewQueryDef(
  db: DbContextBase,
  view: ViewBuilder<any, any, any>,
): QueryDef {
  if (view.meta.viewFn == null) {
    throw new Error(`뷰 '${view.meta.name}'에 viewFn이 없습니다.`);
  }

  const qr = view.meta.viewFn(db);
  const selectDef = qr.getSelectQueryDef();

  return {
    type: "createView",
    view: {
      database: view.meta.database ?? db.database,
      schema: view.meta.schema ?? db.schema,
      name: view.meta.name,
    },
    queryDef: selectDef,
  };
}

/**
 * CREATE PROCEDURE QueryDef 생성
 *
 * @param db - DbContext 인스턴스
 * @param procedure - 프로시저 빌더
 * @returns CREATE PROCEDURE QueryDef
 * @throws {Error} 프로시저에 본문이 없을 때
 */
export function getCreateProcQueryDef(
  db: DbContextBase,
  procedure: ProcedureBuilder<any, any>,
): QueryDef {
  if (procedure.meta.query == null) {
    throw new Error(`프로시저 '${procedure.meta.name}'에 본문이 없습니다.`);
  }

  const params = procedure.meta.params as ColumnBuilderRecord | undefined;
  const returns = procedure.meta.returns as ColumnBuilderRecord | undefined;

  return {
    type: "createProc",
    procedure: {
      database: procedure.meta.database ?? db.database,
      schema: procedure.meta.schema ?? db.schema,
      name: procedure.meta.name,
    },
    params: params
      ? Object.entries(params).map(([key, col]) => ({
          name: key,
          dataType: col.meta.dataType,
          nullable: col.meta.nullable,
          default: col.meta.default,
        }))
      : undefined,
    returns: returns
      ? Object.entries(returns).map(([key, col]) => ({
          name: key,
          dataType: col.meta.dataType,
          nullable: col.meta.nullable,
        }))
      : undefined,
    query: procedure.meta.query,
  };
}

/**
 * DROP TABLE QueryDef 생성
 */
export function getDropTableQueryDef(table: QueryDefObjectName): DropTableQueryDef {
  return { type: "dropTable", table };
}

/**
 * RENAME TABLE QueryDef 생성
 */
export function getRenameTableQueryDef(
  table: QueryDefObjectName,
  newName: string,
): RenameTableQueryDef {
  return { type: "renameTable", table, newName };
}

/**
 * DROP VIEW QueryDef 생성
 */
export function getDropViewQueryDef(view: QueryDefObjectName): DropViewQueryDef {
  return { type: "dropView", view };
}

/**
 * DROP PROCEDURE QueryDef 생성
 */
export function getDropProcQueryDef(procedure: QueryDefObjectName): DropProcQueryDef {
  return { type: "dropProc", procedure };
}

/**
 * TableBuilder/ViewBuilder를 QueryDefObjectName으로 변환
 *
 * @param db - DbContext 인스턴스
 * @param tableOrView - 테이블 또는 뷰 빌더
 * @returns QueryDef에서 사용할 객체 이름 정보
 */
export function getQueryDefObjectName(
  db: DbContextBase,
  tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>,
): QueryDefObjectName {
  return objClearUndefined({
    database: tableOrView.meta.database ?? db.database,
    schema: tableOrView.meta.schema ?? db.schema,
    name: tableOrView.meta.name,
  });
}
