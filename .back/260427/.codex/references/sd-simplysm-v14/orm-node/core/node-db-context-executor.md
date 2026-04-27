# `NodeDbContextExecutor`

> **읽어야 하는 상황**: `DbContext`에 직접 주입할 Node.js용 `DbContextExecutor`가 필요할 때. 일반적인 생성·트랜잭션 관리는 [`createOrm`](./create-orm.md)이 감싼다.

## When to use

- ✅ `DbContext` 인스턴스를 직접 만들고 executor만 패키지 구현체로 연결할 때 사용.
- ❌ 콜백 단위 트랜잭션 실행만 필요하면 [`createOrm`](./create-orm.md)을 사용.

## Signature

```typescript
export class NodeDbContextExecutor implements DbContextExecutor {
  constructor(_config: DbConnConfig);

  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: DataRecord[],
  ): Promise<void>;
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `connect` | method | `() => Promise<void>` | `createDbConn`으로 연결 객체를 만들고 연결한다. |
| `close` | method | `() => Promise<void>` | 현재 연결을 닫고 내부 연결 참조를 제거한다. |
| `beginTransaction` | method | `(isolationLevel?: IsolationLevel) => Promise<void>` | 현재 연결에서 트랜잭션을 시작한다. |
| `commitTransaction` | method | `() => Promise<void>` | 현재 트랜잭션을 커밋한다. |
| `rollbackTransaction` | method | `() => Promise<void>` | 현재 트랜잭션을 롤백한다. |
| `executeParametrized` | method | `(query: string, params?: unknown[]) => Promise<Record<string, unknown>[][]>` | 원시 파라미터화 SQL을 실행한다. |
| `bulkInsert` | method | `(tableName: string, columnMetas: Record<string, ColumnMeta>, records: DataRecord[]) => Promise<void>` | DBMS별 native bulk API로 레코드를 삽입한다. |
| `executeDefs` | method | `<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]) => Promise<T[][]>` | `QueryDef`를 SQL로 빌드하고 결과를 파싱한다. |

## Usage

```typescript
import { DbContext } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "@simplysm/orm-node";

class AppDb extends DbContext {}

const executor = new NodeDbContextExecutor({
  dialect: "postgresql",
  host: "localhost",
  username: "app",
  password: "secret",
  database: "app",
});

const db = new AppDb(executor, { database: "app" });
await executor.connect();
try {
  await executor.beginTransaction();
  await executor.commitTransaction();
} finally {
  await executor.close();
}
```

## Anti-patterns

### 연결 전 실행 메서드 호출

`close`, transaction 메서드, `executeParametrized`, `bulkInsert`, `executeDefs`는 내부 연결이 없으면 `DB_CONN_ERRORS.NOT_CONNECTED`로 `SdError`를 던진다.
