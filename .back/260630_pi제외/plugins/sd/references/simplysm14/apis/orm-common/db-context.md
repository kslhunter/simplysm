# @simplysm/orm-common — DbContext / DDL / 마이그레이션

`DbContext` 상속 클래스에서 table/view/procedure factory를 등록하고, executor를 통해 연결·트랜잭션·DDL·초기화를 수행할 때 같이 읽는 군.

## DbContext

```ts
abstract class DbContext implements DbContextBase {
  readonly status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  migrations: Migration[];
  _migration: () => Queryable<{ code: string }, any>;

  constructor(executor: DbContextExecutor, opt: { database: string; schema?: string });
  protected queryable<T extends TableBuilder<any, any> | ViewBuilder<any, any, any>>(builder: T): () => Queryable<T["$inferSelect"], T extends TableBuilder<any, any> ? T : never>;
  protected executable<T extends ProcedureBuilder<any, any>>(builder: T): () => Executable<T["$params"], T["$returns"]>;

  connect<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
  connectWithoutTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult>;
  transaction<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
  initialize(options?: { dbs?: string[]; force?: boolean }): Promise<boolean>;
}
```

- `executor: DbContextExecutor` — 실제 DB 연결·트랜잭션·QueryDef 실행을 위임받는 객체.
- `opt.database: string` — `database` getter 기본값과 객체명 기본 database에 쓰는 이름.
- `opt.schema?: string` — `schema` getter 기본값과 객체명 기본 schema에 쓰는 이름.
- `status: "ready"|"connect"|"transact"` — 연결 상태. `connect`/`connectWithoutTransaction` 은 `ready` 가 아니면 throw, `transaction` 은 `transact` 상태면 throw.
- `migrations: Migration[]` — `initialize` 가 `_migration` 테이블의 `code` 와 대조해 미적용 항목만 실행하는 migration 목록.
- `_migration` — `Table("_migration")` 기반 시스템 queryable. `code: varchar(255)` PK 테이블에 migration 이름을 저장.
- `queryable(builder)` — Table/View builder를 `() => Queryable` factory로 감싸고 `SD_BUILDER` 태그를 붙인다. DbContext 서브클래스 프로퍼티 등록용.
- `executable(builder)` — Procedure builder를 `() => Executable` factory로 감싸고 `SD_BUILDER` 태그를 붙인다. DbContext 서브클래스 프로퍼티 등록용.
- `connect(fn, isolationLevel?)` — relation 검증, alias counter reset, executor connect, transaction begin, `fn`, commit/rollback, close를 순서대로 수행한다.
- `connectWithoutTransaction(callback)` — relation 검증·alias reset·connect/close만 수행하고 transaction begin/commit/rollback은 하지 않는다.
- `transaction(fn, isolationLevel?)` — 현재 연결에서 transaction begin, `fn`, commit/rollback을 수행하고 종료 후 status를 `connect` 로 둔다.
- `executeDefs(defs, resultMetas?)` — `status === "transact"` 에서 `DDL_TYPES` 에 포함된 QueryDef가 있으면 throw하고, 그 외에는 executor에 위임한다.
- `initialize(options?)` — Code First 초기화. `force=true` 는 schema clear 후 전체 생성, `force=false` 는 `_migration` 존재 여부와 migration code로 신규 생성 또는 미적용 migration 실행을 결정한다.
- `options.dbs?: string[]` — 초기화 대상 database 목록. 미지정이면 `db.database` 단일값을 사용하고, 둘 다 없으면 throw.
- `options.force?: boolean` — `true` 면 기존 schema를 삭제 후 전체 객체를 재생성하고 모든 migration을 적용됨으로 등록한다. 미지정 시 `false`.
- `initialize` 반환값 — 미적용 migration을 실제 실행한 경우 `true`; 신규 전체 생성, force 재생성, 미적용 migration 없음은 `false`.
- 트랜잭션 rollback 중 `DbTransactionError` 의 `NO_ACTIVE_TRANSACTION` 이 아닌 오류가 나면 원래 오류의 `cause` 로 보존한다.

## DbContext DDL 메서드

