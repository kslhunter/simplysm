# @simplysm/orm-common — QueryDef / Expr / Column 타입

executor·QueryBuilder 를 직접 구현하거나 AST·결과 메타를 다룰 때 참조하는 저수준 타입군. 일반 쿼리 작성에선 직접 쓸 일이 적다.

## Column / DataType 타입

- `type DataType` — SQL 데이터 타입 union: `{type:"int"}`/`{type:"bigint"}`/`{type:"float"}`/`{type:"double"}`/`{type:"decimal";precision;scale?}`/`{type:"varchar";length}`/`{type:"char";length}`/`{type:"text"}`/`{type:"binary"}`/`{type:"boolean"}`/`{type:"datetime"}`/`{type:"date"}`/`{type:"time"}`/`{type:"uuid"}`.
- `type ColumnPrimitiveMap` — TS 타입 이름 → 실제 타입: `string`/`number`/`boolean`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`Bytes`.
- `type ColumnPrimitiveStr` — 위 키(`"string"|"number"|...`).
- `type ColumnPrimitive` — 모든 원시 값 union + `undefined`(NULL 표현).
- `const dataTypeStrToColumnPrimitiveStr` — SQL 타입명 → TS 타입명 매핑 객체(`int`→`"number"`, `datetime`→`"DateTime"` 등).
- `type InferColumnPrimitiveFromDataType<T>` — `DataType` → TS 타입 추론(`cast` 결과 타입).
- `inferColumnPrimitiveStr(value): ColumnPrimitiveStr` — 런타임 값에서 타입명 추론. NULL 이면 throw(추론 불가).
- `interface ColumnMeta` — column 메타: `type: ColumnPrimitiveStr`/`dataType: DataType`/`autoIncrement?`/`nullable?`/`default?`/`description?`.

## Database / Executor / 결과 타입

- `type Dialect = "mysql" | "mssql" | "postgresql"` — 지원 dialect.
- `const dialects: Dialect[]` — 전체 dialect 목록(dialect별 테스트 루프용).
- `type IsolationLevel` — 격리 수준: `"READ_UNCOMMITTED"`(dirty read 허용)/`"READ_COMMITTED"`(기본, 커밋된 것만)/`"REPEATABLE_READ"`(반복 읽기 일관)/`"SERIALIZABLE"`(완전 직렬화·가장 엄격).
- `type DataRecord` — 재귀 결과 레코드(`ColumnPrimitive | DataRecord | DataRecord[]`). include 중첩 표현.
- `interface DbContextExecutor` — DB I/O 주입 인터페이스: `connect()`/`close()`/`beginTransaction(isolationLevel?)`/`commitTransaction()`/`rollbackTransaction()`/`executeDefs(defs, resultMetas?)`.
- `interface ResultMeta` — 결과 변환 메타: `columns: Record<string, ColumnPrimitiveStr>`(키→타입)/`joins: Record<string, {isSingle}>`(조인 alias→단일/배열). `parseQueryResult` 입력.
- `interface QueryBuildResult` — `QueryBuilder.build()` 반환: `sql: string`/`resultSetIndex?`(가져올 결과셋, 기본 0)/`resultSetStride?`(N번째마다 추출, MySQL 배치 INSERT 용).
- `interface Migration` — `name: string`/`up: (db) => Promise<void>`.

## Expr AST 타입

`type Expr` — 전체 표현식 union. `type WhereExpr` — WHERE 전용 union(비교+논리). 각 멤버는 `type` 판별자 + 인자 필드를 가진 인터페이스. 모두 `type` 리터럴로 구분되며, 사용자는 `expr.*` 빌더로 생성하므로 직접 만들 일은 거의 없음.

