# @simplysm/orm-common — db-context

`DbContext` 를 상속해 테이블·뷰·프로시저를 프로퍼티로 등록하고, 연결·트랜잭션 경계·DDL·마이그레이션을 다루는 군. 실제 DB I/O 는 생성자에 주입하는 `DbContextExecutor` 가 담당하고, `DbContext` 는 QueryDef 생성·트랜잭션 상태 관리·DDL 실행 오케스트레이션만 한다.

## DbContext

```typescript
abstract class DbContext implements DbContextBase {
  status: DbContextStatus;             // "ready" | "connect" | "transact"
  migrations: Migration[];             // 서브클래스에서 오버라이드
  constructor(executor: DbContextExecutor, opt: { database: string; schema?: string });

  protected queryable<T extends TableBuilder | ViewBuilder>(builder: T): () => Queryable<...>;
  protected executable<T extends ProcedureBuilder>(builder: T): () => Executable<...>;

  connect<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  connectWithoutTransaction<R>(callback: () => Promise<R>): Promise<R>;
  transaction<R>(fn: () => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  initialize(options?: { dbs?: string[]; force?: boolean }): Promise<boolean>;
  // + DDL 실행 메서드 / DDL QueryDef 생성기 (아래)
}
```

### 등록 메서드 (protected — 서브클래스에서 프로퍼티 정의용)

- `this.queryable(builder)` — Table/View 빌더를 등록해 `() => Queryable` 팩토리를 반환. 호출할 때마다 새 alias 가 부여됨. 각 테이블을 별도 프로퍼티로 두면 40+ 테이블에서도 TS7056 직렬화 한계를 피함.
- `this.executable(builder)` — Procedure 빌더를 등록해 `() => Executable` 팩토리를 반환.

```typescript
class MainDb extends DbContext {
  user = this.queryable(User);
  post = this.queryable(Post);
  activeUsers = this.queryable(ActiveUsers);
  getUserById = this.executable(GetUserById);

  migrations = [{ name: "001", up: async (db) => { await db.createTable(User); } }];
}
const db = new MainDb(executor, { database: "mydb" });
```

### 연결·트랜잭션 경계

- `connect(fn, isolationLevel?)` — 연결 → `BEGIN TRANSACTION` → `fn()` → 성공 시 COMMIT, 예외 시 ROLLBACK → 항상 close. 콜백 반환값이 그대로 반환됨. `status` 가 `"ready"` 가 아니면 throw. 첫 호출 시 관계 정의 검증(`validateRelations`)을 1회 수행. **앱에서 권장하는 기본 진입점**.
- `connectWithoutTransaction(callback)` — 트랜잭션 없이 연결만(자동 BEGIN/COMMIT 없음). 트랜잭션이 불가하거나 불필요한 작업용.
- `transaction(fn, isolationLevel?)` — 이미 연결된(`connect`/`connectWithoutTransaction` 내부) 상태에서 트랜잭션만 따로 시작. 이미 `"transact"` 면 throw. ROLLBACK 시 활성 트랜잭션이 없으면(`NO_ACTIVE_TRANSACTION`) 그 에러는 무시하고 원본 에러를 던짐.
- `isolationLevel` — `READ_UNCOMMITTED`/`READ_COMMITTED`/`REPEATABLE_READ`/`SERIALIZABLE`. 미지정 시 executor 기본값.

```typescript
const users = await db.connect(async () => {
  return db.user().where((u) => [expr.eq(u.isActive, true)]).execute();
});
```

### DbContextBase 핵심 메서드 (executor·내부에서 사용)

- `database` / `schema` — 생성자 옵션 게터.
- `getNextAlias()` — `T1`, `T2`, ... 순차 alias 발급. `resetAliasCounter()` 로 초기화(연결 시작 시 자동).
- `executeDefs<T>(defs, resultMetas?)` — QueryDef 배열을 executor 로 실행. `"transact"` 상태에서 DDL 타입(`DDL_TYPES`)이 섞이면 throw.
- `getQueryDefObjectName(tableOrView)` — 빌더 → `{ database?, schema?, name }` 변환.
- `switchFk(table, enabled)` — FK 제약 활성/비활성(트랜잭션 내 사용 가능, DDL 아님).

### DDL 실행 메서드 (Promise<void>)

`executeDefs` 로 즉시 실행. `"transact"` 상태에서는 DDL 차단됨.

- 테이블: `createTable(table)` / `dropTable(name)` / `renameTable(name, newName)` / `truncate(name)`
- 뷰: `createView(view)` / `dropView(name)`
- 프로시저: `createProc(proc)` / `dropProc(name)`
- 컬럼: `addColumn(name, columnName, column)` / `dropColumn(name, column)` / `modifyColumn(name, columnName, column)` / `renameColumn(name, column, newName)`
- 키·인덱스: `addPrimaryKey(name, columns)` / `dropPrimaryKey(name)` / `addForeignKey(name, relationName, relationDef)` / `dropForeignKey(name, relationName)` / `addIndex(name, indexBuilder)` / `dropIndex(name, columns)`
- 스키마: `clearSchema({ database, schema? })` / `schemaExists(database, schema?): Promise<boolean>`
- `switchFk(name, enabled)` — DDL 아님(트랜잭션 내 가능).

