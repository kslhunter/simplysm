# @simplysm/orm-node — 저수준 DB 연결

`createOrm` 추상화 밖에서 DB 연결 객체를 만들거나, raw SQL·파라미터 쿼리·bulk insert·`DbContextExecutor` 구현을 직접 다룰 때 같이 읽는 묶음.

## createDbConn

```ts
function createDbConn(config: DbConnConfig): Promise<DbConn>
```

- `config`: `DbConnConfig` — `dialect` 로 생성할 연결 구현체를 고른다.
- `config.dialect: "mysql"` — `mysql2/promise` 를 지연 import 하고 `MysqlDbConn` 을 생성한다.
- `config.dialect: "postgresql"` — `pg` 와 `pg-copy-streams` 를 지연 import 하고 `PostgresqlDbConn` 을 생성한다.
- `config.dialect: "mssql" | "mssql-azure"` — `tedious` 를 지연 import 하고 `MssqlDbConn` 을 생성한다.
- 반환값: `Promise<DbConn>` — 아직 연결되지 않은 연결 객체이며, 실제 연결은 반환 객체의 `connect()` 에서 열린다.
- 모듈 캐시: 한 번 import 한 드라이버 모듈은 내부 `modules` 객체에 저장되어 다음 생성에서 재사용된다.

## DbConn

```ts
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

- `EventEmitter<{ close: void }>`: 연결 종료 시 `close` 이벤트를 발생시키는 이벤트 기반 연결 인터페이스다.
- `config`: `DbConnConfig` — 이 연결이 받은 dialect별 접속 설정이다.
- `isConnected`: `boolean` — 연결 성공 후 `true`, 종료·reset 후 `false` 로 바뀌는 연결 상태 값이다.
- `isInTransaction`: `boolean` — `beginTransaction` 성공 후 `true`, `commitTransaction`/`rollbackTransaction` 성공 후 `false` 로 바뀌는 트랜잭션 상태 값이다.
- `connect`: `() => Promise<void>` — DB 연결을 수립하며, 구현체들은 이미 연결된 상태에서 `DB_CONN_ERRORS.ALREADY_CONNECTED` 로 오류를 낸다.
- `close`: `() => Promise<void>` — DB 연결을 종료하며, 구현체들은 미연결 상태면 종료 처리를 건너뛴다.
- `beginTransaction`: `(isolationLevel?: IsolationLevel) => Promise<void>` — 트랜잭션을 시작하며, 인자가 없으면 `config.defaultIsolationLevel`, 그것도 없으면 `"READ_UNCOMMITTED"` 를 사용한다.
- `isolationLevel`: `IsolationLevel | undefined` — 드라이버의 트랜잭션 격리 수준 설정으로 전달되는 값이다.
- `commitTransaction`: `() => Promise<void>` — 트랜잭션을 커밋하고 구현체 상태의 `isInTransaction` 을 `false` 로 바꾼다.
- `rollbackTransaction`: `() => Promise<void>` — 트랜잭션을 롤백하고 구현체 상태의 `isInTransaction` 을 `false` 로 바꾼다.
- `execute`: `(queries: string[]) => Promise<Record<string, unknown>[][]>` — `str.isNullOrEmpty` 로 제외되지 않은 SQL 문자열을 순서대로 실행하고 각 실행 결과 배열을 이어 붙여 반환한다.
- `queries`: `string[]` — 순차 실행할 SQL 문자열 배열이다.
- `executeParametrized`: `(query: string, params?: unknown[]) => Promise<Record<string, unknown>[][]>` — SQL 1건과 선택 파라미터 배열을 드라이버 쿼리 API로 실행한다.
- `query`: `string` — 실행할 SQL 문자열이며, 오류 메시지에 포함될 수 있다.
- `params`: `unknown[] | undefined` — 드라이버 파라미터 바인딩에 전달되는 값 배열이다.
- `bulkInsert`: `(tableName, columnMetas, records) => Promise<void>` — dialect별 native bulk 경로로 여러 레코드를 삽입한다.
- `tableName`: `string` — bulk insert 대상 테이블명이며 구현체가 SQL 문자열 또는 드라이버 bulk API에 그대로 전달한다.
- `columnMetas`: `Record<string, ColumnMeta>` — 컬럼명별 메타이며, 키 순서가 bulk insert 값 추출 순서가 된다.
- `records`: `Record<string, unknown>[]` — 삽입할 레코드 배열이며, 길이가 0이면 삽입 경로를 실행하지 않는다.

## DbConnConfig 계열

```ts
type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;

interface MysqlDbConnConfig {
  dialect: "mysql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  defaultIsolationLevel?: IsolationLevel;
}

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

