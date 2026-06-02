# @simplysm/orm-common — DbContext / 연결·트랜잭션·DDL·마이그레이션

`DbContext` 추상 클래스를 상속해 테이블·뷰·프로시저를 프로퍼티로 등록하고, 연결·트랜잭션·DDL·마이그레이션을 실행하는 묶음. executor(`DbContextExecutor`) 구현체와 `{ database, schema? }` 옵션을 생성자로 주입한다. 트랜잭션 롤백 에러는 `DbTransactionError` 로 표준화된다.

## DbContext (정의·등록)

`abstract class DbContext implements DbContextBase`. 서브클래스에서 `this.queryable(...)`/`this.executable(...)` 로 멤버를 만들고 `migrations` 를 오버라이드한다.

- `constructor(executor: DbContextExecutor, opt: { database: string; schema?: string })` — executor 와 대상 DB 옵션 주입.
- `protected queryable(builder): () => Queryable` — Table/View 빌더를 Queryable 팩토리로 등록. 호출 시마다 새 alias 부여(View 는 viewFn 실행). 반환 함수에 `SD_BUILDER` 심볼로 원본 빌더를 부착.
- `protected executable(builder): () => Executable` — Procedure 빌더를 Executable 팩토리로 등록. 마찬가지로 `SD_BUILDER` 부착.
- `migrations: Migration[]` — 마이그레이션 정의 배열. 서브클래스에서 오버라이드. `initialize()` 가 미적용분만 순서대로 실행.
- `_migration` — 내부 시스템 마이그레이션 테이블(`_Migration`) Queryable. 적용 이력 저장용.

```typescript
class MainDb extends DbContext {
  user = this.queryable(User);
  post = this.queryable(Post);
  getUserById = this.executable(GetUserById);
  override migrations = [{ name: "001", up: async (db) => { await db.createTable(User); } }];
}
const db = new MainDb(executor, { database: "mydb" });
```

## 상태·내부 (DbContextBase / DbContextStatus)

`interface DbContextBase` — Queryable/Executable/View 가 의존하는 핵심 면. DbContext 가 구현. executor·어댑터 작성 시 참조.

- `status: DbContextStatus` — `"ready"`(미연결) / `"connect"`(연결됨, 트랜잭션 밖) / `"transact"`(트랜잭션 중). `transact` 상태에서 DDL 실행 시 throw.
- `readonly database` / `readonly schema` — 주입된 옵션 값(`string | undefined`).
- `getNextAlias(): string` — 다음 테이블 alias(`T1`, `T2`...) 발급. 카운터 증가.
- `resetAliasCounter(): void` — alias 카운터 0 으로. connect 시작 시 호출됨.
- `executeDefs<T>(defs, resultMetas?): Promise<T[][]>` — QueryDef 배열 실행 위임. `transact` 중 DDL 포함 시 throw. 모든 쿼리 실행의 단일 통로.
- `getQueryDefObjectName(tableOrView): QueryDefObjectName` — 빌더에서 `{database, schema, name}` 추출.
- `switchFk(table, enabled): Promise<void>` — FK 제약 on/off(트랜잭션 내 허용).

`type DbContextStatus = "ready" | "connect" | "transact"`. `interface DbContextDdlMethods` 는 아래 DDL 메서드들의 시그니처 모음(`Migration.up` 의 인자 타입).

## 연결·트랜잭션

- `connect<T>(fn, isolationLevel?): Promise<T>` — 연결+트랜잭션으로 `fn` 실행. 최초 1회 관계 검증(`validateRelations`) 후 alias 리셋, beginTransaction → fn → commit, 예외 시 rollback 후 rethrow, 끝에 항상 close. `ready` 상태 아니면 throw. 일반적인 "한 작업=한 트랜잭션" 경로.
- `connectWithoutTransaction<T>(callback): Promise<T>` — 연결만(트랜잭션 없이) `callback` 실행 후 close. DDL·여러 독립 트랜잭션을 그 안에서 직접 열 때.
- `transaction<T>(fn, isolationLevel?): Promise<T>` — 이미 연결된 상태에서 트랜잭션 1개 실행(begin→fn→commit, 실패 시 rollback). `transact` 중 재호출하면 throw. `connectWithoutTransaction` 안에서 트랜잭션을 나눠 쓸 때.
- `isolationLevel` — `"READ_UNCOMMITTED"|"READ_COMMITTED"|"REPEATABLE_READ"|"SERIALIZABLE"`. 미지정 시 DB 기본값. 동시성 요구에 따라 선택.

롤백 중 발생한 에러가 `DbTransactionError` 이고 코드가 `NO_ACTIVE_TRANSACTION` 이면 무시(원 에러 보존), 그 외엔 원 에러의 `cause` 로 부착.

