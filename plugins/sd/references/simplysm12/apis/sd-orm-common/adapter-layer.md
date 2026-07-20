# @simplysm/sd-orm-common — 어댑터 레이어 (드라이버 구현용)

새 DB 드라이버/실행기를 만들 때 구현하는 인터페이스와, ORM 이 만들어내는 dialect 비종속 쿼리 정의(IR: `TQueryDef`) 및 이를 SQL 문자열로 바꾸는 `QueryBuilder`.
앱 개발에서는 거의 직접 다루지 않음.

## IDbContextExecutor

`DbContext` 가 생성자에서 주입받아 모든 실제 실행을 위임하는 인터페이스. 구현체가 커넥션/드라이버를 감쌈.

- `getInfoAsync(): Promise<{ dialect; database?; schema? }>` — 접속 메타.
- `connectAsync()` / `closeAsync()` — 연결 수립/해제.
- `beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL)` / `commitTransactionAsync()` / `rollbackTransactionAsync()` — 트랜잭션.
- `executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]>` — IR 배열을 SQL 로 빌드, 실행하고 def별 결과 반환.
  - `options[i]` 로 결과 파싱(컬럼 타입/JOIN) 지정.
- `executeParametrizedAsync(query, params?)` — raw 파라미터 쿼리.
- `bulkInsertAsync(tableName, columnDefs: IQueryColumnDef[], records)` / `bulkUpsertAsync(...)` — 대량 처리.

## IQueryResultParseOption

`SdOrmUtils.parseQueryResultAsync` 가 사용하는 결과 해석 옵션.

- `columns?: Record<string, { dataType: string | undefined }>` — 컬럼별 변환 타입명(`"DateTime"|"DateOnly"|"Time"|"Uuid"|"Boolean"|"Number"` 등). 키는 점 표기 풀네임.
- `joins?: Record<string, { isSingle: boolean }>` — JOIN 키별 단일/배열 여부. `isSingle=true` 면 단일 객체, false 면 배열로 재조립.

## IDbConn

물리 커넥션 추상화(EventEmitter). 보통 executor 내부에서 사용.

- `config: TDbConnConf`, `isConnected: boolean`, `isOnTransaction: boolean` — 상태.
- `on("close", listener)` — close 이벤트.
- `connectAsync` / `closeAsync` / `beginTransactionAsync(isolationLevel?)` / `commitTransactionAsync` / `rollbackTransactionAsync`.
- `executeAsync(queries: string[]): Promise<any[][]>` — 완성된 SQL 문자열 배열 실행.
- `executeParametrizedAsync(query, params?)`, `bulkInsertAsync(...)`, `bulkUpsertAsync(...)`.

## TDbConnConf

union 멤버:

- `IDefaultDbConnConf { dialect: "mysql"|"mssql"|"mssql-azure"; host; port?; username; password; database?; schema?; defaultIsolationLevel?: ISOLATION_LEVEL }`
- `ISqliteDbConnConf { dialect: "sqlite"; filePath }`

## QueryBuilder

- `class QueryBuilder`. `new QueryBuilder(dialect)`.
- `TQueryDef`/세부 Def 를 dialect별 SQL 문자열로 변환.
- `DbContext.qb` 로도 노출.
- 내부에 `qh: QueryHelper` 보유.

각 메서드는 대응하는 `I*QueryDef` 를 받아 SQL `string`(일부 `string[]`) 반환:

- DB: `createDatabaseIfNotExists`, `clearDatabaseIfExists`, `getDatabaseInfo`.
- 메타 조회: `getTableInfos`, `getTableInfo`, `getTableColumnInfos`, `getTablePrimaryKeys`, `getTableForeignKeys`, `getTableIndexes`.
- DDL: `createTable`, `createView`, `createProcedure`, `executeProcedure`, `dropTable`, `addColumn`(→string[]), `removeColumn`, `modifyColumn`(→string[]),
  `renameColumn`, `dropPrimaryKey`, `addPrimaryKey`, `addForeignKey`, `removeForeignKey`, `createIndex`, `dropIndex`, `configIdentityInsert`,
  `configForeignKeyCheck`, `truncateTable`.
- DML: `select`, `insertInto`, `insert`, `update`, `insertIfNotExists`, `upsert`, `delete`.
- 식별자/이름:
  - `wrap(name): string` — 식별자 래핑. mysql 은 백틱, 그 외 `[...]`.
  - `getTableName(def: IQueryTableNameDef): string` — DB.스키마.테이블 풀네임(dialect별 체인). mssql 기본은 database 있으면 schema 필수(없으면 throw).
  - `getTableNameWithoutDatabase(def)` — 첫 세그먼트(DB) 제외.
  - `getTableNameChain(def): string[]` — dialect별 이름 세그먼트 배열(mysql: [db?, name], mssql-azure: [schema?, name], mssql: [db, schema, name] 등).
  - `getQueryOfQueryValue(queryValue: TQueryBuilderValue): string` — 토큰/서브쿼리/배열을 괄호 포함 SQL 로 평탄화.

