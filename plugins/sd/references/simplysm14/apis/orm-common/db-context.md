# @simplysm/orm-common — DbContext / 연결·트랜잭션 / DDL

`DbContext` 는 table/view/procedure 를 class 프로퍼티로 등록하고 연결·트랜잭션·DDL·Code-First 초기화를 제공하는 추상 베이스. 실제 DB 연결·실행은 생성자에 주입하는 `DbContextExecutor` 가 담당한다. 사용법: [client-orm.md](../../manuals/client-orm.md).

## DbContext (abstract class, implements `DbContextBase`)

```ts
abstract class DbContext {
  constructor(executor: DbContextExecutor, opt: { database: string; schema?: string });
}
```

- `executor` — DB 연결/쿼리 실행 어댑터. 모든 연결·트랜잭션·`executeDefs` 가 이 객체에 위임된다.
- `opt.database` — 기본 데이터베이스명. `database`/`schema` getter 와 `getQueryDefObjectName` 의 기본 네임스페이스로 쓰인다.
- `opt.schema` — 기본 스키마명(MSSQL/PostgreSQL). 선택.

### 등록 (protected — 서브클래스 프로퍼티 정의용)

- `queryable(builder)` — `TableBuilder` 또는 `ViewBuilder` 를 받아 `() => Queryable<builder["$inferSelect"], Table이면 builder 아니면 never>` 팩토리를 반환. 반환 함수에 `SD_BUILDER` 심볼로 원본 builder 를 부착(초기화 시 수집용). table 일 때만 `TFrom` 가 채워져 CUD 가능.
- `executable(builder)` — `ProcedureBuilder` 를 받아 `() => Executable<builder["$params"], builder["$returns"]>` 팩토리를 반환. 마찬가지로 `SD_BUILDER` 부착.

서브클래스는 `user = this.queryable(User)` / `getUserById = this.executable(GetUserById)` 형태로 프로퍼티를 선언하고, 호출(`db.user()`) 시 새 `Queryable`/`Executable` 인스턴스를 얻는다.

### 상태·메타 getter

- `status` — `"ready" | "connect" | "transact"`. `ready`=미연결, `connect`=연결됨(트랜잭션 밖), `transact`=트랜잭션 중. 연결/트랜잭션 메서드의 진입 가드에 쓰인다.
- `database` — 생성자 `opt.database` 값(`string | undefined`).
- `schema` — 생성자 `opt.schema` 값(`string | undefined`).
- `migrations: Migration[]` — 마이그레이션 정의 배열. 기본 `[]`, 서브클래스에서 오버라이드. `initialize` 가 참조한다.
- `_migration` — `_Migration`(시스템 `_migration` 테이블) 의 `Queryable` 팩토리. 적용된 마이그레이션 코드 적재용.

### 내부 유틸 (`DbContextBase`)

- `getNextAlias()` — `T1`, `T2` … 순으로 증가하는 테이블 별칭 문자열 반환. Queryable 이 FROM/JOIN 별칭 생성에 사용.
- `resetAliasCounter()` — 별칭 카운터를 0 으로 리셋. 매 연결 시작 시 호출됨.
- `getQueryDefObjectName(tableOrView)` — builder 메타와 context 기본 database/schema 를 합쳐 `QueryDefObjectName`(`{database?, schema?, name}`) 생성.
- `executeDefs(defs, resultMetas?)` — `QueryDef[]` 를 executor 로 실행해 `T[][]`(쿼리별 결과 배열) 반환. `transact` 상태에서 DDL 타입(`DDL_TYPES`)이 섞이면 throw.
- `switchFk(table, enabled)` — FK 제약 활성/비활성 DDL 실행(트랜잭션 내 허용).

### 연결 / 트랜잭션

- `connect(fn, isolationLevel?)` — `ready` 가 아니면 throw. 최초 1회 관계 검증(`validateRelations`) 수행, 별칭 카운터 리셋, executor 연결 후 **트랜잭션을 자동 시작**하고 `fn()` 실행 → 성공 시 commit, 실패 시 rollback(rollback 실패는 원본 에러 `cause` 로 보존, `NO_ACTIVE_TRANSACTION` 은 무시), 마지막에 항상 close. `fn` 결과를 그대로 반환.
- `connectWithoutTransaction(callback)` — `ready` 가 아니면 throw. 관계 검증·별칭 리셋·연결 후 트랜잭션 없이 `callback()` 실행, 마지막에 close. 트랜잭션을 직접 제어할 때 사용.
- `transaction(fn, isolationLevel?)` — 이미 `transact` 면 throw. (보통 `connectWithoutTransaction` 안에서) 트랜잭션을 시작해 `fn()` 실행 → commit, 실패 시 rollback 후 throw.
- `isolationLevel` — `"READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE"`. executor 에 전달되는 격리 수준(선택).

### Code-First 초기화

`initialize(options?): Promise<boolean>` — context 에 등록된 모든 builder(table/view/procedure)를 DB 에 생성하고 마이그레이션을 적용한다.

- `options.dbs` — 초기화 대상 데이터베이스명 배열. 미지정 시 현재 `database` 1개. builder 에 `database` 가 명시된 경우 그 값이 대상과 일치할 때만 생성, 미지정 builder 는 각 대상에 생성.
- `options.force` — `true` 면 `clearSchema` 로 기존 스키마를 비우고 전부 재생성한 뒤 모든 마이그레이션을 "적용됨"으로 등록. `false`(기본)면 마이그레이션 기반 증분 초기화.
- 반환 — 실제로 미적용 마이그레이션을 실행했으면 `true`, 아니면 `false`. 동작: `force=true`→`false`; `_migration` 테이블 없음(새 환경)→전체 생성+전부 등록→`false`; 있음→미적용분만 `migration.up(db)` 실행→실행분 있으면 `true`. 대상 DB 가 존재하지 않으면 throw.

