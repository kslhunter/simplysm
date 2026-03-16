# DDL & 초기화

`createDbContext()`로 생성된 DbContext 인스턴스에서 사용하는 DDL 메서드.

**중요:** DDL 연산은 트랜잭션 내에서 실행할 수 없다. `connectWithoutTransaction()` 내에서 사용해야 한다.

## 스키마 초기화

```typescript
await db.connectWithoutTransaction(async () => {
  // 정의된 모든 테이블/뷰/프로시저 자동 생성
  await db.initialize();

  // 기존 스키마 삭제 후 재생성
  await db.initialize({ force: true });

  // 특정 DB만 초기화
  await db.initialize({ dbs: ["mydb"] });
});
```

### initialize API

```
db.initialize(options?: {
  dbs?: string[];      // 초기화할 DB 목록 (생략 시 전체)
  force?: boolean;     // true이면 기존 스키마 삭제 후 재생성
}): Promise<void>
```

## 테이블 DDL

```typescript
// 테이블 생성 (TableBuilder 전달)
await db.createTable(User);

// 테이블 삭제 (QueryDefObjectName 전달)
await db.dropTable({ name: "user", database: "mydb" });

// 테이블 이름 변경
await db.renameTable({ name: "user" }, "users_v2");
```

## 컬럼 DDL

```typescript
import { createColumnFactory } from "@simplysm/orm-common";
const c = createColumnFactory();

// 컬럼 추가
await db.addColumn({ name: "user" }, "phone", c.varchar(20).nullable());

// 컬럼 수정
await db.modifyColumn({ name: "user" }, "phone", c.varchar(50).nullable());

// 컬럼 이름 변경
await db.renameColumn({ name: "user" }, "phone", "phoneNumber");

// 컬럼 삭제
await db.dropColumn({ name: "user" }, "phone");
```

## 키/인덱스 DDL

```typescript
// PK
await db.addPrimaryKey({ name: "user" }, ["id"]);
await db.dropPrimaryKey({ name: "user" });

// FK
await db.addForeignKey({ name: "order" }, "user", userRelationDef);
await db.dropForeignKey({ name: "order" }, "user");

// 인덱스
await db.addIndex({ name: "user" }, indexBuilder);
await db.dropIndex({ name: "user" }, ["email"]);
```

## 뷰/프로시저 DDL

```typescript
await db.createView(UserSummary);
await db.dropView({ name: "user_summary" });

await db.createProc(GetUserOrders);
await db.dropProc({ name: "get_user_orders" });
```

## 스키마 관리

```typescript
// 스키마 존재 여부
const exists = await db.schemaExists("mydb", "dbo");

// 스키마 내 모든 테이블 삭제
await db.clearSchema({ database: "mydb", schema: "dbo" });

// 테이블 TRUNCATE
await db.truncate({ name: "user" });

// FK 제약조건 토글
await db.switchFk({ name: "user" }, false); // FK 비활성화
// ... 벌크 작업 ...
await db.switchFk({ name: "user" }, true);  // FK 활성화
```

## DDL 메서드 API

### 테이블/뷰/프로시저

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `createTable` | `(table: TableBuilder) => Promise<void>` | 테이블 생성 |
| `dropTable` | `(table: QueryDefObjectName) => Promise<void>` | 테이블 삭제 |
| `renameTable` | `(table: QueryDefObjectName, newName: string) => Promise<void>` | 테이블 이름 변경 |
| `createView` | `(view: ViewBuilder) => Promise<void>` | 뷰 생성 |
| `dropView` | `(view: QueryDefObjectName) => Promise<void>` | 뷰 삭제 |
| `createProc` | `(proc: ProcedureBuilder) => Promise<void>` | 프로시저 생성 |
| `dropProc` | `(proc: QueryDefObjectName) => Promise<void>` | 프로시저 삭제 |

### 컬럼

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `addColumn` | `(table, columnName, column: ColumnBuilder) => Promise<void>` | 컬럼 추가 |
| `dropColumn` | `(table, column: string) => Promise<void>` | 컬럼 삭제 |
| `modifyColumn` | `(table, columnName, column: ColumnBuilder) => Promise<void>` | 컬럼 수정 |
| `renameColumn` | `(table, column, newName) => Promise<void>` | 컬럼 이름 변경 |

### 키/인덱스

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `addPrimaryKey` | `(table, columns: string[]) => Promise<void>` | PK 추가 |
| `dropPrimaryKey` | `(table) => Promise<void>` | PK 삭제 |
| `addForeignKey` | `(table, relationName, relationDef) => Promise<void>` | FK 추가 |
| `dropForeignKey` | `(table, relationName) => Promise<void>` | FK 삭제 |
| `addIndex` | `(table, indexBuilder) => Promise<void>` | 인덱스 추가 |
| `dropIndex` | `(table, columns: string[]) => Promise<void>` | 인덱스 삭제 |

### 스키마

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `schemaExists` | `(database, schema?) => Promise<boolean>` | 스키마 존재 여부 |
| `clearSchema` | `(params: { database, schema? }) => Promise<void>` | 스키마 내 모든 테이블 삭제 |
| `truncate` | `(table) => Promise<void>` | 테이블 TRUNCATE |
| `switchFk` | `(table, enabled: boolean) => Promise<void>` | FK 제약조건 on/off |