- 값: `ExprColumn`(`path: string[]`) / `ExprValue`(`value`) / `ExprRaw`(`sql`/`params`).
- 비교(WhereExpr): `ExprEq`/`ExprGt`/`ExprLt`/`ExprGte`/`ExprLte`(각 `source`/`target`), `ExprBetween`(`source`/`from?`/`to?`), `ExprIsNull`(`arg`), `ExprLike`/`ExprRegexp`(`source`/`pattern`), `ExprIn`(`source`/`values`), `ExprInQuery`(`source`/`query`), `ExprExists`(`query`).
- 논리(WhereExpr): `ExprNot`(`arg`), `ExprAnd`/`ExprOr`(`conditions`).
- 문자열: `ExprConcat`/`ExprLeft`/`ExprRight`/`ExprTrim`/`ExprPadStart`/`ExprReplace`/`ExprUpper`/`ExprLower`/`ExprLength`/`ExprByteLength`/`ExprSubstring`/`ExprIndexOf`.
- 숫자: `ExprAbs`/`ExprRound`(`digits`)/`ExprCeil`/`ExprFloor`.
- 날짜: `ExprYear`/`ExprMonth`/`ExprDay`/`ExprHour`/`ExprMinute`/`ExprSecond`/`ExprIsoWeek`/`ExprIsoWeekStartDate`/`ExprIsoYearMonth`/`ExprDateDiff`(`unit`/`from`/`to`)/`ExprDateAdd`(`unit`/`source`/`value`)/`ExprFormatDate`(`format`).
- 조건: `ExprCoalesce`/`ExprNullIf`/`ExprIs`/`ExprSwitch`(`cases`/`else`)/`ExprIf`(`condition`/`then`/`else?`).
- 집계: `ExprCount`(`arg?`/`distinct?`)/`ExprSum`/`ExprAvg`/`ExprMax`/`ExprMin`.
- 기타: `ExprGreatest`/`ExprLeast`/`ExprRowNum`/`ExprRandom`/`ExprCast`(`source`/`targetType`).
- Window: `ExprWindow`(`fn: WinFn`/`spec: WinSpec`). `WinFn` union = `WinFnRowNumber`/`WinFnRank`/`WinFnDenseRank`/`WinFnNtile`(`n`)/`WinFnLag`/`WinFnLead`(`column`/`offset?`/`default?`)/`WinFnFirstValue`/`WinFnLastValue`/`WinFnSum`/`WinFnAvg`/`WinFnCount`/`WinFnMin`/`WinFnMax`. `WinSpec` = `{ partitionBy?: Expr[]; orderBy?: [Expr, ("ASC"|"DESC")?][] }`.
- 시스템: `ExprSubquery`(`queryDef`).
- `type DateUnit = "year"|"month"|"day"|"hour"|"minute"|"second"`.

## QueryDef AST 타입

`type QueryDef` — 전체 쿼리 정의 union(DML+DDL+Utils+Meta). `executeDefs`/`build` 입력.

- DML: `SelectQueryDef`(`from`/`as`/`select?`/`distinct?`/`top?`/`lock?`/`where?`/`joins?`/`orderBy?`/`limit?`/`groupBy?`/`having?`/`with?`), `SelectQueryDefJoin`(+`isSingle?`), `InsertQueryDef`(`records`/`overrideIdentity?`/`output?`), `InsertIfNotExistsQueryDef`(`record`/`existsSelectQuery`), `InsertIntoQueryDef`(`recordsSelectQuery`), `UpdateQueryDef`(`record`/`where?`/`joins?`...), `DeleteQueryDef`, `UpsertQueryDef`(`existsSelectQuery`/`insertRecord`/`updateRecord`).
- DDL: `ClearSchemaQueryDef`, `CreateTableQueryDef`(`columns`/`primaryKey?`)/`DropTableQueryDef`/`RenameTableQueryDef`/`TruncateQueryDef`, `AddColumnQueryDef`/`DropColumnQueryDef`/`ModifyColumnQueryDef`/`RenameColumnQueryDef`, `AddPrimaryKeyQueryDef`/`DropPrimaryKeyQueryDef`, `AddForeignKeyQueryDef`(`foreignKey: {name/fkColumns/targetTable/targetPkColumns}`)/`DropForeignKeyQueryDef`, `AddIndexQueryDef`(`index: {name/columns/unique?}`)/`DropIndexQueryDef`, `CreateViewQueryDef`/`DropViewQueryDef`, `CreateProcQueryDef`(`params?`/`returns?`/`query`)/`DropProcQueryDef`/`ExecProcQueryDef`(`params`).
- Utils/Meta: `SwitchFkQueryDef`(`enabled`), `SchemaExistsQueryDef`.
- 공통: `QueryDefObjectName`(`database?`/`schema?`/`name`) — DB 객체 이름(MySQL=`db.name`, MSSQL=`db.schema.name`, PG=`schema.name`). `CudOutputDef`(`columns`/`pkColNames`/`aiColName?`) — CUD OUTPUT 절.
- `const DDL_TYPES` — DDL 타입명 배열(트랜잭션 내 DDL 차단 검사용. `switchFk` 는 제외 — 트랜잭션 내 허용). `type DdlType` — 그 union.
