import type { ColumnPrimitive, DataType } from "./column";
import type { Expr, WhereExpr } from "./expr";

//#region ========== Common ==========

/**
 * DB object name (table, View, Procedure, etc.)
 *
 * DBMS-specific namespaces:
 * - MySQL: `database.name` (schema ignored)
 * - MSSQL: `database.schema.name` (schema defaults to dbo)
 * - PostgreSQL: `schema.name` (database is for connection only)
 */
export interface QueryDefObjectName {
  database?: string;
  schema?: string;
  name: string;
}

//#endregion

//#region ========== DML ==========

/**
 * CUD query OUTPUT clause definition
 *
 * Define return values after INSERT/UPDATE/DELETE
 */
export interface CudOutputDef {
  columns: string[];
  pkColNames: string[];
  aiColName?: string;
}

/**
 * SELECT Query definition
 *
 * @property type - Query type ("select")
 * @property from - FROM clause (table/Subquery)
 * @property as - Table alias
 * @property select - SELECT clause column mapping
 * @property distinct - Whether DISTINCT
 * @property top - TOP N (MSSQL)
 * @property lock - Whether to lock
 * @property where - WHERE condition array
 * @property joins - JOIN definition array
 * @property orderBy - ORDER BY [column, direction] array
 * @property limit - LIMIT [offset, count]
 * @property groupBy - GROUP BY expression array
 * @property having - HAVING condition array
 * @property with - Recursive CTE definition
 */
export interface SelectQueryDef {
  type: "select";
  from?: QueryDefObjectName | SelectQueryDef | SelectQueryDef[] | string;
  as: string;
  select?: Record<string, Expr>;
  distinct?: boolean;
  top?: number;
  lock?: boolean;
  where?: WhereExpr[];
  joins?: SelectQueryDefJoin[];
  orderBy?: [Expr, ("ASC" | "DESC")?][];
  limit?: [number, number];
  groupBy?: Expr[];
  having?: WhereExpr[];
  with?: { name: string; base: SelectQueryDef; recursive: SelectQueryDef };
}

/**
 * JOIN Query definition
 *
 * SelectQueryDef extension + isSingle flag
 */
export interface SelectQueryDefJoin extends SelectQueryDef {
  /** Whether single result (1:1 relation) */
  isSingle?: boolean;
}

/**
 * INSERT Query definition
 *
 * @property records - Record array to insert
 * @property overrideIdentity - Whether to enable IDENTITY_INSERT
 * @property output - OUTPUT clause definition
 */
export interface InsertQueryDef {
  type: "insert";
  table: QueryDefObjectName;
  records: Record<string, ColumnPrimitive>[];
  overrideIdentity?: boolean;
  output?: CudOutputDef;
}

/**
 * Conditional INSERT Query definition
 *
 * Insert only if not exists
 */
export interface InsertIfNotExistsQueryDef {
  type: "insertIfNotExists";
  table: QueryDefObjectName;
  record: Record<string, ColumnPrimitive>;
  existsSelectQuery: SelectQueryDef;
  overrideIdentity?: boolean;
  output?: CudOutputDef;
}

/**
 * INSERT INTO SELECT Query definition
 *
 * Insert subquery results
 */
export interface InsertIntoQueryDef {
  type: "insertInto";
  table: QueryDefObjectName;
  recordsSelectQuery: SelectQueryDef;
  overrideIdentity?: boolean;
  output?: CudOutputDef;
}

/**
 * UPDATE Query definition
 *
 * @property record - Column/value mapping to update
 * @property joins - UPDATE JOIN (when supported)
 */
export interface UpdateQueryDef {
  type: "update";
  table: QueryDefObjectName;
  as: string;
  record: Record<string, Expr>;
  top?: number;
  where?: WhereExpr[];
  joins?: SelectQueryDefJoin[];
  limit?: [number, number];
  output?: CudOutputDef;
}

/**
 * DELETE Query definition
 */
export interface DeleteQueryDef {
  type: "delete";
  table: QueryDefObjectName;
  as: string;
  top?: number;
  where?: WhereExpr[];
  joins?: SelectQueryDefJoin[];
  limit?: [number, number];
  output?: CudOutputDef;
}

/**
 * UPSERT Query definition
 *
 * INSERT or UPDATE (MERGE Pattern)
 */