### DDL QueryDef 생성기 (`get*QueryDef`)

위 실행 메서드와 1:1 대응하되 실행하지 않고 `QueryDef` 만 반환. 마이그레이션·배치에서 여러 DDL 을 모아 한 번에 `executeDefs` 하거나 SQL 을 검사할 때. 예: `getCreateTableQueryDef`, `getAddColumnQueryDef`, `getAddForeignKeyQueryDef`, `getDropIndexQueryDef`, `getTruncateQueryDef`, `getSwitchFkQueryDef` 등. `getCreateObjectQueryDef(builder)` 는 Table/View/Procedure 중 무엇이든 받아 적절한 CREATE QueryDef 를 반환.

### initialize

- `initialize(options?)` — DbContext 에 등록된 스키마·`migrations` 를 기준으로 DB 를 초기화/마이그레이션. `options.dbs` 로 대상 DB 제한, `options.force` 로 강제 재생성. 변경이 있었으면 `true` 반환.

## DbContextStatus

```typescript
type DbContextStatus = "ready" | "connect" | "transact";
```

- `"ready"` — 미연결. `connect`/`connectWithoutTransaction` 호출 가능.
- `"connect"` — 연결됨, 트랜잭션 없음. `transaction` 호출 가능.
- `"transact"` — 트랜잭션 활성. DDL 실행 차단.

## DbContextExecutor

`DbContext` 가 위임하는 실제 DB I/O 인터페이스. `@simplysm/orm-node`(서버)·orm-service 클라이언트 등이 구현.

```typescript
interface DbContextExecutor {
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
}
```

- `executeDefs(defs, resultMetas?)` — QueryDef 배열을 SQL 로 빌드·실행. `resultMetas[i]` 가 주어진 def 의 결과는 `parseQueryResult` 로 타입 변환/중첩되고, 없으면 원시 결과 그대로. 반환은 def 별 결과 배열의 배열.

## Migration

```typescript
interface Migration {
  name: string;                                              // 고유 이름 (타임스탬프 권장)
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
```

- `name` — 적용 여부를 추적하는 고유 키. 적용된 이름은 `_migration` 시스템 테이블에 적재됨.
- `up(db)` — 스키마 변경을 수행하는 함수. `db` 로 DDL 실행 메서드 사용.

```typescript
migrations = [
  { name: "20260105_001_create_user", up: async (db) => { await db.createTable(User); } },
  { name: "20260105_002_add_email", up: async (db) => {
    await db.addColumn(User, "email", { type: "varchar", length: 200 });
  } },
];
```

## DbTransactionError / DbErrorCode

DBMS 별 네이티브 에러를 표준 코드로 래핑. ROLLBACK 시 활성 트랜잭션 없음 등을 코드로 분기.

```typescript
class DbTransactionError extends Error {
  readonly name = "DbTransactionError";
  constructor(code: DbErrorCode, message: string, originalError?: unknown);
  readonly code: DbErrorCode;
  readonly originalError?: unknown;
}
enum DbErrorCode {
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",       // ROLLBACK 시 활성 트랜잭션 없음
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",
  DEADLOCK = "DEADLOCK",                                  // 데드락
  LOCK_TIMEOUT = "LOCK_TIMEOUT",                          // 잠금 타임아웃
}
```

- `code` — DBMS 독립 분류. `connect`/`transaction` 의 롤백 로직이 `NO_ACTIVE_TRANSACTION` 을 무시하는 데 사용.
- `originalError` — 원본 DBMS 에러(디버깅용).

## 관련 export

- `DbContextBase` / `DbContextDdlMethods` — `DbContext` 가 구현하는 핵심·DDL 인터페이스. executor·`Queryable`·`ViewBuilder` 가 의존.
- `SD_BUILDER` — `queryable()`/`executable()` 이 반환 팩토리에 빌더를 부착하는 심볼 키(내부용).
- `_Migration` — 적용된 마이그레이션을 기록하는 시스템 테이블 빌더(`_migration`, PK `code`).

## 주의사항

- 테이블은 반드시 **개별 프로퍼티**로(`user = this.queryable(User)`) — 한 객체에 묶으면 TS7056.
- 앱 코드는 옵션을 흩뿌리지 말고 `connect` 경계 안에서만 쿼리 (client-orm.md 의 `AppOrmProvider` 패턴).
- DDL 은 트랜잭션 밖에서. `transaction()` 안에서 DDL 메서드 호출 시 `executeDefs` 가 throw.