## TQueryDef (IR union) 및 세부 Def

- `type TQueryDef` = `type` 판별자 + 페이로드의 합집합.
- `DbContext.executeDefsAsync` / `Queryable` 가 만들고 `QueryBuilder`/executor 가 소비.

멤버 `type`:

- 조회/DML: `"select"`(ISelectQueryDef), `"insert"`(IInsertQueryDef), `"insertInto"`, `"update"`, `"delete"`, `"insertIfNotExists"`, `"upsert"`.
- 메타 조회: `"getDatabaseInfo"`, `"getTableInfos"`, `"getTableInfo"`, `"getTableColumnInfos"`, `"getTablePrimaryKeys"`, `"getTableForeignKeys"`, `"getTableIndexes"`.
- DDL: `"createTable"`, `"createView"`, `"createProcedure"`, `"executeProcedure"`, `"dropTable"`, `"addColumn"`, `"removeColumn"`, `"modifyColumn"`,
  `"renameColumn"`, `"dropPrimaryKey"`, `"addPrimaryKey"`, `"addForeignKey"`, `"removeForeignKey"`, `"createIndex"`, `"dropIndex"`, `"truncateTable"`,
  `"createDatabaseIfNotExists"`, `"clearDatabaseIfExists"`, `"configIdentityInsert"`, `"configForeignKeyCheck"`.

핵심 페이로드 타입:

- `TQueryBuilderValue = string | ISelectQueryDef | TQueryBuilderValue[]` — SQL 토큰/서브쿼리/중첩의 재귀 표현. WHERE/SELECT 값 등에 사용.
- `IQueryTableNameDef { database?; schema?; name }` — 테이블 식별.
- `IQueryColumnDef { name; dataType: Type<TQueryValue> | TSdOrmDataType | string; autoIncrement?; nullable? }` — 컬럼 정의(생성/벌크).
- `IQueryPrimaryKeyDef { columnName; orderBy: "ASC"|"DESC" }`.
- `ISelectQueryDef` — from?/as?/join?(`IJoinQueryDef[]`)/distinct?/where?/top?/groupBy?/having?/orderBy?([값,"ASC"|"DESC"][])
  /limit?([skip,take])/pivot?/unpivot?/lock?/sample?/select?(Record<별칭, 값>).
  pivot, unpivot 은 `{ valueColumn; pivotColumn; pivotKeys: string[] }`.
- `IJoinQueryDef extends ISelectQueryDef { isCustomSelect: boolean }` — JOIN 절(커스텀 select 여부).
- `IInsertQueryDef { from; record: Record<col, val>; output? }`, `IUpdateQueryDef`(+from/record/output, ISelectQueryDef 상속), `IInsertIntoQueryDef`(select+target), `IDeleteQueryDef`(from/output).
- `IInsertIfNotExistsQueryDef { from; as; insertRecord; where; output? }`.
- `IUpsertQueryDef { from; as; updateRecord; insertRecord; where; output?; aiKeyName?; pkColNames: string[] }` — `aiKeyName`=autoIncrement PK명, `pkColNames`=충돌 판정 PK 목록.
- `IConfigIdentityInsertQueryDef { table; state: "on"|"off" }` — IDENTITY_INSERT 토글.
- `IConfigForeignKeyCheckQueryDef { table; useCheck: boolean }` — FK 체크 on/off.
- `IExecuteProcedureQueryDef { procedure: IQueryTableNameDef; record }`, `ICreateProcedureQueryDef { table; columns; procedure }`, `ICreateViewQueryDef { table; queryDef: ISelectQueryDef }`.
- 그 외:
  - `IAddColumnQueryDef`/`IModifyColumnQueryDef`(column + `defaultValue?`).
  - `IRenameColumnQueryDef { prevName; nextName }`.
  - `IAddPrimaryKeyQueryDef { columns: string[] }`.
  - `IAddForeignKeyQueryDef`(foreignKey: name/fkColumns/targetTable/targetPkColumns).
  - `ICreateIndexQueryDef`(index: name/columns[{name,orderBy,unique}]).
  - `IGetTableInfosDef { database?; schema? }`.
  - 단일 `table` 류 조회 Def 등.

## TDbDateSeparator

`QueryHelper.dateDiff/dateAdd` 의 단위. `"year"|"quarter"|"month"|"day"|"week"|"hour"|"minute"|"second"|"millisecond"|"microsecond"|"nanosecond"`.