export interface UpsertQueryDef {
  type: "upsert";
  table: QueryDefObjectName;
  existsSelectQuery: SelectQueryDef;
  insertRecord: Record<string, Expr>;
  updateRecord: Record<string, Expr>;
  overrideIdentity?: boolean;
  output?: CudOutputDef;
}

//#endregion

//#region ========== Utils ==========

/** FK constraint enable/disable */
export interface SwitchFkQueryDef {
  type: "switchFk";
  table: QueryDefObjectName;
  enabled: boolean;
}

//#endregion

//#region ========== DDL - Schema ==========

/** Clear schema (delete all objects) */
export interface ClearSchemaQueryDef {
  type: "clearSchema";
  database: string;
  schema?: string;
}

//#endregion

//#region ========== DDL - Table ==========

/** CREATE TABLE */
export interface CreateTableQueryDef {
  type: "createTable";
  table: QueryDefObjectName;
  columns: {
    name: string;
    dataType: DataType;
    autoIncrement?: boolean;
    nullable?: boolean;
    default?: ColumnPrimitive;
  }[];
  primaryKey?: string[];
}

/** DROP TABLE */
export interface DropTableQueryDef {
  type: "dropTable";
  table: QueryDefObjectName;
}

/** RENAME TABLE */
export interface RenameTableQueryDef {
  type: "renameTable";
  table: QueryDefObjectName;
  newName: string;
}

/** TRUNCATE TABLE */
export interface TruncateQueryDef {
  type: "truncate";
  table: QueryDefObjectName;
}

//#endregion

//#region ========== DDL - Column ==========

/** ADD COLUMN */
export interface AddColumnQueryDef {
  type: "addColumn";
  table: QueryDefObjectName;
  column: {
    name: string;
    dataType: DataType;
    autoIncrement?: boolean;
    nullable?: boolean;
    default?: ColumnPrimitive;
  };
}

/** DROP COLUMN */
export interface DropColumnQueryDef {
  type: "dropColumn";
  table: QueryDefObjectName;
  column: string;
}

/** MODIFY COLUMN (type/property change) */
export interface ModifyColumnQueryDef {
  type: "modifyColumn";
  table: QueryDefObjectName;
  column: {
    name: string;
    dataType: DataType;
    autoIncrement?: boolean;
    nullable?: boolean;
    default?: ColumnPrimitive;
  };
}

/** RENAME COLUMN */
export interface RenameColumnQueryDef {
  type: "renameColumn";
  table: QueryDefObjectName;
  column: string;
  newName: string;
}

//#endregion

//#region ========== DDL - PK/FK/Index ==========

/** DROP PRIMARY KEY */
export interface DropPrimaryKeyQueryDef {
  type: "dropPrimaryKey";
  table: QueryDefObjectName;
}

/** ADD PRIMARY KEY */
export interface AddPrimaryKeyQueryDef {
  type: "addPrimaryKey";
  table: QueryDefObjectName;
  columns: string[];
}

/** ADD FOREIGN KEY */
export interface AddForeignKeyQueryDef {
  type: "addForeignKey";
  table: QueryDefObjectName;
  foreignKey: {
    name: string;
    fkColumns: string[];
    targetTable: QueryDefObjectName;
    targetPkColumns: string[];
  };
}

/** DROP FOREIGN KEY */
export interface DropForeignKeyQueryDef {
  type: "dropForeignKey";
  table: QueryDefObjectName;
  foreignKey: string;
}

/** CREATE INDEX */
export interface AddIndexQueryDef {
  type: "addIndex";
  table: QueryDefObjectName;
  index: {
    name: string;
    columns: { name: string; orderBy: "ASC" | "DESC" }[];
    unique?: boolean;
  };
}

/** DROP INDEX */
export interface DropIndexQueryDef {
  type: "dropIndex";
  table: QueryDefObjectName;
  index: string;
}

//#endregion

//#region ========== DDL - View/Procedure ==========

/** CREATE VIEW */
export interface CreateViewQueryDef {
  type: "createView";
  view: QueryDefObjectName;
  queryDef: SelectQueryDef;
}

/** DROP VIEW */
export interface DropViewQueryDef {
  type: "dropView";
  view: QueryDefObjectName;
}

