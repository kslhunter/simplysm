# @simplysm/orm-common — 하위 타입 / QueryDef·Expr AST / QueryBuilder / 결과 파싱

executor·QueryBuilder 를 직접 구현하거나, `QueryDef`/`Expr` AST·column 타입을 다루거나, 원시 DB 결과를 TS 객체로 환원할 때 참조하는 묶음. 일반 쿼리 작성에서는 expr/Queryable 가 이 타입들을 가려주므로 직접 쓸 일이 적다.

## Database / Executor 타입

- `Dialect` (type) — `"mysql" | "mssql" | "postgresql"`. 지원 DBMS.
- `dialects` (const) — `Dialect[]` 전체 목록. dialect 별 검증 테스트 루프에 사용.
- `IsolationLevel` (type) — `"READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE"`. 트랜잭션 격리 수준(`connect`/`transaction` 인자).
- `DbContextExecutor` (interface) — 실제 DB 연결·실행 어댑터 계약. `connect()`/`close()`/`beginTransaction(isolationLevel?)`/`commitTransaction()`/`rollbackTransaction()`/`executeDefs(defs, resultMetas?)` 구현 필요. 서버(node)·클라이언트(service-client)가 각각 구현해 `DbContext` 생성자에 주입.
- `DataRecord` (type) — `{ [key: string]: ColumnPrimitive | DataRecord | DataRecord[] }`. 재귀적 결과 레코드(중첩 include 표현).
- `ResultMeta` (interface) — 결과 변환 메타. `columns`=컬럼명→`ColumnPrimitiveStr` 매핑(타입 파싱용), `joins`=조인 alias→`{ isSingle }`(단일/배열 중첩 구분). `Queryable.getResultMeta()` 가 생성, `parseQueryResult` 가 소비.
- `QueryBuildResult` (interface) — `QueryBuilder.build()` 반환. `sql`=빌드된 SQL, `resultSetIndex`=결과를 가져올 셋 인덱스(기본 0; MySQL INSERT+OUTPUT 은 1), `resultSetStride`=다중 결과에서 N번째마다 추출(MySQL 배치 INSERT 의 SELECT 만 모을 때).
- `Migration` (interface) — db-context.md 참조(여기서도 재노출).

## Column 원시 타입

- `DataType` (type) — SQL 데이터 타입 union(`{ type: "int" }`, `{ type: "decimal"; precision; scale? }`, `{ type: "varchar"; length }`, `char`/`text`/`binary`/`boolean`/`datetime`/`date`/`time`/`uuid`, `bigint`/`float`/`double`). `cast`/DDL 컬럼 정의에 사용.
- `ColumnPrimitiveMap` (type) — 타입명→실제 TS 타입 매핑(`string`/`number`/`boolean`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`Bytes`).
- `ColumnPrimitiveStr` (type) — `keyof ColumnPrimitiveMap`(타입명 문자열). `ExprUnit.dataType` 의 타입.
- `ColumnPrimitive` (type) — 저장 가능한 모든 원시 값 `| undefined`(undefined=NULL).
- `ColumnMeta` (interface) — 컬럼 메타(`type`/`dataType`/`autoIncrement?`/`nullable?`/`default?`/`description?`). `ColumnBuilder.meta`.
- `dataTypeStrToColumnPrimitiveStr` (const) — SQL 타입명→TS 타입명 매핑 테이블(`int`→`"number"`, `datetime`→`"DateTime"` 등).
- `InferColumnPrimitiveFromDataType<T>` (type) — `DataType` 에서 TS 타입 추론.
- `inferColumnPrimitiveStr(value)` (function) — 런타임 값에서 `ColumnPrimitiveStr` 추론. NULL 이면 추론 불가로 throw. 리터럴을 ExprUnit 으로 자동 래핑할 때 사용.

## Expr AST 타입

`Expr` 는 모든 표현식 노드의 union, `WhereExpr` 는 WHERE 절용(비교+논리) union. `expr.*` 빌더가 이 AST 를 만들고, `ExprRendererBase` 가 SQL 로 렌더링한다. 각 노드는 `type` 판별 필드를 가진 interface:

- 값: `ExprColumn`(컬럼 참조 `path`), `ExprValue`(리터럴 `value`), `ExprRaw`(`sql`+`params`).
- 비교: `ExprEq`/`ExprGt`/`ExprLt`/`ExprGte`/`ExprLte`/`ExprBetween`/`ExprIsNull`/`ExprLike`/`ExprRegexp`/`ExprIn`/`ExprInQuery`/`ExprExists`.
- 논리: `ExprNot`/`ExprAnd`/`ExprOr`.
- 문자열: `ExprConcat`/`ExprLeft`/`ExprRight`/`ExprTrim`/`ExprPadStart`/`ExprReplace`/`ExprUpper`/`ExprLower`/`ExprLength`/`ExprByteLength`/`ExprSubstring`/`ExprIndexOf`.
- 숫자: `ExprAbs`/`ExprRound`/`ExprCeil`/`ExprFloor`.
- 날짜: `ExprYear`/`ExprMonth`/`ExprDay`/`ExprHour`/`ExprMinute`/`ExprSecond`/`ExprIsoWeek`/`ExprIsoWeekStartDate`/`ExprIsoYearMonth`/`ExprDateDiff`/`ExprDateAdd`/`ExprFormatDate`.
- 조건: `ExprCoalesce`/`ExprNullIf`/`ExprIs`/`ExprSwitch`/`ExprIf`.
- 집계: `ExprCount`/`ExprSum`/`ExprAvg`/`ExprMax`/`ExprMin`.
- 기타: `ExprGreatest`/`ExprLeast`/`ExprRowNum`/`ExprRandom`/`ExprCast`/`ExprSubquery`.
- 윈도우: `ExprWindow`(`fn`=`WinFn`, `spec`=`WinSpec`). `WinFn` union = `WinFnRowNumber`/`WinFnRank`/`WinFnDenseRank`/`WinFnNtile`/`WinFnLag`/`WinFnLead`/`WinFnFirstValue`/`WinFnLastValue`/`WinFnSum`/`WinFnAvg`/`WinFnCount`/`WinFnMin`/`WinFnMax`. `WinSpec`=`{ partitionBy?: Expr[]; orderBy?: [Expr, dir?][] }`.
- `DateUnit` (type) — `"year"|"month"|"day"|"hour"|"minute"|"second"`. dateDiff/dateAdd 단위.

