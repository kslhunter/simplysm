import type { Expr, WhereExpr } from "../expr/expr.types";

// ============================================
// 공통 타입
// ============================================

export interface TableName {
  database?: string;
  schema?: string;
  name: string;
}

/*export interface QueryColumnDef {
  name: string;
  dataType: string;
  autoIncrement?: boolean;
  nullable?: boolean;
}*/

// ============================================
// DML - SELECT
// ============================================

export interface SelectQuery {
  from?: TableName | SelectQuery | SelectQuery[];
  as?: string;
  select?: Record<string, Expr>;
  join?: JoinQueryDef[];
  where?: WhereExpr[];
  distinct?: boolean;
  top?: number;
  groupBy?: Expr[];
  having?: WhereExpr[];
  orderBy?: [Expr, "ASC" | "DESC"][];
  limit?: [number, number];
  pivot?: PivotDef;
  unpivot?: UnpivotDef;
  lock?: boolean;
  sample?: number;
  isCustomSelect?: boolean;
}

/**
 * PIVOT 정의
 * - pivotColumn: PIVOT 기준 컬럼 (예: month)
 * - valueColumn: 집계할 값 컬럼 (예: amount)
 * - aggregateExpr: 집계 표현식 (Expr로 받아 SUM(A)+5 같은 복잡한 경우도 대응, ExprRaw 사용 가능)
 * - pivotValues: PIVOT할 값 목록 (예: ['Jan', 'Feb', 'Mar'])
 * - defaultValue: NULL일 때 기본값 (선택)
 */
export interface PivotDef {
  pivotColumn: Expr;
  valueColumn: Expr;
  aggregateExpr: Expr;
  pivotValues: string[];
  defaultValue?: Expr;
}

/**
 * UNPIVOT 정의
 * - valueColumnName: UNPIVOT 후 생성될 값 컬럼 이름 (예: "amount")
 * - keyColumnName: UNPIVOT 후 생성될 키 컬럼 이름 (예: "month")
 * - sourceColumns: UNPIVOT 대상 컬럼들 (예: ["Jan", "Feb", "Mar"])
 */
export interface UnpivotDef {
  valueColumnName: string;
  keyColumnName: string;
  sourceColumns: string[];
}

export interface JoinQueryDef extends SelectQuery {
  from: string | SelectQuery | SelectQuery[];
  as: string;
  isSingle: boolean;
}

// ============================================
// DML - INSERT
// ============================================

export interface InsertQueryDef {
  from: TableName;
  records: Record<string, Expr>[]; // key는 unwrapped column name
  output?: string[]; // unwrapped column names
  pkColNames?: string[]; // unwrapped column names
  aiColName?: string; // unwrapped column name
  disableFkCheck?: boolean; // FK 체크 비활성화 옵션
}

// ============================================
// DML - UPDATE
// ============================================

export interface UpdateQueryDef {
  from: TableName;
  as: string; // unwrapped alias
  record: Record<string, Expr>; // key는 unwrapped column name
  join?: JoinQueryDef[];
  where?: WhereExpr[];
  output?: string[]; // unwrapped column names
  top?: number;
  disableFkCheck?: boolean; // FK 체크 비활성화 옵션
}

// ============================================
// DML - DELETE
// ============================================

export interface DeleteQueryDef {
  from: TableName;
  as: string; // unwrapped alias
  join?: JoinQueryDef[];
  where?: WhereExpr[];
  output?: string[]; // unwrapped column names
  top?: number;
  disableFkCheck?: boolean; // FK 체크 비활성화 옵션
}

// ============================================
// DML - UPSERT
// ============================================

export interface UpsertQueryDef {
  from: TableName;
  as: string; // unwrapped alias
  updateRecord: Record<string, Expr>; // key는 unwrapped column name
  insertRecord: Record<string, Expr>; // key는 unwrapped column name
  where: WhereExpr[];
  output?: string[]; // unwrapped column names
  pkColNames: string[]; // unwrapped column names
  aiColName?: string; // unwrapped column name
}

// ============================================
// DML - INSERT INTO (SELECT INTO)
// ============================================

export interface InsertIntoQueryDef {
  target: TableName;
  from?: string | TableName | SelectQuery | SelectQuery[];
  as?: string;
  select: Record<string, Expr>; // key는 unwrapped column name
  join?: JoinQueryDef[];
  where?: WhereExpr[];
  distinct?: boolean;
  groupBy?: Expr[];
  having?: WhereExpr[];
  orderBy?: [Expr, "ASC" | "DESC"][];
  stopAutoIdentity?: boolean; // IDENTITY_INSERT 옵션 (MSSQL)
}

// ============================================
// DML - INSERT IF NOT EXISTS
// ============================================

export interface InsertIfNotExistsQueryDef {
  from: TableName;
  as: string; // unwrapped alias
  insertRecord: Record<string, Expr>; // key는 unwrapped column name
  where: WhereExpr[];
  output?: string[]; // unwrapped column names
  pkColNames?: string[]; // unwrapped column names
  aiColName?: string; // unwrapped column name
}

// ============================================
// DDL - Database
// ============================================

export interface CreateDatabaseQueryDef {
  database: string;
}

export interface ClearDatabaseQueryDef {
  database: string;
}

// ============================================
// DDL - Table
// ============================================

export interface TruncateTableQueryDef {
  table: TableName;
}

export interface CreateTableQueryDef {
  table: TableName;
  columns: (QueryColumnDef & { defaultValue?: Expr })[];
  primaryKeys: { columnName: string; orderBy: "ASC" | "DESC" }[];
}

// ============================================
// DDL - Foreign Key
// ============================================

export interface AddForeignKeyQueryDef {
  table: TableName;
  foreignKey: {
    name: string;
    fkColumns: string[];
    targetTable: TableName;
    targetPkColumns: string[];
  };
}

// ============================================
// DDL - Index
// ============================================

export interface CreateIndexQueryDef {
  table: TableName;
  index: {
    name: string;
    columns: { name: string; orderBy: "ASC" | "DESC"; unique: boolean }[];
  };
}

// ============================================
// DDL - View
// ============================================

export interface CreateViewQueryDef {
  view: TableName;
  query: string;
}

// ============================================
// DDL - Procedure
// ============================================

export interface CreateProcedureQueryDef {
  procedure: TableName;
  query: string;
}

export interface ExecuteProcedureQueryDef {
  procedure: TableName;
  params?: Record<string, Expr>;
}

// ============================================
// Meta - Database
// ============================================

export interface GetDatabaseInfoDef {
  database: string;
}

// ============================================
// Meta - Table
// ============================================

export interface GetTableInfosDef {
  database?: string;
  schema?: string;
}

export interface GetTableInfoDef {
  table: TableName;
}

export interface GetTableColumnInfosDef {
  table: TableName;
}

export interface GetTablePrimaryKeysDef {
  table: TableName;
}

export interface GetTableForeignKeysDef {
  table: TableName;
}

export interface GetTableIndexesDef {
  table: TableName;
}

// ============================================
// Query Result Parse Option
// ============================================

export interface QueryResultParseOption {
  columns?: Record<string, { dataType: string }>;
  joins?: Record<string, { isSingle: boolean }>;
}
