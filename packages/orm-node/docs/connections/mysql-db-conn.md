# MysqlDbConn

mysql2/promise 라이브러리를 사용하여 MySQL 연결을 관리하는 클래스.

```typescript
class MysqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  isConnected: boolean;
  isInTransaction: boolean;
  readonly config: MysqlDbConnConfig;

  constructor(
    mysql2: typeof import("mysql2/promise"),
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
| `isConnected` | property | `boolean` | 연결 여부 |
| `isInTransaction` | property | `boolean` | 트랜잭션 진행 여부 |
| `config` | property | `MysqlDbConnConfig` | 연결 설정 |
| `connect()` | method | `Promise<void>` | DB 연결을 수립한다. `multipleStatements: true`, `charset: "utf8mb4"`로 연결한다 |
| `close()` | method | `Promise<void>` | DB 연결을 종료한다 |
| `beginTransaction(isolationLevel?)` | method | `Promise<void>` | `SET SESSION TRANSACTION ISOLATION LEVEL {level}` 후 `BEGIN`을 실행한다. MySQL은 트랜잭션 시작 전에 격리 수준을 설정해야 한다 |
| `commitTransaction()` | method | `Promise<void>` | 트랜잭션을 커밋한다 |
| `rollbackTransaction()` | method | `Promise<void>` | 트랜잭션을 롤백한다 |
| `execute(queries)` | method | `Promise<Record<string, unknown>[][]>` | SQL 쿼리 배열을 순차 실행한다 |
| `executeParametrized(query, params?)` | method | `Promise<Record<string, unknown>[][]>` | 파라미터화된 쿼리를 실행한다. 결과 형식에 따라 처리: single SELECT → flat 배열, single INSERT/UPDATE/DELETE → 빈 결과 집합, multi-statement → 각 statement의 결과를 별도 결과 집합으로 분리 |
| `bulkInsert(tableName, columnMetas, records)` | method | `Promise<void>` | `LOAD DATA LOCAL INFILE`을 사용하여 대량 삽입한다 |

일반적으로 직접 생성하지 않고 [`createDbConn()`](../core/create-db-conn.md)을 통해 인스턴스를 얻는다. 직접 생성은 테스트 코드에서 네이티브 라이브러리를 주입할 때 사용한다.

생성자에서 mysql2/promise 라이브러리 모듈을 첫 번째 인수로 직접 주입받는다.

## `bulkInsert()` 처리 흐름

1. `os.tmpdir()`에 UUID 기반 임시 CSV 파일 생성 (TAB 구분)
2. UUID/binary 컬럼은 hex 문자열로 기록, `SET` 절에서 `UNHEX()` 변환
3. `LOAD DATA LOCAL INFILE` 실행
4. `finally` 블록에서 임시 파일 삭제

## Usage

```typescript
import { MysqlDbConn } from "@simplysm/orm-node";

const mysql2 = await import("mysql2/promise");
const conn = new MysqlDbConn(mysql2, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "testdb",
});

await conn.connect();
const results = await conn.execute(["SELECT 1 AS val"]);
await conn.close();
```
