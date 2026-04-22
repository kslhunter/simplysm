# createDbConn

dialect 기반 DbConn 팩토리. 네이티브 드라이버를 지연 로딩하여 DbConn 인스턴스를 생성한다.

```typescript
async function createDbConn(config: DbConnConfig): Promise<DbConn>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `config` | `DbConnConfig` | 데이터베이스 연결 설정. `dialect` 필드로 구현체를 결정한다 |

## Returns

`Promise<DbConn>` — 아직 연결되지 않은 상태의 DbConn 인스턴스. `connect()`를 별도로 호출해야 한다.

`config.dialect`에 따라 적절한 DbConn 구현체를 생성한다:

| dialect | 반환 타입 | 로드하는 패키지 |
|---------|-----------|----------------|
| `"mysql"` | [`MysqlDbConn`](../connections/mysql-db-conn.md) | `mysql2/promise` |
| `"postgresql"` | [`PostgresqlDbConn`](../connections/postgresql-db-conn.md) | `pg`, `pg-copy-streams` |
| `"mssql"` / `"mssql-azure"` | [`MssqlDbConn`](../connections/mssql-db-conn.md) | `tedious` |

네이티브 드라이버 패키지는 최초 호출 시에만 동적 import로 로드하고 모듈 수준 캐시에 보관한다. 이후 호출에서는 캐시된 모듈을 재사용한다.

## Usage

```typescript
import { createDbConn } from "@simplysm/orm-node";

const conn = await createDbConn({
  dialect: "postgresql",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "mydb",
});

await conn.connect();

try {
  await conn.beginTransaction();
  await conn.execute(["INSERT INTO users (name) VALUES ('Alice')"]);
  await conn.commitTransaction();
} catch {
  await conn.rollbackTransaction();
} finally {
  await conn.close();
}
```
