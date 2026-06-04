# @simplysm/orm-common — DbContext / 연결·트랜잭션·DDL·마이그레이션

`DbContext` 추상 클래스를 상속해 테이블·뷰·프로시저를 클래스 프로퍼티로 등록하고, 연결·트랜잭션·DDL·마이그레이션을 실행하는 묶음. `DbContextExecutor` 구현체와 `{ database, schema? }` 옵션을 생성자로 주입한다. 각 프로퍼티가 독립 직렬화되어 40+ 테이블에서도 TS7056 이 발생하지 않는다. 트랜잭션 롤백 에러는 `DbTransactionError` 로 표준화된다.

> 앱(Angular) 환경에서는 화면이 `DbContext` 를 직접 생성하지 않고 `AppOrmProvider.connectAsync(cb)` 로 감싼다(client-orm.md). `db` 인자가 곧 아래 `DbContext` 인스턴스이므로, 콜백 안의 쿼리 작성법은 동일하다.

## DbContext (abstract class)

```typescript
abstract class DbContext implements DbContextBase {
  constructor(executor: DbContextExecutor, opt: { database: string; schema?: string });

  status: DbContextStatus;                  // "ready" | "connect" | "transact"
  get database(): string | undefined;
  get schema(): string | undefined;
  migrations: Migration[];                  // 서브클래스에서 오버라이드

  // 등록 (protected — 서브클래스 프로퍼티 초기화에서 사용)
  protected queryable<T>(builder: T): () => Queryable<...>;
  protected executable<T>(builder: T): () => Executable<...>;

  // 연결
  connect<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  connectWithoutTransaction<R>(callback: () => Promise<R>): Promise<R>;
  transaction<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;

  // DDL 실행 / DDL QueryDef 생성기 / initialize ...
}
```

식별자 풀이:

- constructor `executor: DbContextExecutor` — 실제 DB 연결·쿼리 실행을 위임할 어댑터(서버 측 node executor, 클라이언트 측 service-client executor). 이 패키지는 SQL/QueryDef 까지만 만들고 실행은 전부 executor 가 한다.
- constructor `opt.database: string` — 기본 데이터베이스명. 빌더가 database 를 지정하지 않으면 이 값이 객체 네임스페이스에 쓰인다.
- constructor `opt.schema?: string` — 기본 스키마명(MSSQL `dbo`, PostgreSQL `public`). MySQL 은 무시.
- `status: "ready"|"connect"|"transact"` — 현재 상태. "ready"=미연결, "connect"=연결됨(트랜잭션 없음), "transact"=트랜잭션 중. `connect()` 중복 호출 방지·트랜잭션 중 DDL 차단 판정에 쓰인다.
- `database` / `schema` (getter) — 주입한 opt 값을 그대로 노출. 빌더의 `getQueryDefObjectName` 기본값으로 쓰임.
- `migrations: Migration[]` — 마이그레이션 정의 배열. 기본 `[]`, 서브클래스에서 오버라이드해 채운다. `initialize()` 가 미실행 항목만 순서대로 실행.
- `queryable(builder)` (protected) — `TableBuilder`/`ViewBuilder` 를 받아 호출할 때마다 새 alias 가 붙는 `() => Queryable` 팩토리를 반환. 서브클래스에서 `user = this.queryable(User)` 형태로 멤버를 만든다.
- `executable(builder)` (protected) — `ProcedureBuilder` 를 받아 `() => Executable` 팩토리를 반환. 서브클래스에서 `getUserById = this.executable(GetUserById)` 형태로 만든다.
- `connect(fn, isolationLevel?)` — 연결 + 트랜잭션으로 `fn` 을 감싼다. 정상 종료 시 commit, throw 시 rollback 후 재throw, 무조건 close. 첫 호출 시 관계 정합성을 1회 검증(`validateRelations`). 기본 진입점.
- `connectWithoutTransaction(callback)` — 연결만 하고 트랜잭션은 열지 않음. 트랜잭션 안에서 동작하지 않는 작업(`initialize`/일부 DDL) 전용. 끝나면 close.
- `transaction(fn, isolationLevel?)` — 이미 `connect` 상태일 때 그 안에서 트랜잭션 블록을 추가로 연다. "transact" 상태에서 재호출하면 throw.
- `isolationLevel?` — 트랜잭션 격리 수준. 미지정 시 executor/DB 기본값. 값별 의미는 아래 `IsolationLevel` 참조.

