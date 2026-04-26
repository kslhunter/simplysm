# `DbConnConfig`

> **읽어야 하는 상황**: DB 연결 설정 객체를 작성하고 `dialect`별 필수·선택 필드를 구분할 때. 설정에서 쿼리 빌더 dialect만 계산하려면 [`getDialectFromConfig`](./get-dialect-from-config.md)을 확인.

## Signature

```typescript
export type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;

export interface MysqlDbConnConfig {
  dialect: "mysql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  defaultIsolationLevel?: IsolationLevel;
}

export interface MssqlDbConnConfig {
  dialect: "mssql" | "mssql-azure";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
}

export interface PostgresqlDbConnConfig {
  dialect: "postgresql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

## Related Types

### `MysqlDbConnConfig`

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"mysql"` | MySQL 연결 분기값. |
| `host` | `string` | DB 서버 호스트. |
| `port` | `number` | DB 서버 포트. |
| `username` | `string` | DB 사용자명. |
| `password` | `string` | DB 비밀번호. |
| `database` | `string` | 연결할 데이터베이스 이름. `createOrm`에서는 config 또는 options 중 하나에 필요하다. |
| `defaultIsolationLevel` | `IsolationLevel` | 트랜잭션 시작 시 명시값이 없을 때 사용할 격리 수준. |

### `MssqlDbConnConfig`

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"mssql" \| "mssql-azure"` | MSSQL 또는 Azure SQL 연결 분기값. |
| `host` | `string` | DB 서버 호스트. |
| `port` | `number` | DB 서버 포트. |
| `username` | `string` | DB 사용자명. |
| `password` | `string` | DB 비밀번호. |
| `database` | `string` | 연결할 데이터베이스 이름. `createOrm`에서는 config 또는 options 중 하나에 필요하다. |
| `schema` | `string` | DbContext 생성 옵션으로 전달할 스키마 이름. |
| `defaultIsolationLevel` | `IsolationLevel` | 트랜잭션 시작 시 명시값이 없을 때 사용할 격리 수준. |

### `PostgresqlDbConnConfig`

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"postgresql"` | PostgreSQL 연결 분기값. |
| `host` | `string` | DB 서버 호스트. |
| `port` | `number` | DB 서버 포트. 구현체 기본값은 `5432`. |
| `username` | `string` | DB 사용자명. |
| `password` | `string` | DB 비밀번호. |
| `database` | `string` | 연결할 데이터베이스 이름. `createOrm`에서는 config 또는 options 중 하나에 필요하다. |
| `schema` | `string` | DbContext 생성 옵션으로 전달할 스키마 이름. |
| `defaultIsolationLevel` | `IsolationLevel` | 트랜잭션 시작 시 명시값이 없을 때 사용할 격리 수준. |

## Usage

```typescript
import type { DbConnConfig } from "@simplysm/orm-node";

const config: DbConnConfig = {
  dialect: "mssql-azure",
  host: "example.database.windows.net",
  username: "app",
  password: "secret",
  database: "app",
  schema: "dbo",
};
```
