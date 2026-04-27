# `PostgresqlDbConn`

> **읽어야 하는 상황**: PostgreSQL의 저수준 연결 구현, 단일 result set 처리, `COPY FROM STDIN` bulk insert 동작을 확인할 때. 설정만으로 생성하려면 [`createDbConn`](../core/create-db-conn.md)을 사용.

## When to use

- ✅ PostgreSQL 연결 구현의 쿼리 실행과 COPY 기반 bulk insert 세부 동작을 확인할 때 사용.
- ❌ 일반 애플리케이션 코드에서 생성자를 직접 호출하지 말고 [`createDbConn`](../core/create-db-conn.md)을 사용.

## Signature

```typescript
export class PostgresqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  isConnected: boolean;
  isInTransaction: boolean;

  constructor(
    _pg: typeof import("pg"),
    _pgCopyStreams: typeof import("pg-copy-streams"),
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
| `config` | constructor property | `PostgresqlDbConnConfig` | PostgreSQL 연결 설정. `port` 기본값은 `5432`. |
| `isConnected` | property | `boolean` | 연결 성공 후 `true`, 종료 후 `false`. |
| `isInTransaction` | property | `boolean` | transaction 시작 후 `true`, commit/rollback 후 `false`. |
| `executeParametrized` | method | `(query: string, params?: unknown[]) => Promise<Record<string, unknown>[][]>` | `pg.Client.query` 결과의 `rows`를 단일 result set으로 반환한다. |
| `bulkInsert` | method | `(tableName: string, columnMetas: Record<string, ColumnMeta>, records: Record<string, unknown>[]) => Promise<void>` | `COPY ${tableName} (...) FROM STDIN WITH (FORMAT csv, NULL '\\N')` 스트림으로 삽입한다. |

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
  await conn.executeParametrized("select * from users where id = $1", [1]);
} finally {
  await conn.close();
}
```

## Anti-patterns

### bulk insert 중 tableName 이스케이프 기대

`bulkInsert`는 `COPY ${tableName}` 형태로 tableName을 그대로 SQL에 넣는다. 소비자 코드는 신뢰된 테이블명만 전달해야 한다.

**근거**: 구현체는 컬럼명만 큰따옴표로 감싸고 `tableName`에는 별도 escape를 수행하지 않는다.
