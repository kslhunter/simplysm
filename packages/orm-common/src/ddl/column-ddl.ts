import type { ColumnBuilder } from "../schema/factory/column-builder";
import type {
  QueryDefObjectName,
  AddColumnQueryDef,
  DropColumnQueryDef,
  ModifyColumnQueryDef,
  RenameColumnQueryDef,
} from "../types/query-def";

/**
 * Generate ADD COLUMN QueryDef
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
 * Generate DROP COLUMN QueryDef
 */
export function getDropColumnQueryDef(
  table: QueryDefObjectName,
  column: string,
): DropColumnQueryDef {
  return { type: "dropColumn", table, column };
}

/**
 * Generate MODIFY COLUMN QueryDef
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
 * Generate RENAME COLUMN QueryDef
 */
export function getRenameColumnQueryDef(
  table: QueryDefObjectName,
  column: string,
  newName: string,
): RenameColumnQueryDef {
  return { type: "renameColumn", table, column, newName };
}
