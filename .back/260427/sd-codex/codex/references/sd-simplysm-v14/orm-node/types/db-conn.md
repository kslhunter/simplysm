# `DbConn`

> **읽어야 하는 상황**: DBMS별 연결 클래스가 공통으로 제공하는 저수준 연결 계약을 확인할 때. 연결 객체를 직접 만들려면 [`createDbConn`](../core/create-db-conn.md)을 사용.

## When to use

- ✅ `MssqlDbConn`, `MysqlDbConn`, `PostgresqlDbConn`을 동일한 타입으로 다루거나 새 DBMS 구현체의 계약을 맞출 때 사용.
- ❌ `DbContext` 업무 쿼리를 작성할 때는 `@simplysm/orm-common`의 `DbContext` API를 사용.

## Signature

```typescript
export interface DbConn extends EventEmitter<{ close: void }> {
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

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `config` | property | `DbConnConfig` | 연결 생성에 사용된 설정. |
| `isConnected` | property | `boolean` | 현재 연결 여부. |
| `isInTransaction` | property | `boolean` | 트랜잭션 진행 여부. |
| `connect` | method | `() => Promise<void>` | DB 연결을 수립한다. |
| `close` | method | `() => Promise<void>` | DB 연결을 종료한다. |
| `beginTransaction` | method | `(isolationLevel?: IsolationLevel) => Promise<void>` | 트랜잭션을 시작한다. |
| `commitTransaction` | method | `() => Promise<void>` | 트랜잭션을 커밋한다. |
| `rollbackTransaction` | method | `() => Promise<void>` | 트랜잭션을 롤백한다. |
| `execute` | method | `(queries: string[]) => Promise<Record<string, unknown>[][]>` | SQL 문자열 배열을 실행한다. 빈 문자열은 구현체에서 제외된다. |
| `executeParametrized` | method | `(query: string, params?: unknown[]) => Promise<Record<string, unknown>[][]>` | 파라미터화 SQL을 실행한다. |
| `bulkInsert` | method | `(tableName: string, columnMetas: Record<string, ColumnMeta>, records: Record<string, unknown>[]) => Promise<void>` | DBMS native bulk API로 여러 레코드를 삽입한다. |

## Usage

```typescript
import type { DbConn } from "@simplysm/orm-node";

async function runHealthCheck(conn: DbConn): Promise<void> {
  await conn.connect();
  try {
    await conn.execute(["select 1"]);
  } finally {
    await conn.close();
  }
}
```

## 관련

- [`DbConnConfig`](./db-conn-config.md) — `config` 필드의 union 타입.
- [`createDbConn`](../core/create-db-conn.md) — `DbConn` 구현체를 생성하는 팩토리.