/** CREATE PROCEDURE */
export interface CreateProcQueryDef {
  type: "createProc";
  procedure: QueryDefObjectName;
  params?: Array<{
    name: string;
    dataType: DataType;
    nullable?: boolean;
    default?: unknown;
  }>;
  returns?: Array<{
    name: string;
    dataType: DataType;
    nullable?: boolean;
  }>;
  query: string;
}

/** DROP PROCEDURE */
export interface DropProcQueryDef {
  type: "dropProc";
  procedure: QueryDefObjectName;
}

/** EXECUTE PROCEDURE */
export interface ExecProcQueryDef {
  type: "execProc";
  procedure: QueryDefObjectName;
  params: Record<string, Expr> | undefined;
}

//#endregion

//#region ========== Meta ==========

/** Check schema existence */
export interface SchemaExistsQueryDef {
  type: "schemaExists";
  database: string;
  schema?: string;
}

//#endregion

//#region ========== DDL type constants ==========

/**
 * DDL QueryDef union (for compile-time validation)
 *
 * @remarks
 * switchFk is excluded because it is not DDL (can be used within transactions)
 */
type DdlQueryDef =
  | ClearSchemaQueryDef
  | CreateTableQueryDef
  | DropTableQueryDef
  | RenameTableQueryDef
  | TruncateQueryDef
  | AddColumnQueryDef
  | DropColumnQueryDef
  | ModifyColumnQueryDef
  | RenameColumnQueryDef
  | DropPrimaryKeyQueryDef
  | AddPrimaryKeyQueryDef
  | AddForeignKeyQueryDef
  | DropForeignKeyQueryDef
  | AddIndexQueryDef
  | DropIndexQueryDef
  | CreateViewQueryDef
  | DropViewQueryDef
  | CreateProcQueryDef
  | DropProcQueryDef;

/**
 * DDL (Data Definition Language) type constants
 *
 * Used for blocking DDL within transactions and DDL type validation
 * Uses satisfies keyword for compile-time synchronization with DdlQueryDef
 *
 * @remarks
 * switchFk is excluded because it is not DDL (can be used within transactions)
 */
export const DDL_TYPES = [
  "clearSchema",
  "createTable",
  "dropTable",
  "renameTable",
  "truncate",
  "addColumn",
  "dropColumn",
  "modifyColumn",
  "renameColumn",
  "dropPrimaryKey",
  "addPrimaryKey",
  "addForeignKey",
  "dropForeignKey",
  "addIndex",
  "dropIndex",
  "createView",
  "dropView",
  "createProc",
  "dropProc",
] as const satisfies readonly DdlQueryDef["type"][];

/** DDL type union */
export type DdlType = (typeof DDL_TYPES)[number];

//#endregion

//#region ========== Combined Union Type ==========

/**
 * All Query definition union type
 *
 * DML (SELECT/INSERT/UPDATE/DELETE/UPSERT) +
 * DDL (Table/Column/PK/FK/Index/View/Procedure) +
 * Utils (SwitchFk) + Meta (SchemaExists)
 *
 * @see {@link SelectQueryDef} SELECT query
 * @see {@link InsertQueryDef} INSERT query
 * @see {@link UpdateQueryDef} UPDATE query
 * @see {@link DeleteQueryDef} DELETE query
 */
export type QueryDef =
  // DML
  | SelectQueryDef
  | InsertQueryDef
  | InsertIfNotExistsQueryDef
  | InsertIntoQueryDef
  | UpdateQueryDef
  | DeleteQueryDef
  | UpsertQueryDef

  // DDL - Schema
  | ClearSchemaQueryDef

  // DDL - Table
  | CreateTableQueryDef
  | DropTableQueryDef
  | RenameTableQueryDef
  | TruncateQueryDef

  // DDL - Column
  | AddColumnQueryDef
  | DropColumnQueryDef
  | ModifyColumnQueryDef
  | RenameColumnQueryDef

  // DDL - PK/FK/Index
  | DropPrimaryKeyQueryDef
  | AddPrimaryKeyQueryDef
  | AddForeignKeyQueryDef
  | DropForeignKeyQueryDef
  | AddIndexQueryDef
  | DropIndexQueryDef

  // DDL - View/Procedure
  | CreateViewQueryDef
  | DropViewQueryDef
  | CreateProcQueryDef
  | DropProcQueryDef
  | ExecProcQueryDef

  // Utils
  | SwitchFkQueryDef

  // Meta
  | SchemaExistsQueryDef;

//#endregion
