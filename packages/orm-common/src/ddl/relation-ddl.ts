import type { ForeignKeyBuilder } from "../schema/factory/relation-builder";
import type { IndexBuilder } from "../schema/factory/index-builder";
import type { TableBuilder } from "../schema/table-builder";
import type {
  QueryDef,
  QueryDefObjectName,
  AddPkQueryDef,
  DropPkQueryDef,
  DropFkQueryDef,
  DropIdxQueryDef,
} from "../types/query-def";
import type { DbContextBase } from "../types/db-context-def";
import { getMatchedPrimaryKeys } from "../exec/queryable";
import { getQueryDefObjectName } from "./table-ddl";

/**
 * DROP PRIMARY KEY QueryDef 생성
 */
export function getDropPkQueryDef(table: QueryDefObjectName): DropPkQueryDef {
  return { type: "dropPk", table };
}

/**
 * ADD PRIMARY KEY QueryDef 생성
 */
export function getAddPkQueryDef(table: QueryDefObjectName, columns: string[]): AddPkQueryDef {
  return { type: "addPk", table, columns };
}

/**
 * ADD FOREIGN KEY QueryDef 생성
 */
export function getAddFkQueryDef(
  db: DbContextBase,
  table: QueryDefObjectName,
  relationName: string,
  relationDef: ForeignKeyBuilder<any, any>,
): QueryDef {
  const targetTable = relationDef.meta.targetFn();
  const fkColumns = relationDef.meta.columns;
  const pk = getMatchedPrimaryKeys(fkColumns, targetTable);

  return {
    type: "addFk",
    table,
    foreignKey: {
      name: `FK_${table.name}_${relationName}`,
      fkColumns,
      targetTable: getQueryDefObjectName(db, targetTable),
      targetPkColumns: pk,
    },
  };
}

/**
 * ADD INDEX QueryDef 생성
 */
export function getAddIdxQueryDef(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): QueryDef {
  const indexMeta = indexBuilder.meta;

  return {
    type: "addIdx",
    table,
    index: {
      name: indexBuilder.meta.name ?? `IDX_${table.name}_${indexMeta.columns.join("_")}`,
      columns: indexMeta.columns.map((col, i) => ({
        name: col,
        orderBy: indexMeta.orderBy?.[i] ?? "ASC",
      })),
      unique: indexMeta.unique,
    },
  };
}

/**
 * DROP FOREIGN KEY QueryDef 생성
 */
export function getDropFkQueryDef(table: QueryDefObjectName, relationName: string): DropFkQueryDef {
  return { type: "dropFk", table, foreignKey: `FK_${table.name}_${relationName}` };
}

/**
 * DROP INDEX QueryDef 생성
 */
export function getDropIdxQueryDef(table: QueryDefObjectName, columns: string[]): DropIdxQueryDef {
  return { type: "dropIdx", table, index: `IDX_${table.name}_${columns.join("_")}` };
}
