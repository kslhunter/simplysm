import type { ColumnBuilder } from "../schema/factory/column-builder";
import type {
  QueryDefObjectName,
  AddColumnQueryDef,
  DropColumnQueryDef,
  ModifyColumnQueryDef,
  RenameColumnQueryDef,
} from "../types/query-def";

/**
 * ADD COLUMN QueryDef 생성
 */
export function getAddColumnQueryDef(
  table: QueryDefObjectName,
  columnName: string,
  column: ColumnBuilder<any, any>,
): AddColumnQueryDef {
  return {
    type: "addColumn",
    table,
    column: {
      name: columnName,
      dataType: column.meta.dataType,
      autoIncrement: column.meta.autoIncrement,
      nullable: column.meta.nullable,
      default: column.meta.default,
    },
  };
}

/**
 * DROP COLUMN QueryDef 생성
 */
export function getDropColumnQueryDef(table: QueryDefObjectName, column: string): DropColumnQueryDef {
  return { type: "dropColumn", table, column };
}

/**
 * MODIFY COLUMN QueryDef 생성
 */
export function getModifyColumnQueryDef(
  table: QueryDefObjectName,
  columnName: string,
  column: ColumnBuilder<any, any>,
): ModifyColumnQueryDef {
  return {
    type: "modifyColumn",
    table,
    column: {
      name: columnName,
      dataType: column.meta.dataType,
      autoIncrement: column.meta.autoIncrement,
      nullable: column.meta.nullable,
      default: column.meta.default,
    },
  };
}

/**
 * RENAME COLUMN QueryDef 생성
 */
export function getRenameColumnQueryDef(
  table: QueryDefObjectName,
  column: string,
  newName: string,
): RenameColumnQueryDef {
  return { type: "renameColumn", table, column, newName };
}