### DDL 실행 메서드 (`Promise<void>`, 일부 예외 표기)

각각 해당 `QueryDef` 1개를 `executeDefs` 로 실행한다. `table` 인자 타입은 별도 표기 없으면 `QueryDefObjectName`(`{database?, schema?, name}`).

| 메서드                                                               | 동작                          |
| -------------------------------------------------------------------- | ----------------------------- |
| `createTable(table: TableBuilder)`                                   | builder 로 CREATE TABLE       |
| `dropTable(table)` / `renameTable(table, newName)`                   | DROP / RENAME TABLE           |
| `createView(view: ViewBuilder)` / `dropView(view)`                   | CREATE / DROP VIEW            |
| `createProc(procedure: ProcedureBuilder)` / `dropProc(procedure)`    | CREATE / DROP PROCEDURE       |
| `addColumn(table, columnName, column: ColumnBuilder)`                | ADD COLUMN                    |
| `dropColumn(table, column)` / `renameColumn(table, column, newName)` | DROP / RENAME COLUMN          |
| `modifyColumn(table, columnName, column: ColumnBuilder)`             | MODIFY COLUMN(타입·속성 변경) |
| `addPrimaryKey(table, columns: string[])` / `dropPrimaryKey(table)`  | PK 추가 / 제거                |
| `addForeignKey(table, relationName, relationDef: ForeignKeyBuilder)` | FK 제약 추가                  |
| `dropForeignKey(table, relationName)`                                | FK 제약 제거                  |
| `addIndex(table, indexBuilder: IndexBuilder<string[]>)`              | 인덱스 생성                   |
| `dropIndex(table, columns: string[])`                                | 인덱스 제거                   |
| `clearSchema(params: { database; schema? })`                         | 스키마 내 전체 객체 삭제      |
| `truncate(table)`                                                    | TRUNCATE                      |
| `schemaExists(database, schema?): Promise<boolean>`                  | 스키마/DB 존재 여부           |
| `switchFk(table, enabled): Promise<void>`                            | FK 제약 on/off                |

### DDL QueryDef 생성기 (실행 없이 `QueryDef` 반환)

위 DDL 과 1:1 대응되는 `getXxxQueryDef(...)` 메서드를 제공한다: `getCreateTableQueryDef`, `getCreateViewQueryDef`, `getCreateProcQueryDef`, `getCreateObjectQueryDef(builder: Table|View|Procedure)`(타입에 맞춰 생성문 분기), `getDropTableQueryDef`, `getRenameTableQueryDef`, `getDropViewQueryDef`, `getDropProcQueryDef`, `getAddColumnQueryDef`, `getDropColumnQueryDef`, `getModifyColumnQueryDef`, `getRenameColumnQueryDef`, `getAddPrimaryKeyQueryDef`, `getDropPrimaryKeyQueryDef`, `getAddForeignKeyQueryDef`, `getAddIndexQueryDef`, `getDropForeignKeyQueryDef`, `getDropIndexQueryDef`, `getClearSchemaQueryDef`, `getSchemaExistsQueryDef`, `getTruncateQueryDef`, `getSwitchFkQueryDef`. 여러 DDL 을 모아 `executeDefs` 로 일괄 실행할 때 사용.

## SD_BUILDER

`const SD_BUILDER: unique symbol` — `queryable`/`executable` 팩토리 함수에 원본 builder 를 부착하는 키. `initialize` 가 context 프로퍼티를 순회하며 이 심볼로 builder 를 수집한다.

## DbContextBase / DbContextStatus / DbContextDdlMethods (`types/db-context-def.ts`)

- `DbContextBase` — `Queryable`/`Executable`/`ViewBuilder` 가 의존하는 핵심 인터페이스. `status`·`database`·`schema`·`getNextAlias`·`resetAliasCounter`·`executeDefs`·`getQueryDefObjectName`·`switchFk` 를 노출. `DbContext` 가 구현한다.
- `DbContextStatus` — `"ready" | "connect" | "transact"` 문자열 유니온.
- `DbContextDdlMethods` — 위 DDL 실행 메서드 + QueryDef 생성기 시그니처를 모은 인터페이스. `Migration.up` 콜백 인자 타입(`DbContextBase & DbContextDdlMethods`)으로 쓰여, 마이그레이션 안에서 DDL 을 호출할 수 있게 한다.

## 트랜잭션 에러 (`errors/db-transaction-error.ts`)

DBMS 별 네이티브 에러를 표준 코드로 추상화한다.

- `enum DbErrorCode` — `NO_ACTIVE_TRANSACTION`(ROLLBACK 시 활성 트랜잭션 없음), `TRANSACTION_ALREADY_STARTED`(트랜잭션 이미 시작됨), `DEADLOCK`(데드락), `LOCK_TIMEOUT`(잠금 타임아웃). 각 값은 동일 문자열 리터럴.
- `class DbTransactionError extends SdError` — `name = "DbTransactionError"`. 생성자 `(code: DbErrorCode, message: string, cause?: Error)`. `code` 로 DBMS 독립 분기, 원본 에러는 `cause` 체인으로 보존. `connect`/`transaction` 의 rollback 실패 처리에서 `NO_ACTIVE_TRANSACTION` 판별에 사용된다.
