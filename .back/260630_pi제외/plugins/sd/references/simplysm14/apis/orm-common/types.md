# @simplysm/orm-common — 타입 / QueryDef·Expr AST / QueryBuilder / 결과 파싱

executor·dialect 어댑터 구현, QueryDef/Expr AST 직접 검사, SQL 렌더링, 원시 DB 결과 변환을 다룰 때 같이 읽는 군.

## Dialect / QueryBuildResult

```ts
type Dialect = "mysql" | "mssql" | "postgresql";
const dialects: Dialect[];
interface QueryBuildResult {
  sql: string;
  resultSetIndex?: number;
  resultSetStride?: number;
}
```

- `"mysql"` — MySQL dialect 선택값.
- `"mssql"` — Microsoft SQL Server dialect 선택값.
- `"postgresql"` — PostgreSQL dialect 선택값.
- `dialects` — `["mysql", "mssql", "postgresql"]` 순서의 dialect 목록.
- `sql` — 렌더링된 SQL 문자열.
- `resultSetIndex?: number` — 다중 result set 중 사용할 시작 index. 없으면 첫 번째 result set.
- `resultSetStride?: number` — `resultSetIndex` 부터 stride 간격 result set을 concat할 때 쓰는 간격.

## DataRecord / ResultMeta

```ts
type DataRecord = { [key: string]: ColumnPrimitive | DataRecord | DataRecord[] };
interface ResultMeta {
  columns: Record<string, ColumnPrimitiveStr>;
  joins: Record<string, { isSingle: boolean }>;
}
```

- `DataRecord` — query 결과 row 구조. primitive, 중첩 객체, 중첩 배열을 허용한다.
- `columns` — flat column key 또는 dotted key를 primitive type name에 매핑한다.
- `joins` — join alias key를 단일/배열 정보에 매핑한다.
- `isSingle: boolean` — `true` 는 단일 객체 join, `false` 는 배열 join.

## Column primitive / DataType / ColumnMeta

```ts
type DataType =
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
type ColumnPrimitiveMap = PrimitiveTypeMap;
type ColumnPrimitiveStr = PrimitiveTypeStr;
type ColumnPrimitive = PrimitiveType;
const dataTypeStrToColumnPrimitiveStr: { int: "number"; bigint: "number"; float: "number"; double: "number"; decimal: "number"; varchar: "string"; char: "string"; text: "string"; binary: "Bytes"; boolean: "boolean"; datetime: "DateTime"; date: "DateOnly"; time: "Time"; uuid: "Uuid" };
type InferColumnPrimitiveFromDataType<TDataType extends DataType> = ColumnPrimitiveMap[...];
function inferColumnPrimitiveStr(value: Exclude<ColumnPrimitive, undefined>): ColumnPrimitiveStr;
interface ColumnMeta {
  type: ColumnPrimitiveStr;
  dataType: DataType;
  autoIncrement?: boolean;
  nullable?: boolean;
  default?: ColumnPrimitive;
  description?: string;
}
```

- `DataType.type` — SQL 타입 discriminator.
- `"int"` / `"bigint"` / `"float"` / `"double"` / `"decimal"` — number primitive로 매핑되는 numeric SQL 타입.
- `precision: number` — decimal 전체 자릿수.
- `scale?: number` — decimal 소수점 이하 자릿수.
- `"varchar"` / `"char"` / `"text"` — string primitive로 매핑되는 문자열 SQL 타입.
- `length: number` — varchar/char 길이.
- `"binary"` — Bytes primitive로 매핑되는 binary SQL 타입.
- `"boolean"` — boolean primitive로 매핑되는 SQL 타입.
- `"datetime"` — DateTime primitive로 매핑되는 SQL 타입.
- `"date"` — DateOnly primitive로 매핑되는 SQL 타입.
- `"time"` — Time primitive로 매핑되는 SQL 타입.
- `"uuid"` — Uuid primitive로 매핑되는 SQL 타입.
- `ColumnPrimitiveMap` — core-common primitive type name → TypeScript type 매핑.
- `ColumnPrimitiveStr` — primitive type name 문자열 union.
- `ColumnPrimitive` — column 값으로 허용되는 primitive union. 코드 주석상 `undefined` 는 SQL NULL을 나타낸다.
- `dataTypeStrToColumnPrimitiveStr` — DataType discriminator를 ColumnPrimitiveStr로 바꾸는 런타임 map.
- `InferColumnPrimitiveFromDataType` — DataType에서 TypeScript primitive type을 추론한다.
- `inferColumnPrimitiveStr(value)` — 런타임 값의 primitive type name을 `primitive.typeStr` 로 추론한다.
- `ColumnMeta.type` — TypeScript primitive type name.
- `ColumnMeta.dataType` — SQL DataType AST.
- `ColumnMeta.autoIncrement?: boolean` — 자동 증가 column 여부.
- `ColumnMeta.nullable?: boolean` — NULL 허용 여부.
- `ColumnMeta.default?: ColumnPrimitive` — column 기본값.
- `ColumnMeta.description?: string` — column 설명.

