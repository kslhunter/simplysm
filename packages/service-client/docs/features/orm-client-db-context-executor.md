# OrmClientDbContextExecutor

`DbContextExecutor` 인터페이스 구현체. `DbContext`의 쿼리 실행을 서버 `OrmService`에 원격 호출한다. 직접 사용보다 [`createOrmClientConnector`](./orm-client-connector.md)를 통해 사용하는 것을 권장한다.

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
