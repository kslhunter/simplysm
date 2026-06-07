# @simplysm/orm-common — DbContext / 연결·트랜잭션·DDL·마이그레이션

`DbContext` 추상 클래스를 상속해 테이블·뷰·프로시저를 클래스 프로퍼티로 등록하고, 연결·트랜잭션·DDL·마이그레이션을 실행하는 묶음. 생성자에 `DbContextExecutor` 구현체와 `{ database, schema? }` 옵션을 주입한다. 각 프로퍼티가 독립적으로 직렬화되므로 40+ 테이블에서도 TS7056 이 발생하지 않는다. 롤백 중 발생하는 트랜잭션 에러는 `DbTransactionError` 로 표준화된다.

## DbContext (abstract class)

```typescript
abstract class DbContext implements DbContextBase {
  constructor(executor: DbContextExecutor, opt: { database: string; schema?: string });
  status: DbContextStatus;            // "ready" | "connect" | "transact"
  get database(): string | undefined;
  get schema(): string | undefined;
  migrations: Migration[];            // 서브클래스에서 오버라이드
}
```

서브클래스에서 `protected queryable(builder)` / `protected executable(builder)` 로 멤버를 등록한다.

- `executor`: `DbContextExecutor` — 실제 connect/close/begin/commit/rollback/executeDefs 를 수행하는 어댑터. 서버는 node 구현, 클라이언트는 service-client 구현을 넣는다.
- `opt.database`: string — 대상 데이터베이스 이름. `database` getter 로 노출.
- `opt.schema`: string — MSSQL/PostgreSQL 스키마(선택). 미지정 시 dialect 기본값.
- `status`: `"ready" | "connect" | "transact"` — 현재 연결 단계. "ready"=미연결, "connect"=연결됨(트랜잭션 밖), "transact"=트랜잭션 중. `transact` 상태에서 DDL 실행 시 throw.
- `migrations`: `Migration[]` — 서브클래스에서 오버라이드하는 마이그레이션 정의 배열. `initialize()` 가 이미 적용된 것을 제외하고 순서대로 실행.

### 멤버 등록 (protected)

- `queryable(builder)` — `TableBuilder`/`ViewBuilder` 를 받아 `() => Queryable<...>` 팩토리를 반환. 호출할 때마다 새 alias 가 부여된 Queryable 생성. CUD 는 `TableBuilder` 기반에서만 가능.
- `executable(builder)` — `ProcedureBuilder` 를 받아 `() => Executable<...>` 팩토리를 반환.

```typescript
class AppDb extends DbContext {
  user = this.queryable(User);
  activeUsers = this.queryable(ActiveUsers); // View
  getUserById = this.executable(GetUserById); // Procedure
  override migrations = [{ name: "001_init", up: async (db) => { await db.createTable(User); } }];
}
const db = new AppDb(executor, { database: "mydb" });
```

### 연결·트랜잭션

- `connect(fn, isolationLevel?)` — 연결 → 트랜잭션 시작 → `fn` 실행 → 성공 시 commit, 예외 시 rollback 후 재throw → 최종 close. `ready` 가 아니면 throw. 최초 호출 시 관계 정의를 1회 검증. 업무 단위의 표준 진입점.
- `connectWithoutTransaction(callback)` — 트랜잭션 없이 연결만 잡고 `callback` 실행 후 close. DDL·초기화처럼 트랜잭션 밖에서 실행해야 하는 작업용.
- `transaction(fn, isolationLevel?)` — 이미 `connect` 상태에서 추가 트랜잭션 경계를 잡을 때. `transact` 상태면 throw. 성공 시 commit, 예외 시 rollback.
- `isolationLevel`: `"READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE"` — 격리 수준(선택). 미지정 시 DB 기본값(보통 READ_COMMITTED). 더티 리드 허용~완전 직렬화 순으로 엄격해짐.

```typescript
await db.connect(async () => {
  const users = await db.user().where((u) => [expr.eq(u.isActive, true)]).execute();
  await db.user().where((u) => [expr.eq(u.id, 1)]).update((u) => ({ name: "수정" }));
}); // 콜백 정상 종료 시 commit, throw 시 rollback
```

### DDL 실행 메서드 (트랜잭션 밖에서만)

각각 `executeDefs` 로 즉시 실행한다. `transact` 상태에서 호출하면 throw.

- `createTable(table)` / `dropTable(name)` / `renameTable(name, newName)` — 테이블 생성/삭제/이름변경.
- `truncate(name)` — 테이블 비우기(전 행 삭제, identity 리셋).
- `createView(view)` / `dropView(name)` — 뷰 생성/삭제.
- `createProc(procedure)` / `dropProc(name)` — 프로시저 생성/삭제.
- `addColumn(table, columnName, column)` / `dropColumn(table, column)` / `modifyColumn(table, columnName, column)` / `renameColumn(table, column, newName)` — 컬럼 변경. `column` 은 `ColumnBuilder`.
- `addPrimaryKey(table, columns)` / `dropPrimaryKey(table)` — PK 추가/삭제. `columns` 는 컬럼명 배열(복합 PK).
- `addForeignKey(table, relationName, relationDef)` / `dropForeignKey(table, relationName)` — FK 추가/삭제. `relationDef` 는 `ForeignKeyBuilder`.
- `addIndex(table, indexBuilder)` / `dropIndex(table, columns)` — 인덱스 추가/삭제.
- `clearSchema({ database, schema? })` — 스키마 내 모든 객체 삭제.
- `schemaExists(database, schema?)` — 스키마 존재 여부 `boolean` 반환.
- `switchFk(table, enabled)` — FK 제약 활성/비활성 토글. `enabled` true=활성, false=비활성. DDL 이 아니라 `transact` 상태에서도 호출 가능(대량 적재 시 FK 일시 해제 용도).
- `getQueryDefObjectName(tableOrView)` — 빌더에서 dialect 네임스페이스가 반영된 `QueryDefObjectName` 산출.

