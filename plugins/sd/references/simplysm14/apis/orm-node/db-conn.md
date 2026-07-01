# @simplysm/orm-node — 저수준 DB 연결

`createOrm` 추상화를 거치지 않고 DB 연결·raw SQL·파라미터 쿼리·bulk insert·DbContextExecutor를 직접 다룰 때 읽는 묶음. ORM 쿼리 작성·조회 흐름은 [orm.md](../../manuals/orm.md).

## createDbConn

```ts
function createDbConn(config: DbConnConfig): Promise<DbConn>;
```

config.dialect에 따라 dialect별 구현체 인스턴스를 생성하는 연결 팩토리.

- `config`: `DbConnConfig` — dialect 선택과 연결 세부사항 지정. 생성된 구현체에 그대로 전달됨.
  - `config.dialect: "mysql"` → mysql2/promise를 지연 import하고 `new MysqlDbConn(mysql, config)` 반환.
  - `config.dialect: "postgresql"` → pg와 pg-copy-streams를 지연 import하고 `new PostgresqlDbConn(pg, pgCopyStreams, config)` 반환.
  - `config.dialect: "mssql" | "mssql-azure"` → tedious를 지연 import하고 `new MssqlDbConn(tedious, config)` 반환.
- 반환값: `Promise<DbConn>` — 아직 연결되지 않은 연결 객체. 실제 TCP 연결은 반환된 객체의 `connect()` 호출 시 수립.
- 모듈 캐싱: 한 번 import된 드라이버 모듈(mysql2·pg·pg-copy-streams·tedious)은 함수 내부 모듈 캐시에 저장되어 다음 호출에서 재사용.

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

각 DBMS 구현체(MysqlDbConn·MssqlDbConn·PostgresqlDbConn)가 구현하는 저수준 연결 인터페이스. EventEmitter<{ close: void }>를 상속하며 연결 종료 시 close 이벤트 발생.

- `config`: `DbConnConfig` — 이 연결이 받은 dialect별 접속 설정.
- `isConnected`: `boolean` — 연결 수립 후 true, 종료 후 false로 변경되는 연결 상태.
- `isInTransaction`: `boolean` — beginTransaction 호출 후 true, commitTransaction/rollbackTransaction 후 false로 변경되는 트랜잭션 상태.
- `connect`: `() => Promise<void>` — DB 연결 수립. 이미 연결된 상태에서 호출하면 `DB_CONN_ERRORS.ALREADY_CONNECTED` 오류 throw.
- `close`: `() => Promise<void>` — DB 연결 종료. 미연결 상태면 처리 생략 (오류 없음).
- `beginTransaction`: `(isolationLevel?) => Promise<void>` — 트랜잭션 시작. 격리 수준 인자가 없으면 config.defaultIsolationLevel 사용, 그것도 없으면 dialect별 드라이버 기본값.
  - `isolationLevel`: `IsolationLevel | undefined` — "READ_UNCOMMITTED"|"READ_COMMITTED"|"REPEATABLE_READ"|"SERIALIZABLE" 중 하나. 드라이버 트랜잭션 설정에 전달.
- `commitTransaction`: `() => Promise<void>` — 트랜잭션 커밋하고 isInTransaction을 false로 변경.
- `rollbackTransaction`: `() => Promise<void>` — 트랜잭션 롤백하고 isInTransaction을 false로 변경.
- `execute`: `(queries) => Promise<Record<string, unknown>[][]>` — SQL 문자열 배열을 순차 실행하고 각 쿼리의 결과 배열을 연결해 반환.
  - `queries`: `string[]` — 순차 실행할 SQL 문자열 배열. 빈 문자열이나 공백만 있는 항목은 실행 대상에서 제외.
- `executeParametrized`: `(query, params?) => Promise<Record<string, unknown>[][]>` — SQL 1건을 파라미터 바인딩으로 실행.
  - `query`: `string` — 실행할 SQL 문자열. 오류 시 메시지에 포함될 수 있음.
  - `params`: `unknown[] | undefined` — 파라미터 값 배열. dialect 드라이버의 파라미터 바인딩으로 전달.
- `bulkInsert`: `(tableName, columnMetas, records) => Promise<void>` — dialect별 native bulk 경로로 여러 레코드를 한 번에 삽입.
  - `tableName`: `string` — bulk insert 대상 테이블명. `database.table` 또는 `database.schema.table` 형식. 구현체가 SQL/드라이버 bulk API에 그대로 전달.
  - `columnMetas`: `Record<string, ColumnMeta>` — 컬럼명→ColumnMeta 매핑. 키 순서가 레코드 값 추출 순서 결정.
  - `records`: `Record<string, unknown>[]` — 삽입할 레코드 배열. 길이 0이면 삽입 경로 스킵하고 즉시 반환.

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

