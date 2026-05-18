# @simplysm/orm-common — DbContext

DB 1개에 대응하는 추상 클래스. 서브클래싱하여 테이블/뷰/프로시저를 인스턴스 프로퍼티로 등록하고, connect/transaction/DDL/initialize 진입점을 제공한다. 실제 SQL 실행은 생성자에 주입된 `DbContextExecutor` 가 담당.

## 생성·등록

```ts
class MainDb extends DbContext {
  user = this.queryable(User);            // → () => Queryable<User.$inferSelect, typeof User>
  vUser = this.queryable(UserSummary);    // View 도 동일
  getUserById = this.executable(GetUserById); // → () => Executable<TParams, TReturns>

  migrations = [
    { name: "001-init", up: async (db) => { await db.createTable(User); } },
  ];
}

const db = new MainDb(executor, { database: "mydb", schema: "dbo" });
```

- `protected queryable(builder)`: `TableBuilder | ViewBuilder` 를 받아 호출시마다 새 alias 가 할당된 `Queryable` 을 만드는 팩토리 함수를 반환. 반환 함수에는 `SD_BUILDER` 심볼로 원본 builder 가 부착됨 (initialize 가 회수).
- `protected executable(builder)`: `ProcedureBuilder` → `Executable` 팩토리. 동일하게 `SD_BUILDER` 부착.
- `_migration` 프로퍼티: 시스템 마이그레이션 테이블(`_migration(code PK varchar(255))`) 이 자동 등록됨.

## 연결 / 트랜잭션

```ts
await db.connect(async () => { ... });                        // connect + tx (auto commit/rollback)
await db.connect(async () => { ... }, "REPEATABLE_READ");     // isolation level
await db.connectWithoutTransaction(async () => { ... });      // connect only
await db.transaction(async () => { ... });                    // 이미 connect 인 상태에서 tx 만
```

- `status: "ready" | "connect" | "transact"`. 잘못된 진입(중복 connect, 중복 tx)은 throw.
- `connect()` 진입시 1회 `validateRelationsImpl` 호출 (relation 무결성 검사 — 잘못된 FK 정의는 여기서 throw).
- 본문 throw 시 자동 rollback → `_executor.close()` 후 status `ready` 복귀. rollback 중 `DbTransactionError(NO_ACTIVE_TRANSACTION)` 는 무시.
- `transaction()` 단독은 `status==="connect"` 일 때만. 이미 transact 면 throw.
- `executeDefs(defs, resultMetas?)`: `_executor.executeDefs` 위임. `status==="transact"` 중 DDL 포함 시 throw.

## DDL 실행

`createTable`, `dropTable`, `renameTable`, `createView`, `dropView`, `createProc`, `dropProc`, `addColumn`, `dropColumn`, `modifyColumn`, `renameColumn`, `addPrimaryKey`, `dropPrimaryKey`, `addForeignKey`, `addIndex`, `dropForeignKey`, `dropIndex`, `clearSchema({database, schema?})`, `schemaExists(database, schema?): Promise<boolean>`, `truncate(table)`, `switchFk(table, enabled)`.

각각 `executeDefs([...QueryDef])` 로 1건씩 실행. 트랜잭션 내에서는 `switchFk` 외 모두 차단(`executeDefs` 에서 검사).

대응 `getXxxQueryDef(...)` 형태의 *생성기* 메서드도 동일 시그니처로 제공 (실행 없이 `QueryDef` 만 반환). `initialize()` 가 배치 DDL 을 모을 때 사용.

`getCreateObjectQueryDef(builder)` — Table/View/Procedure 중 무엇이든 받아 알맞은 create DDL 반환.

## initialize

```ts
await db.initialize();                      // 미적용 migration 만 실행
await db.initialize({ dbs: ["a", "b"] });   // 다중 DB
await db.initialize({ force: true });       // 스키마 clear + 전체 재생성 + 모든 migration 을 "적용됨" 등록
```

반환값: 실행된 migration 이 있으면 `true`, 아니면 `false`.

동작:
- `force=true`: `clearSchema` → DbContext 의 모든 등록 객체(`queryable`/`executable` 프로퍼티에서 `SD_BUILDER` 로 회수) create → `_Migration` 에 모든 migration name 등록 → `false`.
- `force=false`:
  - `_Migration` 테이블 없음 = 신규 DB → 전체 create + 모든 migration 등록 → `false`.
  - 있음 → 미적용 migration 만 순차 실행 → 실행분 있으면 `true`.

서브클래스가 `migrations: Migration[]` 를 오버라이드해 `{ name, up(db) }` 목록 제공.

## 헬퍼

- `database`/`schema` getter — 생성자 옵션 노출.
- `getNextAlias(): string` — `T1`, `T2`, ... alias 카운터. `connect`/`connectWithoutTransaction` 진입시 reset.
- `resetAliasCounter()`.
- `getQueryDefObjectName(tableOrView)` — Table/View 메타에서 `{database, schema, name}` 산출 (없으면 DbContext 옵션 fallback).

## 인터페이스

외부에서 DbContext 를 의존성으로 다룰 때는 `DbContextBase`(코어) + `DbContextDdlMethods`(DDL) 인터페이스 사용 (`./types/db-context-def`). `DbContext` 가 둘 다 구현.