- `DbConnConfig`: dialect별 연결 설정 유니온 — `createDbConn`, `NodeDbContextExecutor`, `createOrm` 의 연결 설정 인자로 쓴다.
- `MysqlDbConnConfig.dialect: "mysql"` — MySQL 연결 구현체를 선택하는 리터럴이다.
- `MssqlDbConnConfig.dialect: "mssql" | "mssql-azure"` — MSSQL 연결 구현체를 선택하며, `"mssql-azure"` 는 연결 옵션의 `encrypt` 를 `true` 로 만든다.
- `PostgresqlDbConnConfig.dialect: "postgresql"` — PostgreSQL 연결 구현체를 선택하는 리터럴이다.
- `host`: `string` — 드라이버 연결의 host/server 값으로 전달된다.
- `port`: `number | undefined` — 드라이버 연결의 port 값으로 전달되며, PostgreSQL 구현체는 미지정 시 `5432` 를 사용한다.
- `username`: `string` — 드라이버 인증 사용자 값으로 전달된다.
- `password`: `string` — 드라이버 인증 비밀번호 값으로 전달된다.
- `database`: `string | undefined` — 드라이버 연결의 database 값으로 전달되고, `createOrm` 의 `OrmOptions.database` 가 없을 때 `DbContext` 생성 옵션으로도 쓰인다.
- `schema`: `string | undefined` — MSSQL/PostgreSQL 설정에서만 있는 스키마 값이며, `createOrm` 의 `OrmOptions.schema` 가 없을 때 `DbContext` 생성 옵션으로 쓰인다.
- `defaultIsolationLevel`: `IsolationLevel | undefined` — `beginTransaction` 인자가 없을 때 사용할 연결별 기본 격리 수준이다.

## getDialectFromConfig

```ts
function getDialectFromConfig(config: DbConnConfig): Dialect
```

- `config`: `DbConnConfig` — dialect 값을 읽을 연결 설정이다.
- 반환값: `Dialect` — `config.dialect` 가 `"mssql-azure"` 이면 `"mssql"`, 그 외에는 원래 dialect 값을 반환한다.
- 사용 위치: `NodeDbContextExecutor` 생성자가 query builder dialect 를 정할 때 사용한다.

## DB 연결 구현체

### MysqlDbConn

```ts
class MysqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  readonly config: MysqlDbConnConfig;
  isConnected: boolean;
  isInTransaction: boolean;
  constructor(_mysql2: typeof import("mysql2/promise"), config: MysqlDbConnConfig);
}
```

- `_mysql2`: `typeof import("mysql2/promise")` — `createConnection`, `query`, transaction API 를 제공하는 MySQL 드라이버 모듈이다.
- `config`: `MysqlDbConnConfig` — host/port/user/password/database/defaultIsolationLevel 을 MySQL 연결과 트랜잭션에 사용한다.
- `connect`: `createConnection` 에 `multipleStatements: true`, `charset: "utf8mb4_bin"`, `infileStreamFactory` 를 포함해 연결하고 성공 시 `isConnected = true` 로 바꾼다.
- `beginTransaction`: `SET SESSION TRANSACTION ISOLATION LEVEL ...` 실행 후 `beginTransaction()` 을 호출하며, 격리 수준 문자열의 `_` 는 공백으로 바꾼다.
- `executeParametrized`: `conn.query({ sql, timeout, values: params })` 로 실행한다.
- `executeParametrized` 반환: 단일 DML 결과 객체면 `[[]]`, 멀티 statement 배열이면 statement별 결과 배열(DML 위치는 `[]`), 단일 SELECT 배열이면 `[rows]` 를 반환한다.
- `bulkInsert`: 임시 TSV 파일을 만들고 `LOAD DATA LOCAL INFILE` 로 삽입한 뒤 임시 파일 삭제를 시도한다.
- `bulkInsert uuid/binary`: 해당 컬럼은 `@_컬럼명` 임시 변수로 읽은 뒤 `SET 컬럼 = UNHEX(@_컬럼명)` 절로 복원한다.
- `bulkInsert 값 변환`: `null` 은 `\\N`, boolean 은 `1`/`0`, 날짜·시간 값은 지정 포맷 문자열, `Uuid` 는 하이픈 제거 문자열, `Uint8Array` 는 hex 문자열로 쓴다.

### MssqlDbConn

```ts
class MssqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  readonly config: MssqlDbConnConfig;
  isConnected: boolean;
  isInTransaction: boolean;
  constructor(_tedious: typeof import("tedious"), config: MssqlDbConnConfig);
}
```

