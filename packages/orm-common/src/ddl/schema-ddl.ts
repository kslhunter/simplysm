import type {
  QueryDefObjectName,
  ClearSchemaQueryDef,
  SchemaExistsQueryDef,
  TruncateQueryDef,
  SwitchFkQueryDef,
} from "../types/query-def";

/**
 * CLEAR SCHEMA QueryDef 생성
 */
export function getClearSchemaQueryDef(params: {
  database: string;
  schema?: string;
}): ClearSchemaQueryDef {
  return { type: "clearSchema", database: params.database, schema: params.schema };
}

/**
 * SCHEMA EXISTS QueryDef 생성
 */
export function getSchemaExistsQueryDef(database: string, schema?: string): SchemaExistsQueryDef {
  return { type: "schemaExists", database, schema };
}

/**
 * TRUNCATE TABLE QueryDef 생성
 */
export function getTruncateQueryDef(table: QueryDefObjectName): TruncateQueryDef {
  return { type: "truncate", table };
}

/**
 * SWITCH FK QueryDef 생성
 */
export function getSwitchFkQueryDef(
  table: QueryDefObjectName,
  switch_: "on" | "off",
): SwitchFkQueryDef {
  return { type: "switchFk", table, switch: switch_ };
}
