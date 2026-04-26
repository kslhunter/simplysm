# `createDbConn`

> **읽어야 하는 상황**: 연결 설정만 가지고 MSSQL, MySQL, PostgreSQL 중 하나의 저수준 `DbConn` 구현체를 생성할 때. `DbContext` 기반 업무 코드를 실행하려면 [`createOrm`](./create-orm.md)을 먼저 확인.

## When to use

- ✅ `DbConn` 인터페이스의 `connect`, `executeParametrized`, `bulkInsert`를 직접 호출해야 하는 저수준 작업에 사용.
- ❌ `DbContext` 서브클래스를 실행하는 일반 ORM 사용에는 [`createOrm`](./create-orm.md)을 사용.

## Signature

```typescript
export async function createDbConn(config: DbConnConfig): Promise<DbConn>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `config` | `DbConnConfig` | `dialect`로 DBMS를 구분하는 연결 설정. |

## Returns

`Promise<DbConn>` — 아직 `connect()`가 호출되지 않은 DB 연결 객체.

## Usage

```typescript
import { createDbConn } from "@simplysm/orm-node";

const conn = await createDbConn({
  dialect: "postgresql",
  host: "localhost",
  username: "app",
  password: "secret",
  database: "app",
});

await conn.connect();
try {
  const [rows] = await conn.executeParametrized("select * from users where id = $1", [1]);
} finally {
  await conn.close();
}
```

## Related Types

- [`DbConnConfig`](../types/db-conn-config.md) — dialect별 설정 union.
- [`DbConn`](../types/db-conn.md) — 반환 객체가 구현하는 공통 인터페이스.

## 관련

- [`MssqlDbConn`](../connections/mssql-db-conn.md) — `dialect: "mssql" | "mssql-azure"`일 때 생성.
- [`MysqlDbConn`](../connections/mysql-db-conn.md) — `dialect: "mysql"`일 때 생성.
- [`PostgresqlDbConn`](../connections/postgresql-db-conn.md) — `dialect: "postgresql"`일 때 생성.
