# `PostgresqlDbConn`

> **읽어야 하는 상황**: PostgreSQL의 저수준 연결 동작이나 bulk insert 구현을 확인할 때. 일반적으로 [`createDbConn`](../core/create-db-conn.md)이 자동 생성하므로 직접 사용할 일은 드물다.

pg + pg-copy-streams 라이브러리를 사용하여 PostgreSQL 연결을 관리하는 클래스.

## When to use

- ✅ 테스트 코드에서 PostgreSQL 연결을 직접 생성하여 네이티브 라이브러리를 주입할 때.
- ❌ 일반적으로 직접 생성하지 않는다. [`createDbConn()`](../core/create-db-conn.md)이 dialect에 따라 자동 생성한다.

## Signature

```typescript
class PostgresqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  isConnected: boolean;
  isInTransaction: boolean;
  readonly config: PostgresqlDbConnConfig;

  constructor(
    pg: typeof import("pg"),
    pgCopyStreams: typeof import("pg-copy-streams"),
    config: PostgresqlDbConnConfig,
  );

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

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `isConnected` | property | `boolean` | 연결 여부 |
| `isInTransaction` | property | `boolean` | 트랜잭션 진행 여부 |
| `config` | property | `PostgresqlDbConnConfig` | 연결 설정 |
| `connect()` | method | `Promise<void>` | DB 연결을 수립한다. 기본 포트는 `5432`. `connectionTimeoutMillis: DB_CONN_CONNECT_TIMEOUT`, `query_timeout: DB_CONN_DEFAULT_TIMEOUT`으로 연결한다 |
| `close()` | method | `Promise<void>` | DB 연결을 종료한다 |
| `beginTransaction(isolationLevel?)` | method | `Promise<void>` | `BEGIN` 후 `SET TRANSACTION ISOLATION LEVEL {level}`을 실행한다 |
| `commitTransaction()` | method | `Promise<void>` | `COMMIT`을 실행한다 |
| `rollbackTransaction()` | method | `Promise<void>` | `ROLLBACK`을 실행한다 |
| `execute(queries)` | method | `Promise<Record<string, unknown>[][]>` | SQL 쿼리 배열을 순차 실행한다 |
| `executeParametrized(query, params?)` | method | `Promise<Record<string, unknown>[][]>` | 파라미터화된 쿼리를 실행한다. PostgreSQL은 단일 결과 집합을 반환하므로 `[result.rows]`로 래핑하여 반환한다 |
| `bulkInsert(tableName, columnMetas, records)` | method | `Promise<void>` | `COPY FROM STDIN`(CSV 형식)을 사용하여 대량 삽입한다 |

일반적으로 직접 생성하지 않고 [`createDbConn()`](../core/create-db-conn.md)을 통해 인스턴스를 얻는다. 직접 생성은 테스트 코드에서 네이티브 라이브러리를 주입할 때 사용한다.

생성자에서 pg와 pg-copy-streams 라이브러리 모듈을 첫 번째, 두 번째 인수로 직접 주입받는다.

## `bulkInsert()` 처리 방식

`pg-copy-streams`의 `from()` 함수로 스트림을 생성하고, `Readable.from(csvContent)`를 파이프한다.

binary 컬럼 값 변환:
- `binary` 타입: PostgreSQL bytea hex 형식 (`\x{hex}`, CSV 큰따옴표로 감쌈)
- `uuid` 타입: `toString()` 그대로

## Usage

```typescript
import { PostgresqlDbConn } from "@simplysm/orm-node";

const pg = await import("pg");
const pgCopyStreams = await import("pg-copy-streams");
const conn = new PostgresqlDbConn(pg, pgCopyStreams, {
  dialect: "postgresql",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "testdb",
});

await conn.connect();
const results = await conn.execute(["SELECT 1 AS val"]);
await conn.close();
```
