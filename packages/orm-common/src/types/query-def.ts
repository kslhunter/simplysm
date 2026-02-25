import type { ColumnPrimitive, DataType } from "./column";
import type { Expr, WhereExpr } from "./expr";

//#region ========== 공통 ==========

/**
 * DB object 이름 (table, View, Procedure 등)
 *
 * DBMS별 네임스페이스:
 * - MySQL: `database.name` (schema 무시)
 * - MSSQL: `database.schema.name` (schema Default value: dbo)
 * - PostgreSQL: `schema.name` (database는 connection용)
 */
export interface QueryDefObjectName {
  database?: string;
  schema?: string;
  name: string;
}

//#endregion

//#region ========== DML ==========

/**
 * CUD query의 OUTPUT 절 definition
 *
 * INSERT/UPDATE/DELETE 후 반환값 definition
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
 * @property from - FROM 절 (table/Subquery)
 * @property as - Table 별칭
 * @property select - SELECT 절 컬럼 Mapping
 * @property distinct - DISTINCT 여부
 * @property top - TOP N (MSSQL)
 * @property lock - 락 여부
 * @property where - WHERE condition array
 * @property joins - JOIN definition array
 * @property orderBy - ORDER BY [컬럼, 방향] array
 * @property limit - LIMIT [offset, count]
 * @property groupBy - GROUP BY expression array
 * @property having - HAVING condition array
 * @property with - recursive CTE definition
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
 * SelectQueryDef 확장 + isSingle flag
 */
export interface SelectQueryDefJoin extends SelectQueryDef {
  /** 단일 result 여부 (1:1 relationship) */
  isSingle?: boolean;
}

/**
 * INSERT Query definition
 *
 * @property records - Insert할 레코드 array
 * @property overrideIdentity - IDENTITY_INSERT Enable 여부
 * @property output - OUTPUT 절 definition
 */
export interface InsertQueryDef {
  type: "insert";
  table: QueryDefObjectName;
  records: Record<string, ColumnPrimitive>[];
  overrideIdentity?: boolean;
  output?: CudOutputDef;
}

/**
 * 조건부 INSERT Query definition
 *
 * 존재하지 않는 경우에만 삽입
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
 * Subquery 결과를 삽입
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
 * @property record - Update할 컬럼/value Mapping
 * @property joins - UPDATE JOIN (지원 시)
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

/** FK constraint Enable/Disable */
export interface SwitchFkQueryDef {
  type: "switchFk";
  table: QueryDefObjectName;
  switch: "on" | "off";
}

//#endregion

//#region ========== DDL - Schema ==========

/** Clear schema (모든 object Delete) */
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

/** MODIFY COLUMN (type/property Change) */
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
export interface DropPkQueryDef {
  type: "dropPk";
  table: QueryDefObjectName;
}

/** ADD PRIMARY KEY */
export interface AddPkQueryDef {
  type: "addPk";
  table: QueryDefObjectName;
  columns: string[];
}

/** ADD FOREIGN KEY */
export interface AddFkQueryDef {
  type: "addFk";
  table: QueryDefObjectName;
  foreignKey: {
    name: string;
    fkColumns: string[];
    targetTable: QueryDefObjectName;
    targetPkColumns: string[];
  };
}

/** DROP FOREIGN KEY */
export interface DropFkQueryDef {
  type: "dropFk";
  table: QueryDefObjectName;
  foreignKey: string;
}

/** CREATE INDEX */
export interface AddIdxQueryDef {
  type: "addIdx";
  table: QueryDefObjectName;
  index: {
    name: string;
    columns: { name: string; orderBy: "ASC" | "DESC" }[];
    unique?: boolean;
  };
}

/** DROP INDEX */
export interface DropIdxQueryDef {
  type: "dropIdx";
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

//#region ========== DDL type 상수 ==========

/**
 * DDL QueryDef union (컴파일 타임 Validation용)
 *
 * @remarks
 * switchFk는 DDL이 아니므로 exclude (transaction 내 사용 가능)
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
  | DropPkQueryDef
  | AddPkQueryDef
  | AddFkQueryDef
  | DropFkQueryDef
  | AddIdxQueryDef
  | DropIdxQueryDef
  | CreateViewQueryDef
  | DropViewQueryDef
  | CreateProcQueryDef
  | DropProcQueryDef;

/**
 * DDL (Data Definition Language) type 상수
 *
 * Transaction 내 DDL 차단 및 DDL type Validation에 사용
 * satisfies 키워드로 DdlQueryDef와의 synchronous화를 컴파일 타임에 Validation
 *
 * @remarks
 * switchFk는 DDL이 아니므로 exclude (transaction 내 사용 가능)
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
  "dropPk",
  "addPk",
  "addFk",
  "dropFk",
  "addIdx",
  "dropIdx",
  "createView",
  "dropView",
  "createProc",
  "dropProc",
] as const satisfies readonly DdlQueryDef["type"][];

/** DDL type union */
export type DdlType = (typeof DDL_TYPES)[number];

//#endregion

//#region ========== 통합 Union Type ==========

/**
 * 모든 Query definition union type
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
  | DropPkQueryDef
  | AddPkQueryDef
  | AddFkQueryDef
  | DropFkQueryDef
  | AddIdxQueryDef
  | DropIdxQueryDef

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
