# @simplysm/orm-common — types

executor·dialect 어댑터 구현, AST 타입, dialect 별 SQL 렌더링, 결과 파싱을 다루는 군. 일반 쿼리 작성에는 직접 쓸 일이 적고, executor 구현체·SQL 검사·결과 변환 계층에서 사용한다.

## 컬럼 원시 타입 / DataType

```typescript
type ColumnPrimitiveMap = { string; number; boolean; DateTime; DateOnly; Time; Uuid; Bytes };
type ColumnPrimitiveStr = keyof ColumnPrimitiveMap;          // 타입 이름 문자열
type ColumnPrimitive = ColumnPrimitiveMap[ColumnPrimitiveStr] | undefined; // undefined=NULL
type DataType =
  | { type: "int" } | { type: "bigint" } | { type: "float" } | { type: "double" }
  | { type: "decimal"; precision: number; scale? } | { type: "varchar"; length: number }
  | { type: "char"; length: number } | { type: "text" } | { type: "binary" }
  | { type: "boolean" } | { type: "datetime" } | { type: "date" } | { type: "time" } | { type: "uuid" };
```

- `ColumnPrimitiveMap` — 타입 이름 → 실제 TS 타입 매핑. `ColumnPrimitiveStr` 은 그 키(`expr.val`/`expr.col` 의 dataType 인자 타입).
- `ColumnPrimitive` — 저장 가능한 모든 원시 값. `undefined` 가 SQL NULL.
- `DataType` — SQL 컬럼 타입의 구조화 표현(DDL·`cast` 에서 사용).
- `dataTypeStrToColumnPrimitiveStr` — `DataType["type"]` → `ColumnPrimitiveStr` 매핑 상수(예 `int → "number"`, `date → "DateOnly"`).
- `InferColumnPrimitiveFromDataType<T>` — `DataType` 으로부터 TS 타입 추론.
- `inferColumnPrimitiveStr(value)` — 런타임 값에서 타입 이름 추론. **NULL 이면 throw**(추론 불가).
- `ColumnMeta` — `{ type; dataType; autoIncrement?; nullable?; default?; description? }`. ColumnBuilder 가 생성해 보유.

## 데이터·executor 타입 (types/db)

```typescript
type Dialect = "mysql" | "mssql" | "postgresql";
const dialects: Dialect[];
type IsolationLevel = "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE";
type DataRecord = { [key: string]: ColumnPrimitive | DataRecord | DataRecord[] };  // 재귀(중첩 관계)
interface ResultMeta { columns: Record<string, ColumnPrimitiveStr>; joins: Record<string, { isSingle: boolean }>; }
interface QueryBuildResult { sql: string; resultSetIndex?: number; resultSetStride?: number; }
```

- `Dialect` — 지원 DBMS(MySQL 8.0.14+, MSSQL 2012+, PostgreSQL 9.0+). `dialects` 는 전체 목록(테스트 매트릭스용).
- `IsolationLevel` — 트랜잭션 격리 수준(기본 `READ_COMMITTED`). `connect`/`transaction`·executor `beginTransaction` 인자.
- `DataRecord` — 쿼리 결과 레코드(중첩 관계는 객체/배열 중첩).
- `ResultMeta` — 결과 변환 메타. `columns` 는 평면 키(`posts.id`) → 타입, `joins` 는 JOIN 경로 → 단일/배열 구분. `Queryable.getResultMeta()` 가 생성.
- `QueryBuildResult` — `build()` 결과. `resultSetIndex`(가져올 결과셋 위치)·`resultSetStride`(N번째마다 추출) 로 다중 결과셋 처리(MySQL INSERT+SELECT, 배치 INSERT 등).
- `DbContextExecutor` / `Migration` — db-context.md 참조.

## QueryDef AST (types/query-def)

`Queryable`/`DbContext` 가 만드는 dialect 독립 쿼리 정의. `QueryDef` 는 전체 union.

- `QueryDefObjectName` — `{ database?; schema?; name }`. DBMS 별 네임스페이스(MySQL `db.name`, MSSQL `db.schema.name`, PostgreSQL `schema.name`).
- DML: `SelectQueryDef`(+`SelectQueryDefJoin` — `isSingle?` 추가), `InsertQueryDef`(`records`/`overrideIdentity?`/`aiColName?`/`output?`), `InsertIfNotExistsQueryDef`, `InsertIntoQueryDef`, `UpdateQueryDef`, `DeleteQueryDef`, `UpsertQueryDef`. `CudOutputDef` 는 OUTPUT 절(`columns`/`pkColNames`/`aiColName?`).
- DDL: `CreateTableQueryDef`/`DropTableQueryDef`/`RenameTableQueryDef`/`TruncateQueryDef`, `AddColumnQueryDef`/`DropColumnQueryDef`/`ModifyColumnQueryDef`/`RenameColumnQueryDef`, `AddPrimaryKeyQueryDef`/`DropPrimaryKeyQueryDef`/`AddForeignKeyQueryDef`/`DropForeignKeyQueryDef`/`AddIndexQueryDef`/`DropIndexQueryDef`, `CreateViewQueryDef`/`DropViewQueryDef`, `CreateProcQueryDef`/`DropProcQueryDef`/`ExecProcQueryDef`, `ClearSchemaQueryDef`.
- Utils/Meta: `SwitchFkQueryDef`(`{ table; enabled }` — DDL 아님), `SchemaExistsQueryDef`.
- `DDL_TYPES` — DDL QueryDef 타입 이름 배열(상수). 트랜잭션 내 DDL 차단(`executeDefs`) 검증에 사용. `switchFk` 는 제외(트랜잭션 가능). `DdlType` 은 그 union 타입.

