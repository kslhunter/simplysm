# `DbConn`

> **읽어야 하는 상황**: DBMS에 무관한 코드에서 연결 객체의 공통 인터페이스를 확인할 때. 연결 설정 타입은 [`DbConnConfig`](./db-conn-config.md) 참조.

저수준 DB 연결 인터페이스. 각 DBMS 구현체(`MssqlDbConn`, `MysqlDbConn`, `PostgresqlDbConn`)가 이 인터페이스를 구현한다.

## When to use

- ✅ DBMS에 무관한 코드에서 연결 객체의 타입으로 사용할 때.
- ✅ 커스텀 DbConn 구현체를 만들 때 이 인터페이스를 구현한다.

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

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `config` | property | `DbConnConfig` | 연결 설정 |
| `isConnected` | property | `boolean` | 연결 여부 |
| `isInTransaction` | property | `boolean` | 트랜잭션 진행 여부 |
| `connect()` | method | `Promise<void>` | DB 연결을 수립한다 |
| `close()` | method | `Promise<void>` | DB 연결을 종료한다 |
| `beginTransaction(isolationLevel?)` | method | `Promise<void>` | 트랜잭션을 시작한다 |
| `commitTransaction()` | method | `Promise<void>` | 트랜잭션을 커밋한다 |
| `rollbackTransaction()` | method | `Promise<void>` | 트랜잭션을 롤백한다 |
| `execute(queries)` | method | `Promise<Record<string, unknown>[][]>` | SQL 쿼리 배열을 실행한다 |
| `executeParametrized(query, params?)` | method | `Promise<Record<string, unknown>[][]>` | 파라미터화된 쿼리를 실행한다 |
| `bulkInsert(tableName, columnMetas, records)` | method | `Promise<void>` | 네이티브 bulk API를 사용하여 대량 삽입한다 |

`EventEmitter<{ close: void }>`를 상속하므로 연결 종료 시 `'close'` 이벤트를 수신할 수 있다.

## Usage

```typescript
conn.on("close", () => {
  // 연결이 종료됨
});

await conn.connect();
await conn.beginTransaction();
await conn.execute(["INSERT INTO users (name) VALUES ('Alice')"]);
await conn.commitTransaction();
await conn.close();
```
