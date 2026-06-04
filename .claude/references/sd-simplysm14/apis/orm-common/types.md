# @simplysm/orm-common — 하위 타입 / QueryDef AST / QueryBuilder / 결과 파싱

executor·QueryBuilder 를 직접 구현하거나, `QueryDef`/`Expr` AST·column 타입을 다루거나, 원시 결과를 TS 객체로 환원할 때 참조하는 묶음. 일반 쿼리 작성에서는 expr/Queryable 가 이 타입들을 가려주므로 직접 쓸 일이 적다.

## column 타입

- `DataType` — SQL 데이터 타입 union: `{type:"int"}`, `{type:"bigint"}`, `{type:"float"}`, `{type:"double"}`, `{type:"decimal", precision, scale?}`, `{type:"varchar", length}`, `{type:"char", length}`, `{type:"text"}`, `{type:"binary"}`, `{type:"boolean"}`, `{type:"datetime"}`, `{type:"date"}`, `{type:"time"}`, `{type:"uuid"}`. `expr.cast` 의 targetType·DDL column 정의에 사용.
- `ColumnPrimitiveMap` — TS 타입 이름 → 실제 타입 매핑: `string→string`, `number→number`, `boolean→boolean`, `DateTime→DateTime`, `DateOnly→DateOnly`, `Time→Time`, `Uuid→Uuid`, `Bytes→Bytes`.
- `ColumnPrimitiveStr` — `keyof ColumnPrimitiveMap`(타입 이름 문자열). `ExprUnit.dataType`·`val` 의 dataType.
- `ColumnPrimitive` — 저장 가능한 모든 원시 값 union + `undefined`(=NULL).
- `dataTypeStrToColumnPrimitiveStr` (const) — SQL DataType 이름 → TS 타입 이름 매핑 객체(`int→"number"`, `varchar→"string"`, `datetime→"DateTime"` 등). `cast` 가 결과 타입 결정에 사용.
- `InferColumnPrimitiveFromDataType<T>` — `DataType` 에서 TS 값 타입 추론.
- `inferColumnPrimitiveStr(value)` — 런타임 값에서 `ColumnPrimitiveStr` 추론. NULL 이면 추론 불가 throw.
- `ColumnMeta` — column 메타: `{ type: ColumnPrimitiveStr; dataType: DataType; autoIncrement?; nullable?; default?; description? }`. `ColumnBuilder.meta` 타입.

## db 타입

- `Dialect` — `"mysql" | "mssql" | "postgresql"`. 지원 DBMS(MySQL 8.0.14+, MSSQL 2012+, PostgreSQL 9.0+).
- `dialects` (const) — `Dialect[]`(전체 목록). dialect별 테스트 매트릭스에 사용.
- `DataRecord` — 재귀 결과 레코드 타입: `{ [key: string]: ColumnPrimitive | DataRecord | DataRecord[] }`. include 중첩(단일 객체/배열)을 표현.
- `QueryBuildResult` — `build()` 반환: `{ sql: string; resultSetIndex?: number; resultSetStride?: number }`. `resultSetIndex`=결과를 가져올 셋 index(기본 0, 예 MySQL INSERT+OUTPUT 는 1). `resultSetStride`=다중 결과에서 N번째마다 추출(MySQL 배치 INSERT 의 `INSERT;SELECT;...` 에서 SELECT 만 모을 때).
- `IsolationLevel` — 트랜잭션 격리 수준(자세히는 [db-context.md](./db-context.md)).
- `DbContextExecutor` / `ResultMeta` / `Migration` — executor·결과 메타·마이그레이션 정의. [db-context.md](./db-context.md) 참조.

## QueryDef AST (query-def.ts)

`executeDefs`/`build` 가 다루는 쿼리 정의 AST. `Queryable.getXQueryDef()`·`DbContext.getXQueryDef()` 가 생성.

