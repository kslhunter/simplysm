# `createOrm`

Node.js ORM 팩토리 함수. `DbContext` 서브클래스와 DB 연결 설정을 받아 트랜잭션을 관리하는 [`Orm<T>`](#orm) 인스턴스를 반환한다.

## When to use

- ✅ DbContext 기반 ORM 쿼리를 실행할 때 — 트랜잭션 관리가 자동으로 이루어진다.
- ❌ 생 SQL만 실행할 때 → [`createDbConn`](./create-db-conn.md)이 더 적절하다.

## Signature

```typescript
function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `DbClass` | constructor | `DbContext`를 상속한 클래스 생성자 |
| `config` | `DbConnConfig` | DB 연결 설정 |
| `options` | `OrmOptions?` | ORM 옵션. `config`보다 우선 적용된다 |

## Returns

`Orm<T>` — `connect()`와 `connectWithoutTransaction()`을 제공하는 ORM 인스턴스.

`options.database` / `options.schema`는 `config`의 동일 필드보다 우선 적용된다. `database`는 필수이며, `config`와 `options` 양쪽 모두 `database`가 없으면 에러를 throw한다.

## Related Types

### `Orm`

`createOrm()`에서 반환하는 객체의 타입.

```typescript
interface Orm<T extends DbContext> {
  readonly DbClass: new (
    executor: DbContextExecutor,
    opt: { database: string; schema?: string },
  ) => T;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;
  connect<R>(callback: (conn: T) => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  connectWithoutTransaction<R>(callback: (conn: T) => Promise<R>): Promise<R>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `DbClass` | constructor | DbContext 서브클래스 생성자 |
| `config` | `DbConnConfig` | DB 연결 설정 |
| `options` | `OrmOptions?` | ORM 옵션 |
| `connect(callback, isolationLevel?)` | method | 트랜잭션 내에서 콜백을 실행한다. 콜백 완료 후 자동 커밋, 예외 발생 시 자동 롤백 |
| `connectWithoutTransaction(callback)` | method | 트랜잭션 없이 콜백을 실행한다 |

### `OrmOptions`

`createOrm()`의 세 번째 인수로 전달하는 옵션. `DbConnConfig`의 동일 필드보다 우선 적용된다.

```typescript
interface OrmOptions {
  database?: string;
  schema?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string?` | 데이터베이스 이름. `DbConnConfig`의 `database` 대신 사용된다 |
| `schema` | `string?` | 스키마 이름 (MSSQL: `dbo`, PostgreSQL: `public`). `DbConnConfig`의 `schema` 대신 사용된다 |

## Usage

```typescript
import { DbContext } from "@simplysm/orm-common";
import { createOrm } from "@simplysm/orm-node";

class MyDb extends DbContext {
  user = this.queryable(User);
}

const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// 트랜잭션 내에서 실행
await orm.connect(async (db) => {
  const users = await db.user().execute();
  return users;
});

// 트랜잭션 없이 실행
await orm.connectWithoutTransaction(async (db) => {
  const users = await db.user().execute();
  return users;
});
```
