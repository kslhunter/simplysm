# `QueryDef`

> **읽어야 하는 상황**: SQL AST 구조를 이해하거나, 커스텀 QueryBuilder를 구현할 때. 일반 쿼리 실행에서는 `Queryable`이 자동 생성하므로 직접 참조할 일이 드물다.

SQL AST 정의 타입 모음. `Queryable`이 내부적으로 생성하며, `QueryBuilderBase.build(def)`에 전달되어 SQL 문자열로 변환된다.

## `QueryDef`

모든 쿼리 정의의 유니온 타입.

```typescript
export type QueryDef =
  | SelectQueryDef
  | InsertQueryDef
  | InsertIfNotExistsQueryDef
  | InsertIntoQueryDef
  | UpdateQueryDef
  | DeleteQueryDef
  | UpsertQueryDef
  | SwitchFkQueryDef
  | CreateTableQueryDef
  | DropTableQueryDef
  | RenameTableQueryDef
  | TruncateQueryDef
  | AddColumnQueryDef
  | DropColumnQueryDef
  | ModifyColumnQueryDef
  | RenameColumnQueryDef
  | AddPrimaryKeyQueryDef
  | DropPrimaryKeyQueryDef
  | AddForeignKeyQueryDef
  | DropForeignKeyQueryDef
  | AddIndexQueryDef
  | DropIndexQueryDef
  | CreateViewQueryDef
  | DropViewQueryDef
  | CreateProcQueryDef
  | DropProcQueryDef
  | ExecProcQueryDef
  | ClearSchemaQueryDef
  | SchemaExistsQueryDef;
```

## `QueryDefObjectName`

DB 객체 이름 (테이블, 뷰, 프로시저 등).

```typescript
export interface QueryDefObjectName {
  database?: string;
  schema?: string;
  name: string;
}
```

DBMS별 네임스페이스 처리:
- MySQL: `database.name` (schema 무시)
- MSSQL: `database.schema.name` (schema 기본값 dbo)
- PostgreSQL: `schema.name` (database는 연결용)

## DML 쿼리 정의

### `SelectQueryDef`

```typescript
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
```

### `SelectQueryDefJoin`

```typescript
export interface SelectQueryDefJoin extends SelectQueryDef {
  isSingle?: boolean;
}
```

### `InsertQueryDef`

```typescript
export interface InsertQueryDef {
  type: "insert";
  table: QueryDefObjectName;
  records: Record<string, ColumnPrimitive>[];
  overrideIdentity?: boolean;
  output?: CudOutputDef;
}
```

### `InsertIfNotExistsQueryDef`

```typescript
export interface InsertIfNotExistsQueryDef {
  type: "insertIfNotExists";
  table: QueryDefObjectName;
  record: Record<string, ColumnPrimitive>;
  existsSelectQuery: SelectQueryDef;
  overrideIdentity?: boolean;
  output?: CudOutputDef;
}
```

### `InsertIntoQueryDef`

```typescript
export interface InsertIntoQueryDef {
  type: "insertInto";
  table: QueryDefObjectName;
  recordsSelectQuery: SelectQueryDef;
  overrideIdentity?: boolean;
  output?: CudOutputDef;
}
```

### `UpdateQueryDef`

```typescript
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
```

### `DeleteQueryDef`

```typescript
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
```

### `UpsertQueryDef`

```typescript
export interface UpsertQueryDef {
  type: "upsert";
  table: QueryDefObjectName;
  existsSelectQuery: SelectQueryDef;
  insertRecord: Record<string, Expr>;
  updateRecord: Record<string, Expr>;
  overrideIdentity?: boolean;
  output?: CudOutputDef;
}
```

## `CudOutputDef`

INSERT/UPDATE/DELETE 후 반환값 정의 (OUTPUT 절).

```typescript
export interface CudOutputDef {
  columns: string[];
  pkColNames: string[];
  aiColName?: string;
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `columns` | `string[]` | 반환할 컬럼 이름 배열 |
| `pkColNames` | `string[]` | PK 컬럼 이름 배열 |
| `aiColName` | `string \| undefined` | AUTO_INCREMENT 컬럼 이름 |

## DDL 쿼리 정의

| 인터페이스 | `type` 값 | 설명 |
|------------|-----------|------|
| `CreateTableQueryDef` | `"createTable"` | CREATE TABLE |
| `DropTableQueryDef` | `"dropTable"` | DROP TABLE |
| `RenameTableQueryDef` | `"renameTable"` | RENAME TABLE |
| `TruncateQueryDef` | `"truncate"` | TRUNCATE TABLE |
| `AddColumnQueryDef` | `"addColumn"` | ADD COLUMN |
| `DropColumnQueryDef` | `"dropColumn"` | DROP COLUMN |
| `ModifyColumnQueryDef` | `"modifyColumn"` | MODIFY/ALTER COLUMN |
| `RenameColumnQueryDef` | `"renameColumn"` | RENAME COLUMN |
| `AddPrimaryKeyQueryDef` | `"addPrimaryKey"` | ADD PRIMARY KEY |
| `DropPrimaryKeyQueryDef` | `"dropPrimaryKey"` | DROP PRIMARY KEY |
| `AddForeignKeyQueryDef` | `"addForeignKey"` | ADD FOREIGN KEY |
| `DropForeignKeyQueryDef` | `"dropForeignKey"` | DROP FOREIGN KEY |
| `AddIndexQueryDef` | `"addIndex"` | ADD INDEX |
| `DropIndexQueryDef` | `"dropIndex"` | DROP INDEX |
| `CreateViewQueryDef` | `"createView"` | CREATE VIEW |
| `DropViewQueryDef` | `"dropView"` | DROP VIEW |
| `CreateProcQueryDef` | `"createProc"` | CREATE PROCEDURE |
| `DropProcQueryDef` | `"dropProc"` | DROP PROCEDURE |
| `ExecProcQueryDef` | `"execProc"` | EXEC PROCEDURE |
| `ClearSchemaQueryDef` | `"clearSchema"` | 스키마 내 모든 객체 제거 |
| `SchemaExistsQueryDef` | `"schemaExists"` | 스키마 존재 여부 확인 |
| `SwitchFkQueryDef` | `"switchFk"` | FK 제약조건 활성화/비활성화 |

## `DDL_TYPES` / `DdlType`

DDL 타입 문자열 목록 및 유니온 타입. `DbContext.executeDefs()` 내부에서 트랜잭션 중 DDL 실행 차단에 사용된다.

```typescript
export const DDL_TYPES: readonly string[];
export type DdlType = typeof DDL_TYPES[number];
```
