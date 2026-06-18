# @simplysm/sd-orm-common — DbContext

`abstract class DbContext`. ORM 진입점. 서브클래스에서 `Queryable`/`StoredProcedure` 필드(예: `users = new Queryable(this, User)`)와 `migrations` getter 를 선언한다. 실제 SQL 실행은 생성자에 주입된 `IDbContextExecutor` 가 담당(없으면 모든 실행 메서드가 "DB 실행기를 알 수 없습니다." throw).

## 생성/필드

- `constructor(_executor: IDbContextExecutor | undefined, opt: TDbContextOption)` — executor 주입 + dialect/db/schema 옵션.
- `abstract get migrations(): Type<IDbMigration>[]` — 마이그레이션 클래스 목록(클래스명 오름차순으로 미적용분 실행).
- `status: "ready" | "connect" | "transact"` — 연결 상태. ready=미연결, connect=연결됨(트랜잭션 외), transact=트랜잭션 중.
- `lastConnectionDateTime?: DateTime` — 마지막 연결/커밋/롤백 시각.
- `prepareDefs: TQueryDef[]` — prepare 류로 누적된 미실행 쿼리 큐(`executePreparedAsync` 로 일괄 실행).
- `qb: QueryBuilder` / `qh: QueryHelper` — `opt.dialect` 로 생성된 빌더/헬퍼.
- `systemMigration: Queryable<this, SystemMigration>` — `_migration` 테이블 Queryable.
- `opt: TDbContextOption` — 동작 옵션(README 참고).

## 연결 / 트랜잭션

- `connectWithoutTransactionAsync<R>(callback): Promise<R>` — 트랜잭션 없이 연결→callback→close. force 초기화 등에 사용.
- `connectAsync<R>(fn, isolationLevel?): Promise<R>` — 연결+트랜잭션 시작→fn→commit→close. 예외 시 rollback 후 throw. ROLLBACK/BEGIN 미존재 류 에러는 무시하고 진행.
- `transAsync<R>(fn, isolationLevel?): Promise<R>` — 이미 연결된 상태에서 트랜잭션만 시작→fn→commit. 이미 transact 면 throw. (connect 와 달리 종료 시 close 하지 않음.)
- `isolationLevel?: ISOLATION_LEVEL` — 트랜잭션 격리수준(README 참고).

## 직접 실행

- `executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]>` — 쿼리 정의 IR 배열 실행, def별 결과 배열 반환. `options[i]` 로 i번째 결과의 타입/JOIN 파싱 지정.
- `executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>` — raw 파라미터 쿼리 실행.
- `bulkInsertAsync(tableName, columnDefs: IQueryColumnDef[], records): Promise<void>` — 대량 INSERT(드라이버 네이티브 경로).
- `bulkUpsertAsync(tableName, columnDefs, records)` — 대량 UPSERT.
- `executePreparedAsync(): Promise<void>` — `prepareDefs` 일괄 실행 후 비움. 큐가 비면 no-op.

## 스키마 조회 (실DB 메타 조회)

- `getIsDbExistsAsync(database?): Promise<boolean>` — DB 존재 여부. sqlite 는 미구현 throw.
- `getIsTableExistsAsync(tableNameDef: IQueryTableNameDef): Promise<boolean>` — 테이블 존재 여부.
- `getTableInfosAsync(database, schema?)` — `{ schema, name }[]`.
- `getTableColumnInfosAsync(database, schema, table)` — `{ name, dataType, length?, precision?, digits?, nullable, autoIncrement }[]`.
- `getTablePkColumnNamesAsync(database, schema, table)` — PK 컬럼명 배열.
- `getTableFksAsync(database, schema, table)` — `{ name, sourceColumnNames[], targetSchemaName, targetTableName }[]`.
- `getTableIndexesAsync(database, schema, table)` — `{ name, columns: { name, orderBy: "ASC"|"DESC" }[] }[]`.
- `getTableDefinitions(): ITableDef[]` — this 의 `Queryable` 필드들에서 테이블 정의 수집.
- `get tableDefs(): ITableDef[]` — `_` 미접두 `Queryable`/`StoredProcedure` 필드의 정의 수집(초기화 대상).
- `truncateTable(table: string): Promise<void>` — TRUNCATE.

## 초기화 / 마이그레이션

- `initializeAsync(dbs?: string[], force?: boolean): Promise<"creation" | "migration" | undefined>` — DB/테이블 부트스트랩.
  - `force=true` — 기존 스키마 무시·재생성. transact 상태에선 throw(connectWithoutTransaction 사용 안내), sqlite 에선 throw(파일 삭제 안내).
  - `force` 아님 — DB+`_migration` 존재 시 미적용 마이그레이션만 클래스명순 실행 후 `"migration"` 반환(없으면 `undefined`). 미존재 시 전체 생성 후 `"creation"`.
  - `dbs?` — (sqlite 외) 생성할 DB명 목록. 미지정 시 `opt.database`. 비면 throw.
  - 반환 `"creation"`=신규 생성, `"migration"`=마이그레이션 적용, `undefined`=변경 없음.

## 테이블 정의 → 쿼리 정의 변환 (마이그레이션 코드에서 스키마 변경 시)

`ITableDef` 또는 컬럼/인덱스/FK 이름을 받아 `TQueryDef`(IR) 를 생성. 반환값은 `executeDefsAsync` 로 실행.
- `getCreateTablesFullQueryDefsFromTableDef(tableDefs): TQueryDef[][]` — 테이블생성/FK추가/인덱스생성 3단계 배열.
- `getCreateTableQueryDefFromTableDef(tableDef): TQueryDef` — view/procedure/일반 테이블 분기 생성. 컬럼 0개면 throw.
- `getCreateFksQueryDefsFromTableDef` / `getCreateIndexesQueryDefsFromTableDef` — FK(+동명 인덱스) / 인덱스 정의들.
- `getAddColumnQueryDefFromTableDef(tableDef, columnName)` / `getModifyColumnQueryDefFromTableDef(...)` — 컬럼 추가/변경.
- `getModifyPkQueryDefFromTableDef(tableDef, columnNames): TQueryDef[]` — PK drop 후(컬럼 있으면) add. 빈 배열이면 drop만.
- `getAddFkQueryDefFromTableDef(tableDef, fkName)` / `getRemoveFkQueryDefFromTableDef(tableDef, fkName)`.
- `getCreateIndexQueryDefFromTableDef(tableDef, indexName)` — 인덱스명이 FK명이면 FK 컬럼으로 인덱스 정의 합성. `getDropIndexQueryDefFromTableDef(tableDef, indexName)`.
- `getTableNameDef(tableDef): IQueryTableNameDef` — 테이블 def + `opt` 로 DB/스키마 채운 이름 정의(sqlite는 name만).

## 옵션 타입

- `TDbContextOption = IDefaultDbContextOption | ISqliteDbContextOption` — README 참고.
- `IDefaultDbContextOption { dialect: "mysql"|"mssql"|"mssql-azure"; database?; schema? }`.
- `ISqliteDbContextOption { dialect: "sqlite" }`.
