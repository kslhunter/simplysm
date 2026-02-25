import type { ForeignKeyBuilder } from "../schema/factory/relation-builder";
import type { IndexBuilder } from "../schema/factory/index-builder";
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
 * Generate DROP PRIMARY KEY QueryDef
 */
export function getDropPkQueryDef(table: QueryDefObjectName): DropPkQueryDef {
  return { type: "dropPk", table };
}

/**
 * Generate ADD PRIMARY KEY QueryDef
 */
export function getAddPkQueryDef(table: QueryDefObjectName, columns: string[]): AddPkQueryDef {
  return { type: "addPk", table, columns };
}

/**
 * Generate ADD FOREIGN KEY QueryDef
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
 * ADD INDEX QueryDef Generate
 */
export function getAddIdxQueryDef(
  table: QueryDefObjectName,
  indexBuilder: IndexBuilder<string[]>,
): QueryDef {
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
 * DROP FOREIGN KEY QueryDef Generate
 */
export function getDropFkQueryDef(table: QueryDefObjectName, relationName: string): DropFkQueryDef {
  return { type: "dropFk", table, foreignKey: `FK_${table.name}_${relationName}` };
}

/**
 * DROP INDEX QueryDef Generate
 */
export function getDropIdxQueryDef(table: QueryDefObjectName, columns: string[]): DropIdxQueryDef {
  return { type: "dropIdx", table, index: `IDX_${table.name}_${columns.join("_")}` };
}
