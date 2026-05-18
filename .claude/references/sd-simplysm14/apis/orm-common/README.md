# @simplysm/orm-common

Dialect 독립 ORM 코어. `DbContext` 상속으로 테이블/뷰/프로시저를 등록하고, fluent builder + Expr AST 로 쿼리를 구성하면, 각 DBMS(MySQL/MSSQL/PostgreSQL) QueryBuilder 가 SQL 로 렌더한다. 실제 connect/execute 는 외부 executor 가 구현 (서버=`@simplysm/orm-node`, 클라이언트=`@simplysm/service-client` 의 OrmServiceClient).

## 사용 트리거 인덱스

- **`DbContext` (abstract class)** — DB 1개에 매핑되는 서브클래스를 만들 때. `protected queryable(Builder)` / `executable(Builder)` 로 테이블·뷰·프로시저를 인스턴스 프로퍼티로 등록, `connect()`/`transaction()` 로 실행 경계 잡고, DDL/`initialize()` 로 스키마 만들 때. 자세히: [db-context.md](./db-context.md)
- **Schema Builders** — `Table(name)`, `View(name)`, `Procedure(name)` 로 스키마 객체 정의할 때. Column / Index / Relation factory 포함. 자세히: [schema-builders.md](./schema-builders.md)
- **`Queryable` / `queryable()`** — `DbContext` 에 등록된 테이블/뷰에서 SELECT/INSERT/UPDATE/DELETE/UPSERT 빌더 체이닝, JOIN/include/recursive CTE/UNION/search 할 때. 자세히: [queryable.md](./queryable.md)
- **`Executable` / `executable()`** — 등록된 프로시저 호출 결과 받을 때. 자세히: [executable.md](./executable.md)
- **`expr` namespace + `ExprUnit`/`WhereExprUnit`** — `where`/`select`/`groupBy`/`having`/`update` 콜백 안에서 비교·논리·문자열·날짜·집계·윈도우·CASE·subquery 등 SQL 표현식 만들 때. dialect 독립 AST. 자세히: [expr.md](./expr.md)
- **`parseSearchQuery(text)`** — `Queryable.search()` 내부에서 쓰는 OR/`+`AND/`-`NOT/`"…"`/`*` 구문 파서. 직접 LIKE 패턴이 필요할 때만 외부 사용.
- **`QueryBuilder` (`createQueryBuilder(dialect)`, `QueryBuilderBase`, `ExprRendererBase`, `*QueryBuilder`, `*ExprRenderer`)** — executor 측에서 `QueryDef` 를 dialect SQL 로 렌더할 때. 응용 코드는 직접 호출 X.
- **`QueryDef` 타입군 (`./types/query-def`)** — executor·테스트에서 빌더가 만든 AST 를 직접 다룰 때. `QueryDef`, `SelectQueryDef`, `InsertQueryDef`, ..., `QueryDefObjectName`, `DDL_TYPES`, `DdlType`.
- **`Expr` 타입군 (`./types/expr`)** — Expr AST 노드 타입(`ExprColumn`/`ExprValue`/`ExprRaw`/`ExprEq`/...`ExprWindow`/`ExprSubquery`). `DateUnit`. ExprRenderer 구현·검사에서 사용.
- **`DataType` / `ColumnPrimitive*` (`./types/column`)** — SQL DataType union(`int`/`bigint`/`varchar`/`datetime`/`uuid`/...) 과 TS 타입 매핑(`ColumnPrimitiveMap`/`ColumnPrimitiveStr`/`ColumnPrimitive`/`ColumnMeta`). `dataTypeStrToColumnPrimitiveStr` 상수, `InferColumnPrimitiveFromDataType<T>` / `inferColumnPrimitiveStr(value)` 런타임 추론.
- **`Dialect` / `dialects` / `DataRecord` / `DbContextExecutor` / `ResultMeta` / `IsolationLevel` / `Migration` / `QueryBuildResult` (`./types/db`)** — executor 구현·DbContext 외부 인터페이스. `Migration[]` 은 DbContext 서브클래스의 `migrations` 프로퍼티로 오버라이드해 `initialize()` 에서 적용.
- **`DbContextBase` / `DbContextStatus` / `DbContextDdlMethods` (`./types/db-context-def`)** — 외부에서 DbContext 를 인터페이스로 다룰 때 (Queryable/Executable/ViewBuilder 가 의존).
- **`DbTransactionError` / `DbErrorCode`** — executor 가 트랜잭션 에러를 표준화해 throw, 호출측은 `instanceof` 로 분기. 코드: `NO_ACTIVE_TRANSACTION`, `TRANSACTION_ALREADY_STARTED`, `DEADLOCK`, `LOCK_TIMEOUT`.
- **`parseResults(rows, meta)` / `pickResultSets(rawResults, buildResult)` (`./utils/*`)** — executor 측 raw 결과 가공. `parseResults` 는 flat row → 중첩 객체(JOIN 그룹핑 + 타입 파싱). `pickResultSets(raw, { resultSetIndex, resultSetStride })` 는 다중 결과 셋에서 필요한 셋만 추출 (예: MySQL 배치 INSERT 의 OUTPUT SELECT).
- **`_Migration` / `SD_BUILDER`** — 내부용. `_Migration` 은 `_migration(code PK)` 시스템 테이블, `SD_BUILDER` 는 `queryable()`/`executable()` 팩토리 함수에 붙는 메타 심볼 (`initialize()` 가 DbContext 의 프로퍼티에서 builder 를 회수할 때 사용).

## QueryBuilder (인라인)

```ts
import { createQueryBuilder } from "@simplysm/orm-common";
const qb = createQueryBuilder("mysql"); // | "mssql" | "postgresql"
const { sql, resultSetIndex, resultSetStride } = qb.build(queryDef);
```

`QueryBuilderBase.build(def)` 가 `def.type` 으로 동적 dispatch 하여 dialect 별 메서드 호출. 결과는 `QueryBuildResult { sql; resultSetIndex?; resultSetStride? }` — 여러 result set 이 돌아오는 dialect 별 패턴(MySQL OUTPUT INSERT 등)을 위해 추출 인덱스/스트라이드 동봉. executor 는 받은 raw set 배열을 `pickResultSets(raw, buildResult)` 로 좁힌다.

`createQueryBuilder(dialect)` 외에 dialect 클래스(`MysqlQueryBuilder`/`MssqlQueryBuilder`/`PostgresqlQueryBuilder` 와 대응 `*ExprRenderer`)도 export. 일반적으로 `createQueryBuilder` 만 쓰면 충분, 커스텀 확장 시 `QueryBuilderBase`/`ExprRendererBase` 상속.
