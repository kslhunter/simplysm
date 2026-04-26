# `MysqlDbConn`

> **읽어야 하는 상황**: MySQL의 저수준 연결 구현, multi-statement 결과 분리, `LOAD DATA LOCAL INFILE` bulk insert 동작을 확인할 때. 설정만으로 생성하려면 [`createDbConn`](../core/create-db-conn.md)을 사용.

## When to use

- ✅ MySQL 연결 구현의 반환 결과 모양이나 bulk insert 직렬화 방식을 확인할 때 사용.
- ❌ 일반 애플리케이션 코드에서 생성자를 직접 호출하지 말고 [`createDbConn`](../core/create-db-conn.md)을 사용.

## Signature

```typescript
export class MysqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  isConnected: boolean;
  isInTransaction: boolean;

  constructor(
    _mysql2: typeof import("mysql2/promise"),
    config: MysqlDbConnConfig,
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
| `config` | constructor property | `MysqlDbConnConfig` | MySQL 연결 설정. |
| `isConnected` | property | `boolean` | 연결 성공 후 `true`, 종료 후 `false`. |
| `isInTransaction` | property | `boolean` | transaction 시작 후 `true`, commit/rollback 후 `false`. |
| `connect` | method | `() => Promise<void>` | `multipleStatements: true`, `charset: "utf8mb4"`, `infileStreamFactory`를 켜서 연결한다. |
| `executeParametrized` | method | `(query: string, params?: unknown[]) => Promise<Record<string, unknown>[][]>` | `mysql2` `query`를 실행하고 단일/다중 statement 결과를 `Record[][]`로 맞춘다. |
| `bulkInsert` | method | `(tableName: string, columnMetas: Record<string, ColumnMeta>, records: Record<string, unknown>[]) => Promise<void>` | 임시 TSV 파일을 만들고 `LOAD DATA LOCAL INFILE`로 삽입한다. |

## Usage

```typescript
import { createDbConn } from "@simplysm/orm-node";

const conn = await createDbConn({
  dialect: "mysql",
  host: "localhost",
  username: "root",
  password: "secret",
  database: "app",
});

await conn.connect();
try {
  await conn.executeParametrized("select * from Users where id = ?", [1]);
} finally {
  await conn.close();
}
```

## Anti-patterns

### bulk insert 중 tableName 이스케이프 기대

`bulkInsert`는 `LOAD DATA LOCAL INFILE ... INTO TABLE ${tableName}` 형태로 tableName을 그대로 SQL에 넣는다. 소비자 코드는 신뢰된 테이블명만 전달해야 한다.

**근거**: 구현체가 컬럼명은 백틱으로 감싸지만 `tableName`에는 별도 escape를 수행하지 않는다.