`SelectQueryDef` 주요 필드: `from`(객체명/서브쿼리/배열(UNION)/문자열) · `as` · `select?` · `distinct?` · `top?` · `lock?` · `where?` · `joins?` · `orderBy?` · `limit?` · `groupBy?` · `having?` · `with?`(재귀 CTE).

## Expr AST (types/expr)

`expr.*` 가 만드는 표현식 AST. 각 인터페이스는 `type` 판별 필드를 가진다.

- `Expr` — 전체 표현식 union(값/문자열/숫자/날짜/조건/집계/기타/윈도우/서브쿼리).
- `WhereExpr` — WHERE 절 전용 union(비교 `ExprEq`/`ExprGt`/.../`ExprBetween`/`ExprIsNull`/`ExprLike`/`ExprRegexp`/`ExprIn`/`ExprInQuery`/`ExprExists` + 논리 `ExprNot`/`ExprAnd`/`ExprOr`).
- 값: `ExprColumn`(`path`), `ExprValue`(`value`), `ExprRaw`(`sql`/`params`).
- `DateUnit` — `"year"|"month"|"day"|"hour"|"minute"|"second"`(`dateDiff`/`dateAdd`).
- 윈도우: `WinFn`(union — `WinFnRowNumber`/`WinFnRank`/`WinFnLag` 등), `WinSpec`(`partitionBy?`/`orderBy?`), `ExprWindow`(`fn`+`spec`).
- 개별 표현식 인터페이스 전체(`ExprConcat`, `ExprDateDiff`, `ExprSwitch`, `ExprCount`, `ExprCast`, `ExprSubquery`, ...)도 export — 각각 `expr.md` 의 함수에 1:1 대응.

## QueryBuilder (dialect 렌더링)

```typescript
function createQueryBuilder(dialect: Dialect): QueryBuilderBase;
abstract class QueryBuilderBase {
  build(def: QueryDef): QueryBuildResult;   // def.type 으로 동적 dispatch
}
abstract class ExprRendererBase {
  render(expr: Expr | WhereExpr): string;
  renderWhere(exprs: WhereExpr[]): string;  // " AND " 결합
  abstract wrap(name: string): string;       // 식별자 감싸기 (`name` / [name] / "name")
  abstract escapeString(value: string): string;
  abstract escapeValue(value: unknown): string;
}
```

- `createQueryBuilder(dialect)` — dialect 에 맞는 QueryBuilder 인스턴스 반환. executor 가 `QueryDef` 를 SQL 로 만들 때 진입점.
- `QueryBuilderBase.build(def)` — `QueryDef` → `QueryBuildResult`. `def.type` 이름의 메서드로 dispatch(미지원 타입은 throw).
- `ExprRendererBase` — `Expr`/`WhereExpr` → SQL 문자열. `wrap`/`escapeString`/`escapeValue` 등 dialect 차이만 abstract.
- dialect 구현 클래스도 export(직접 인스턴스화보다 `createQueryBuilder` 권장): `MysqlQueryBuilder`/`MssqlQueryBuilder`/`PostgresqlQueryBuilder`, `MysqlExprRenderer`/`MssqlExprRenderer`/`PostgresqlExprRenderer`.

```typescript
const builder = createQueryBuilder("mysql");
const { sql } = builder.build(db.user().getSelectQueryDef());
```

## 결과 파싱

```typescript
function parseQueryResult<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined>;
function pickResultSets<T>(
  rawResults: T[][],
  buildResult: Pick<QueryBuildResult, "resultSetIndex" | "resultSetStride">,
): T[];
```

- `parseQueryResult(rawResults, meta)` — DB 원시 결과를 `meta` 로 타입 변환·중첩(JOIN 평면 키 → 객체/배열)한다. async 전용(대량 처리 중 100건마다 이벤트 루프 양보). 입력이 비었거나 파싱 후 전부 빈 객체면 `undefined`. 타입 파싱 실패 시 throw. `isSingle` JOIN 에 서로 다른 다중 결과가 오면 throw. (null 은 보존, undefined 키는 제거.)
- `pickResultSets(rawResults, buildResult)` — 다중 결과셋에서 필요한 셋만 추출. `resultSetIndex` 없으면 첫 셋, `stride` 없으면 해당 인덱스 단일, 있으면 인덱스부터 stride 간격으로 concat(MySQL 배치 INSERT;SELECT 패턴).

```typescript
const meta = { columns: { id: "number", "posts.id": "number" }, joins: { posts: { isSingle: false } } };
const rows = await parseQueryResult(rawResults, meta);
```

## 주의사항

- 이 군은 executor·SQL 검사·결과 파싱 계층용. 앱 쿼리 작성은 `queryable.md`/`expr.md` 의 고수준 API 사용.
- `parseQueryResult` 의 `meta` 는 필수 — 없으면 호출 자체가 불필요(입력=출력). 보통 `Queryable.getResultMeta()` 로 생성.
- `QueryDefObjectName` 의 네임스페이스 해석은 dialect 마다 다름(MySQL 은 schema 무시 등).
