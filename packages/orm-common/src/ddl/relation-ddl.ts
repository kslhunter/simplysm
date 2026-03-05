import type { ForeignKeyBuilder } from "../schema/factory/relation-builder";
import type { IndexBuilder } from "../schema/factory/index-builder";
import type {
  QueryDef,
  QueryDefObjectName,
  AddPrimaryKeyQueryDef,
  DropPrimaryKeyQueryDef,
  DropForeignKeyQueryDef,
  DropIndexQueryDef,
} from "../types/query-def";
import type { DbContextBase } from "../types/db-context-def";
import { getMatchedPrimaryKeys } from "../exec/queryable";
import { getQueryDefObjectName } from "./table-ddl";

/**
 * Generate DROP PRIMARY KEY QueryDef
 */
export function getDropPrimaryKeyQueryDef(table: QueryDefObjectName): DropPrimaryKeyQueryDef {
  return { type: "dropPrimaryKey", table };
}

/**
 * Generate ADD PRIMARY KEY QueryDef
 */
export function getAddPrimaryKeyQueryDef(table: QueryDefObjectName, columns: string[]): AddPrimaryKeyQueryDef {
  return { type: "addPrimaryKey", table, columns };
}

/**
 * Generate ADD FOREIGN KEY QueryDef
 */
export function getAddForeignKeyQueryDef(
  db: DbContextBase,
  table: QueryDefObjectName,
  relationName: string,
  relationDef: ForeignKeyBuilder<any, any>,
): QueryDef {
  const targetTable = relationDef.meta.targetFn();
  const fkColumns = relationDef.meta.columns;
  const pk = getMatchedPrimaryKeys(fkColumns, targetTable);

  return {
    type: "addForeignKey",
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
export function getAddIndexQueryDef(
  table: QueryDefObjectName,
  indexBuilder: IndexBuilder<string[]>,
): QueryDef {
  const indexMeta = indexBuilder.meta;

  return {
    type: "addIndex",
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
export function getDropForeignKeyQueryDef(table: QueryDefObjectName, relationName: string): DropForeignKeyQueryDef {
  return { type: "dropForeignKey", table, foreignKey: `FK_${table.name}_${relationName}` };
}

/**
 * DROP INDEX QueryDef Generate
 */
export function getDropIndexQueryDef(table: QueryDefObjectName, columns: string[]): DropIndexQueryDef {
  return { type: "dropIndex", table, index: `IDX_${table.name}_${columns.join("_")}` };
}
