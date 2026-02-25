import type {
  QueryDefObjectName,
  ClearSchemaQueryDef,
  SchemaExistsQueryDef,
  TruncateQueryDef,
  SwitchFkQueryDef,
} from "../types/query-def";

/**
 * Generate CLEAR SCHEMA QueryDef
 */
export function getClearSchemaQueryDef(params: {
  database: string;
  schema?: string;
}): ClearSchemaQueryDef {
  return { type: "clearSchema", database: params.database, schema: params.schema };
}

/**
 * Generate SCHEMA EXISTS QueryDef
 */
export function getSchemaExistsQueryDef(database: string, schema?: string): SchemaExistsQueryDef {
  return { type: "schemaExists", database, schema };
}

/**
 * Generate TRUNCATE TABLE QueryDef
 */
export function getTruncateQueryDef(table: QueryDefObjectName): TruncateQueryDef {
  return { type: "truncate", table };
}

/**
 * Generate SWITCH FK QueryDef
 */
export function getSwitchFkQueryDef(
  table: QueryDefObjectName,
  switch_: "on" | "off",
): SwitchFkQueryDef {
  return { type: "switchFk", table, switch: switch_ };
}