- `_tedious`: `typeof import("tedious")` — `Connection`, `Request`, `BulkLoad`, `TYPES`, `ISOLATION_LEVEL` 을 제공하는 MSSQL 드라이버 모듈이다.
- `config`: `MssqlDbConnConfig` — server/auth/database/port/defaultIsolationLevel 및 Azure 암호화 분기에 사용한다.
- `connect`: tedious `Connection` 을 만들고 `config.dialect === "mssql-azure"` 일 때 `encrypt: true`, 그 외에는 `false` 로 설정한다.
- `connect` 옵션: `rowCollectionOnDone: true`, `useUTC: false`, `trustServerCertificate: true`, `requestTimeout: DB_CONN_DEFAULT_TIMEOUT`, `connectTimeout: DB_CONN_CONNECT_TIMEOUT` 를 사용한다.
- `close`: 진행 중인 request 를 `cancel()` 하고 request 목록이 비워지길 기다린 뒤 연결을 닫는다.
- `beginTransaction`: tedious `beginTransaction` 에 `isolationLevel ?? config.defaultIsolationLevel ?? "READ_UNCOMMITTED"` 로 고른 격리 수준을 전달한다.
- `executeParametrized`: `params` 가 있으면 `p0`, `p1` 순서 이름으로 `addParameter` 후 `execSql`, 없으면 `execSqlBatch` 로 실행한다.
- `params` 타입 추론: string→`NVarChar`, integer number→`BigInt`, non-integer number→`Decimal`, boolean→`Bit`, `DateTime`→`DateTime2`, `DateOnly`→`Date`, `Time`→`Time`, `Uuid`→`UniqueIdentifier`, `Uint8Array`→`VarBinary` 로 매핑한다.
- `params` 제한: `null`/`undefined` 파라미터와 알 수 없는 값 타입은 `SdError` 로 거부한다.
- `bulkInsert`: tedious `BulkLoad` 를 사용하고 `ColumnMeta.dataType` 을 tedious bulk column type 으로 변환한다.
- `bulkInsert 값 변환`: `Uuid` 는 문자열, `Uint8Array` 는 `Buffer`, `DateTime`/`DateOnly` 는 내부 `date`, `Time` 은 `HH:mm:ss` 문자열로 넘긴다.

### PostgresqlDbConn

```ts
class PostgresqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  readonly config: PostgresqlDbConnConfig;
  isConnected: boolean;
  isInTransaction: boolean;
  constructor(
    _pg: typeof import("pg"),
    _pgCopyStreams: typeof import("pg-copy-streams"),
    config: PostgresqlDbConnConfig,
  );
}
```

- `_pg`: `typeof import("pg")` — `Client` 를 제공하는 PostgreSQL 드라이버 모듈이다.
- `_pgCopyStreams`: `typeof import("pg-copy-streams")` — `COPY FROM STDIN` 스트림 생성에 쓰는 모듈이다.
- `config`: `PostgresqlDbConnConfig` — host/port/user/password/database/defaultIsolationLevel 을 PostgreSQL 연결과 트랜잭션에 사용한다.
- `connect`: `new Client` 로 연결하며, `port` 가 없으면 `5432`, `connectionTimeoutMillis` 는 `DB_CONN_CONNECT_TIMEOUT`, `query_timeout` 은 `DB_CONN_DEFAULT_TIMEOUT` 을 사용한다.
- `beginTransaction`: `BEGIN` 실행 후 `SET TRANSACTION ISOLATION LEVEL ...` 을 실행하며, 격리 수준 문자열의 `_` 는 공백으로 바꾼다.
- `executeParametrized`: `client.query(query, params)` 로 실행하고 `[result.rows]` 를 반환한다.
- `bulkInsert`: `COPY ${tableName} ("col") FROM STDIN WITH (FORMAT csv, NULL '\\N')` 스트림에 CSV 문자열을 pipe 한다.
- `bulkInsert 값 변환`: `null` 은 `\\N`, boolean 은 `true`/`false`, 필요한 문자열은 CSV 큰따옴표로 감싸고 내부 `"` 를 `""` 로 바꾸며, `Uuid` 는 문자열, `Uint8Array` 는 `"\\x..."` bytea hex 형식으로 쓴다.

## bulkInsert DataType 처리

