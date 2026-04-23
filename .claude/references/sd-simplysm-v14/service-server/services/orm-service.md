# OrmService

ORM 브리지 서비스 정의. WebSocket 전용이며 `auth()`로 래핑되어 로그인이 필수다. `defineService("Orm", auth((ctx) => ...))`로 정의되어 있다.

## When to use

- ✅ 클라이언트에서 WebSocket을 통해 DB 연결/쿼리를 수행해야 할 때
- ❌ HTTP API로 DB 작업을 수행하려면 별도 서비스를 정의한다 — OrmService는 WebSocket 전용이다

```typescript
const OrmService: ServiceDefinition;
```

소켓별 DB 연결 관리:
- `WeakMap<ServiceSocket, Map<number, DbConn>>`으로 소켓별 연결 상태를 관리한다
- 소켓이 닫히면 해당 소켓의 열린 DB 연결을 모두 자동 종료한다
- `getConfig("orm")`에서 `configName`으로 DB 연결 설정을 읽는다

HTTP 요청 시 "WebSocket 연결이 필요합니다" 에러를 던진다.

## Members

| Method | Signature | Description |
|--------|-----------|-------------|
| `getInfo` | `(opt: DbConnOptions & { configName: string }) => Promise<{ dialect: Dialect; database?: string; schema?: string }>` | DB 연결 정보를 반환한다. `mssql-azure` dialect은 `mssql`로 변환된다 |
| `connect` | `(opt: DbConnOptions & { configName: string }) => Promise<number>` | DB에 연결하고 연결 ID를 반환한다 |
| `close` | `(connId: number) => Promise<void>` | DB 연결을 종료한다 |
| `beginTransaction` | `(connId: number, isolationLevel?: IsolationLevel) => Promise<void>` | 트랜잭션을 시작한다 |
| `commitTransaction` | `(connId: number) => Promise<void>` | 트랜잭션을 커밋한다 |
| `rollbackTransaction` | `(connId: number) => Promise<void>` | 트랜잭션을 롤백한다 |
| `executeParametrized` | `(connId: number, query: string, params?: unknown[]) => Promise<unknown[][]>` | 파라미터화된 쿼리를 실행한다 |
| `executeDefs` | `(connId: number, defs: QueryDef[], options?: (ResultMeta \| undefined)[]) => Promise<unknown[][]>` | QueryDef 배열을 SQL로 변환하여 실행한다. `options`가 모두 `undefined`이면 쿼리를 합쳐 한 번에 실행한다 |
| `bulkInsert` | `(connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]) => Promise<void>` | 대량 삽입을 수행한다 |

## Related Types

### `OrmServiceType`

`OrmService`의 메서드 시그니처 타입. 클라이언트 측 타입 공유에 사용한다.

```typescript
type OrmServiceType = ServiceMethods<typeof OrmService>;
```