```typescript
await db.connect(async () => {
  const user = await db.user().where((u) => [expr.eq(u.id, 1)]).lock().single();
  await db.user().where((u) => [expr.eq(u.id, 1)]).update((u) => ({ name: expr.val("string", "X") }));
}, "REPEATABLE_READ");
```

## DDL 실행 메서드

각 메서드는 해당 QueryDef 1개를 `executeDefs` 로 실행한다(`transact` 중 호출 시 throw). 대상 `table`/`view`/`procedure` 인자는 빌더 또는 `QueryDefObjectName`.

- `createTable(table)` / `dropTable(table)` / `renameTable(table, newName)` — 테이블 생성·삭제·이름변경.
- `createView(view)` / `dropView(view)` — 뷰 생성·삭제.
- `createProc(procedure)` / `dropProc(procedure)` — 프로시저 생성·삭제.
- `addColumn(table, columnName, column)` / `dropColumn(table, column)` / `modifyColumn(table, columnName, column)` / `renameColumn(table, column, newName)` — 컬럼 추가·삭제·변경·이름변경. `column` 은 `ColumnBuilder`.
- `addPrimaryKey(table, columns)` / `dropPrimaryKey(table)` — PK 추가·삭제.
- `addForeignKey(table, relationName, relationDef)` / `dropForeignKey(table, relationName)` — FK 추가·삭제. `relationDef` 는 `ForeignKeyBuilder`.
- `addIndex(table, indexBuilder)` / `dropIndex(table, columns)` — 인덱스 추가·삭제.
- `truncate(table)` — 데이터 전체 삭제(DDL 취급).
- `clearSchema(params: { database, schema? })` — 스키마 내 모든 객체 삭제. 초기화·테스트 정리에.
- `schemaExists(database, schema?): Promise<boolean>` — 스키마 존재 여부.
- `switchFk(table, enabled): Promise<void>` — FK 제약 일시 on/off(트랜잭션 내 허용, DDL 아님).

`get...QueryDef(...)` 형태의 생성기(`getCreateTableQueryDef` 등 위 메서드 1:1 대응 + `getCreateObjectQueryDef`)는 실행 없이 `QueryDef` 만 반환 — 여러 DDL 을 모아 한 번에 실행하거나 SQL 을 미리 확인할 때.

## 초기화 / Migration

- `initialize(options?: { dbs?: string[]; force?: boolean }): Promise<boolean>` — 스키마·마이그레이션 적용. `dbs`=대상 DB 한정, `force`=강제 재생성. 적용 여부 반환.
- `interface Migration` — `{ name: string; up: (db: DbContextBase & DbContextDdlMethods) => Promise<void> }`. `name` 은 고유(타임스탬프 권장), `up` 안에서 DDL 호출. `initialize` 가 미적용 `name` 만 순서대로 실행.

```typescript
override migrations: Migration[] = [
  { name: "20260105_001_create_user", up: async (db) => { await db.createTable(User); } },
  { name: "20260105_002_add_email", up: async (db) => { await db.addColumn(User, "email", c.varchar(200).nullable()); } },
];
```

## 트랜잭션 에러 (DbTransactionError / DbErrorCode)

DBMS 네이티브 트랜잭션 에러를 표준 코드로 래핑. `connect`/`transaction` 의 롤백 경로에서 던져진다(주로 executor 구현이 생성).

- `class DbTransactionError extends Error`
  - `code: DbErrorCode` — 표준 에러 코드(생성자 1번째 인자).
  - `message: string` — 메시지(생성자 2번째 인자).
  - `originalError?: unknown` — 원본 DBMS 에러(생성자 3번째, 디버깅용).
  - `name` — 항상 `"DbTransactionError"`.
- `enum DbErrorCode` (문자열 값)
  - `NO_ACTIVE_TRANSACTION` — 활성 트랜잭션 없는데 ROLLBACK 시도. 롤백 중 이 코드면 컨텍스트가 무시하고 원 에러를 보존.
  - `TRANSACTION_ALREADY_STARTED` — 이미 트랜잭션 시작됨.
  - `DEADLOCK` — 데드락.
  - `LOCK_TIMEOUT` — 잠금 타임아웃.

```typescript
try {
  await db.rollbackTransaction();
} catch (err) {
  if (err instanceof DbTransactionError && err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) return;
  throw err;
}
```

## SD_BUILDER

- `const SD_BUILDER: unique symbol` — `queryable()`/`executable()` 가 반환한 팩토리 함수에 원본 빌더(TableBuilder/ViewBuilder/ProcedureBuilder)를 부착하는 심볼 키. 컨텍스트 멤버에서 정의 빌더를 역으로 꺼낼 때(예: 전체 테이블 순회·DDL 자동화) 사용.
