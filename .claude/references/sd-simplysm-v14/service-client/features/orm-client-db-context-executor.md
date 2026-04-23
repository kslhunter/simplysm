# `OrmClientDbContextExecutor`

`DbContextExecutor` 인터페이스 구현체. `DbContext`의 쿼리 실행을 서버 `OrmService`에 원격 호출한다.

## When to use

- ✅ `DbContext`에 주입할 원격 executor가 필요할 때 (커스텀 연결 로직 구현 시)
- ❌ 일반적으로 [`createOrmClientConnector`](./orm-client-connector.md)를 통해 간접 사용한다. 직접 사용은 트랜잭션 관리를 수동으로 제어해야 하는 특수한 경우에만 필요하다.

```typescript
export class OrmClientDbContextExecutor implements DbContextExecutor {
  constructor(
    private readonly _client: ServiceClient,
    private readonly _opt: DbConnOptions & { configName: string },
  );
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `getInfo()` | method | `Promise<{ dialect: Dialect; database?: string; schema?: string }>` | 서버에서 DB dialect, database, schema 조회 |
| `connect()` | method | `Promise<void>` | 서버에서 DB 연결 생성. `_connId` 할당 |
| `beginTransaction(isolationLevel?)` | method | `Promise<void>` | 트랜잭션 시작 |
| `commitTransaction()` | method | `Promise<void>` | 트랜잭션 커밋 |
| `rollbackTransaction()` | method | `Promise<void>` | 트랜잭션 롤백 |
| `close()` | method | `Promise<void>` | DB 연결 종료 및 `_connId` 해제 |
| `executeDefs(defs, options?)` | method | `Promise<T[][]>` | QueryDef 배열을 서버에서 실행 |
| `executeParametrized(query, params?)` | method | `Promise<unknown[][]>` | 파라미터화된 쿼리를 서버에서 실행 |
| `bulkInsert(tableName, columnDefs, records)` | method | `Promise<void>` | 대량 INSERT를 서버에서 실행 |
