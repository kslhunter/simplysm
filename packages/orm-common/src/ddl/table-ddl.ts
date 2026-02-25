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
 * Builder를 CREATE QueryDef로 Transform
 *
 * @param db - DbContext instance
 * @param builder - Table/View/Procedure builder
 * @returns CREATE TABLE/VIEW/PROCEDURE QueryDef
 * @throws {Error} When unknown builder type
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

  throw new Error(`Unknown builder type: ${typeof builder}`);
}

/**
 * CREATE TABLE QueryDef Generate
 *
 * @param db - DbContext instance
 * @param table - Table builder
 * @returns CREATE TABLE QueryDef
 * @throws {Error} When table has no columns
 */
export function getCreateTableQueryDef(db: DbContextBase, table: TableBuilder<any, any>): QueryDef {
  const columns = table.meta.columns as ColumnBuilderRecord | undefined;
  if (columns == null) {
    throw new Error(`Table '${table.meta.name}' has no columns.`);
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
 * CREATE VIEW QueryDef Generate
 *
 * @param db - DbContext instance
 * @param view - View builder
 * @returns CREATE VIEW QueryDef
 * @throws {Error} When view has no viewFn
 */
export function getCreateViewQueryDef(
  db: DbContextBase,
  view: ViewBuilder<any, any, any>,
): QueryDef {
  if (view.meta.viewFn == null) {
    throw new Error(`View '${view.meta.name}' has no viewFn.`);
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
 * CREATE PROCEDURE QueryDef Generate
 *
 * @param db - DbContext instance
 * @param procedure - Procedure builder
 * @returns CREATE PROCEDURE QueryDef
 * @throws {Error} When procedure has no body
 */
export function getCreateProcQueryDef(
  db: DbContextBase,
  procedure: ProcedureBuilder<any, any>,
): QueryDef {
  if (procedure.meta.query == null) {
    throw new Error(`Procedure '${procedure.meta.name}' has no body.`);
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
 * DROP TABLE QueryDef Generate
 */
export function getDropTableQueryDef(table: QueryDefObjectName): DropTableQueryDef {
  return { type: "dropTable", table };
}

/**
 * RENAME TABLE QueryDef Generate
 */
export function getRenameTableQueryDef(
  table: QueryDefObjectName,
  newName: string,
): RenameTableQueryDef {
  return { type: "renameTable", table, newName };
}

/**
 * DROP VIEW QueryDef Generate
 */
export function getDropViewQueryDef(view: QueryDefObjectName): DropViewQueryDef {
  return { type: "dropView", view };
}

/**
 * DROP PROCEDURE QueryDef Generate
 */
export function getDropProcQueryDef(procedure: QueryDefObjectName): DropProcQueryDef {
  return { type: "dropProc", procedure };
}

/**
 * Transform TableBuilder/ViewBuilder to QueryDefObjectName
 *
 * @param db - DbContext instance
 * @param tableOrView - Table or View builder
 * @returns Object name information for use in QueryDef
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
