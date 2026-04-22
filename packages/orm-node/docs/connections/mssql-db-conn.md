# MssqlDbConn

tedious 라이브러리를 사용하여 MSSQL/Azure SQL 연결을 관리하는 클래스.

```typescript
class MssqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  isConnected: boolean;
  isInTransaction: boolean;
  readonly config: MssqlDbConnConfig;

  constructor(
    tedious: typeof import("tedious"),
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
| `isConnected` | property | `boolean` | 연결 여부 |
| `isInTransaction` | property | `boolean` | 트랜잭션 진행 여부 |
| `config` | property | `MssqlDbConnConfig` | 연결 설정 |
| `connect()` | method | `Promise<void>` | DB 연결을 수립한다. `dialect === "mssql-azure"`인 경우 `encrypt: true`로 연결한다. 연결 성공 시 유휴 타임아웃 타이머(`DB_CONN_DEFAULT_TIMEOUT * 2`)를 시작한다 |
| `close()` | method | `Promise<void>` | 진행 중인 요청을 취소(`cancel()`)하고 30초 내에 완료될 때까지 대기한 뒤 연결을 종료한다 |
| `beginTransaction(isolationLevel?)` | method | `Promise<void>` | 트랜잭션을 시작한다 |
| `commitTransaction()` | method | `Promise<void>` | 트랜잭션을 커밋한다 |
| `rollbackTransaction()` | method | `Promise<void>` | 트랜잭션을 롤백한다 |
| `execute(queries)` | method | `Promise<Record<string, unknown>[][]>` | SQL 쿼리 배열을 순차 실행한다 |
| `executeParametrized(query, params?)` | method | `Promise<Record<string, unknown>[][]>` | 파라미터화된 쿼리를 실행한다. 파라미터가 있으면 `execSql()`, 없으면 `execSqlBatch()`를 사용한다. 쿼리 오류 시 오류 발생 줄을 `==> ` 접두사로 표시하여 에러 메시지에 포함한다 |
| `bulkInsert(tableName, columnMetas, records)` | method | `Promise<void>` | tedious `BulkLoad` API를 사용하여 대량 삽입한다 |

일반적으로 직접 생성하지 않고 [`createDbConn()`](../core/create-db-conn.md)을 통해 인스턴스를 얻는다. 직접 생성은 테스트 코드에서 네이티브 라이브러리를 주입할 때 사용한다.

생성자에서 tedious 라이브러리 모듈을 첫 번째 인수로 직접 주입받는다. `createDbConn()`이 동적 import 후 전달한다.

## `bulkInsert()` 값 변환 규칙

| 값 타입 | 변환 방식 |
|---------|-----------|
| `Uuid` | `toString()` |
| `Uint8Array` | `Buffer.from(val)` (tedious 라이브러리 요구사항으로 인한 예외적 허용) |
| `DateTime` / `DateOnly` | `.date` (native Date 객체) |
| `Time` | `"HH:mm:ss"` 포맷 문자열 |

## Usage

```typescript
import { MssqlDbConn } from "@simplysm/orm-node";

const tedious = await import("tedious");
const conn = new MssqlDbConn(tedious, {
  dialect: "mssql",
  host: "localhost",
  port: 1433,
  username: "sa",
  password: "password",
  database: "mydb",
});

await conn.connect();
const results = await conn.execute(["SELECT 1 AS val"]);
await conn.close();
```
