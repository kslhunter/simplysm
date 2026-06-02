# @simplysm/orm-common — DbContext / 연결·DDL·마이그레이션

테이블/뷰/프로시저 빌더를 class 프로퍼티로 등록하고, 연결·트랜잭션·DDL·초기화·마이그레이션을 제공하는 추상 클래스. 서브클래스로 확장해 사용. 실제 DB I/O 는 생성자에 주입한 `DbContextExecutor` 가 담당.

## DbContext (추상 클래스)

- `new DbContext(executor: DbContextExecutor, opt: { database: string; schema? })` — 생성자(서브클래스가 호출). `executor` 는 DB I/O 구현, `opt.database`/`opt.schema` 는 기본 네임스페이스.
- `status: DbContextStatus` — 현재 상태(`"ready"`|`"connect"`|`"transact"`). 연결/트랜잭션 가드에 사용.
- `database` / `schema` — 주입한 기본 database/schema.
- 등록 메서드(protected, 서브클래스 프로퍼티 초기화에서 호출):
  - `queryable(builder): () => Queryable` — Table/View 빌더를 Queryable 팩토리로 등록. 호출할 때마다 새 alias 부여.
  - `executable(builder): () => Executable` — Procedure 빌더를 Executable 팩토리로 등록.
- `migrations: Migration[]` — 마이그레이션 정의(서브클래스에서 오버라이드). 기본 빈 배열.

```typescript
class MainDb extends DbContext {
  user = this.queryable(User);
  post = this.queryable(Post);
  getUserById = this.executable(GetUserById);
  migrations = [{ name: "001", up: async (db) => { await db.createTable(User); } }];
}
const db = new MainDb(executor, { database: "mydb" });
await db.connect(async () => { await db.user().execute(); });
```

## 연결 / 트랜잭션

- `connect<T>(fn, isolationLevel?): Promise<T>` — 연결 + 트랜잭션 1개를 감싸 `fn` 실행. 성공 시 commit, 예외 시 rollback 후 throw, 종료 시 항상 close. `ready` 가 아니면 throw. 최초 호출 시 관계 정합성 검증. `isolationLevel` 은 격리 수준(선택).
- `connectWithoutTransaction<T>(callback): Promise<T>` — 트랜잭션 없이 연결만 잡고 `callback` 실행, 종료 시 close. 내부에서 별도 `transaction()` 을 직접 호출할 때 사용.
- `transaction<T>(fn, isolationLevel?): Promise<T>` — 이미 연결된 상태에서 트랜잭션만 시작/commit/rollback. `transact` 상태면 throw. (DDL 은 transact 상태에서 실행 불가 — `executeDefs` 가 throw)

## DbContextBase 내부 인터페이스 메서드

executor·Queryable 이 의존하는 저수준 메서드(직접 호출은 드묾):
- `getNextAlias(): string` — 다음 테이블 alias(`T1`, `T2`...) 발급.
- `resetAliasCounter(): void` — alias 카운터 초기화(연결 시작 시 호출).
- `executeDefs<T>(defs: QueryDef[], resultMetas?): Promise<T[][]>` — QueryDef 배열을 executor 로 실행. transact 상태에서 DDL 포함 시 throw.
- `getQueryDefObjectName(tableOrView): QueryDefObjectName` — 빌더 → DB 객체 이름(database/schema/name) 해석.
- `switchFk(table, enabled): Promise<void>` — FK 제약 활성/비활성(트랜잭션 내 가능).

## DDL 실행 메서드 (await 후 즉시 실행)

각각 해당 DDL 을 `executeDefs` 로 즉시 실행. `table`/`view`/`procedure` 인자는 `QueryDefObjectName` 또는 빌더.
- `createTable(table)` / `dropTable(table)` / `renameTable(table, newName)` — 테이블 생성/삭제/이름변경.
- `createView(view)` / `dropView(view)` — 뷰 생성/삭제.
- `createProc(procedure)` / `dropProc(procedure)` — 프로시저 생성/삭제.
- `addColumn(table, columnName, column)` — column 추가(`column` 은 `ColumnBuilder`).
- `dropColumn(table, column)` — column 삭제.
- `modifyColumn(table, columnName, column)` — column 타입/속성 변경.
- `renameColumn(table, column, newName)` — column 이름 변경.
- `addPrimaryKey(table, columns)` / `dropPrimaryKey(table)` — PK 추가/삭제.
- `addForeignKey(table, relationName, relationDef)` — FK 추가(`relationDef` 는 `ForeignKeyBuilder`).
- `dropForeignKey(table, relationName)` — FK 삭제.
- `addIndex(table, indexBuilder)` / `dropIndex(table, columns)` — index 추가/삭제.
- `clearSchema(params: { database; schema? })` — 스키마 내 모든 객체 삭제.
- `schemaExists(database, schema?): Promise<boolean>` — 스키마 존재 확인.
- `truncate(table)` — 테이블 비우기.

## DDL QueryDef 생성기 (실행 없이 def 만 반환)

위 DDL 들의 `get*QueryDef(...)` 버전. 즉시 실행하지 않고 `QueryDef` 만 반환해 배치·검사용으로 모을 때 사용. 예: `getCreateTableQueryDef(table)`, `getDropTableQueryDef(table)`, `getAddColumnQueryDef(table, columnName, column)`, `getAddForeignKeyQueryDef(...)`, `getTruncateQueryDef(table)`, `getSwitchFkQueryDef(table, enabled)` 등. `getCreateObjectQueryDef(builder)` 는 Table/View/Procedure 중 무엇이든 받아 알맞은 CREATE def 반환.

## 초기화 / 마이그레이션

- `initialize(options?: { dbs?: string[]; force?: boolean }): Promise<boolean>` — 스키마 동기화/마이그레이션 실행.
  - `dbs?: string[]` — 대상 database 한정(미지정 시 전체).
  - `force?: boolean` — true 면 기존 스키마를 강제 재생성. 운영 데이터 손실 위험이 있어 개발/초기 셋업에서만.
  - 반환 boolean — 초기화 수행 여부.
- `interface Migration` — 마이그레이션 1건.
  - `name: string` — 고유 이름(타임스탬프 권장, 적용 여부 추적 키).
  - `up: (db) => Promise<void>` — 적용 함수. `db` 는 DDL 메서드를 갖춘 컨텍스트.

## 관련 타입

- `type DbContextStatus = "ready" | "connect" | "transact"`.
- `interface DbContextBase` — Queryable/Executable/ViewBuilder 가 의존하는 핵심 인터페이스(위 저수준 메서드 + database/schema/status).
- `interface DbContextDdlMethods` — DDL 실행+생성기 메서드 시그니처 모음(Migration.up 의 db 타입).
- `interface DbContextExecutor` — 주입할 실행기 인터페이스. `connect()`/`close()`/`beginTransaction(isolationLevel?)`/`commitTransaction()`/`rollbackTransaction()`/`executeDefs(defs, resultMetas?)`.
- `const SD_BUILDER: symbol` — 등록된 팩토리 함수에 원본 빌더를 매달아두는 심볼 키(내부 메타 조회용).
- `_Migration` — 시스템 마이그레이션 테이블 빌더(`_migration`, PK `code: varchar(255)`). initialize 가 적용 이력 저장에 사용.