```ts
createTable(table: TableBuilder<any, any>): Promise<void>;
dropTable(table: QueryDefObjectName): Promise<void>;
renameTable(table: QueryDefObjectName, newName: string): Promise<void>;
createView(view: ViewBuilder<any, any, any>): Promise<void>;
dropView(view: QueryDefObjectName): Promise<void>;
createProc(procedure: ProcedureBuilder<any, any>): Promise<void>;
dropProc(procedure: QueryDefObjectName): Promise<void>;
addColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): Promise<void>;
dropColumn(table: QueryDefObjectName, column: string): Promise<void>;
modifyColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): Promise<void>;
renameColumn(table: QueryDefObjectName, column: string, newName: string): Promise<void>;
addPrimaryKey(table: QueryDefObjectName, columns: string[]): Promise<void>;
dropPrimaryKey(table: QueryDefObjectName): Promise<void>;
addForeignKey(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder<any>): Promise<void>;
addIndex(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): Promise<void>;
dropForeignKey(table: QueryDefObjectName, relationName: string): Promise<void>;
dropIndex(table: QueryDefObjectName, columns: string[]): Promise<void>;
clearSchema(params: { database: string; schema?: string }): Promise<void>;
schemaExists(database: string, schema?: string): Promise<boolean>;
truncate(table: QueryDefObjectName): Promise<void>;
switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
```

- 각 실행 메서드 — 대응 `get*QueryDef` 1개를 만든 뒤 `executeDefs` 로 실행한다.
- `table`/`view`/`procedure: QueryDefObjectName` — DDL 대상 객체명. `database`/`schema`/`name` 필드를 가진다.
- `newName: string` — rename 대상의 새 이름.
- `columnName: string` — 추가·변경할 column 이름.
- `column: ColumnBuilder` — column dataType/autoIncrement/nullable/default 메타를 QueryDef로 복사한다.
- `columns: string[]` — PK 또는 index 대상 column 목록.
- `relationName: string` — FK 이름 생성에 들어가는 관계명. add/drop FK에서 `FK_${table.name}_${relationName}` 패턴으로 쓰인다.
- `indexBuilder: IndexBuilder<string[]>` — index name/columns/orderBy/unique 메타를 QueryDef로 복사한다.
- `params.database: string` — clear schema 대상 database.
- `params.schema?: string` / `schema?: string` — schema 지원 dialect의 schema 이름.
- `enabled: boolean` — FK 제약 전환값. `true` 는 활성화, `false` 는 비활성화 QueryDef를 만든다.
- `schemaExists` — `getSchemaExistsQueryDef` 실행 결과 첫 번째 result set 길이가 0보다 크면 `true`.
- `switchFk` — `DDL_TYPES` 에 포함되지 않아 transaction 상태에서도 `executeDefs` 차단 대상이 아니다.

## DbContext DDL QueryDef 생성기

```ts
getCreateTableQueryDef(table: TableBuilder<any, any>): QueryDef;
getCreateViewQueryDef(view: ViewBuilder<any, any, any>): QueryDef;
getCreateProcQueryDef(procedure: ProcedureBuilder<any, any>): QueryDef;
getCreateObjectQueryDef(builder: TableBuilder<any, any> | ViewBuilder<any, any, any> | ProcedureBuilder<any, any>): QueryDef;
getDropTableQueryDef(table: QueryDefObjectName): QueryDef;
getRenameTableQueryDef(table: QueryDefObjectName, newName: string): QueryDef;
getDropViewQueryDef(view: QueryDefObjectName): QueryDef;
getDropProcQueryDef(procedure: QueryDefObjectName): QueryDef;
getAddColumnQueryDef(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): QueryDef;
getDropColumnQueryDef(table: QueryDefObjectName, column: string): QueryDef;
getModifyColumnQueryDef(table: QueryDefObjectName, columnName: string, column: ColumnBuilder<any, any>): QueryDef;
getRenameColumnQueryDef(table: QueryDefObjectName, column: string, newName: string): QueryDef;
getAddPrimaryKeyQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
getDropPrimaryKeyQueryDef(table: QueryDefObjectName): QueryDef;
getAddForeignKeyQueryDef(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder<any>): QueryDef;
getAddIndexQueryDef(table: QueryDefObjectName, indexBuilder: IndexBuilder<string[]>): QueryDef;
getDropForeignKeyQueryDef(table: QueryDefObjectName, relationName: string): QueryDef;
getDropIndexQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
getClearSchemaQueryDef(params: { database: string; schema?: string }): QueryDef;
getSchemaExistsQueryDef(database: string, schema?: string): QueryDef;
getTruncateQueryDef(table: QueryDefObjectName): QueryDef;
getSwitchFkQueryDef(table: QueryDefObjectName, enabled: boolean): QueryDef;
```