- `QueryDefObjectName` — `{ database?; schema?; name }`. DB 객체 네임스페이스(MySQL `database.name`, MSSQL `database.schema.name`, PostgreSQL `schema.name`).
- DML: `SelectQueryDef`(from/as/select/distinct/top/lock/where/joins/orderBy/limit/groupBy/having/with), `SelectQueryDefJoin`(SelectQueryDef + `isSingle?`), `InsertQueryDef`(records/overrideIdentity?/output?), `InsertIfNotExistsQueryDef`, `InsertIntoQueryDef`, `UpdateQueryDef`, `DeleteQueryDef`, `UpsertQueryDef`.
- `CudOutputDef` — CUD OUTPUT 절: `{ columns: string[]; pkColNames: string[]; aiColName? }`. 삽입/갱신/삭제 행 회수 정의.
- DDL: `ClearSchemaQueryDef`, `CreateTableQueryDef`/`DropTableQueryDef`/`RenameTableQueryDef`/`TruncateQueryDef`, `AddColumnQueryDef`/`DropColumnQueryDef`/`ModifyColumnQueryDef`/`RenameColumnQueryDef`, `AddPrimaryKeyQueryDef`/`DropPrimaryKeyQueryDef`/`AddForeignKeyQueryDef`/`DropForeignKeyQueryDef`/`AddIndexQueryDef`/`DropIndexQueryDef`, `CreateViewQueryDef`/`DropViewQueryDef`/`CreateProcQueryDef`/`DropProcQueryDef`/`ExecProcQueryDef`.
- Utils/Meta: `SwitchFkQueryDef`(`{ table; enabled }`, DDL 아님 — 트랜잭션 가능), `SchemaExistsQueryDef`.
- `DDL_TYPES` (const) — DDL QueryDef type 문자열 배열. 트랜잭션 중 DDL 차단 판정(`switchFk` 는 제외)에 사용.
- `DdlType` — `(typeof DDL_TYPES)[number]`.
- `QueryDef` — 전체 union(DML + DDL + SwitchFk + SchemaExists). `executeDefs(defs: QueryDef[])` 의 원소 타입.

## Expr AST (expr.ts)

`ExprUnit.expr`/`WhereExprUnit.expr` 가 담는 JSON AST. QueryBuilder 의 ExprRenderer 가 SQL 로 변환.

- `Expr` — 전체 표현식 union(값 `ExprColumn`/`ExprValue`/`ExprRaw`, 문자열/숫자/날짜/조건/집계/기타/window `ExprWindow`/시스템 `ExprSubquery`). select/orderBy 등.
- `WhereExpr` — WHERE 전용 union(비교 `ExprEq`/`ExprGt`/.../`ExprIn`/`ExprInQuery`/`ExprExists` + 논리 `ExprNot`/`ExprAnd`/`ExprOr`). where/having.
- 개별 인터페이스(`ExprEq`, `ExprConcat`, `ExprCount`, `ExprCast`, `ExprWindow` 등) — 각 `expr.*` 함수가 만드는 노드. `type` discriminant + 피연산자 필드.
- `DateUnit` — `"year"|"month"|"day"|"hour"|"minute"|"second"`. dateDiff/dateAdd.
- `WinFn` — window 함수 노드 union(`WinFnRowNumber`/`WinFnRank`/`WinFnLag`/`WinFnSum`/...). `WinSpec` — `{ partitionBy?: Expr[]; orderBy?: [Expr,("ASC"|"DESC")?][] }`(OVER 절).

## QueryBuilder (QueryDef → SQL)

직접 SQL 문자열이 필요하거나 dialect 동작을 검증할 때.

- `createQueryBuilder(dialect: Dialect): QueryBuilderBase` — dialect 에 맞는 QueryBuilder 생성(`mysql`→Mysql, `mssql`→Mssql, `postgresql`→Postgresql).
- `QueryBuilderBase` (abstract) — `build(def: QueryDef): QueryBuildResult` 가 공개 진입점. `def.type` 으로 동적 dispatch. 나머지는 protected/abstract(dialect 구현).
- `MysqlQueryBuilder` / `MssqlQueryBuilder` / `PostgresqlQueryBuilder` — dialect별 구현. 보통 `createQueryBuilder` 로 얻음.
- `ExprRendererBase` (abstract) — Expr→SQL 렌더러. `render(expr): string`, `renderWhere(exprs): string` 공개. `wrap(name)`/`escapeString`/`escapeValue` 는 dialect abstract.
- `MysqlExprRenderer` / `MssqlExprRenderer` / `PostgresqlExprRenderer` — dialect별 렌더러.

```typescript
const sql = createQueryBuilder("mysql").build(queryable.getSelectQueryDef()).sql;
```

## 결과 파싱

executor 가 원시 행을 받은 뒤 `ResultMeta` 로 TS 객체로 환원할 때.

- `parseQueryResult<T>(rawResults, meta): Promise<T[] | undefined>` — 원시 결과 배열 + `ResultMeta` 로 타입 변환·JOIN 중첩. JOIN 없으면 단순 파싱, 있으면 그룹키 기준 재귀 그룹핑(O(n) Map). 입력 비었거나 파싱 후 전부 빈 객체면 `undefined`. 100건마다 이벤트 루프 양보(async 전용). isSingle 관계에 서로 다른 결과가 섞이면 throw.
- `pickResultSets<T>(rawResults, buildResult): T[]` — 다중 결과셋에서 `QueryBuildResult` 의 `resultSetIndex`/`resultSetStride` 에 따라 필요한 셋만 추출. index 없으면 첫 셋, stride 없으면 index 셋 단일, stride 있으면 index 부터 stride 간격으로 concat(MySQL 배치 INSERT 의 SELECT 만 모을 때).
