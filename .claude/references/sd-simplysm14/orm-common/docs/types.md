# Types

## `Dialect`

지원하는 Database dialect.

```typescript
export type Dialect = "mysql" | "mssql" | "postgresql";
```

- `mysql`: MySQL 8.0.14+
- `mssql`: Microsoft SQL Server 2012+
- `postgresql`: PostgreSQL 9.0+

## `dialects`

모든 Dialect 목록 배열. 테스트에서 dialect별 검증에 사용.

```typescript
export const dialects: Dialect[] = ["mysql", "mssql", "postgresql"];
```

## `IsolationLevel`

트랜잭션 격리 수준.

```typescript
export type IsolationLevel = "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE";
```

| Value | Description |
|-------|-------------|
| `READ_UNCOMMITTED` | 커밋되지 않은 데이터 읽기 가능 (Dirty Read) |
| `READ_COMMITTED` | 커밋된 데이터만 읽기 (기본값) |
| `REPEATABLE_READ` | 동일 query가 동일 결과 반환 보장 |
| `SERIALIZABLE` | 완전 직렬화 (가장 엄격) |

## `DataRecord`

쿼리 결과 데이터 레코드 타입. 재귀적 구조로 중첩 관계(include) 결과를 표현한다.

```typescript
export type DataRecord = {
  [key: string]: ColumnPrimitive | DataRecord | DataRecord[];
};
```

## `DbContextExecutor`

실제 DB 연결과 쿼리 실행을 담당하는 인터페이스. `orm-node`의 `NodeDbContextExecutor` 또는 서비스 클라이언트 구현으로 제공한다.

```typescript
export interface DbContextExecutor {
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
}
```

| Method | Description |
|--------|-------------|
| `connect()` | DB 연결 수립 |
| `close()` | DB 연결 종료 |
| `beginTransaction(isolationLevel?)` | 트랜잭션 시작 |
| `commitTransaction()` | 트랜잭션 커밋 |
| `rollbackTransaction()` | 트랜잭션 롤백 |
| `executeDefs(defs, resultMetas?)` | QueryDef 배열 실행 |

## `QueryBuildResult`

`QueryBuilder.build()` 반환 타입.

```typescript
export interface QueryBuildResult {
  sql: string;
  resultSetIndex?: number;
  resultSetStride?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sql` | `string` | 빌드된 SQL 문자열 |
| `resultSetIndex` | `number \| undefined` | 결과를 가져올 결과 셋 index (기본값: 0) |
| `resultSetStride` | `number \| undefined` | 다중 결과에서 N번째마다 결과 셋 추출 |

## `ResultMeta`

SELECT 결과를 TypeScript 객체로 변환할 때 사용하는 메타데이터.

```typescript
export interface ResultMeta {
  columns: Record<string, ColumnPrimitiveStr>;
  joins: Record<string, { isSingle: boolean }>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `columns` | `Record<string, ColumnPrimitiveStr>` | Column 이름 -> 타입 문자열 매핑 |
| `joins` | `Record<string, { isSingle: boolean }>` | JOIN alias -> 단일/배열 구분 |

## `Migration`

Database migration 정의. Schema 변경을 버전 관리한다.

```typescript
export interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 고유 Migration 이름 (타임스탬프 권장) |
| `up` | `(db) => Promise<void>` | Migration 실행 함수 |

## `parseQueryResult`

DB 쿼리 결과를 TypeScript 객체로 변환한다. 타입 파싱 + JOIN 결과 중첩을 처리한다.

```typescript
export async function parseQueryResult<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined>;
```

- meta 필수: meta 없이는 이 함수를 호출할 필요 없음 (입력 = 출력)
- 빈 결과 처리: 입력 배열이 비어있거나 파싱 후 모든 레코드가 빈 객체이면 undefined 반환
- async 전용: 대규모 처리 시 이벤트 루프 양보 (100건마다)
- JOIN 있음: Map 기반 그룹핑으로 O(n) 복잡도

## `DataType`

SQL 데이터 타입 정의. discriminated union으로 `type` 필드로 분기한다.

