# @simplysm/orm-common — 타입·실행 엔진 내부

executor·어댑터를 구현하거나 QueryDef/Expr AST·결과 메타를 직접 다루고, QueryDef 를 dialect SQL 로 렌더링하거나 raw 결과를 TS 객체로 환원할 때 참조하는 묶음. 일반 쿼리 작성에서는 expr/Queryable 가 이 타입들을 가려주므로 직접 쓸 일이 적다.

## Column 타입

- `type DataType` — SQL 타입 union. `{type:"int"}`/`{type:"bigint"}`/`{type:"float"}`/`{type:"double"}`/`{type:"decimal";precision;scale?}`/`{type:"varchar";length}`/`{type:"char";length}`/`{type:"text"}`/`{type:"binary"}`/`{type:"boolean"}`/`{type:"datetime"}`/`{type:"date"}`/`{type:"time"}`/`{type:"uuid"}`. cast/DDL 에서 사용.
- `type ColumnPrimitiveMap` — TS 타입 이름→실제 타입(`string`/`number`/`boolean`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`Bytes`).
- `type ColumnPrimitiveStr` — 위 맵의 키(`"string"` 등). ExprUnit.dataType 의 타입.
- `type ColumnPrimitive` — 저장 가능한 모든 원시값 `| undefined`(undefined=NULL).
- `const dataTypeStrToColumnPrimitiveStr` — SQL 타입명→TS 타입명 매핑 객체(`int→"number"`, `datetime→"DateTime"` 등).
- `type InferColumnPrimitiveFromDataType<T>` — DataType 에서 TS 타입 추론(cast 결과 타입).
- `function inferColumnPrimitiveStr(value): ColumnPrimitiveStr` — 런타임 값에서 타입명 추론. NULL 이면 throw(추론 불가).
- `interface ColumnMeta` — 컬럼 메타: `type`(ColumnPrimitiveStr), `dataType`, `autoIncrement?`, `nullable?`, `default?`, `description?`.

## Database 타입

- `type Dialect = "mysql" | "mssql" | "postgresql"` — 지원 DBMS.
- `const dialects: Dialect[]` — 전 dialect 목록(테스트 `it.each` 등에).
- `type IsolationLevel` — `"READ_UNCOMMITTED"|"READ_COMMITTED"|"REPEATABLE_READ"|"SERIALIZABLE"`. 트랜잭션 격리(엄격도 순).
- `type DataRecord` — 재귀 결과 행 타입(`{ [k]: ColumnPrimitive | DataRecord | DataRecord[] }`). include 중첩 표현.
- `interface QueryBuildResult` — QueryBuilder.build() 반환: `sql`(렌더된 SQL), `resultSetIndex?`(가져올 결과셋 인덱스, 기본 0), `resultSetStride?`(N번째마다 추출, MySQL 배치 INSERT 의 SELECT 만 모을 때).
- `interface ResultMeta` — 결과 변환 메타: `columns`(컬럼키→ColumnPrimitiveStr), `joins`(조인키→`{isSingle}`). `parseQueryResult` 입력.

## Executor / Migration 인터페이스

- `interface DbContextExecutor` — DB 연결·실행 계약(orm-node 등이 구현). `connect()`/`close()`/`beginTransaction(isolationLevel?)`/`commitTransaction()`/`rollbackTransaction()`/`executeDefs<T>(defs, resultMetas?): Promise<T[][]>`. 새 DB 어댑터 작성 시 이 면을 채움.
- `interface Migration` — `{ name; up(db) }` ([db-context.md](./db-context.md) 참조).

## QueryDef AST

`type QueryDef` 는 DML+DDL+Utils+Meta 의 union. executor 의 `executeDefs` 가 받고 QueryBuilder 가 SQL 로 변환.