dialect별 데이터베이스 연결 설정. createDbConn·NodeDbContextExecutor·createOrm의 연결 설정 인자로 사용.

- `DbConnConfig`: dialect별 config 유니온 타입.
- `MysqlDbConnConfig.dialect: "mysql"` — MySQL 연결 구현체 선택.
- `MssqlDbConnConfig.dialect: "mssql" | "mssql-azure"` — MSSQL 연결 구현체 선택. "mssql-azure"는 연결의 encrypt 옵션을 true로 설정 (Azure SQL 요구사항), "mssql"은 false.
- `PostgresqlDbConnConfig.dialect: "postgresql"` — PostgreSQL 연결 구현체 선택.
- `host`: `string` — 데이터베이스 서버 호스트명 또는 IP. 드라이버의 host/server 옵션으로 전달.
- `port`: `number | undefined` — 서버 포트. 미지정 시: PostgreSQL은 5432, MySQL/MSSQL은 드라이버 기본값(MySQL 3306, MSSQL 1433).
- `username`: `string` — 인증 사용자명. MSSQL은 `authentication.options.userName`으로 전달.
- `password`: `string` — 인증 비밀번호.
- `database`: `string | undefined` — 연결 후 기본 데이터베이스. createOrm에서 OrmOptions.database가 없을 때 DbContext 생성 옵션으로도 사용. 둘 다 없거나 빈 문자열이면 오류.
- `schema`: `string | undefined` — MSSQL/PostgreSQL 스키마명. createOrm에서 OrmOptions.schema가 없을 때 DbContext 생성 옵션으로 사용 (연결 자체에는 전달 안 됨).
- `defaultIsolationLevel`: `IsolationLevel | undefined` — beginTransaction 인자가 없을 때 사용할 기본 트랜잭션 격리 수준.

## getDialectFromConfig

```ts
function getDialectFromConfig(config: DbConnConfig): Dialect;
```

config.dialect를 표준 Dialect 타입으로 정규화하는 헬퍼.

- `config`: `DbConnConfig` — 정규화할 연결 설정.
- 반환값: `Dialect` — "mysql"|"postgresql"|"mssql" 중 하나. config.dialect === "mssql-azure"이면 "mssql"으로 반환, 그 외는 원본 값 반환.
- 사용처: NodeDbContextExecutor 생성자에서 query builder의 dialect 결정 시 사용.

## 구현체: MysqlDbConn

```ts
class MysqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  readonly config: MysqlDbConnConfig;
  isConnected: boolean;
  isInTransaction: boolean;
  constructor(_mysql2: typeof import("mysql2/promise"), config: MysqlDbConnConfig);
}
```

mysql2/promise 기반 MySQL 연결 구현체.

- `_mysql2`: `typeof import("mysql2/promise")` — 드라이버 모듈. createConnection·query·transaction API 제공.
- `connect`: createConnection에 `multipleStatements: true`(멀티 statement 활성), `charset: "utf8mb4_bin"`(바이너리 정렬), `infileStreamFactory`(LOAD DATA LOCAL INFILE 지원)를 포함해 연결. 성공 시 isConnected = true.
- `beginTransaction`: `SET SESSION TRANSACTION ISOLATION LEVEL <level>` 실행 후 드라이버 beginTransaction() 호출. level 문자열의 `_`를 공백으로 치환.
- `executeParametrized`: conn.query({ sql, timeout, values: params })로 실행. 반환: 단일 DML → [[]], 멀티 statement → statement별 결과배열(DML은 []), 단일 SELECT → [rows].
- `bulkInsert`: 임시 TSV 파일 생성 → LOAD DATA LOCAL INFILE 실행 → finally에서 임시 파일 삭제 시도 (삭제 실패 무시). UUID/binary 컬럼은 @_컬럼명 임시변수로 읽은 뒤 SET 컬럼=UNHEX(@_컬럼명)으로 복원.

## 구현체: MssqlDbConn

```ts
class MssqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  readonly config: MssqlDbConnConfig;
  isConnected: boolean;
  isInTransaction: boolean;
  constructor(_tedious: typeof import("tedious"), config: MssqlDbConnConfig);
}
```

tedious 기반 MSSQL/Azure SQL 연결 구현체.

