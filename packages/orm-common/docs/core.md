# Core

## `DbContext`

DB 연결/트랜잭션/DDL/초기화를 제공하는 추상 클래스. `queryable()`/`executable()`로 테이블/프로시저를 등록한다. 각 프로퍼티가 독립 직렬화되어 40+ 테이블에서도 TS7056이 발생하지 않는다.

```typescript
export abstract class DbContext implements DbContextBase {
  status: DbContextStatus;
  migrations: Migration[];

  constructor(
    executor: DbContextExecutor,
    opt: { database: string; schema?: string },
  );

  // 등록 메서드
  protected queryable<T extends TableBuilder | ViewBuilder>(builder: T): () => Queryable;
  protected executable<T extends ProcedureBuilder>(builder: T): () => Executable;

  // 연결 관리
  connect<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;
  connectWithoutTransaction<TResult>(callback: () => Promise<TResult>): Promise<TResult>;
  transaction<TResult>(fn: () => Promise<TResult>, isolationLevel?: IsolationLevel): Promise<TResult>;

  // DDL 실행 메서드
  createTable(table: TableBuilder): Promise<void>;
  dropTable(table: QueryDefObjectName): Promise<void>;
  renameTable(table: QueryDefObjectName, newName: string): Promise<void>;
  createView(view: ViewBuilder): Promise<void>;
  dropView(view: QueryDefObjectName): Promise<void>;
  createProc(procedure: ProcedureBuilder): Promise<void>;
  dropProc(procedure: QueryDefObjectName): Promise<void>;
  addColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder): Promise<void>;
  dropColumn(table: QueryDefObjectName, column: string): Promise<void>;
  modifyColumn(table: QueryDefObjectName, columnName: string, column: ColumnBuilder): Promise<void>;
  renameColumn(table: QueryDefObjectName, column: string, newName: string): Promise<void>;
  addPrimaryKey(table: QueryDefObjectName, columns: string[]): Promise<void>;
  dropPrimaryKey(table: QueryDefObjectName): Promise<void>;
  addForeignKey(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder): Promise<void>;
  addIndex(table: QueryDefObjectName, indexBuilder: IndexBuilder): Promise<void>;
  dropForeignKey(table: QueryDefObjectName, relationName: string): Promise<void>;
  dropIndex(table: QueryDefObjectName, columns: string[]): Promise<void>;
  clearSchema(params: { database: string; schema?: string }): Promise<void>;
  schemaExists(database: string, schema?: string): Promise<boolean>;
  truncate(table: QueryDefObjectName): Promise<void>;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;

  // DDL QueryDef 생성기 (getCreateTableQueryDef, getDropTableQueryDef, ... 등 동일 시그니처)
  getCreateTableQueryDef(table: TableBuilder): QueryDef;
  getCreateViewQueryDef(view: ViewBuilder): QueryDef;
  getCreateProcQueryDef(procedure: ProcedureBuilder): QueryDef;
  getCreateObjectQueryDef(builder: TableBuilder | ViewBuilder | ProcedureBuilder): QueryDef;
  getDropTableQueryDef(table: QueryDefObjectName): QueryDef;
  getRenameTableQueryDef(table: QueryDefObjectName, newName: string): QueryDef;
  getDropViewQueryDef(view: QueryDefObjectName): QueryDef;
  getDropProcQueryDef(procedure: QueryDefObjectName): QueryDef;
  getAddColumnQueryDef(table: QueryDefObjectName, columnName: string, column: ColumnBuilder): QueryDef;
  getDropColumnQueryDef(table: QueryDefObjectName, column: string): QueryDef;
  getModifyColumnQueryDef(table: QueryDefObjectName, columnName: string, column: ColumnBuilder): QueryDef;
  getRenameColumnQueryDef(table: QueryDefObjectName, column: string, newName: string): QueryDef;
  getAddPrimaryKeyQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
  getDropPrimaryKeyQueryDef(table: QueryDefObjectName): QueryDef;
  getAddForeignKeyQueryDef(table: QueryDefObjectName, relationName: string, relationDef: ForeignKeyBuilder): QueryDef;
  getAddIndexQueryDef(table: QueryDefObjectName, indexBuilder: IndexBuilder): QueryDef;
  getDropForeignKeyQueryDef(table: QueryDefObjectName, relationName: string): QueryDef;
  getDropIndexQueryDef(table: QueryDefObjectName, columns: string[]): QueryDef;
  getClearSchemaQueryDef(params: { database: string; schema?: string }): QueryDef;
  getSchemaExistsQueryDef(database: string, schema?: string): QueryDef;
  getTruncateQueryDef(table: QueryDefObjectName): QueryDef;
  getSwitchFkQueryDef(table: QueryDefObjectName, enabled: boolean): QueryDef;

  // 초기화
  initialize(options?: { dbs?: string[]; force?: boolean }): Promise<boolean>;

  // DbContextBase 구현
  get database(): string | undefined;
  get schema(): string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
  getQueryDefObjectName(tableOrView: TableBuilder | ViewBuilder): QueryDefObjectName;
}
```