## 연결 & 트랜잭션

```typescript
// 자동 트랜잭션 (connect -> begin -> callback -> commit/rollback -> close)
const result = await db.connect(async () => {
  await db.user().insert([{ name: "Alice", createdAt: new DateTime() }]);
  return await db.user().execute();
}, "SERIALIZABLE"); // 격리 수준 선택

// 트랜잭션 없이 연결 (DDL 작업 등)
await db.connectWithoutTransaction(async () => {
  await db.initialize();
});

// 수동 트랜잭션 (connectWithoutTransaction 내에서)
await db.connectWithoutTransaction(async () => {
  // DDL 먼저 실행 (트랜잭션 밖)
  await db.createTable(NewTable);

  // 이후 트랜잭션 내에서 DML 실행
  await db.transaction(async () => {
    await db.user().insert([{ name: "Bob", createdAt: new DateTime() }]);
  });
});
```

### 연결 API

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `connect` | `(fn, isolationLevel?) => Promise<T>` | 자동 트랜잭션 (connect -> begin -> fn -> commit/rollback -> close) |
| `connectWithoutTransaction` | `(fn) => Promise<T>` | 트랜잭션 없이 연결 (DDL용) |
| `transaction` | `(fn, isolationLevel?) => Promise<T>` | 수동 트랜잭션 (connectWithoutTransaction 내에서) |

격리 수준: `"READ_UNCOMMITTED"`, `"READ_COMMITTED"`, `"REPEATABLE_READ"`, `"SERIALIZABLE"`

## DbContextExecutor 인터페이스

Node.js(`@simplysm/orm-node`)나 서비스 클라이언트(`@simplysm/service-client`)에서 구현.

```typescript
interface DbContextExecutor {
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeDefs<T>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
}
```

## 마이그레이션

`defineDbContext`의 `migrations` 옵션으로 스키마 변경사항을 관리한다. `initialize()` 호출 시 아직 실행되지 않은 마이그레이션만 실행된다.

```typescript
const MyDb = defineDbContext({
  tables: { user: User },
  migrations: [
    {
      name: "20260105_001_create_user_table",
      up: async (db) => {
        await db.createTable(User);
      },
    },
    {
      name: "20260106_001_add_email_column",
      up: async (db) => {
        const c = createColumnFactory();
        await db.addColumn({ name: "user" }, "email", c.varchar(200).nullable());
      },
    },
  ],
});
```

### Migration 인터페이스

```typescript
interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
```

실행된 마이그레이션은 `_migration` 테이블에 기록된다.

```typescript
// 마이그레이션 코드 조회
const migrations = await db._migration().execute();
```

## DbTransactionError

트랜잭션 관련 에러를 DBMS 독립적으로 처리하기 위한 에러 클래스.

```typescript
import { DbTransactionError, DbErrorCode } from "@simplysm/orm-common";

// DbErrorCode:
// - NO_ACTIVE_TRANSACTION: 활성 트랜잭션 없음
// - TRANSACTION_ALREADY_STARTED: 트랜잭션 이미 시작됨
// - DEADLOCK: 데드락 발생
// - LOCK_TIMEOUT: 잠금 타임아웃
```

### DbTransactionError API

```typescript
class DbTransactionError extends Error {
  readonly name: "DbTransactionError";
  readonly code: DbErrorCode;
  readonly originalError?: unknown;
  constructor(code: DbErrorCode, message: string, originalError?: unknown);
}
```

## QueryDef 생성기

DDL 메서드 외에도 `get*QueryDef()` 메서드로 QueryDef만 생성할 수 있다 (직접 실행하지 않음).

```typescript
const def = db.getCreateTableQueryDef(User);
const def2 = db.getAddColumnQueryDef({ name: "user" }, "phone", c.varchar(20));
// ... 등. 모든 DDL 메서드에 대응하는 get*QueryDef() 메서드가 있다.
```

| 생성기 | 대응 DDL 메서드 |
|--------|---------------|
| `getCreateTableQueryDef` | `createTable` |
| `getCreateViewQueryDef` | `createView` |
| `getCreateProcQueryDef` | `createProc` |
| `getCreateObjectQueryDef` | Table/View/Procedure 자동 판별 |
| `getDropTableQueryDef` | `dropTable` |
| `getRenameTableQueryDef` | `renameTable` |
| `getDropViewQueryDef` | `dropView` |
| `getDropProcQueryDef` | `dropProc` |
| `getAddColumnQueryDef` | `addColumn` |
| `getDropColumnQueryDef` | `dropColumn` |
| `getModifyColumnQueryDef` | `modifyColumn` |
| `getRenameColumnQueryDef` | `renameColumn` |
| `getAddPrimaryKeyQueryDef` | `addPrimaryKey` |
| `getDropPrimaryKeyQueryDef` | `dropPrimaryKey` |
| `getAddForeignKeyQueryDef` | `addForeignKey` |
| `getAddIndexQueryDef` | `addIndex` |
| `getDropForeignKeyQueryDef` | `dropForeignKey` |
| `getDropIndexQueryDef` | `dropIndex` |
| `getClearSchemaQueryDef` | `clearSchema` |
| `getSchemaExistsQueryDef` | `schemaExists` |
| `getTruncateQueryDef` | `truncate` |
| `getSwitchFkQueryDef` | `switchFk` |