## QueryDef object name / DML AST

```ts
interface QueryDefObjectName { database?: string; schema?: string; name: string }
interface CudOutputDef { columns: string[]; pkColNames: string[]; aiColName?: string }
interface SelectQueryDef { type: "select"; from?: QueryDefObjectName | SelectQueryDef | SelectQueryDef[] | string; as: string; select?: Record<string, Expr>; distinct?: boolean; top?: number; lock?: boolean; where?: WhereExpr[]; joins?: SelectQueryDefJoin[]; orderBy?: [Expr, ("ASC" | "DESC")?][]; limit?: [number, number]; groupBy?: Expr[]; having?: WhereExpr[]; with?: { name: string; base: SelectQueryDef; recursive: SelectQueryDef } }
interface SelectQueryDefJoin extends SelectQueryDef { isSingle?: boolean }
interface InsertQueryDef { type: "insert"; table: QueryDefObjectName; records: Record<string, ColumnPrimitive>[]; overrideIdentity?: boolean; aiColName?: string; output?: CudOutputDef }
interface InsertIfNotExistsQueryDef { type: "insertIfNotExists"; table: QueryDefObjectName; record: Record<string, ColumnPrimitive>; existsSelectQuery: SelectQueryDef; overrideIdentity?: boolean; output?: CudOutputDef }
interface InsertIntoQueryDef { type: "insertInto"; table: QueryDefObjectName; recordsSelectQuery: SelectQueryDef; overrideIdentity?: boolean; output?: CudOutputDef }
interface UpdateQueryDef { type: "update"; table: QueryDefObjectName; as: string; record: Record<string, Expr>; top?: number; where?: WhereExpr[]; joins?: SelectQueryDefJoin[]; limit?: [number, number]; output?: CudOutputDef }
interface DeleteQueryDef { type: "delete"; table: QueryDefObjectName; as: string; top?: number; where?: WhereExpr[]; joins?: SelectQueryDefJoin[]; limit?: [number, number]; output?: CudOutputDef }
interface UpsertQueryDef { type: "upsert"; table: QueryDefObjectName; existsSelectQuery: SelectQueryDef; insertRecord: Record<string, Expr>; updateRecord: Record<string, Expr>; overrideIdentity?: boolean; output?: CudOutputDef }
```