- 공통: `interface QueryDefObjectName` — `{ database?; schema?; name }`(dialect별 네임스페이스: MySQL `db.name`, MSSQL `db.schema.name`, PG `schema.name`). `interface CudOutputDef` — `{ columns; pkColNames; aiColName? }`(CUD OUTPUT).
- DML: `SelectQueryDef`(from/select/where/joins/orderBy/limit/groupBy/having/with/distinct/top/lock), `SelectQueryDefJoin`(+`isSingle?`), `InsertQueryDef`(records/overrideIdentity?/output?), `InsertIfNotExistsQueryDef`(record/existsSelectQuery), `InsertIntoQueryDef`(recordsSelectQuery), `UpdateQueryDef`(record/where/joins), `DeleteQueryDef`, `UpsertQueryDef`(existsSelectQuery/insertRecord/updateRecord).
- DDL: `ClearSchemaQueryDef`, `CreateTableQueryDef`/`DropTableQueryDef`/`RenameTableQueryDef`/`TruncateQueryDef`, `AddColumnQueryDef`/`DropColumnQueryDef`/`ModifyColumnQueryDef`/`RenameColumnQueryDef`, `AddPrimaryKeyQueryDef`/`DropPrimaryKeyQueryDef`/`AddForeignKeyQueryDef`/`DropForeignKeyQueryDef`/`AddIndexQueryDef`/`DropIndexQueryDef`, `CreateViewQueryDef`/`DropViewQueryDef`/`CreateProcQueryDef`/`DropProcQueryDef`/`ExecProcQueryDef`.
- Utils/Meta: `SwitchFkQueryDef`(`table`/`enabled`), `SchemaExistsQueryDef`.
- `const DDL_TYPES` — DDL QueryDef 의 `type` 문자열 배열(`switchFk` 제외 — 트랜잭션 내 허용). `transact` 중 DDL 차단 검사·검증에. `type DdlType` — 그 union.

## Expr AST

- `type Expr` — 값/문자열/숫자/날짜/조건/집계/window 표현식의 전체 union.
- `type WhereExpr` — 비교·논리·NULL·LIKE·IN·EXISTS 등 WHERE 전용 union.
- `type DateUnit = "year"|"month"|"day"|"hour"|"minute"|"second"` — dateDiff/dateAdd 단위.
- `interface WinSpec` — `{ partitionBy?: Expr[]; orderBy?: [Expr, ("ASC"|"DESC")?][] }`(window OVER 절 AST).
- 노드별 인터페이스: `ExprColumn`(`path`), `ExprValue`(`value`), `ExprRaw`(`sql`/`params`), 비교 `ExprEq`/`ExprGt`/`ExprLt`/`ExprGte`/`ExprLte`/`ExprBetween`/`ExprIsNull`/`ExprLike`/`ExprRegexp`/`ExprIn`/`ExprInQuery`/`ExprExists`, 논리 `ExprNot`/`ExprAnd`/`ExprOr`, 문자열·숫자·날짜·조건·집계·기타(`ExprConcat`...`ExprSubquery`), window `ExprWindow` 등. 각 노드는 `type` 디스크리미네이터 + 피연산자 필드를 가진 평범한 데이터 객체.

## dialect QueryBuilder (SQL 렌더러)

QueryDef → SQL 문자열 변환. executor 구현체가 사용.

- `createQueryBuilder(dialect: Dialect): QueryBuilderBase` — dialect 에 맞는 빌더 인스턴스 생성(mysql→Mysql, mssql→Mssql, postgresql→Postgresql).
- `abstract class QueryBuilderBase` — 렌더링 기반. `build(def): QueryBuildResult` 가 `def.type` 이름의 메서드로 동적 dispatch(미지원 타입이면 throw). 공통 절 렌더링(WHERE/ORDER BY/GROUP BY/HAVING/JOIN/FROM)은 구현, dialect 차이는 abstract(select/insert/... DML, 각 DDL, tableName/renderJoin). LATERAL/CROSS APPLY 필요 감지(`needsLateral`), 재귀 self 조인 감지(`isRecursiveSelfJoin`) 보조.
- `class MysqlQueryBuilder` / `class MssqlQueryBuilder` / `class PostgresqlQueryBuilder` — `QueryBuilderBase` 의 dialect 구현체.
- `abstract class ExprRendererBase` — `Expr`/`WhereExpr` 노드를 SQL 조각으로 렌더링하는 추상 기반. `class MysqlExprRenderer`/`class MssqlExprRenderer`/`class PostgresqlExprRenderer` 가 dialect 구현. QueryBuilder 내부에서 식별자 wrap·표현식 변환에 사용.

## 결과 파싱 유틸

executor 가 DB raw 결과를 TS 객체로 환원할 때 사용. 일반 사용자는 직접 호출하지 않음.

- `parseQueryResult<T>(rawResults, meta: ResultMeta): Promise<T[] | undefined>` — flat raw 행 배열을 `meta.columns`(키→타입)로 타입 변환하고 `meta.joins`(키→`{isSingle}`)로 중첩 그룹핑. 입력이 비었거나 파싱 후 전부 빈 객체면 undefined. async 전용(100행마다 이벤트 루프 양보). `isSingle:true` 관계에 서로 다른 다건이 매칭되면 throw.
- `pickResultSets<T>(rawResults: T[][], buildResult): T[]` — 다중 결과셋 추출. `resultSetIndex` 없으면 첫 셋, `resultSetStride` 없으면 해당 인덱스 셋, 있으면 인덱스부터 stride 간격으로 concat(MySQL 배치 INSERT 의 SELECT 결과만 모을 때).
