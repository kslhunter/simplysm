# @simplysm/orm-common — 타입 / QueryDef, Expr AST / QueryBuilder / 결과 파싱

executor, dialect 어댑터를 구현하거나 AST 를 직접 생성, 검사하고 SQL 렌더링, 결과 변환을 다룰 때 쓰는 저수준 타입, 클래스 군.
대부분 라이브러리 구현, 구현체 작성자용이며, 일반 앱은 `DbContext`/`Queryable`/`expr` 만으로 충분합니다.

## DB 런타임 타입 (`types/db.ts`)

- `type Dialect` — `"mysql" | "mssql" | "postgresql"`. 지원 DBMS(MySQL 8.0.14+, MSSQL 2012+, PostgreSQL 9.0+).
- `const dialects: Dialect[]` — `["mysql", "mssql", "postgresql"]`. 전체 dialect 목록(테스트 등).
- `interface QueryBuildResult` — QueryBuilder.build 반환.
  - `sql` — 렌더된 SQL.
  - `resultSetIndex?` — 결과를 가져올 셋 인덱스, 기본 0.
  - `resultSetStride?` — N번째마다 셋 추출; MySQL 배치 INSERT 의 SELECT 결과 수집용.
- `type IsolationLevel` — 값:
  - `"READ_UNCOMMITTED"` — dirty read 허용.
  - `"READ_COMMITTED"` — 커밋분만, 기본.
  - `"REPEATABLE_READ"` — 반복 읽기 보장.
  - `"SERIALIZABLE"` — 완전 직렬화.
- `type DataRecord` — `{ [key: string]: ColumnPrimitive | DataRecord | DataRecord[] }`. 중첩 관계 결과를 표현하는 재귀 행 타입.
- `interface DbContextExecutor` — DB 어댑터 인터페이스. `orm-node`(서버), service client 가 구현.
  - 멤버: `connect()`, `close()`, `beginTransaction(isolationLevel?)`, `commitTransaction()`,
    `rollbackTransaction()`, `executeDefs(defs, resultMetas?): Promise<T[][]>`.
- `interface ResultMeta` — 결과 변환 메타. `parseQueryResult` 입력.
  - `columns: Record<string, ColumnPrimitiveStr>` — 컬럼명→타입.
  - `joins: Record<string, { isSingle: boolean }>` — JOIN alias→단일/배열.
- `interface Migration` — `DbContext.migrations` 에 등록.
  - `name: string` — 고유, 타임스탬프 권장.
  - `up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>` — 마이그레이션 실행.

## Column 타입 (`types/column.ts`)

- `type DataType` — SQL 데이터 타입 판별 유니온. DBMS 매핑은 [schema.md](./schema.md) column 표 참조.
  - 각 멤버 `{ type: ... }`: `int`/`bigint`/`float`/`double`/`decimal`(+`precision`,`scale?`)/
    `varchar`(+`length`)/`char`(+`length`)/`text`/`binary`/`boolean`/`datetime`/`date`/`time`/`uuid`.
- `type ColumnPrimitive` — 컬럼 저장 가능 TS 원시 타입(`PrimitiveType`). `undefined`=NULL.
- `type ColumnPrimitiveMap` — 타입명→TS 타입 매핑(`PrimitiveTypeMap`).
- `type ColumnPrimitiveStr` — 원시 타입 이름 문자열(`PrimitiveTypeStr`; "string"/"number"/... ).
- `const dataTypeStrToColumnPrimitiveStr` — SQL `DataType["type"]`→`ColumnPrimitiveStr` 매핑 상수(예 `int`→"number", `uuid`→"Uuid").
- `type InferColumnPrimitiveFromDataType<T>` — `DataType` 에서 TS 타입 추론. `cast` 결과 타입에 사용.
- `inferColumnPrimitiveStr(value)` — 런타임 값에서 `ColumnPrimitiveStr` 추론(`primitive.typeStr`). 알 수 없으면 throw.
- `interface ColumnMeta` — 컬럼 메타. `ColumnBuilder.meta` 형태.
  - 멤버: `type: ColumnPrimitiveStr`, `dataType: DataType`, `autoIncrement?`, `nullable?`,
    `default?: ColumnPrimitive`, `description?`.