- `database?: string` — DB 객체 database namespace. MySQL/MSSQL 렌더링에 쓰이고 PostgreSQL tableName 렌더링에서는 연결용으로 취급된다.
- `schema?: string` — DB 객체 schema namespace. MSSQL/PostgreSQL 렌더링에 쓰인다.
- `name: string` — table/view/procedure 이름.
- `CudOutputDef.columns` — INSERT/UPDATE/DELETE/UPSERT 후 반환할 column 이름 목록.
- `pkColNames` — output 조회용 PK column 이름 목록.
- `aiColName?: string` — auto-increment column 이름.
- `type: "select"` — SELECT QueryDef discriminator.
- `from` — table object, subquery, union subquery 배열, CTE 이름 string 중 하나.
- `as` — table/subquery alias.
- `select?: Record<string, Expr>` — output alias → expression map. 없으면 `*` 렌더링.
- `distinct?: boolean` — DISTINCT 여부.
- `top?: number` — TOP/LIMIT row 수.
- `lock?: boolean` — row lock 여부.
- `where?: WhereExpr[]` — WHERE 조건 배열.
- `joins?: SelectQueryDefJoin[]` — JOIN query 정의 배열.
- `orderBy?: [Expr, "ASC"|"DESC"?][]` — ORDER BY expression과 방향 배열.
- `"ASC"` — 오름차순 정렬.
- `"DESC"` — 내림차순 정렬.
- `limit?: [number, number]` — `[offset, count]` pagination.
- `groupBy?: Expr[]` — GROUP BY expression 배열.
- `having?: WhereExpr[]` — HAVING 조건 배열.
- `with?: { name; base; recursive }` — recursive CTE 정의.
- `isSingle?: boolean` — JOIN 결과가 단일 객체인지 여부.
- `type: "insert"` — INSERT QueryDef discriminator.
- `records` — 삽입할 record 배열.
- `overrideIdentity?: boolean` — identity/auto-increment 명시값 삽입이 필요한지 여부.
- `type: "insertIfNotExists"` — 조건부 INSERT discriminator.
- `record` — 조건부 삽입 단일 record.
- `existsSelectQuery` — 존재 여부 확인 SELECT QueryDef.
- `type: "insertInto"` — INSERT INTO SELECT discriminator.
- `recordsSelectQuery` — 삽입할 데이터를 만드는 SELECT QueryDef.
- `type: "update"` — UPDATE QueryDef discriminator.
- `record: Record<string, Expr>` — 갱신할 column → value expression map.
- `type: "delete"` — DELETE QueryDef discriminator.
- `type: "upsert"` — UPSERT QueryDef discriminator.
- `insertRecord` — 없을 때 삽입할 column → expression map.
- `updateRecord` — 있을 때 갱신할 column → expression map.

## QueryDef DDL / utility AST

```ts
interface SwitchFkQueryDef { type: "switchFk"; table: QueryDefObjectName; enabled: boolean }
interface ClearSchemaQueryDef { type: "clearSchema"; database: string; schema?: string }
interface CreateTableQueryDef { type: "createTable"; table: QueryDefObjectName; columns: { name: string; dataType: DataType; autoIncrement?: boolean; nullable?: boolean; default?: ColumnPrimitive }[]; primaryKey?: string[] }
interface DropTableQueryDef { type: "dropTable"; table: QueryDefObjectName }
interface RenameTableQueryDef { type: "renameTable"; table: QueryDefObjectName; newName: string }
interface TruncateQueryDef { type: "truncate"; table: QueryDefObjectName }
interface AddColumnQueryDef { type: "addColumn"; table: QueryDefObjectName; column: { name: string; dataType: DataType; autoIncrement?: boolean; nullable?: boolean; default?: ColumnPrimitive } }
interface DropColumnQueryDef { type: "dropColumn"; table: QueryDefObjectName; column: string }
interface ModifyColumnQueryDef { type: "modifyColumn"; table: QueryDefObjectName; column: { name: string; dataType: DataType; autoIncrement?: boolean; nullable?: boolean; default?: ColumnPrimitive } }
interface RenameColumnQueryDef { type: "renameColumn"; table: QueryDefObjectName; column: string; newName: string }
interface DropPrimaryKeyQueryDef { type: "dropPrimaryKey"; table: QueryDefObjectName }
interface AddPrimaryKeyQueryDef { type: "addPrimaryKey"; table: QueryDefObjectName; columns: string[] }
interface AddForeignKeyQueryDef { type: "addForeignKey"; table: QueryDefObjectName; foreignKey: { name: string; fkColumns: string[]; targetTable: QueryDefObjectName; targetPkColumns: string[] } }
interface DropForeignKeyQueryDef { type: "dropForeignKey"; table: QueryDefObjectName; foreignKey: string }
interface AddIndexQueryDef { type: "addIndex"; table: QueryDefObjectName; index: { name: string; columns: { name: string; orderBy: "ASC" | "DESC" }[]; unique?: boolean } }
interface DropIndexQueryDef { type: "dropIndex"; table: QueryDefObjectName; index: string }
interface CreateViewQueryDef { type: "createView"; view: QueryDefObjectName; queryDef: SelectQueryDef }
interface DropViewQueryDef { type: "dropView"; view: QueryDefObjectName }
interface CreateProcQueryDef { type: "createProc"; procedure: QueryDefObjectName; params?: { name: string; dataType: DataType; nullable?: boolean; default?: ColumnPrimitive }[]; returns?: { name: string; dataType: DataType; nullable?: boolean }[]; query: string }
interface DropProcQueryDef { type: "dropProc"; procedure: QueryDefObjectName }
interface ExecProcQueryDef { type: "execProc"; procedure: QueryDefObjectName; params: Record<string, Expr> | undefined }
interface SchemaExistsQueryDef { type: "schemaExists"; database: string; schema?: string }
const DDL_TYPES: readonly DdlType[];
type DdlType = ...;
type QueryDef = SelectQueryDef | InsertQueryDef | ... | SchemaExistsQueryDef;
```