## QueryDef AST 타입

`QueryDef` 는 모든 쿼리 정의 union. `Queryable`/`DbContext` 가 생성하고 `executeDefs`·QueryBuilder 가 소비. 각자 `type` 판별 필드:

- 공통: `QueryDefObjectName`(`database?`/`schema?`/`name` — dialect 별 네임스페이스), `CudOutputDef`(`columns`/`pkColNames`/`aiColName?` — CUD OUTPUT 절).
- DML: `SelectQueryDef`(from/as/select/distinct/top/lock/where/joins/orderBy/limit/groupBy/having/with), `SelectQueryDefJoin`(SelectQueryDef + `isSingle?`), `InsertQueryDef`(`records`/`overrideIdentity?`/`aiColName?`/`output?` — overrideIdentity 는 AI 컬럼에 명시값 삽입 시, aiColName 은 PostgreSQL 시퀀스 보정용), `InsertIfNotExistsQueryDef`, `InsertIntoQueryDef`, `UpdateQueryDef`, `DeleteQueryDef`, `UpsertQueryDef`.
- DDL: `CreateTableQueryDef`/`DropTableQueryDef`/`RenameTableQueryDef`/`TruncateQueryDef`, `AddColumnQueryDef`/`DropColumnQueryDef`/`ModifyColumnQueryDef`/`RenameColumnQueryDef`, `AddPrimaryKeyQueryDef`/`DropPrimaryKeyQueryDef`, `AddForeignKeyQueryDef`/`DropForeignKeyQueryDef`, `AddIndexQueryDef`/`DropIndexQueryDef`, `CreateViewQueryDef`/`DropViewQueryDef`, `CreateProcQueryDef`/`DropProcQueryDef`/`ExecProcQueryDef`, `ClearSchemaQueryDef`.
- Utils/Meta: `SwitchFkQueryDef`(`enabled` — DDL 아님, 트랜잭션 내 사용 가능), `SchemaExistsQueryDef`.
- `DDL_TYPES` (const) — DDL 타입 문자열 배열(`["createTable", ...]`). 트랜잭션 내 DDL 차단·검증에 사용(`switchFk` 는 제외). `DdlType` (type) = `(typeof DDL_TYPES)[number]`.

## QueryBuilder (dialect 별 SQL 렌더링)

- `createQueryBuilder(dialect)` (function) — `Dialect` 에 맞는 `QueryBuilderBase` 인스턴스 반환(mysql→`MysqlQueryBuilder` 등). QueryDef 를 SQL 로 변환할 때의 진입점.
- `QueryBuilderBase` (abstract class) — QueryDef→SQL 추상 기본. `build(def)` 가 `def.type` 으로 동적 dispatch 해 `QueryBuildResult` 반환. dialect 공통 로직(WHERE/ORDER BY/GROUP BY/JOIN 렌더 골격) 구현, 차이나는 부분은 abstract(`tableName`/`renderJoin`/`renderLimit` 등). 새 dialect 추가 시 상속.
- `ExprRendererBase` (abstract class) — Expr→SQL 추상 기본. `render(expr)` 가 `expr.type` 으로 dispatch. `wrap(name)`(식별자 감싸기: MySQL `` `name` ``, MSSQL `[name]`, PostgreSQL `"name"`)·`escapeString(value)`·`escapeValue(value)` 는 abstract.
- dialect 구현체: `MysqlQueryBuilder`/`MysqlExprRenderer`, `MssqlQueryBuilder`/`MssqlExprRenderer`, `PostgresqlQueryBuilder`/`PostgresqlExprRenderer`. 보통 `createQueryBuilder` 로 얻고 직접 `new` 하지 않음.

## 결과 파싱

- `parseQueryResult(rawResults, meta)` (function) — 원시 DB 결과 배열을 `ResultMeta` 기준으로 타입 변환·JOIN 중첩한 객체 배열로 환원. async 전용(대량 처리 중 이벤트 루프 양보). 입력이 비었거나 파싱 후 전부 빈 객체면 `undefined` 반환. 타입 파싱 실패 시 throw. `meta` 없이 부를 이유 없음(입력=출력).
  - 평탄 키 `"posts.id"` → 중첩 `{ posts: { id } }` 로 변환. `joins[key].isSingle` 에 따라 배열/단일 객체로 그룹핑. `isSingle: true` 인데 서로 다른 결과가 여럿이면 throw.
- `pickResultSets(rawResults, buildResult)` (function) — 다중 결과셋에서 `QueryBuildResult` 메타(`resultSetIndex`/`resultSetStride`)에 따라 필요한 셋만 추출. `resultSetIndex` 없으면 첫 셋, `stride` 없으면 해당 인덱스 단일 셋, `stride` 있으면 인덱스부터 stride 간격 셋을 concat(MySQL 배치 INSERT 의 SELECT 결과만 모을 때).
