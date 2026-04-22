# NodeDbContextExecutor

`orm-common`의 `DbContextExecutor` 인터페이스를 구현하는 Node.js 환경용 실행자. `DbContext`에서 내부적으로 사용한다.

```typescript
class NodeDbContextExecutor implements DbContextExecutor {
  constructor(config: DbConnConfig);

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
| `connect()` | method | `Promise<void>` | `createDbConn()`으로 DB 연결을 생성하고 연결을 수립한다 |
| `close()` | method | `Promise<void>` | DB 연결을 종료한다 |
| `beginTransaction(isolationLevel?)` | method | `Promise<void>` | 트랜잭션을 시작한다 |
| `commitTransaction()` | method | `Promise<void>` | 트랜잭션을 커밋한다 |
| `rollbackTransaction()` | method | `Promise<void>` | 트랜잭션을 롤백한다 |
| `executeParametrized(query, params?)` | method | `Promise<Record<string, unknown>[][]>` | 파라미터화된 쿼리를 실행한다 |
| `bulkInsert(tableName, columnMetas, records)` | method | `Promise<void>` | 대량 데이터 삽입 |
| `executeDefs(defs, resultMetas?)` | method | `Promise<T[][]>` | QueryDef 배열을 SQL로 변환하여 실행한다 |

일반적으로 직접 사용하지 않는다. [`createOrm()`](./create-orm.md)이 내부적으로 이 클래스를 생성하여 `DbContext`에 전달한다.

## `executeDefs()` 처리 방식

- `resultMetas`가 모두 `undefined`이면 쿼리를 단일 문자열로 결합하여 한 번의 요청으로 실행한다 (결과 불필요 최적화).
- 그 외에는 각 def를 개별 실행하고 `ResultMeta`가 있으면 `parseQueryResult()`로 결과를 파싱한다.