- `type: "switchFk"` — FK 제약 활성화/비활성화 utility QueryDef. `DDL_TYPES` 에 포함되지 않는다.
- `enabled: boolean` — `true` 는 FK 활성화, `false` 는 FK 비활성화.
- `type: "clearSchema"` — schema 객체 삭제 QueryDef.
- `database: string` — clear/schemaExists 대상 database.
- `schema?: string` — clear/schemaExists 대상 schema.
- `type: "createTable"` — CREATE TABLE QueryDef.
- `columns[].name` — column 이름.
- `columns[].dataType` — column SQL type AST.
- `columns[].autoIncrement?: boolean` — auto increment 여부.
- `columns[].nullable?: boolean` — NULL 허용 여부.
- `columns[].default?: ColumnPrimitive` — 기본값.
- `primaryKey?: string[]` — PK column 목록.
- `type: "dropTable"` / `"renameTable"` / `"truncate"` — table drop/rename/truncate discriminator.
- `newName: string` — table/column 새 이름.
- `type: "addColumn"` / `"dropColumn"` / `"modifyColumn"` / `"renameColumn"` — column DDL discriminator.
- `column: string` — drop/rename 대상 column 이름.
- `type: "dropPrimaryKey"` / `"addPrimaryKey"` — PK DDL discriminator.
- `columns: string[]` — PK 추가 대상 column 목록.
- `type: "addForeignKey"` / `"dropForeignKey"` — FK DDL discriminator.
- `foreignKey.name` — FK constraint 이름.
- `foreignKey.fkColumns` — source FK column 목록.
- `foreignKey.targetTable` — 참조 대상 table object name.
- `foreignKey.targetPkColumns` — 참조 대상 PK column 목록.
- `foreignKey: string` — drop 대상 FK constraint 이름.
- `type: "addIndex"` / `"dropIndex"` — index DDL discriminator.
- `index.name` — index 이름.
- `index.columns[].name` — index column 이름.
- `index.columns[].orderBy: "ASC"|"DESC"` — index column 정렬 방향.
- `index.unique?: boolean` — unique index 여부.
- `index: string` — drop 대상 index 이름.
- `type: "createView"` / `"dropView"` — view DDL discriminator.
- `queryDef` — view 본문 SELECT QueryDef.
- `type: "createProc"` / `"dropProc"` / `"execProc"` — procedure create/drop/execute discriminator.
- `params` — procedure parameter 정의 또는 execute parameter expression map.
- `returns` — procedure 반환 column 정의.
- `query: string` — procedure 본문 SQL.
- `type: "schemaExists"` — schema 존재 여부 확인 QueryDef.
- `DDL_TYPES` — transaction 상태에서 `DbContext.executeDefs` 가 차단하는 DDL type 목록. `switchFk` 는 제외된다.
- `DdlType` — `DDL_TYPES[number]` union.
- `QueryDef` — 모든 DML/DDL/utility/meta QueryDef union.

## Expr AST value / where

