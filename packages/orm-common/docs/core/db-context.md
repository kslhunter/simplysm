# DbContext

DB 연결/트랜잭션/DDL/초기화를 제공하는 추상 클래스. `queryable()`/`executable()`로 테이블/프로시저를 class 프로퍼티로 등록하며, 각 프로퍼티가 독립 직렬화되어 40+ 테이블에서도 TS7056이 발생하지 않는다.

```typescript
export abstract class DbContext implements DbContextBase {
  status: DbContextStatus;
  _migration: () => Queryable<...>;
  migrations: Migration[];

  constructor(
    executor: DbContextExecutor,
    opt: { database: string; schema?: string },
  );
}
```

## Members

### 상태 / 메타데이터

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `status` | property | `DbContextStatus` | 현재 연결 상태 (`"ready"` \| `"connect"` \| `"transact"`) |
| `database` | getter | `string \| undefined` | Database 이름 |
| `schema` | getter | `string \| undefined` | Schema 이름 |
| `migrations` | property | `Migration[]` | 마이그레이션 정의 배열. 서브클래스에서 오버라이드 |
| `_migration` | property | `() => Queryable<...>` | 시스템 마이그레이션 테이블 쿼리어블 |

### 등록 메서드

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `queryable(builder)` | method (protected) | `() => Queryable<T>` | 테이블/뷰 쿼리어블 등록. 반환값을 class 프로퍼티에 할당 |
| `executable(builder)` | method (protected) | `() => Executable<TParams, TReturns>` | 프로시저 실행 래퍼 등록 |

### 연결 관리

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `connect(fn, isolationLevel?)` | method | `Promise<TResult>` | 연결 → 트랜잭션 시작 → fn → 커밋 → 종료 |
| `connectWithoutTransaction(fn)` | method | `Promise<TResult>` | 연결 → fn → 종료. 트랜잭션 없는 DDL/읽기 작업에 사용 |
| `transaction(fn, isolationLevel?)` | method | `Promise<TResult>` | 이미 연결된 상태에서 부분 트랜잭션 시작 |

### DDL 실행 메서드

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `createTable(table)` | method | `Promise<void>` | CREATE TABLE |
| `dropTable(table)` | method | `Promise<void>` | DROP TABLE |
| `renameTable(table, newName)` | method | `Promise<void>` | RENAME TABLE |
| `createView(view)` | method | `Promise<void>` | CREATE VIEW |
| `dropView(view)` | method | `Promise<void>` | DROP VIEW |
| `createProc(procedure)` | method | `Promise<void>` | CREATE PROCEDURE |
| `dropProc(procedure)` | method | `Promise<void>` | DROP PROCEDURE |
| `addColumn(table, columnName, column)` | method | `Promise<void>` | ADD COLUMN |
| `dropColumn(table, column)` | method | `Promise<void>` | DROP COLUMN |
| `modifyColumn(table, columnName, column)` | method | `Promise<void>` | MODIFY/ALTER COLUMN |
| `renameColumn(table, column, newName)` | method | `Promise<void>` | RENAME COLUMN |
| `addPrimaryKey(table, columns)` | method | `Promise<void>` | ADD PRIMARY KEY |
| `dropPrimaryKey(table)` | method | `Promise<void>` | DROP PRIMARY KEY |
| `addForeignKey(table, relationName, relationDef)` | method | `Promise<void>` | ADD FOREIGN KEY |
| `addIndex(table, indexBuilder)` | method | `Promise<void>` | ADD INDEX |
| `dropForeignKey(table, relationName)` | method | `Promise<void>` | DROP FOREIGN KEY |
| `dropIndex(table, columns)` | method | `Promise<void>` | DROP INDEX |
| `clearSchema(params)` | method | `Promise<void>` | 스키마 내 모든 객체 제거 |
| `schemaExists(database, schema?)` | method | `Promise<boolean>` | 스키마 존재 여부 확인 |
| `truncate(table)` | method | `Promise<void>` | TRUNCATE TABLE |
| `switchFk(table, enabled)` | method | `Promise<void>` | FK 제약조건 활성화/비활성화 |

### DDL QueryDef 생성기