- `_tedious`: `typeof import("tedious")` — 드라이버 모듈. Connection·Request·BulkLoad·TYPES·ISOLATION_LEVEL 제공.
- `connect`: tedious Connection 생성. config.dialect === "mssql-azure"면 encrypt: true, 그 외 false. 함께 rowCollectionOnDone: true, useUTC: false, trustServerCertificate: true, requestTimeout/connectTimeout 설정.
- `close`: 진행 중인 request 모두 cancel 후 요청 목록 비워질 때까지(최대 30초) 대기. 연결 종료 시 close 이벤트 발생.
- `beginTransaction`: tedious beginTransaction에 ISOLATION_LEVEL[isolationLevel ?? config.defaultIsolationLevel ?? "READ_UNCOMMITTED"]으로 격리 수준 전달.
- `executeParametrized`: params 유무에 따라 p0·p1·... 이름으로 addParameter 후 execSql 또는 execSqlBatch 실행. 값→tedious 타입: string→NVarChar, 정수 number→BigInt, 실수 number→Decimal, boolean→Bit, DateTime→DateTime2, DateOnly→Date, Time→Time, Uuid→UniqueIdentifier, Uint8Array→VarBinary. null/undefined/미지원 타입 → SdError.
- `bulkInsert`: tedious BulkLoad 사용. ColumnMeta.dataType을 tedious bulk column type으로 변환. 값 변환: Uuid→문자열, Uint8Array→Buffer, DateTime/DateOnly→내부 Date, Time→"HH:mm:ss".

## 구현체: PostgresqlDbConn

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

pg 기반 PostgreSQL 연결 구현체.

- `_pg`: `typeof import("pg")` — 드라이버 모듈. Client 제공.
- `_pgCopyStreams`: `typeof import("pg-copy-streams")` — COPY FROM STDIN 스트림 생성 모듈 (bulkInsert에 사용).
- `connect`: new Client로 연결. port 미지정 시 5432, connectionTimeoutMillis/query_timeout 설정.
- `beginTransaction`: BEGIN 실행 후 SET TRANSACTION ISOLATION LEVEL <level> 실행. level 문자열의 `_`를 공백으로 치환.
- `executeParametrized`: client.query(query, params)로 실행. 단일 결과셋이므로 [result.rows] 반환.
- `bulkInsert`: COPY 테이블명 (col...) FROM STDIN WITH (FORMAT csv, NULL '\N') 스트림에 CSV 문자열 pipe.

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
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: DataRecord[],
  ): Promise<void>;
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}
```

DbContext가 실제 DB 작업을 위임하는 Node.js 실행자. createOrm이 내부에서 생성해 DbClass에 주입하나, 직접 조립할 때도 사용 가능.

- `constructor(config)`: DbConnConfig 저장. getDialectFromConfig(config)로 query builder dialect 결정.
- `connect`: createDbConn(config)로 새 DbConn 생성 후 conn.connect() 호출.
- `close`: 현재 연결의 close() 호출하고 내부 연결 참조를 undefined로 변경.
- `beginTransaction` / `commitTransaction` / `rollbackTransaction` / `executeParametrized` / `bulkInsert`: 현재 연결의 동명 메서드에 위임.
- `executeDefs<T>`: QueryDef 배열을 SQL로 변환·실행하고 ResultMeta로 타입 변환. resultMetas[i]가 있으면 parseQueryResult<T>로 변환, 없으면 raw 결과셋을 T[]로 반환. 최적화: 모든 resultMetas가 null/undefined면 모든 SQL을 줄바꿈으로 합쳐 한 번에 실행한 뒤 빈 배열들 반환.
  - `defs`: `QueryDef[]` — SQL로 변환해 실행할 query definition 배열.
  - `resultMetas`: `(ResultMeta | undefined)[] | undefined` — 각 항목의 타입 변환 메타. 항목이 없으면 raw 결과셋 그대로 반환.
- 미연결 상태: 내부 연결이 없으면 모든 메서드는 `SdError(DB_CONN_ERRORS.NOT_CONNECTED)` throw.

## 상수

```ts
const DB_CONN_CONNECT_TIMEOUT = 10 * 1000; // 10000ms
const DB_CONN_DEFAULT_TIMEOUT = 10 * 60 * 1000; // 600000ms (10분)
const DB_CONN_ERRORS = {
  NOT_CONNECTED: "'Connection'이 연결되어 있지 않습니다.",
  ALREADY_CONNECTED: "'Connection'이 이미 연결되어 있습니다.",
} as const;
```

연결 타임아웃과 오류 메시지 상수.

- `DB_CONN_CONNECT_TIMEOUT`: `10000`ms — MSSQL/PostgreSQL 연결 수립 타임아웃으로 사용. connectTimeout/connectionTimeoutMillis 옵션 전달값.
- `DB_CONN_DEFAULT_TIMEOUT`: `600000`ms (10분) — 쿼리 timeout 기본값과 idle 자동 종료 타이머(× 2) 계산에 사용.
- `DB_CONN_ERRORS.NOT_CONNECTED`: `"'Connection'이 연결되어 있지 않습니다."` — 미연결 상태에서 실행 시도 시 throw되는 오류 메시지.
- `DB_CONN_ERRORS.ALREADY_CONNECTED`: `"'Connection'이 이미 연결되어 있습니다."` — 이미 연결된 객체에 다시 connect() 호출 시 throw되는 오류 메시지.
