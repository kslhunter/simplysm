# @simplysm/orm-common

Dialect 독립 ORM 코어. `DbContext` 상속으로 테이블/뷰/프로시저를 등록하고, fluent builder + Expr AST 로 쿼리를 구성하면, 각 DBMS(MySQL/MSSQL/PostgreSQL) QueryBuilder 가 SQL 로 렌더한다. 실제 connect/execute 는 외부 executor 가 구현 (서버=`@simplysm/orm-node`, 클라이언트=`@simplysm/service-client` 의 OrmServiceClient).

## 사용 트리거 인덱스

- **`DbContext` (abstract class)** — DB 1개에 매핑되는 서브클래스를 만들 때. `protected queryable(Builder)` / `executable(Builder)` 로 테이블·뷰·프로시저를 인스턴스 프로퍼티로 등록, `connect()`/`transaction()` 로 실행 경계 잡고, DDL/`initialize()` 로 스키마 만들 때. 자세히: [db-context.md](./db-context.md)
- **Schema Builders** — `Table(name)`, `View(name)`, `Procedure(name)` 로 스키마 객체 정의할 때. Column / Index / Relation factory 포함. 자세히: [schema-builders.md](./schema-builders.md)
- **`Queryable` / `queryable()`** — `DbContext` 에 등록된 테이블/뷰에서 SELECT/INSERT/UPDATE/DELETE/UPSERT 빌더 체이닝, JOIN/include/recursive CTE/UNION/search 할 때. 자세히: [queryable.md](./queryable.md)
- **`Executable` / `executable()`** — 등록된 프로시저 호출 결과 받을 때. 자세히: [executable.md](./executable.md)
- **`expr` namespace + `ExprUnit`/`WhereExprUnit`** — `where`/`select`/`groupBy`/`having`/`update` 콜백 안에서 비교·논리·문자열·날짜·집계·윈도우·CASE·subquery 등 SQL 표현식 만들 때. dialect 독립 AST. 자세히: [expr.md](./expr.md)
- **`parseSearchQuery(text)`** — `Queryable.search()` 내부에서 쓰는 OR/`+`AND/`-`NOT/`"…"`/`*` 구문 파서. 직접 LIKE 패턴이 필요할 때만 외부 사용. (`ParsedSearchQuery` = `{ or, must, not }`)
- **`createQueryBuilder(dialect)`** — `Dialect` 문자열로 dialect 별 QueryBuilder 인스턴스 받을 때 (executor 진입점).
- **`QueryBuilderBase` / `ExprRendererBase`** — 커스텀 dialect 구현을 위해 상속 베이스 필요할 때.
- **`MysqlQueryBuilder` / `MssqlQueryBuilder` / `PostgresqlQueryBuilder`** (와 대응 `*ExprRenderer`) — 특정 dialect 인스턴스를 직접 new 하거나 `instanceof` 분기할 때. 일반은 `createQueryBuilder` 사용.
- **`QueryDef` (union) + `QueryDefObjectName` (`./types/query-def`)** — executor 가 받는 query AST 의 union 타입 / 모든 DDL/DML 이 공통으로 쓰는 `{database?, schema?, name}` 형태의 DB 객체 식별자.
- **`SelectQueryDef`, `InsertQueryDef`, `InsertIfNotExistsQueryDef`, `InsertIntoQueryDef`, `UpdateQueryDef`, `DeleteQueryDef`, `UpsertQueryDef`, `SelectQueryDefJoin`, `CudOutputDef`** — DML AST 노드를 직접 만들거나 검사할 때 (executor·테스트).
- **DDL QueryDef (`Create*` / `Drop*` / `Rename*` / `Add*` / `Modify*` / `Truncate*` / `Clear*` / `Schema*` / `ExecProc*` 등)** — 스키마 변경/프로시저 호출 AST 를 직접 다룰 때 (`getXxxQueryDef()` 반환 타입과 일치).
- **`DDL_TYPES` (배열) / `DdlType` (union)** — query 가 DDL 인지 런타임/타입 레벨에서 검사할 때. 트랜잭션 내 DDL 차단 가드에서 사용.
- **`Expr` (union) / `WhereExpr` (union)** — SELECT·ORDER BY·SET 콜백이 모두 받는 일반 표현식 AST 와, WHERE·HAVING 전용 boolean 표현식 AST. ExprRenderer 가 dispatch 하는 대상.
- **개별 Expr 노드 (`ExprColumn`, `ExprValue`, `ExprRaw`, `ExprEq`, `ExprLike`, `ExprConcat`, `ExprDateDiff`, `ExprSwitch`, `ExprCount`, `ExprWindow`, `ExprSubquery` …)** — Expr renderer 구현, AST 검사, 디버깅 시 개별 노드 타입 필요할 때. 응용 코드는 `expr.*` 헬퍼만 사용.
- **`WinFn` (union) / `WinSpec` / `WinFn*` 개별 노드** — Window 함수 AST 분기 (`rowNumber`, `rank`, `lag`, `sumOver` 등) 를 직접 처리할 때.
- **`DateUnit`** — `dateDiff`/`dateAdd` 의 단위 union (`"year" | "month" | "day" | "hour" | "minute" | "second"`). 동적으로 단위 선택할 때.
- **`DataType` (`./types/column`)** — SQL 타입 union (`{type:"int"}` / `{type:"varchar",length}` / `{type:"decimal",precision,scale?}` ...). DDL/cast 의 타입 인자.
- **`ColumnPrimitive` / `ColumnPrimitiveStr` / `ColumnPrimitiveMap`** — Column 값으로 허용되는 TS 타입 union (`string|number|boolean|DateTime|DateOnly|Time|Uuid|Bytes|undefined`), 그 키 이름 union, 키→타입 매핑. ExprUnit/ResultMeta 가 사용.
- **`ColumnMeta`** — `ColumnBuilder.meta` 의 형태 (`{type, dataType, autoIncrement?, nullable?, default?, description?}`). 외부에서 column 정의를 읽어 DDL 만들 때.
- **`dataTypeStrToColumnPrimitiveStr`** — `DataType.type` → `ColumnPrimitiveStr` 상수 매핑. cast 결과 dataType 추론에 사용.
- **`InferColumnPrimitiveFromDataType<T>`** — `DataType` 타입에서 TS 값 타입 추론 (제네릭 타입 유틸).
- **`inferColumnPrimitiveStr(value)`** — 런타임 값에서 `ColumnPrimitiveStr` 추론. NULL/unknown 이면 throw.
- **`Dialect`** — `"mysql" | "mssql" | "postgresql"` union. dialect 분기/`createQueryBuilder` 인자.
- **`dialects`** — `Dialect[]` 상수 배열. 테스트의 `it.each(dialects)` 또는 모든 dialect 순회용.
- **`DataRecord`** — query 결과 row 의 재귀 타입 (`{ [key]: ColumnPrimitive | DataRecord | DataRecord[] }`). Queryable/Executable 의 결과 제약.
- **`DbContextExecutor`** — 외부에서 DbContext 에 주입할 executor 인터페이스 (`connect`/`close`/`beginTransaction`/`commitTransaction`/`rollbackTransaction`/`executeDefs`). 신규 dialect/원격 executor 구현 시.
- **`ResultMeta`** — `executeDefs` 가 받는 `{columns: Record<string,ColumnPrimitiveStr>, joins: Record<string,{isSingle}>}`. raw row → 타입 변환·JOIN 그룹핑에 필요.
- **`IsolationLevel`** — `"READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE"`. `connect`/`transaction` 인자.
- **`Migration`** — `{name, up(db)}`. DbContext 서브클래스의 `migrations` 프로퍼티 타입. `initialize()` 가 적용.
- **`QueryBuildResult`** — `QueryBuilder.build()` 반환 (`{sql, resultSetIndex?, resultSetStride?}`). executor 가 `pickResultSets` 로 좁힐 때 필요.
- **`DbContextBase` (`./types/db-context-def`)** — DbContext 의 코어 인터페이스 (`status`/`database`/`schema`/`executeDefs`/`getNextAlias` 등). Queryable·Executable·ViewBuilder 가 의존하므로 mock/대체 구현 시 사용.
- **`DbContextStatus`** — `"ready" | "connect" | "transact"`. status 분기 시.
- **`DbContextDdlMethods`** — `createTable`/`addColumn`/`addForeignKey` 등 DDL 메서드 집합 인터페이스. `Migration.up` 의 db 인자 타입.
- **`DbTransactionError`** — executor 가 트랜잭션 에러를 표준화해 throw 하는 클래스. 호출측은 `instanceof DbTransactionError` 로 분기.
- **`DbErrorCode`** — `NO_ACTIVE_TRANSACTION` / `TRANSACTION_ALREADY_STARTED` / `DEADLOCK` / `LOCK_TIMEOUT` enum. `err.code === DbErrorCode.DEADLOCK` 같은 분기에 사용.
- **`parseQueryResult(rows, meta)` (`./utils/result-parser`)** — flat row 배열 + `ResultMeta` → 타입 변환 + JOIN 그룹핑된 중첩 객체 배열. async. 빈 결과면 undefined. executor 가 SELECT/OUTPUT 결과를 사용자 객체로 가공할 때.
- **`pickResultSets(rawResults, buildResult)` (`./utils/pick-result-sets`)** — `QueryBuildResult` 의 `resultSetIndex`/`resultSetStride` 따라 여러 결과 셋 중 필요한 셋만 추출/concat. MySQL 배치 INSERT 의 OUTPUT SELECT 만 모을 때.
- **`_Migration`** — `_migration(code PK varchar(255))` 시스템 테이블의 TableBuilder. DbContext 가 자동 등록, 사용자 직접 import 불필요.
- **`SD_BUILDER`** — `queryable()`/`executable()` 팩토리 함수에 builder 를 부착하는 심볼. `initialize()` 가 DbContext 의 프로퍼티에서 builder 를 회수할 때 사용. 사용자 코드 직접 사용 X.

## QueryBuilder (인라인)

```ts
import { createQueryBuilder } from "@simplysm/orm-common";
const qb = createQueryBuilder("mysql"); // | "mssql" | "postgresql"
const { sql, resultSetIndex, resultSetStride } = qb.build(queryDef);
```

`QueryBuilderBase.build(def)` 가 `def.type` 으로 동적 dispatch 하여 dialect 별 메서드 호출. 결과는 `QueryBuildResult { sql; resultSetIndex?; resultSetStride? }` — 여러 result set 이 돌아오는 dialect 별 패턴(MySQL OUTPUT INSERT 등)을 위해 추출 인덱스/스트라이드 동봉. executor 는 받은 raw set 배열을 `pickResultSets(raw, buildResult)` 로 좁힌다.

`createQueryBuilder(dialect)` 외에 dialect 클래스(`MysqlQueryBuilder`/`MssqlQueryBuilder`/`PostgresqlQueryBuilder` 와 대응 `*ExprRenderer`)도 export. 일반적으로 `createQueryBuilder` 만 쓰면 충분, 커스텀 확장 시 `QueryBuilderBase`/`ExprRendererBase` 상속.