```ts
type DateUnit = "year" | "month" | "day" | "hour" | "minute" | "second";
interface ExprColumn { type: "column"; path: string[] }
interface ExprValue { type: "value"; value: ColumnPrimitive }
interface ExprRaw { type: "raw"; sql: string; params: Expr[] }
interface ExprEq { type: "eq"; source: Expr; target: Expr }
interface ExprGt { type: "gt"; source: Expr; target: Expr }
interface ExprLt { type: "lt"; source: Expr; target: Expr }
interface ExprGte { type: "gte"; source: Expr; target: Expr }
interface ExprLte { type: "lte"; source: Expr; target: Expr }
interface ExprBetween { type: "between"; source: Expr; from?: Expr; to?: Expr }
interface ExprIsNull { type: "null"; arg: Expr }
interface ExprLike { type: "like"; source: Expr; pattern: Expr }
interface ExprRegexp { type: "regexp"; source: Expr; pattern: Expr }
interface ExprIn { type: "in"; source: Expr; values: Expr[] }
interface ExprInQuery { type: "inQuery"; source: Expr; query: SelectQueryDef }
interface ExprExists { type: "exists"; query: SelectQueryDef }
interface ExprNot { type: "not"; arg: WhereExpr }
interface ExprAnd { type: "and"; conditions: WhereExpr[] }
interface ExprOr { type: "or"; conditions: WhereExpr[] }
type WhereExpr = ExprEq | ExprGt | ... | ExprOr;
```

- `DateUnit` literals — 날짜 diff/add 단위: `"year"`, `"month"`, `"day"`, `"hour"`, `"minute"`, `"second"`.
- `ExprColumn.path` — column alias/path 조각.
- `ExprValue.value` — literal primitive 값.
- `ExprRaw.sql` — `$1`, `$2` placeholder를 포함한 raw SQL 조각.
- `ExprRaw.params` — raw placeholder에 대응하는 expression 배열.
- `source` / `target` — 비교 source와 target expression.
- `from?: Expr` / `to?: Expr` — BETWEEN 하한/상한 expression.
- `arg` — 단항 조건/표현식 대상.
- `pattern` — LIKE/REGEXP pattern expression.
- `values` — IN 값 expression 배열.
- `query` — IN/EXISTS subquery SelectQueryDef.
- `conditions` — AND/OR 조건 배열.
- `WhereExpr` — WHERE/HAVING에 들어갈 수 있는 조건 AST union.

## Expr AST scalar / aggregate / window

```ts
interface ExprConcat { type: "concat"; args: Expr[] }
interface ExprLeft { type: "left"; source: Expr; length: Expr }
interface ExprRight { type: "right"; source: Expr; length: Expr }
interface ExprTrim { type: "trim"; arg: Expr }
interface ExprPadStart { type: "padStart"; source: Expr; length: Expr; fillString: Expr }
interface ExprReplace { type: "replace"; source: Expr; from: Expr; to: Expr }
interface ExprUpper { type: "upper"; arg: Expr }
interface ExprLower { type: "lower"; arg: Expr }
interface ExprLength { type: "length"; arg: Expr }
interface ExprByteLength { type: "byteLength"; arg: Expr }
interface ExprSubstring { type: "substring"; source: Expr; start: Expr; length?: Expr }
interface ExprIndexOf { type: "indexOf"; source: Expr; search: Expr }
interface ExprAbs { type: "abs"; arg: Expr }
interface ExprRound { type: "round"; arg: Expr; digits: number }
interface ExprCeil { type: "ceil"; arg: Expr }
interface ExprFloor { type: "floor"; arg: Expr }
interface ExprYear { type: "year"; arg: Expr } /* month/day/hour/minute/second/isoWeek/isoWeekStartDate/isoYearMonth도 같은 arg 구조 */
interface ExprDateDiff { type: "dateDiff"; unit: DateUnit; from: Expr; to: Expr }
interface ExprDateAdd { type: "dateAdd"; unit: DateUnit; source: Expr; value: Expr }
interface ExprFormatDate { type: "formatDate"; source: Expr; format: string }
interface ExprCoalesce { type: "coalesce"; args: Expr[] }
interface ExprNullIf { type: "nullIf"; source: Expr; value: Expr }
interface ExprIs { type: "is"; condition: WhereExpr }
interface ExprSwitch { type: "switch"; cases: { when: WhereExpr; then: Expr }[]; else: Expr }
interface ExprIf { type: "if"; condition: WhereExpr; then: Expr; else?: Expr }
interface ExprCount { type: "count"; arg?: Expr; distinct?: boolean }
interface ExprSum { type: "sum"; arg: Expr } /* avg/max/min도 같은 arg 구조 */
interface ExprGreatest { type: "greatest"; args: Expr[] }
interface ExprLeast { type: "least"; args: Expr[] }
interface ExprRowNum { type: "rowNum" }
interface ExprRandom { type: "random" }
interface ExprCast { type: "cast"; source: Expr; targetType: DataType }
interface ExprSubquery { type: "subquery"; queryDef: SelectQueryDef }
interface WinSpec { partitionBy?: Expr[]; orderBy?: [Expr, ("ASC" | "DESC")?][] }
interface ExprWindow { type: "window"; fn: WinFn; spec: WinSpec }
type Expr = ExprColumn | ExprValue | ... | ExprSubquery;
```