## Expr AST (`types/expr.ts`)

`expr` 빌더가 만드는 노드 타입. 모두 `{ type: ... }` 판별 인터페이스. `ExprRendererBase` 가 `type` 별로 dispatch 합니다.

- `type Expr` — 전체 표현식 유니온(값, 문자열, 숫자, 날짜, 조건, 집계, 기타, 윈도우, 시스템). `select`/`orderBy` 등에서 쓰입니다.
- `type WhereExpr` — WHERE 전용(boolean 반환) 유니온: 비교(`ExprEq`/`Gt`/`Lt`/`Gte`/`Lte`/`Between`/`IsNull`/`Like`/`Regexp`/`In`/`InQuery`/`Exists`) + 논리(`ExprNot`/`And`/`Or`).
- `type DateUnit` — `"year"|"month"|"day"|"hour"|"minute"|"second"`. 날짜 함수 단위.

노드 인터페이스 군(각 `expr` 메서드와 1:1, SQL 의미는 [expr.md](./expr.md) 참조):

- 값: `ExprColumn`(컬럼 참조, `path: string[]`), `ExprValue`(리터럴), `ExprRaw`(raw SQL + 파라미터).
- 비교/논리: 위 `WhereExpr` 멤버들.
- 문자열: `ExprConcat`/`Left`/`Right`/`Trim`/`PadStart`/`Replace`/`Upper`/`Lower`/`Length`/`ByteLength`/`Substring`/`IndexOf`.
- 숫자: `ExprAbs`/`Round`(+`digits`)/`Ceil`/`Floor`.
- 날짜: `ExprYear`/`Month`/`Day`/`Hour`/`Minute`/`Second`/`IsoWeek`/`IsoWeekStartDate`/`IsoYearMonth`/`DateDiff`/`DateAdd`/`FormatDate`.
- 조건: `ExprCoalesce`/`NullIf`/`Is`/`Switch`(`cases: {when,then}[]`,`else`)/`If`.
- 집계: `ExprCount`(+`distinct?`)/`Sum`/`Avg`/`Max`/`Min`.
- 기타: `ExprGreatest`/`Least`/`RowNum`/`Random`/`Cast`(+`targetType: DataType`).
- 윈도우: `ExprWindow`(`fn: WinFn`, `spec: WinSpec`). `WinSpec`=`{ partitionBy?: Expr[]; orderBy?: [Expr, ("ASC"|"DESC")?][] }`.
- `type WinFn` — 윈도우 함수 유니온: `WinFnRowNumber`/`Rank`/`DenseRank`/`Ntile`(+`n`)/`Lag`/`Lead`(+`offset?`,`default?`)/`FirstValue`/`LastValue`/`Sum`/`Avg`/`Count`/`Min`/`Max`.
- 시스템: `ExprSubquery`(`queryDef: SelectQueryDef`).

## QueryDef AST (`types/query-def.ts`)

`Queryable`/DDL 메서드가 만들고 `QueryBuilder` 가 SQL 로 렌더링하는 쿼리 정의. 모두 `{ type: ... }` 판별.

- `interface QueryDefObjectName` — `{ database?, schema?, name }`. DBMS별 네임스페이스(MySQL `db.name`, MSSQL `db.schema.name`, PG `schema.name`).
- `type QueryDef` — 전체 유니온(DML + DDL + Utils + Meta).
- DML:
  - `SelectQueryDef`(from/as/select/distinct/top/lock/where/joins/orderBy/limit/groupBy/having/with),
    `SelectQueryDefJoin`(+`isSingle?`).
  - `InsertQueryDef`(records/overrideIdentity?/aiColName?/output?), `InsertIfNotExistsQueryDef`, `InsertIntoQueryDef`.
  - `UpdateQueryDef`, `DeleteQueryDef`, `UpsertQueryDef`.
