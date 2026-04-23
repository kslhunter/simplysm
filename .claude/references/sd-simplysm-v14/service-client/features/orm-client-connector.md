# `OrmClientConnector`

`DbContext` 트랜잭션 연결을 원격 서버에서 실행하는 헬퍼 인터페이스. 팩토리 함수 `createOrmClientConnector`로 생성한다.

## When to use

- ✅ 클라이언트에서 `DbContext`를 통해 원격 DB 트랜잭션을 실행할 때
- ✅ FK 제약 위반 시 사용자 친화적 에러 메시지가 필요할 때 (`connect()` 메서드가 자동 변환)
- ❌ 서버 측에서 직접 DB에 접근할 때 → `@simplysm/orm-node` 사용

```typescript
export interface OrmClientConnector {
  connect<T extends DbContext, R>(
    config: OrmConnectOptions<T>,
    callback: (db: T) => Promise<R> | R,
  ): Promise<R>;
  connectWithoutTransaction<T extends DbContext, R>(
    config: OrmConnectOptions<T>,
    callback: (db: T) => Promise<R> | R,
  ): Promise<R>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `connect(config, callback)` | method | `Promise<R>` | 트랜잭션 모드로 연결. FK 제약 위반 시 사용자 친화적 에러 메시지로 변환 |
| `connectWithoutTransaction(config, callback)` | method | `Promise<R>` | 트랜잭션 없이 연결 |

## Related Types

### `OrmConnectOptions`

ORM 원격 연결에 필요한 옵션 인터페이스.

```typescript
export interface OrmConnectOptions<T extends DbContext> {
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `DbClass` | `new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T` | required | 사용할 `DbContext` 서브클래스 생성자 |
| `connOpt` | `DbConnOptions & { configName: string }` | required | DB 연결 옵션. `configName`은 서버 설정 키 |
| `dbContextOpt` | `{ database: string; schema: string }` | optional | DB 컨텍스트 옵션. 생략하면 서버에서 조회한 `info.database`/`info.schema` 사용 |

## `createOrmClientConnector`

`OrmClientConnector` 팩토리 함수.

```typescript
export function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `serviceClient` | [`ServiceClient`](../main/service-client.md) | 이미 연결된 서비스 클라이언트 |

## Usage

```typescript
import { createOrmClientConnector } from "@simplysm/service-client";

const connector = createOrmClientConnector(client);

// 트랜잭션 모드
const result = await connector.connect(
  {
    DbClass: MyDbContext,
    connOpt: { configName: "main", username: "user", password: "pass" },
  },
  async (db) => {
    return db.myTable.select((item) => ({ id: item.id, name: item.name }));
  },
);

// 트랜잭션 없이
const result2 = await connector.connectWithoutTransaction(
  { DbClass: MyDbContext, connOpt: { configName: "main" } },
  async (db) => db.myTable.select(),
);
```