- `args` — 함수 인자 expression 배열.
- `length` — 문자열 추출/padding 길이 expression.
- `fillString` — padding 문자열 expression.
- `from` / `to` — replace source/target 또는 dateDiff 시작/끝 expression.
- `start` — substring 시작 위치 expression.
- `search` — indexOf 검색 문자열 expression.
- `digits: number` — round 소수점 자릿수.
- `unit: DateUnit` — dateDiff/dateAdd 단위.
- `value: Expr` — dateAdd 값 또는 nullIf 비교값.
- `format: string` — formatDate 포맷 문자열.
- `condition: WhereExpr` — `is`/`if` 조건.
- `cases[].when` / `cases[].then` — CASE WHEN 조건과 값.
- `else` — CASE/IF 기본값 expression.
- `arg?: Expr` — count 대상. 없으면 COUNT(*) 의미.
- `distinct?: boolean` — count distinct 여부.
- `targetType: DataType` — cast 대상 SQL 타입.
- `queryDef` — scalar subquery SelectQueryDef.
- `partitionBy?: Expr[]` — window partition expression 목록.
- `orderBy?: [Expr, "ASC"|"DESC"?][]` — window order expression 목록.
- `Expr` — SELECT/value expression 전체 union.

## Window function AST

```ts
interface WinFnRowNumber { type: "rowNumber" }
interface WinFnRank { type: "rank" }
interface WinFnDenseRank { type: "denseRank" }
interface WinFnNtile { type: "ntile"; n: number }
interface WinFnLag { type: "lag"; column: Expr; offset?: number; default?: Expr }
interface WinFnLead { type: "lead"; column: Expr; offset?: number; default?: Expr }
interface WinFnFirstValue { type: "firstValue"; column: Expr }
interface WinFnLastValue { type: "lastValue"; column: Expr }
interface WinFnSum { type: "sum"; column: Expr }
interface WinFnAvg { type: "avg"; column: Expr }
interface WinFnCount { type: "count"; column?: Expr }
interface WinFnMin { type: "min"; column: Expr }
interface WinFnMax { type: "max"; column: Expr }
type WinFn = WinFnRowNumber | WinFnRank | ... | WinFnMax;
```

- `type` — window function discriminator.
- `n: number` — NTILE group 수.
- `column: Expr` — lag/lead/value/window aggregate 대상 expression.
- `offset?: number` — lag/lead 이동 row 수. renderer는 미지정 시 1을 사용한다.
- `default?: Expr` — lag/lead 대상 row가 없을 때 반환할 expression.
- `WinFn` — ranking/navigation/aggregate window function union.

## createQueryBuilder / QueryBuilderBase

```ts
function createQueryBuilder(dialect: Dialect): QueryBuilderBase;
abstract class QueryBuilderBase {
  build(def: QueryDef): QueryBuildResult;
  protected result(sql: string, resultSetIndex?: number): QueryBuildResult;
}
class MysqlQueryBuilder extends QueryBuilderBase {}
class MssqlQueryBuilder extends QueryBuilderBase {}
class PostgresqlQueryBuilder extends QueryBuilderBase {}
```