사용 예 (직접 API):

```typescript
class MainDb extends DbContext {
  user = this.queryable(User);
  post = this.queryable(Post);
  getUserById = this.executable(GetUserById);
  override migrations = [{ name: "001", up: async (db) => { await db.createTable(User); } }];
}

const db = new MainDb(executor, { database: "mydb" });
const users = await db.connect(async () => {
  return db.user().where((u) => [expr.eq(u.isActive, true)]).execute();
});
```

주의:

- 트랜잭션("transact") 상태에서 DDL(`createTable` 등)을 `executeDefs` 로 보내면 "TRANSACTION 상태에서는 DDL을 실행할 수 없습니다" throw. DDL 은 `connectWithoutTransaction` 안에서 실행.
- 롤백 자체가 실패해도 원래 에러를 우선 throw 하고, 롤백 실패 원인은 `err.cause` 로 부착(단, `NO_ACTIVE_TRANSACTION` 은 무시).

## DDL 실행 메서드

`connectWithoutTransaction` 안에서 호출하며, 즉시 executor 로 실행한다. 모두 `Promise<void>`(예외: `schemaExists` → `Promise<boolean>`).

- `createTable(table: TableBuilder)` / `dropTable(table)` / `renameTable(table, newName)` — 테이블 생성/삭제/이름변경. drop·rename 의 `table` 인자는 `QueryDefObjectName`(`{ database?, schema?, name }`).
- `createView(view: ViewBuilder)` / `dropView(view)` — 뷰 생성/삭제.
- `createProc(procedure: ProcedureBuilder)` / `dropProc(procedure)` — 프로시저 생성/삭제.
- `addColumn(table, columnName, column: ColumnBuilder)` / `dropColumn(table, column)` / `modifyColumn(table, columnName, column)` / `renameColumn(table, column, newName)` — column 추가/삭제/타입·속성변경/이름변경.
- `addPrimaryKey(table, columns: string[])` / `dropPrimaryKey(table)` — PK 추가/삭제. 복합 PK 는 `columns` 에 여러 이름.
- `addForeignKey(table, relationName, relationDef: ForeignKeyBuilder)` / `dropForeignKey(table, relationName)` — FK 제약 추가/삭제.
- `addIndex(table, indexBuilder: IndexBuilder<string[]>)` / `dropIndex(table, columns: string[])` — index 추가/삭제. drop 은 column 이름 배열로 식별.
- `clearSchema(params: { database; schema? })` — 스키마의 모든 객체 삭제(초기화).
- `schemaExists(database, schema?): Promise<boolean>` — 스키마 존재 여부.
- `truncate(table)` — 테이블 데이터 전체 비우기(구조 유지).
- `switchFk(table, enabled: boolean)` — FK 제약 일시 활성/비활성. `enabled` false=비활성(대량 적재 전), true=재활성. DDL 이 아니라 트랜잭션 안에서도 호출 가능.

각 `createX`/`dropX`/... 에는 동일 시그니처의 `getXQueryDef(...): QueryDef` 생성기 버전이 쌍으로 존재(실행하지 않고 QueryDef AST 만 반환). 추가로 `getCreateObjectQueryDef(builder)` 는 Table/View/Procedure 중 무엇이든 받아 알맞은 create QueryDef 를 반환한다. 마이그레이션에서 여러 DDL 을 모아 한 번에 보내거나 DDL 을 검사·로깅할 때 사용.

## initialize

```typescript
initialize(options?: { dbs?: string[]; force?: boolean }): Promise<boolean>
```

- `dbs?: string[]` — 초기화 대상 데이터베이스명 목록. 미지정 시 컨텍스트의 기본 database.
- `force?: boolean` — true 면 기존 스키마를 비우고(`clearSchema`) 전체 재생성. false/미지정이면 미적용 마이그레이션만 증분 실행하고, 변경이 있었는지를 boolean 으로 반환.
- 반환값 — 실제로 스키마를 만들거나 마이그레이션을 적용했으면 true. 트랜잭션 안에서 돌지 않으므로 `connectWithoutTransaction` 으로 호출.

## DbContextBase / DbContextStatus / DbContextDdlMethods