- QueryDef 생성기는 실행하지 않고 AST만 반환한다. 같은 이름의 실행 메서드에서 이 반환값을 `executeDefs` 로 넘긴다.
- `getCreateTableQueryDef` — table에 columns가 없으면 throw한다.
- `getCreateViewQueryDef` — view에 `viewFn` 이 없으면 throw한다.
- `getCreateProcQueryDef` — procedure에 `body` SQL이 없으면 throw한다.
- `getCreateObjectQueryDef` — Table/View/Procedure builder 타입별 create QueryDef로 dispatch하고 알 수 없는 builder면 throw한다.
- `getAddForeignKeyQueryDef` — FK column 수와 target PK 수를 `getMatchedPrimaryKeys` 로 맞춘다.
- `getAddIndexQueryDef` — index name 미지정 시 `IDX_${table.name}_${columns.join("_")}`, orderBy 미지정 column은 `"ASC"`.
- `getDropIndexQueryDef` — index 이름을 `IDX_${table.name}_${columns.join("_")}` 로 만든다.

## DbContextBase / DbContextStatus / DbContextDdlMethods

```ts
interface DbContextBase {
  readonly status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
  getQueryDefObjectName(tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>): QueryDefObjectName;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
}
type DbContextStatus = "ready" | "connect" | "transact";
interface DbContextDdlMethods { /* DbContext DDL 메서드 + QueryDef 생성기 */ }
```

- `"ready"` — 연결 전 또는 close 완료 상태.
- `"connect"` — executor 연결은 열린 상태이고 transaction은 열리지 않은 상태.
- `"transact"` — transaction begin 이후 commit/rollback 전 상태.
- `getNextAlias()` — `T${++counter}` 형식 alias를 반환한다.
- `resetAliasCounter()` — alias counter를 0으로 되돌린다.
- `getQueryDefObjectName(tableOrView)` — builder meta의 database/schema가 있으면 우선하고 없으면 DbContext의 database/schema를 사용한다.
- `DbContextDdlMethods` — `Migration.up` 인자에 붙는 DDL 실행·QueryDef 생성 메서드 묶음.

## DbContextExecutor / IsolationLevel / Migration

```ts
interface DbContextExecutor {
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
}
type IsolationLevel = "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE";
interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
```

- `connect`/`close` — DbContext 연결 경계에서 호출되는 executor hook.
- `beginTransaction(isolationLevel?)` — `connect`/`transaction` 이 transaction 시작 시 호출한다.
- `commitTransaction`/`rollbackTransaction` — callback 성공·실패에 따라 호출된다.
- `executeDefs(defs, resultMetas?)` — QueryDef 배열과 결과 변환 메타 배열을 실행 계층으로 넘긴다.
- `"READ_UNCOMMITTED"` — 커밋되지 않은 데이터 읽기 가능.
- `"READ_COMMITTED"` — 커밋된 데이터만 읽기.
- `"REPEATABLE_READ"` — 트랜잭션 내 동일 query의 동일 결과 보장.
- `"SERIALIZABLE"` — 가장 엄격한 직렬화 격리.
- `Migration.name` — `_migration.code` 에 저장·대조되는 고유 migration 이름.
- `Migration.up` — 미적용 migration 실행 함수. DDL 메서드가 포함된 db를 받는다.

## DbTransactionError / DbErrorCode

```ts
enum DbErrorCode {
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",
  DEADLOCK = "DEADLOCK",
  LOCK_TIMEOUT = "LOCK_TIMEOUT",
}
class DbTransactionError extends SdError {
  readonly name = "DbTransactionError";
  constructor(code: DbErrorCode, message: string, cause?: Error);
}
```

- `NO_ACTIVE_TRANSACTION` — rollback 등에서 활성 transaction이 없음을 나타내는 표준 코드.
- `TRANSACTION_ALREADY_STARTED` — transaction 중복 시작을 나타내는 표준 코드.
- `DEADLOCK` — deadlock을 나타내는 표준 코드.
- `LOCK_TIMEOUT` — lock timeout을 나타내는 표준 코드.
- `code` — DBMS별 native 오류를 DBMS 독립적으로 분기하기 위한 표준 코드.
- `message` — `SdError` 에 전달되는 오류 메시지.
- `cause?: Error` — 원본 DBMS 오류를 cause 체인으로 보존한다.

## SD_BUILDER

```ts
const SD_BUILDER: unique symbol;
```

- `SD_BUILDER` — `DbContext.queryable`/`executable` 이 반환 factory에 붙이는 builder 태그. `initialize` 는 DbContext 인스턴스 값 중 이 symbol이 있는 function에서 Table/View/Procedure builder를 수집한다.