- `dialect: Dialect` — `"mysql"` 는 `MysqlQueryBuilder`, `"mssql"` 은 `MssqlQueryBuilder`, `"postgresql"` 는 `PostgresqlQueryBuilder` 를 만든다.
- `build(def)` — `def.type` 과 같은 이름의 protected method로 dispatch한다. method가 없으면 throw한다.
- `def: QueryDef` — 렌더링할 QueryDef AST.
- `result(sql, resultSetIndex?)` — SQL과 선택적 resultSetIndex를 QueryBuildResult로 감싼다.
- `MysqlQueryBuilder` — MySQL용 QueryDef renderer. OUTPUT 미지원 구간은 multi-statement와 resultSetIndex/stride를 사용한다.
- `MssqlQueryBuilder` — MSSQL용 QueryDef renderer. OUTPUT, TOP, OFFSET/FETCH, `sp_rename`, `MERGE` 등을 사용한다.
- `PostgresqlQueryBuilder` — PostgreSQL용 QueryDef renderer. RETURNING, schema.table, recursive CTE, sequence 보정, CTE 기반 upsert를 사용한다.

## ExprRendererBase / dialect expression renderers

```ts
abstract class ExprRendererBase {
  constructor(buildSelect: (def: SelectQueryDef) => string);
  abstract wrap(name: string): string;
  abstract escapeString(value: string): string;
  abstract escapeValue(value: ColumnPrimitive): string;
  render(expr: Expr | WhereExpr): string;
  renderWhere(exprs: WhereExpr[]): string;
}
class MysqlExprRenderer extends ExprRendererBase { renderDataType(dataType: DataType): string }
class MssqlExprRenderer extends ExprRendererBase { renderDataType(dataType: DataType): string }
class PostgresqlExprRenderer extends ExprRendererBase { renderDataType(dataType: DataType): string }
```

- `buildSelect` — subquery expression 렌더링 시 SelectQueryDef를 SQL로 바꾸는 함수.
- `wrap(name)` — dialect별 identifier quoting. MySQL은 backtick, MSSQL은 bracket, PostgreSQL은 double quote를 쓴다.
- `escapeString(value)` — SQL 문자열 literal 내부 escape.
- `escapeValue(value)` — ColumnPrimitive를 dialect SQL literal로 변환한다.
- `render(expr)` — `expr.type` 과 같은 renderer method로 dispatch한다. method가 없으면 throw한다.
- `renderWhere(exprs)` — WhereExpr 배열을 `AND` 로 연결한다.
- `renderDataType(dataType)` — dialect별 DDL/CAST SQL type 문자열을 반환한다.
- `MysqlExprRenderer` — MySQL expression/data type renderer.
- `MssqlExprRenderer` — MSSQL expression/data type renderer. `regexp` 렌더링은 throw한다.
- `PostgresqlExprRenderer` — PostgreSQL expression/data type renderer.

## parseQueryResult

```ts
function parseQueryResult<TRecord>(rawResults: Record<string, unknown>[], meta: ResultMeta): Promise<TRecord[] | undefined>;
```

- `rawResults` — DB driver가 반환한 flat row 배열.
- `meta` — type 변환과 join 구조 정보. meta 없이 호출할 필요가 없다는 주석이 있다.
- 반환값 — 변환된 row 배열. 입력이 비었거나 파싱 후 유효 row가 없으면 `undefined`.
- type parsing — `number`, `string`, `boolean`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Bytes` 로 변환한다.
- boolean parsing — `0`, `"0"`, `false` 는 false; `1`, `"1"`, `true` 는 true; 그 외는 Boolean(value).
- Bytes parsing — `Uint8Array` 는 그대로, string은 hex로 변환, 그 외는 throw.
- join parsing — dotted key를 중첩 객체로 만들고 `meta.joins[key].isSingle` 에 따라 단일 객체 또는 배열로 그룹핑한다.
- `isSingle` 충돌 — 단일 join에 서로 다른 여러 결과가 있으면 throw한다.
- async 처리 — 100개 record마다 event loop에 양보한다.

## pickResultSets

```ts
function pickResultSets<T>(rawResults: T[][], buildResult: Pick<QueryBuildResult, "resultSetIndex" | "resultSetStride">): T[];
```

- `rawResults` — DB driver가 반환한 다중 result set 배열.
- `buildResult.resultSetIndex?: number` — 없으면 `rawResults[0] ?? []` 반환.
- `buildResult.resultSetStride?: number` — 없으면 `rawResults[resultSetIndex] ?? []` 반환.
- stride 있음 — `resultSetIndex`, `resultSetIndex + stride`, ... result set을 모두 concat한다.