### DDL QueryDef 생성기 (실행 없이 def 만)

위 실행 메서드와 1:1 대응하는 `get*QueryDef(...)` 가 모두 있다(`getCreateTableQueryDef`, `getDropTableQueryDef`, `getAddColumnQueryDef`, `getAddForeignKeyQueryDef`, `getTruncateQueryDef`, `getSwitchFkQueryDef`, `getClearSchemaQueryDef`, `getSchemaExistsQueryDef` 등). 실행하지 않고 `QueryDef` AST 만 얻어 배치 실행·검증·SQL 변환에 쓸 때 사용. 단일 `getCreateObjectQueryDef(builder)` 는 Table/View/Procedure 빌더 종류를 보고 알맞은 CREATE def 를 만든다.

### 마이그레이션 / 초기화

- `initialize(options?)` — `migrations` 중 미적용분을 순서대로 실행하고, 적용 여부를 `_migration` 시스템 테이블에 기록. `boolean` 반환(변경 발생 여부 등).
  - `options.dbs`: string[] — 대상 데이터베이스 목록 한정(선택).
  - `options.force`: boolean — true 면 강제 재초기화. 스키마를 다시 깔아야 할 때만 사용.
- `executeDefs(defs, resultMetas?)` — `QueryDef[]` 를 executor 로 실행해 `T[][]`(def 별 결과) 반환. `transact` 상태에서 DDL 타입이 섞이면 throw. 빌더가 만든 def 를 저수준으로 직접 실행할 때 사용.

## Migration (interface)

```typescript
interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
```

- `name`: string — 고유 마이그레이션 식별자. 타임스탬프 접두 권장(`20260105_001_...`). 이 값으로 적용 여부를 추적하므로 한번 배포되면 변경 금지.
- `up`: `(db) => Promise<void>` — 스키마 변경 함수. `db` 로 DDL 메서드를 호출. 실행은 `initialize()` 가 미적용분만 골라 호출.

## DbTransactionError / DbErrorCode

DBMS 네이티브 에러를 dialect 독립 코드로 래핑한다. `connect`/`transaction` 의 롤백 단계에서 "이미 롤백되어 활성 트랜잭션이 없음" 같은 상황을 코드로 식별해 무시 여부를 판단할 때 쓴다.

```typescript
class DbTransactionError extends Error {
  constructor(code: DbErrorCode, message: string, originalError?: unknown);
  readonly code: DbErrorCode;
  readonly originalError?: unknown;
}
enum DbErrorCode { NO_ACTIVE_TRANSACTION, TRANSACTION_ALREADY_STARTED, DEADLOCK, LOCK_TIMEOUT }
```

- `code`: `DbErrorCode` — 표준화된 에러 종류. 아래 enum literal 로 분기.
- `originalError`: unknown — 래핑 전 원본 DBMS 에러(디버깅용). dialect 별 원인 추적 시 참조.
- `NO_ACTIVE_TRANSACTION` — 롤백/커밋할 활성 트랜잭션이 없음. 이미 롤백된 경우 무시 분기에 사용.
- `TRANSACTION_ALREADY_STARTED` — 트랜잭션이 이미 시작됨(중첩 시작 시도).
- `DEADLOCK` — 교착 상태로 트랜잭션이 강제 중단됨. 재시도 정책 분기에 사용.
- `LOCK_TIMEOUT` — 잠금 대기 시간 초과. 재시도/백오프 분기에 사용.

```typescript
try {
  await db.rollbackTransaction();
} catch (err) {
  if (err instanceof DbTransactionError && err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) return;
  throw err;
}
```

## DbContextBase / DbContextStatus / DbContextDdlMethods / SD_BUILDER

- `DbContextBase` (interface) — `Queryable`/`Executable`/`ViewBuilder` 가 의존하는 컨텍스트 최소 인터페이스(`status`, `database`, `schema`, `getNextAlias`, `resetAliasCounter`, `executeDefs`, `getQueryDefObjectName`, `switchFk`). `DbContext` 가 구현한다. executor·뷰 정의처럼 컨텍스트 전체가 아니라 일부 능력만 요구하는 시그니처에 쓴다.
- `DbContextStatus` (type) — `"ready" | "connect" | "transact"`. 위 `status` 와 동일.
- `DbContextDdlMethods` (interface) — DDL 실행 메서드 + `get*QueryDef` 생성기를 모은 인터페이스. `Migration.up` 의 `db` 파라미터 타입(`DbContextBase & DbContextDdlMethods`)에 쓰여, 마이그레이션 함수에서 DDL 만 노출되게 한다.
- `SD_BUILDER` (symbol) — `queryable()`/`executable()` 가 반환하는 팩토리 함수에 원본 빌더를 매다는 심볼 키. 등록된 멤버에서 원본 `TableBuilder`/`ViewBuilder`/`ProcedureBuilder` 를 역참조해야 할 때(스키마 수집·DDL 자동화 등) 사용.