```typescript
export type DataType =
  | { type: "int" }
  | { type: "bigint" }
  | { type: "float" }
  | { type: "double" }
  | { type: "decimal"; precision: number; scale?: number }
  | { type: "varchar"; length: number }
  | { type: "char"; length: number }
  | { type: "text" }
  | { type: "binary" }
  | { type: "boolean" }
  | { type: "datetime" }
  | { type: "date" }
  | { type: "time" }
  | { type: "uuid" };
```

## `ColumnPrimitiveMap`

TypeScript 타입 이름(문자열) -> 실제 TypeScript 타입 매핑.

```typescript
export type ColumnPrimitiveMap = {
  string: string;
  number: number;
  boolean: boolean;
  DateTime: DateTime;
  DateOnly: DateOnly;
  Time: Time;
  Uuid: Uuid;
  Bytes: Bytes;
};
```

## `ColumnPrimitiveStr`

Column 원시 타입 이름 문자열. `keyof ColumnPrimitiveMap`.

```typescript
export type ColumnPrimitiveStr = "string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes";
```

## `ColumnPrimitive`

Column에 저장 가능한 모든 원시 타입. undefined는 NULL을 나타냄.

```typescript
export type ColumnPrimitive = string | number | boolean | DateTime | DateOnly | Time | Uuid | Bytes | undefined;
```

## `dataTypeStrToColumnPrimitiveStr`

SQL DataType 문자열 -> TypeScript 타입 이름 매핑.

```typescript
export const dataTypeStrToColumnPrimitiveStr: {
  int: "number"; bigint: "number"; float: "number"; double: "number"; decimal: "number";
  varchar: "string"; char: "string"; text: "string";
  binary: "Bytes"; boolean: "boolean";
  datetime: "DateTime"; date: "DateOnly"; time: "Time"; uuid: "Uuid";
};
```

## `InferColumnPrimitiveFromDataType`

DataType에서 TypeScript 타입 추론.

```typescript
export type InferColumnPrimitiveFromDataType<TDataType extends DataType> =
  ColumnPrimitiveMap[(typeof dataTypeStrToColumnPrimitiveStr)[TDataType["type"]]];
```

## `inferColumnPrimitiveStr`

런타임 값에서 ColumnPrimitiveStr을 추론한다. NULL 값으로는 추론 불가 (에러 발생).

```typescript
export function inferColumnPrimitiveStr(value: ColumnPrimitive): ColumnPrimitiveStr;
```

## `ColumnMeta`

Column 메타데이터. ColumnBuilder에서 생성되어 TableBuilder에 전달된다.