직접 실행하지 않고 `QueryDef`만 반환한다. `executeDefs()`로 수동 실행할 때 사용.

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `getCreateTableQueryDef(table)` | method | `QueryDef` | CREATE TABLE QueryDef |
| `getCreateViewQueryDef(view)` | method | `QueryDef` | CREATE VIEW QueryDef |
| `getCreateProcQueryDef(procedure)` | method | `QueryDef` | CREATE PROCEDURE QueryDef |
| `getCreateObjectQueryDef(builder)` | method | `QueryDef` | Table/View/Procedure 구분 없이 CREATE QueryDef |
| `getDropTableQueryDef(table)` | method | `QueryDef` | DROP TABLE QueryDef |
| `getRenameTableQueryDef(table, newName)` | method | `QueryDef` | RENAME TABLE QueryDef |
| `getDropViewQueryDef(view)` | method | `QueryDef` | DROP VIEW QueryDef |
| `getDropProcQueryDef(procedure)` | method | `QueryDef` | DROP PROCEDURE QueryDef |
| `getAddColumnQueryDef(table, columnName, column)` | method | `QueryDef` | ADD COLUMN QueryDef |
| `getDropColumnQueryDef(table, column)` | method | `QueryDef` | DROP COLUMN QueryDef |
| `getModifyColumnQueryDef(table, columnName, column)` | method | `QueryDef` | MODIFY COLUMN QueryDef |
| `getRenameColumnQueryDef(table, column, newName)` | method | `QueryDef` | RENAME COLUMN QueryDef |
| `getAddPrimaryKeyQueryDef(table, columns)` | method | `QueryDef` | ADD PK QueryDef |
| `getDropPrimaryKeyQueryDef(table)` | method | `QueryDef` | DROP PK QueryDef |
| `getAddForeignKeyQueryDef(table, relationName, relationDef)` | method | `QueryDef` | ADD FK QueryDef |
| `getAddIndexQueryDef(table, indexBuilder)` | method | `QueryDef` | ADD INDEX QueryDef |
| `getDropForeignKeyQueryDef(table, relationName)` | method | `QueryDef` | DROP FK QueryDef |
| `getDropIndexQueryDef(table, columns)` | method | `QueryDef` | DROP INDEX QueryDef |
| `getClearSchemaQueryDef(params)` | method | `QueryDef` | Clear Schema QueryDef |
| `getSchemaExistsQueryDef(database, schema?)` | method | `QueryDef` | Schema Exists QueryDef |
| `getTruncateQueryDef(table)` | method | `QueryDef` | TRUNCATE QueryDef |
| `getSwitchFkQueryDef(table, enabled)` | method | `QueryDef` | Switch FK QueryDef |

### 기타

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `getNextAlias()` | method | `string` | 다음 테이블 별칭 생성 (`T1`, `T2`, ...) |
| `resetAliasCounter()` | method | `void` | 별칭 카운터 초기화 |
| `executeDefs<T>(defs, resultMetas?)` | method | `Promise<T[][]>` | QueryDef 배열 직접 실행 |
| `getQueryDefObjectName(tableOrView)` | method | `QueryDefObjectName` | 테이블/뷰의 QueryDef 객체명 반환 |
| `initialize(options?)` | method | `Promise<boolean>` | Code First 초기화 + 마이그레이션 실행 |

## Related Types

### `DbContextBase`

Queryable, Executable, ViewBuilder 내부에서 사용하는 DbContext 인터페이스.

```typescript
export interface DbContextBase {
  status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
  getQueryDefObjectName(
    tableOrView: TableBuilder<any, any> | ViewBuilder<any, any, any>,
  ): QueryDefObjectName;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
}
```

### `DbContextStatus`

```typescript
export type DbContextStatus = "ready" | "connect" | "transact";
```

| 값 | 설명 |
|----|------|
| `"ready"` | 연결 없음. `connect()`/`connectWithoutTransaction()` 호출 가능 |
| `"connect"` | 연결됨. 트랜잭션 없는 상태 |
| `"transact"` | 트랜잭션 진행 중 |

### `DbContextDdlMethods`

`DbContext`가 구현하는 DDL 메서드 전체 인터페이스. DDL 실행 메서드(`createTable`, `dropTable`, ...) 및 QueryDef 생성 메서드(`getCreateTableQueryDef`, ...) 모두 포함.

```typescript
export interface DbContextDdlMethods {
  createTable(table: TableBuilder<any, any>): Promise<void>;
  dropTable(table: QueryDefObjectName): Promise<void>;
  // ... (DbContext의 DDL 메서드 시그니처와 동일)
}
```

### `SD_BUILDER`

`DbContext.queryable()`/`executable()`로 등록된 프로퍼티에 부착된 빌더 참조용 Symbol.

```typescript
export const SD_BUILDER: unique symbol;
```

## 연결/트랜잭션 패턴

| 메서드 | 용도 |
|--------|------|
| `connect(fn)` | 연결 → 트랜잭션 시작 → fn → 커밋 → 종료. 일반 DML 작업에 사용 |
| `connectWithoutTransaction(fn)` | 연결 → fn → 종료. 트랜잭션 없는 DDL/읽기 전용 작업에 사용 |
| `transaction(fn)` | 이미 연결된 상태에서 부분 트랜잭션 시작. `connectWithoutTransaction` 내부에서 사용 |

- `connect()`/`connectWithoutTransaction()`은 status가 `"ready"`가 아니면 에러를 던진다 (재진입 방지).
- 트랜잭션 중 DDL 실행은 런타임 에러를 발생시킨다.
- 롤백 실패 시 원래 에러의 `cause`에 롤백 에러를 첨부하여 전파한다.

## Usage

```typescript
class MainDb extends DbContext {
  user = this.queryable(User);
  post = this.queryable(Post);
  activeUsers = this.queryable(ActiveUsers);
  getUserById = this.executable(GetUserById);

  migrations = [{ name: "001", up: async (db) => { await db.createTable(User); } }];
}

const db = new MainDb(executor, { database: "mydb", schema: "dbo" });

// 일반 DML (트랜잭션 포함)
await db.connect(async () => {
  const users = await db.user().execute();
  await db.user().insert([{ name: "Alice", createdAt: DateTime.now() }]);
});

// DDL (트랜잭션 없음)
await db.connectWithoutTransaction(async () => {
  await db.createTable(User);
  await db.addColumn({ name: "User" }, "phone", phoneColumn);
});

// Code First 초기화 + 마이그레이션
await db.connectWithoutTransaction(async () => {
  await db.initialize();
});
```
