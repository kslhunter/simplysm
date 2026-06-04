import type { ColumnPrimitive, DataType } from "./column";
import type { Expr, WhereExpr } from "./expr";

//#region ========== Common ==========

/**
 * DB 객체 이름 (table, View, Procedure 등)
 *
 * DBMS별 네임스페이스:
 * - MySQL: `database.name` (schema 무시)
 * - MSSQL: `database.schema.name` (schema 기본값 dbo)
 * - PostgreSQL: `schema.name` (database는 연결용)
 */
export interface QueryDefObjectName {
  database?: string;
  schema?: string;
  name: string;
}

//#endregion

//#region ========== DML ==========

/**
 * CUD query OUTPUT 절 정의
 *
 * INSERT/UPDATE/DELETE 후 반환값 정의
 */
export interface CudOutputDef {
  columns: string[];
  pkColNames: string[];
  aiColName?: string;
}

/**
 * SELECT query 정의
 *
 * @property type - Query 타입 ("select")
 * @property from - FROM 절 (table/subquery)
 * @property as - Table alias
 * @property select - SELECT 절 column 매핑
 * @property distinct - DISTINCT 여부
 * @property top - TOP N (MSSQL)
 * @property lock - 잠금 여부
 * @property where - WHERE 조건 배열
 * @property joins - JOIN 정의 배열
 * @property orderBy - ORDER BY [column, direction] 배열
 * @property limit - LIMIT [offset, count]
 * @property groupBy - GROUP BY expression 배열
 * @property having - HAVING 조건 배열
 * @property with - 재귀 CTE 정의
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
 * JOIN query 정의
 *
 * SelectQueryDef 확장 + isSingle 플래그
 */
export interface SelectQueryDefJoin extends SelectQueryDef {
  /** 단일 결과 여부 (1:1 관계) */
  isSingle?: boolean;
}

/**
 * INSERT query 정의
 *
 * @property records - 삽입할 레코드 배열
 * @property overrideIdentity - IDENTITY_INSERT 활성화 여부
 * @property aiColName - AI(auto-increment) 컬럼명. PostgreSQL에서 명시값 삽입 후 시퀀스 보정에 사용
 * @property output - OUTPUT 절 정의
 */
export interface InsertQueryDef {
  type: "insert";
  table: QueryDefObjectName;
  records: Record<string, ColumnPrimitive>[];
  overrideIdentity?: boolean;
  aiColName?: string;
  output?: CudOutputDef;
}

/**
 * 조건부 INSERT query 정의
 *
 * 존재하지 않을 때만 삽입
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
 * INSERT INTO SELECT query 정의
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
 * UPDATE query 정의
 *
 * @property record - 갱신할 column/값 매핑
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
 * DELETE query 정의
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
 * UPSERT query 정의
 *
 * INSERT 또는 UPDATE (MERGE 패턴)
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

/** FK 제약조건 활성화/비활성화 */
export interface SwitchFkQueryDef {
  type: "switchFk";
  table: QueryDefObjectName;
  enabled: boolean;
}

//#endregion

//#region ========== DDL - Schema ==========

/** Schema 초기화 (모든 객체 삭제) */
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

/** MODIFY COLUMN (타입/속성 변경) */
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

/** Schema 존재 여부 확인 */
export interface SchemaExistsQueryDef {
  type: "schemaExists";
  database: string;
  schema?: string;
}

//#endregion

//#region ========== DDL 타입 상수 ==========

/**
 * DDL QueryDef union (컴파일 타임 검증용)
 *
 * @remarks
 * switchFk는 DDL이 아니므로 제외 (트랜잭션 내에서 사용 가능)
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
 * DDL (Data Definition Language) 타입 상수
 *
 * 트랜잭션 내 DDL 차단 및 DDL 타입 검증에 사용
 * DdlQueryDef와의 컴파일 타임 동기화를 위해 satisfies 키워드 사용
 *
 * @remarks
 * switchFk는 DDL이 아니므로 제외 (트랜잭션 내에서 사용 가능)
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

/** DDL 타입 union */
export type DdlType = (typeof DDL_TYPES)[number];

//#endregion

//#region ========== 결합 Union 타입 ==========

/**
 * 전체 query 정의 union 타입
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