```typescript
export interface ColumnMeta {
  type: ColumnPrimitiveStr;
  dataType: DataType;
  autoIncrement?: boolean;
  nullable?: boolean;
  default?: ColumnPrimitive;
  description?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `ColumnPrimitiveStr` | TypeScript 타입 이름 |
| `dataType` | `DataType` | SQL 데이터 타입 |
| `autoIncrement` | `boolean \| undefined` | 자동 증가 여부 |
| `nullable` | `boolean \| undefined` | NULL 허용 여부 |
| `default` | `ColumnPrimitive \| undefined` | 기본값 |
| `description` | `string \| undefined` | Column 설명 |

## `DateUnit`

날짜 단위.

```typescript
export type DateUnit = "year" | "month" | "day" | "hour" | "minute" | "second";
```

## `Expr`

모든 표현식 AST의 유니온 타입. ExprColumn, ExprValue, ExprRaw와 60+ 개의 개별 표현식 타입의 합집합.

```typescript
export type Expr = ExprColumn | ExprValue | ExprRaw | ExprConcat | ExprLeft | ... | ExprWindow | ExprSubquery;
```

주요 표현식 인터페이스 (각각 `type` discriminant 필드를 가짐):

| Interface | type | Description |
|-----------|------|-------------|
| `ExprColumn` | `"column"` | Column 참조 (`path: string[]`) |
| `ExprValue` | `"value"` | 리터럴 값 (`value: unknown`) |
| `ExprRaw` | `"raw"` | Raw SQL (`sql: string, params: Expr[]`) |
| `ExprEq` | `"eq"` | 동등 비교 |
| `ExprGt` | `"gt"` | 초과 비교 |
| `ExprLt` | `"lt"` | 미만 비교 |
| `ExprGte` | `"gte"` | 이상 비교 |
| `ExprLte` | `"lte"` | 이하 비교 |
| `ExprBetween` | `"between"` | 범위 비교 |
| `ExprIsNull` | `"null"` | NULL 체크 |
| `ExprLike` | `"like"` | LIKE 패턴 |
| `ExprRegexp` | `"regexp"` | 정규식 매칭 |
| `ExprIn` | `"in"` | IN 목록 |
| `ExprInQuery` | `"inQuery"` | IN 서브쿼리 |
| `ExprExists` | `"exists"` | EXISTS 서브쿼리 |
| `ExprNot` | `"not"` | NOT |
| `ExprAnd` | `"and"` | AND |
| `ExprOr` | `"or"` | OR |
| `ExprConcat` | `"concat"` | 문자열 연결 |
| `ExprCount` | `"count"` | COUNT 집계 |
| `ExprSum` | `"sum"` | SUM 집계 |
| `ExprAvg` | `"avg"` | AVG 집계 |
| `ExprMax` | `"max"` | MAX 집계 |
| `ExprMin` | `"min"` | MIN 집계 |
| `ExprWindow` | `"window"` | Window 함수 |
| `ExprSubquery` | `"subquery"` | 스칼라 서브쿼리 |
| `ExprCast` | `"cast"` | 타입 변환 |
| `ExprSwitch` | `"switch"` | CASE WHEN |
| `ExprIf` | `"if"` | IF 조건 |
| `ExprCoalesce` | `"coalesce"` | COALESCE |

## `WhereExpr`

WHERE 절 표현식 AST 유니온 타입.

```typescript
export type WhereExpr = ExprEq | ExprGt | ExprLt | ExprGte | ExprLte | ExprBetween | ExprIsNull | ExprLike | ExprRegexp | ExprIn | ExprInQuery | ExprExists | ExprNot | ExprAnd | ExprOr;
```

## `WinSpec`

Window 함수 스펙.

```typescript
export interface WinSpec {
  partitionBy?: Expr[];
  orderBy?: [Expr, ("ASC" | "DESC")?][];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `partitionBy` | `Expr[] \| undefined` | 파티션 기준 표현식 |
| `orderBy` | `[Expr, ("ASC" \| "DESC")?][] \| undefined` | 정렬 기준 |

## `WinFn`

Window 함수 유니온 타입.

```typescript
export type WinFn = WinFnRowNumber | WinFnRank | WinFnDenseRank | WinFnNtile | WinFnLag | WinFnLead | WinFnFirstValue | WinFnLastValue | WinFnSum | WinFnAvg | WinFnCount | WinFnMin | WinFnMax;
```

## `QueryDef`

모든 쿼리 정의의 유니온 타입.

```typescript
export type QueryDef = SelectQueryDef | InsertQueryDef | InsertIfNotExistsQueryDef | InsertIntoQueryDef | UpdateQueryDef | DeleteQueryDef | UpsertQueryDef | ExecProcQueryDef | /* DDL types */;
```

## `SelectQueryDef`

SELECT 쿼리 정의.

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

## `InsertQueryDef`

INSERT 쿼리 정의.

```typescript
export interface InsertQueryDef {
  type: "insert";
  table: QueryDefObjectName;
  records: Record<string, unknown>[];
  overrideIdentity?: boolean;
  output?: CudOutputDef;
}
```

## `UpdateQueryDef`

UPDATE 쿼리 정의.

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

## `DeleteQueryDef`

DELETE 쿼리 정의.

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

## `UpsertQueryDef`

UPSERT 쿼리 정의.

```typescript
export interface UpsertQueryDef {
  type: "upsert";
  table: QueryDefObjectName;
  existsSelectQuery: Omit<SelectQueryDef, "select">;
  updateRecord: Record<string, Expr>;
  insertRecord: Record<string, Expr>;
  output?: CudOutputDef;
}
```

## `QueryDefObjectName`

테이블/뷰 이름 정의.

```typescript
export interface QueryDefObjectName {
  database?: string;
  schema?: string;
  name: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string \| undefined` | 데이터베이스 이름 |
| `schema` | `string \| undefined` | 스키마 이름 |
| `name` | `string` | 테이블/뷰 이름 |

## `CudOutputDef`

CUD 작업 OUTPUT 절 정의.

```typescript
export interface CudOutputDef {
  columns: string[];
  pkColNames: string[];
  aiColName?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `columns` | `string[]` | 반환할 column 이름 |
| `pkColNames` | `string[]` | PK column 이름 |
| `aiColName` | `string \| undefined` | AutoIncrement column 이름 |

## `SelectQueryDefJoin`

JOIN 쿼리 정의.

```typescript
export interface SelectQueryDefJoin extends SelectQueryDef {
  as: string;
  isSingle: boolean;
}
```

## `DDL_TYPES`

DDL 타입 문자열 목록.

```typescript
export const DDL_TYPES = [
  "switchFk", "clearSchema", "createTable", "dropTable", "renameTable", "truncate",
  "addColumn", "dropColumn", "modifyColumn", "renameColumn",
  "dropPrimaryKey", "addPrimaryKey", "addForeignKey", "dropForeignKey", "addIndex", "dropIndex",
  "createView", "dropView", "createProc", "dropProc",
  "schemaExists",
] as const;
```

## `DdlType`

DDL 타입 유니온.

```typescript
export type DdlType = (typeof DDL_TYPES)[number];
```

## DDL QueryDef 인터페이스

각 DDL 작업을 위한 QueryDef 인터페이스. 모두 `type` discriminant 필드를 가진다.

| Interface | type | Description |
|-----------|------|-------------|
| `SwitchFkQueryDef` | `"switchFk"` | FK 제약조건 활성화/비활성화 |
| `ClearSchemaQueryDef` | `"clearSchema"` | 스키마 전체 삭제 |
| `CreateTableQueryDef` | `"createTable"` | 테이블 생성 |
| `DropTableQueryDef` | `"dropTable"` | 테이블 삭제 |
| `RenameTableQueryDef` | `"renameTable"` | 테이블 이름 변경 |
| `TruncateQueryDef` | `"truncate"` | 테이블 데이터 전체 삭제 |
| `AddColumnQueryDef` | `"addColumn"` | Column 추가 |
| `DropColumnQueryDef` | `"dropColumn"` | Column 삭제 |
| `ModifyColumnQueryDef` | `"modifyColumn"` | Column 수정 |
| `RenameColumnQueryDef` | `"renameColumn"` | Column 이름 변경 |
| `DropPrimaryKeyQueryDef` | `"dropPrimaryKey"` | PK 삭제 |
| `AddPrimaryKeyQueryDef` | `"addPrimaryKey"` | PK 추가 |
| `AddForeignKeyQueryDef` | `"addForeignKey"` | FK 추가 |
| `DropForeignKeyQueryDef` | `"dropForeignKey"` | FK 삭제 |
| `AddIndexQueryDef` | `"addIndex"` | Index 추가 |
| `DropIndexQueryDef` | `"dropIndex"` | Index 삭제 |
| `CreateViewQueryDef` | `"createView"` | View 생성 |
| `DropViewQueryDef` | `"dropView"` | View 삭제 |
| `CreateProcQueryDef` | `"createProc"` | Procedure 생성 |
| `DropProcQueryDef` | `"dropProc"` | Procedure 삭제 |
| `SchemaExistsQueryDef` | `"schemaExists"` | 스키마 존재 확인 |
| `ExecProcQueryDef` | `"execProc"` | Procedure 실행 |
| `InsertIfNotExistsQueryDef` | `"insertIfNotExists"` | 조건부 INSERT |
| `InsertIntoQueryDef` | `"insertInto"` | INSERT INTO SELECT |
