# `DbConnConfig`

> **읽어야 하는 상황**: DB 연결 설정을 구성할 때. `dialect` 필드로 DBMS별 설정을 분기한다.

DB 연결 설정 discriminated union. `dialect` 필드로 구현체를 분기한다.

```typescript
type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;
```

## Related Types

### `MysqlDbConnConfig`

MySQL 연결 설정.

```typescript
interface MysqlDbConnConfig {
  dialect: "mysql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"mysql"` | Discriminant. 항상 `"mysql"` |
| `host` | `string` | 호스트 주소 |
| `port` | `number?` | 포트 (생략 시 mysql2 기본값 사용) |
| `username` | `string` | 사용자 이름 |
| `password` | `string` | 비밀번호 |
| `database` | `string?` | 데이터베이스 이름 |
| `defaultIsolationLevel` | `IsolationLevel?` | 기본 격리 수준 (미지정 시 `READ_UNCOMMITTED`) |

### `MssqlDbConnConfig`

MSSQL/Azure SQL 연결 설정.

```typescript
interface MssqlDbConnConfig {
  dialect: "mssql" | "mssql-azure";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"mssql" \| "mssql-azure"` | Discriminant. `"mssql-azure"`인 경우 암호화 연결(`encrypt: true`)을 사용한다 |
| `host` | `string` | 호스트 주소 |
| `port` | `number?` | 포트 |
| `username` | `string` | 사용자 이름 |
| `password` | `string` | 비밀번호 |
| `database` | `string?` | 데이터베이스 이름 |
| `schema` | `string?` | 스키마 이름 |
| `defaultIsolationLevel` | `IsolationLevel?` | 기본 격리 수준 (미지정 시 `READ_UNCOMMITTED`) |

### `PostgresqlDbConnConfig`

PostgreSQL 연결 설정.

```typescript
interface PostgresqlDbConnConfig {
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

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"postgresql"` | Discriminant. 항상 `"postgresql"` |
| `host` | `string` | 호스트 주소 |
| `port` | `number?` | 포트 (미지정 시 `5432`) |
| `username` | `string` | 사용자 이름 |
| `password` | `string` | 비밀번호 |
| `database` | `string?` | 데이터베이스 이름 |
| `schema` | `string?` | 스키마 이름 |
| `defaultIsolationLevel` | `IsolationLevel?` | 기본 격리 수준 (미지정 시 `READ_UNCOMMITTED`) |