### 연결/트랜잭션 패턴

| 메서드 | 용도 |
|--------|------|
| `connect(fn)` | 연결 -> 트랜잭션 시작 -> fn -> 커밋 -> 종료. 일반 DML 작업에 사용 |
| `connectWithoutTransaction(fn)` | 연결 -> fn -> 종료. 트랜잭션 없는 DDL/읽기 전용 작업에 사용 |
| `transaction(fn)` | 이미 연결된 상태에서 부분 트랜잭션 시작. `connectWithoutTransaction` 내부에서 사용 |

- `connect()`/`connectWithoutTransaction()`은 status가 `"ready"`가 아니면 에러를 던진다 (재진입 방지).
- 트랜잭션 중 DDL 실행은 런타임 에러를 발생시킨다.
- 롤백 실패 시 원래 에러의 `cause`에 롤백 에러를 첨부하여 전파한다.

## `SD_BUILDER`

DbContext의 queryable/executable 프로퍼티에 부착된 builder 참조용 Symbol.

```typescript
export const SD_BUILDER: unique symbol;
```

## `DbContextBase`

Queryable, Executable, ViewBuilder에서 사용하는 DbContext 내부 인터페이스. DbContext class가 이 인터페이스를 구현한다.

```typescript
export interface DbContextBase {
  status: DbContextStatus;
  readonly database: string | undefined;
  readonly schema: string | undefined;
  getNextAlias(): string;
  resetAliasCounter(): void;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
  getQueryDefObjectName(tableOrView: TableBuilder | ViewBuilder): QueryDefObjectName;
  switchFk(table: QueryDefObjectName, enabled: boolean): Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `DbContextStatus` | 현재 연결 상태 |
| `database` | `string \| undefined` | 데이터베이스 이름 |
| `schema` | `string \| undefined` | 스키마 이름 |

## `DbContextStatus`

DbContext 상태를 나타내는 문자열 리터럴 유니온.

```typescript
export type DbContextStatus = "ready" | "connect" | "transact";
```

## `DbContextDdlMethods`

DDL 실행 메서드 인터페이스. DbContext에서 사용하는 모든 DDL 메서드 시그니처를 정의한다. DDL 실행 메서드와 DDL QueryDef 생성 메서드를 모두 포함한다.

```typescript
export interface DbContextDdlMethods {
  createTable(table: TableBuilder): Promise<void>;
  dropTable(table: QueryDefObjectName): Promise<void>;
  // ... (DbContext의 DDL 메서드와 동일한 시그니처)
}
```

## `DbErrorCode`

트랜잭션 관련 에러 코드. DBMS별 네이티브 에러 코드를 추상화한다.

```typescript
export enum DbErrorCode {
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",
  DEADLOCK = "DEADLOCK",
  LOCK_TIMEOUT = "LOCK_TIMEOUT",
}
```

| Value | Description |
|-------|-------------|
| `NO_ACTIVE_TRANSACTION` | 활성 트랜잭션 없음 (ROLLBACK 시) |
| `TRANSACTION_ALREADY_STARTED` | 트랜잭션 이미 시작됨 |
| `DEADLOCK` | 데드락 발생 |
| `LOCK_TIMEOUT` | 잠금 타임아웃 |

## `DbTransactionError`

DBMS별 네이티브 에러를 표준화된 에러 코드로 래핑하는 에러 클래스.

```typescript
export class DbTransactionError extends Error {
  override readonly name = "DbTransactionError";

  constructor(
    public readonly code: DbErrorCode,
    message: string,
    public readonly originalError?: unknown,
  );
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | `DbErrorCode` | 표준화된 에러 코드 |
| `originalError` | `unknown \| undefined` | 원본 DBMS 에러 (디버깅용) |