- `interface CudOutputDef` — `{ columns: string[]; pkColNames: string[]; aiColName? }`. INSERT/UPDATE/DELETE OUTPUT 절 정의.
- DDL: `ClearSchemaQueryDef`, `CreateTableQueryDef`, `DropTableQueryDef`, `RenameTableQueryDef`,
  `TruncateQueryDef`, `AddColumnQueryDef`, `DropColumnQueryDef`, `ModifyColumnQueryDef`,
  `RenameColumnQueryDef`, `AddPrimaryKeyQueryDef`, `DropPrimaryKeyQueryDef`, `AddForeignKeyQueryDef`,
  `DropForeignKeyQueryDef`, `AddIndexQueryDef`, `DropIndexQueryDef`, `CreateViewQueryDef`,
  `DropViewQueryDef`, `CreateProcQueryDef`, `DropProcQueryDef`, `ExecProcQueryDef`.
- Utils/Meta: `SwitchFkQueryDef`(FK on/off), `SchemaExistsQueryDef`.
- `const DDL_TYPES` — DDL `type` 문자열 배열(`satisfies` 로 `DdlQueryDef` 와 동기화).
  - `switchFk`/`execProc` 제외(트랜잭션 내 허용).
  - `executeDefs` 의 트랜잭션 내 DDL 차단에 사용.
- `type DdlType` — `DDL_TYPES[number]` 유니온.

## 결과 파싱 유틸 (`utils/`)

- `parseQueryResult(rawResults, meta: ResultMeta): Promise<TRecord[] | undefined>`
  — 원시 결과를 `ResultMeta` 기준으로 타입 변환 + JOIN 중첩 그룹핑.
  - async 전용(대량 처리 시 100건마다 이벤트 루프 양보).
  - 빈 입력, 전부 빈 객체면 `undefined`.
  - JOIN 없으면 단순 파싱, 있으면 깊이순 재귀 그룹핑(`isSingle` 관계에 다른 값 충돌 시 throw).
  - 타입 파싱 실패 시 throw.
- `pickResultSets(rawResults, buildResult)`
  — 다중 결과 셋에서 `QueryBuildResult` 의 `resultSetIndex`/`resultSetStride` 에 따라 필요한 셋만 추출.
  - index 없으면 첫 셋, stride 없으면 index 셋, 있으면 index 부터 stride 간격 셋을 concat.

## QueryBuilder — dialect SQL 렌더링 (`query-builder/`)

`QueryDef`/`Expr` AST 를 dialect SQL 문자열로 변환. executor 구현체가 사용.

- `createQueryBuilder(dialect: Dialect): QueryBuilderBase` — dialect 에 맞는 QueryBuilder 인스턴스 생성(팩토리).
- `abstract class QueryBuilderBase` — QueryDef→SQL 추상 베이스.
  - `build(def: QueryDef): QueryBuildResult` 가 `def.type` 으로 메서드 dispatch.
  - dialect 공통 렌더링(where/orderBy/groupBy/having/join/from, LATERAL, 재귀 self-join 감지)을 제공하고,
    DML/DDL 별 렌더는 abstract.
- `abstract class ExprRendererBase` — Expr→SQL 추상 베이스. 생성자에 `buildSelect` 콜백 주입.
  - `render(expr)` 가 `expr.type` dispatch, `renderWhere(exprs)` 는 AND 결합.
  - public 유틸 `wrap(name)`(식별자 인용), `escapeString(value)`, `escapeValue(value)` 는 abstract.
- dialect 구현 클래스(각 `QueryBuilderBase`/`ExprRendererBase` 확장):
  `MysqlQueryBuilder`+`MysqlExprRenderer`, `MssqlQueryBuilder`+`MssqlExprRenderer`,
  `PostgresqlQueryBuilder`+`PostgresqlExprRenderer`.
  - dialect 차이(OUTPUT/LIMIT/식별자 인용/FK, 시퀀스 처리 등)를 각자 구현합니다.
