# Connections

세 연결 클래스(`MssqlDbConn`, `MysqlDbConn`, `PostgresqlDbConn`)는 모두 `EventEmitter<{ close: void }>`를 상속하고 `DbConn` 인터페이스를 구현한다.

일반적으로 직접 생성하지 않고 `createDbConn()`을 통해 인스턴스를 얻는다. 직접 생성은 테스트 코드에서 네이티브 라이브러리를 주입할 때 사용한다.

## `MssqlDbConn`

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

**생성자**: tedious 라이브러리 모듈을 첫 번째 인수로 직접 주입받는다. `createDbConn()`이 동적 import 후 전달한다.

**`connect()`**: `config.dialect === "mssql-azure"`인 경우 `encrypt: true`로 연결한다. 연결 성공 시 유휴 타임아웃 타이머(`DB_CONN_DEFAULT_TIMEOUT * 2`)를 시작한다.

**`close()`**: 진행 중인 요청을 취소(`cancel()`)하고 30초 내에 완료될 때까지 대기한 뒤 연결을 종료한다.

**`bulkInsert()`**: tedious `BulkLoad` API를 사용한다. 값 변환 규칙:
- `Uuid` → `toString()`
- `Uint8Array` → `Buffer.from(val)` (tedious 라이브러리 요구사항으로 인한 예외적 허용)
- `DateTime` / `DateOnly` → `.date` (native Date 객체)
- `Time` → `"HH:mm:ss"` 포맷 문자열

**`executeParametrized()`**: 파라미터가 있으면 `conn.execSql()`, 없으면 `conn.execSqlBatch()`를 사용한다. 쿼리 오류 시 오류 발생 줄을 `==> ` 접두사로 표시하여 에러 메시지에 포함한다.

## `MysqlDbConn`

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

**생성자**: mysql2/promise 라이브러리 모듈을 첫 번째 인수로 직접 주입받는다.

**`connect()`**: `username === "root"`인 경우 `database` 옵션을 전달하지 않는다 (모든 데이터베이스에 접근 가능하도록 관리 작업용). `multipleStatements: true`, `charset: "utf8mb4"`로 연결한다.

**`beginTransaction()`**: `SET SESSION TRANSACTION ISOLATION LEVEL {level}` 후 `BEGIN`을 실행한다. MySQL은 트랜잭션 시작 전에 격리 수준을 설정해야 한다.

**`bulkInsert()`**: `LOAD DATA LOCAL INFILE`을 사용한다. 처리 흐름:
1. `os.tmpdir()`에 UUID 기반 임시 CSV 파일 생성 (TAB 구분)
2. UUID/binary 컬럼은 hex 문자열로 기록, `SET` 절에서 `UNHEX()` 변환
3. `LOAD DATA LOCAL INFILE` 실행
4. `finally` 블록에서 임시 파일 삭제

**`executeParametrized()`**: 결과 형식에 따라 처리:
- single SELECT → flat `RowDataPacket[]`를 단일 결과 집합으로 반환
- single INSERT/UPDATE/DELETE → `ResultSetHeader`이므로 빈 결과 집합 반환
- multi-statement → 각 statement의 결과를 별도 결과 집합으로 분리

## `PostgresqlDbConn`

pg + pg-copy-streams 라이브러리를 사용하여 PostgreSQL 연결을 관리하는 클래스.

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

**생성자**: pg와 pg-copy-streams 라이브러리 모듈을 첫 번째, 두 번째 인수로 직접 주입받는다.

**`connect()`**: 기본 포트는 `5432`. `connectionTimeoutMillis: DB_CONN_CONNECT_TIMEOUT`, `query_timeout: DB_CONN_DEFAULT_TIMEOUT`으로 연결한다.

**`beginTransaction()`**: `BEGIN` 후 `SET TRANSACTION ISOLATION LEVEL {level}`을 실행한다.

**`bulkInsert()`**: `COPY FROM STDIN`(CSV 형식)을 사용한다. `pg-copy-streams`의 `from()` 함수로 스트림을 생성하고, `Readable.from(csvContent)`를 파이프한다. binary 컬럼은 PostgreSQL bytea hex 형식(`\x{hex}`)으로 변환한다.

**`executeParametrized()`**: PostgreSQL은 단일 결과 집합을 반환하므로 `[result.rows]`로 래핑하여 반환한다.