- `DbContextBase` (interface) — `Queryable`/`Executable`/`ViewBuilder` 가 의존하는 컨텍스트 최소 면(`status`, `database`, `schema`, `getNextAlias()`, `resetAliasCounter()`, `executeDefs()`, `getQueryDefObjectName()`, `switchFk()`). 직접 구현할 일은 드물고, 커스텀 컨텍스트 타입의 상한으로 쓰인다.
- `DbContextStatus` — `"ready" | "connect" | "transact"`. 위 `status` 와 동일 의미.
- `DbContextDdlMethods` (interface) — 위 DDL 실행 메서드 + QueryDef 생성기 전체를 모은 인터페이스. `Migration.up(db)` 의 `db` 타입이 `DbContextBase & DbContextDdlMethods` 라 마이그레이션 콜백에서 DDL 을 호출할 수 있다.

## DbContextExecutor / ResultMeta

`DbContextExecutor` (interface) — DbContext 가 연결·실행을 위임할 어댑터. 직접 구현은 서버/클라이언트 어댑터 패키지에서만.

- `connect(): Promise<void>` / `close(): Promise<void>` — 물리 연결 수립/종료.
- `beginTransaction(isolationLevel?)` / `commitTransaction()` / `rollbackTransaction()` — 트랜잭션 제어. rollback 은 활성 트랜잭션이 없으면 `DbTransactionError(NO_ACTIVE_TRANSACTION)` 를 던질 수 있음.
- `executeDefs<T>(defs: QueryDef[], resultMetas?: (ResultMeta|undefined)[]): Promise<T[][]>` — QueryDef 배열을 실행하고 def별 결과 배열을 반환. `resultMetas` 가 있으면 해당 def 결과를 그 메타로 타입 환원.
- `ResultMeta` (interface) — `{ columns: Record<string, ColumnPrimitiveStr>; joins: Record<string, { isSingle: boolean }> }`. SELECT 결과를 TS 객체로 환원할 때의 column 타입·JOIN 중첩 구조 메타. `Queryable.getResultMeta()` 가 생성. (자세히는 [types.md](./types.md))

## Migration

```typescript
interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
```

- `name: string` — 마이그레이션 고유 이름(타임스탬프 권장, 예 `20260105_001_create_user`). 적용 여부 추적 키이므로 한 번 배포 후 변경 금지.
- `up(db)` — 적용 시 실행할 함수. `db` 로 DDL 메서드를 호출. 미적용 항목만 `name` 순서대로 1회씩 실행된다.

## IsolationLevel

`connect`/`transaction`/`beginTransaction` 의 격리 수준.

- `"READ_UNCOMMITTED"` — 커밋 전 데이터까지 읽음(Dirty Read 허용). 가장 느슨, 정합성 낮음.
- `"READ_COMMITTED"` — 커밋된 데이터만 읽음. 일반적 기본값.
- `"REPEATABLE_READ"` — 트랜잭션 내 동일 쿼리가 동일 결과 보장.
- `"SERIALIZABLE"` — 완전 직렬화. 가장 엄격, 경합 시 잠금/충돌 비용 큼.

## DbTransactionError / DbErrorCode

DBMS별 네이티브 트랜잭션 에러를 표준 코드로 래핑한다. 롤백·재시도 분기에서 `instanceof DbTransactionError` + `err.code` 로 판별.

```typescript
class DbTransactionError extends Error {
  readonly name = "DbTransactionError";
  constructor(code: DbErrorCode, message: string, originalError?: unknown);
  readonly code: DbErrorCode;
  readonly originalError?: unknown;
}
```

- `code: DbErrorCode` — 표준화된 에러 코드(아래). 분기 기준.
- `message: string` — 사람용 메시지.
- `originalError?: unknown` — 원본 DBMS 에러(디버깅용 원형 보존).

`DbErrorCode` (enum, 값은 동명 문자열):

- `NO_ACTIVE_TRANSACTION` — 롤백 대상 활성 트랜잭션 없음. 이미 롤백/커밋된 경우. `connect` 내부에서 이 코드는 무시된다.
- `TRANSACTION_ALREADY_STARTED` — 트랜잭션이 이미 시작됨(중복 begin).
- `DEADLOCK` — 데드락 발생. 재시도 정책 트리거로 사용.
- `LOCK_TIMEOUT` — 잠금 대기 타임아웃.

```typescript
try {
  await executor.rollbackTransaction();
} catch (err) {
  if (err instanceof DbTransactionError && err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) return;
  throw err;
}
```
