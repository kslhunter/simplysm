# Types

## `DbConn`

저수준 DB 연결 인터페이스. 각 DBMS 구현체(`MssqlDbConn`, `MysqlDbConn`, `PostgresqlDbConn`)가 이 인터페이스를 구현한다.

```typescript
interface DbConn extends EventEmitter<{ close: void }> {
  config: DbConnConfig;
  isConnected: boolean;
  isInTransaction: boolean;
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  execute(queries: string[]): Promise<Record<string, unknown>[][]>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `config` | `DbConnConfig` | 연결 설정 |
| `isConnected` | `boolean` | 연결 여부 |
| `isInTransaction` | `boolean` | 트랜잭션 진행 여부 |
| `connect()` | `Promise<void>` | DB 연결을 수립한다 |
| `close()` | `Promise<void>` | DB 연결을 종료한다 |
| `beginTransaction(isolationLevel?)` | `Promise<void>` | 트랜잭션을 시작한다 |
| `commitTransaction()` | `Promise<void>` | 트랜잭션을 커밋한다 |
| `rollbackTransaction()` | `Promise<void>` | 트랜잭션을 롤백한다 |
| `execute(queries)` | `Promise<Record<string, unknown>[][]>` | SQL 쿼리 배열을 실행한다 |
| `executeParametrized(query, params?)` | `Promise<Record<string, unknown>[][]>` | 파라미터화된 쿼리를 실행한다 |
| `bulkInsert(tableName, columnMetas, records)` | `Promise<void>` | 네이티브 bulk API를 사용하여 대량 삽입한다 |

`EventEmitter<{ close: void }>`를 상속하므로 연결 종료 시 `'close'` 이벤트를 수신할 수 있다.

## `DbConnConfig`

DB 연결 설정 discriminated union. `dialect` 필드로 구현체를 분기한다.

```typescript
type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;
```

## `MysqlDbConnConfig`

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

## `MssqlDbConnConfig`

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
| `dialect` | `"mssql" \| "mssql-azure"` | Discriminant. `"mssql-azure"`인 경우 암호화 연결(encrypt)을 사용한다 |
| `host` | `string` | 호스트 주소 |
| `port` | `number?` | 포트 |
| `username` | `string` | 사용자 이름 |
| `password` | `string` | 비밀번호 |
| `database` | `string?` | 데이터베이스 이름 |
| `schema` | `string?` | 스키마 이름 |
| `defaultIsolationLevel` | `IsolationLevel?` | 기본 격리 수준 (미지정 시 `READ_UNCOMMITTED`) |

## `PostgresqlDbConnConfig`

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

## `DB_CONN_CONNECT_TIMEOUT`

DB 연결 수립 타임아웃 (10초).

```typescript
const DB_CONN_CONNECT_TIMEOUT = 10 * 1000; // 10_000ms
```

## `DB_CONN_DEFAULT_TIMEOUT`

DB 쿼리 기본 타임아웃 (10분). 유휴 연결 자동 종료 타이머는 이 값의 2배 후 `close()`를 호출한다.

```typescript
const DB_CONN_DEFAULT_TIMEOUT = 10 * 60 * 1000; // 600_000ms
```

## `DB_CONN_ERRORS`

DB 연결 관련 오류 메시지 상수.

```typescript
const DB_CONN_ERRORS = {
  NOT_CONNECTED: "'Connection'이 연결되어 있지 않습니다.",
  ALREADY_CONNECTED: "'Connection'이 이미 연결되어 있습니다.",
} as const;
```

| Key | Value |
|-----|-------|
| `NOT_CONNECTED` | `"'Connection'이 연결되어 있지 않습니다."` |
| `ALREADY_CONNECTED` | `"'Connection'이 이미 연결되어 있습니다."` |

## `getDialectFromConfig`

`DbConnConfig`에서 정규화된 `Dialect`를 추출한다.

```typescript
function getDialectFromConfig(config: DbConnConfig): Dialect;
```

`"mssql-azure"` → `"mssql"`로 변환하고, 나머지(`"mysql"`, `"mssql"`, `"postgresql"`)는 `config.dialect`를 그대로 반환한다.