- `int`: 정수형 bulk 컬럼 또는 문자열 숫자 값으로 처리한다.
- `bigint`: 큰 정수형 bulk 컬럼 또는 문자열 숫자 값으로 처리한다.
- `float`: MSSQL은 `Real`, MySQL/PostgreSQL은 문자열 숫자 값으로 처리한다.
- `double`: MSSQL은 `Float`, MySQL/PostgreSQL은 문자열 숫자 값으로 처리한다.
- `decimal`: MSSQL은 `Decimal` 과 `precision`/`scale`, MySQL/PostgreSQL은 문자열 숫자 값으로 처리한다.
- `varchar`: MSSQL은 `NVarChar(length)`, MySQL/PostgreSQL은 문자열 escape 규칙으로 처리한다.
- `char`: MSSQL은 `NChar(length)`, MySQL/PostgreSQL은 문자열 escape 규칙으로 처리한다.
- `text`: MSSQL은 `NText`, MySQL/PostgreSQL은 문자열 escape 규칙으로 처리한다.
- `binary`: MSSQL은 `VarBinary(Infinity)`, MySQL은 hex+`UNHEX`, PostgreSQL은 bytea hex CSV 값으로 처리한다.
- `boolean`: MSSQL은 `Bit`, MySQL은 `1`/`0`, PostgreSQL은 `true`/`false` 로 처리한다.
- `datetime`: MSSQL은 `DateTime2`, MySQL/PostgreSQL은 `yyyy-MM-dd HH:mm:ss.fff` 문자열로 처리한다.
- `date`: MSSQL은 `Date`, MySQL/PostgreSQL은 `yyyy-MM-dd` 문자열로 처리한다.
- `time`: MSSQL은 `Time`, MySQL/PostgreSQL은 `HH:mm:ss` 문자열로 처리한다.
- `uuid`: MSSQL은 `UniqueIdentifier`, MySQL은 하이픈 제거 hex+`UNHEX`, PostgreSQL은 UUID 문자열로 처리한다.
- 알 수 없는 `dataType.type`: 구현체 helper 가 `SdError("지원하지 않는 DataType: ...")` 를 throw 한다.

## NodeDbContextExecutor

```ts
class NodeDbContextExecutor implements DbContextExecutor {
  constructor(config: DbConnConfig);
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(tableName: string, columnMetas: Record<string, ColumnMeta>, records: DataRecord[]): Promise<void>;
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}
```

- `constructor(config)`: `DbConnConfig` 를 저장하고 `getDialectFromConfig(config)` 결과를 query builder dialect 로 보관한다.
- `connect`: `createDbConn(config)` 로 새 `DbConn` 을 만든 뒤 `conn.connect()` 를 호출한다.
- `close`: 현재 연결의 `close()` 를 호출하고 내부 연결 참조를 `undefined` 로 바꾼다.
- `beginTransaction`: 내부 연결의 `beginTransaction(isolationLevel)` 에 위임한다.
- `commitTransaction`: 내부 연결의 `commitTransaction()` 에 위임한다.
- `rollbackTransaction`: 내부 연결의 `rollbackTransaction()` 에 위임한다.
- `executeParametrized`: 내부 연결의 `executeParametrized(query, params)` 에 위임한다.
- `bulkInsert`: 내부 연결의 `bulkInsert(tableName, columnMetas, records)` 에 위임한다.
- `executeDefs`: `createQueryBuilder(dialect).build(def)` 로 SQL 을 만들고 내부 연결 실행 결과를 `pickResultSets`/`parseQueryResult` 경로로 변환한다. 사용법: [orm.md](../../manuals/orm.md)
- `defs`: `QueryDef[]` — SQL 로 변환해 실행할 query definition 배열이다.
- `resultMetas`: `(ResultMeta | undefined)[] | undefined` — 항목이 있으면 해당 결과셋을 `parseQueryResult<T>` 로 변환하고, 없으면 raw 결과셋을 `T[]` 로 반환한다.
- 결과 불필요 경로: `resultMetas` 배열이 전달됐고 모든 항목이 `null`/`undefined` 이면 모든 SQL 을 줄바꿈으로 합쳐 한 번 실행한 뒤 `defs` 개수만큼 빈 배열을 반환한다.
- 미연결 상태: 내부 연결이 없으면 모든 위임 메서드는 `SdError(DB_CONN_ERRORS.NOT_CONNECTED)` 를 throw 한다.

## 상수

```ts
const DB_CONN_CONNECT_TIMEOUT = 10 * 1000;
const DB_CONN_DEFAULT_TIMEOUT = 10 * 60 * 1000;
const DB_CONN_ERRORS = {
  NOT_CONNECTED: "'Connection'이 연결되어 있지 않습니다.",
  ALREADY_CONNECTED: "'Connection'이 이미 연결되어 있습니다.",
} as const;
```

- `DB_CONN_CONNECT_TIMEOUT`: `10000` 밀리초 — MSSQL/PostgreSQL 연결 수립 타임아웃에 전달된다.
- `DB_CONN_DEFAULT_TIMEOUT`: `600000` 밀리초 — 쿼리 timeout 값과 연결 idle 자동 종료 타이머 계산에 사용된다.
- `DB_CONN_ERRORS.NOT_CONNECTED`: `"'Connection'이 연결되어 있지 않습니다."` — 연결 없이 실행하려는 경로에서 쓰는 오류 메시지다.
- `DB_CONN_ERRORS.ALREADY_CONNECTED`: `"'Connection'이 이미 연결되어 있습니다."` — 이미 연결된 객체에 다시 `connect()` 할 때 쓰는 오류 메시지다.
