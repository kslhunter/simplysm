# `MssqlDbConn`

> **읽어야 하는 상황**: MSSQL 또는 Azure SQL의 저수준 연결 구현, 파라미터 바인딩, `tedious` BulkLoad 동작을 확인할 때. 설정만으로 생성하려면 [`createDbConn`](../core/create-db-conn.md)을 사용.

## When to use

- ✅ MSSQL/Azure SQL 연결 구현을 직접 테스트하거나 `DbConn` 구현 세부 동작을 확인할 때 사용.
- ❌ 일반 애플리케이션 코드에서 생성자를 직접 호출하지 말고 [`createDbConn`](../core/create-db-conn.md)을 사용.

## Signature

```typescript
export class MssqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  isConnected: boolean;
  isInTransaction: boolean;

  constructor(
    _tedious: typeof import("tedious"),
    config: MssqlDbConnConfig,
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
| `config` | constructor property | `MssqlDbConnConfig` | 연결 설정. `dialect: "mssql-azure"`이면 `encrypt: true`로 연결한다. |
| `isConnected` | property | `boolean` | 연결 성공 후 `true`, 종료 후 `false`. |
| `isInTransaction` | property | `boolean` | transaction 시작 후 `true`, commit/rollback 후 `false`. |
| `executeParametrized` | method | `(query: string, params?: unknown[]) => Promise<Record<string, unknown>[][]>` | `params`가 있으면 `p0`, `p1` 이름으로 `tedious` 파라미터를 추가한다. |
| `bulkInsert` | method | `(tableName: string, columnMetas: Record<string, ColumnMeta>, records: Record<string, unknown>[]) => Promise<void>` | `tedious` `BulkLoad`로 대량 삽입한다. |

## Usage

```typescript
import { createDbConn } from "@simplysm/orm-node";

const conn = await createDbConn({
  dialect: "mssql",
  host: "localhost",
  username: "sa",
  password: "secret",
  database: "app",
});

await conn.connect();
try {
  await conn.executeParametrized("select * from dbo.Users where id = @p0", [1]);
} finally {
  await conn.close();
}
```

## Anti-patterns

### null/undefined 파라미터 바인딩

`executeParametrized`의 MSSQL 타입 추론은 `null` 또는 `undefined` 값을 받으면 `SdError`를 던진다.

**근거**: private `_guessTediousType`이 `value == null`이면 `"_guessTediousType: null/undefined 값은 지원하지 않습니다."` 오류를 발생시킨다.
