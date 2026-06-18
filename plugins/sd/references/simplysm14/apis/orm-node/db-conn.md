# @simplysm/orm-node — 저수준 DB 연결

`createOrm` 추상화를 거치지 않고 raw SQL·파라미터 쿼리·bulk insert·수동 트랜잭션을 직접 다루거나, dialect별 접속 설정 타입을 작성하거나, `DbContext` executor 를 손수 조립할 때 함께 읽히는 묶음. 연결 인스턴스 생성·연결 인터페이스·접속 설정·executor·dialect 헬퍼·상수로 구성.

## createDbConn

```typescript
function createDbConn(config: DbConnConfig): Promise<DbConn>
```

`config.dialect` 에 맞는 드라이버를 **지연 import** 해 연결 인스턴스를 생성(mysql → `mysql2/promise`, postgresql → `pg` + `pg-copy-streams`, mssql/mssql-azure → `tedious`). 한 번 로드한 드라이버는 모듈 캐시에 보관해 재사용. 반환 객체는 아직 **미연결** 상태이므로 `connect()` 를 별도로 호출해야 함.

```typescript
const conn = await createDbConn({ dialect: "postgresql", host: "localhost", username: "u", password: "p", database: "db" });
await conn.connect();
```

## DbConn

저수준 연결 인터페이스. `EventEmitter<{ close: void }>` 를 상속하며 연결 종료 시 `close` 이벤트를 발생시킨다. 구현체 `MssqlDbConn`/`MysqlDbConn`/`PostgresqlDbConn` 은 직접 export 되지 않고 `createDbConn` 으로만 획득(타입 `DbConn` 만 import 가능).

- config: DbConnConfig — 이 연결의 접속 설정(읽기 전용). 어떤 dialect·DB 로 연결됐는지 확인용.
- isConnected: boolean — 현재 연결 여부. `connect` 성공 시 `true`, `close`/드라이버 `end` 이벤트 시 `false`. 재연결 판단·정리 분기에 사용.
- isInTransaction: boolean — 트랜잭션 진행 여부. `beginTransaction` 후 `true`, 커밋·롤백 후 `false`. 중첩 방지·상태 확인에 사용.
- connect(): Promise\<void\> — 연결 수립. 이미 연결돼 있으면 `DB_CONN_ERRORS.ALREADY_CONNECTED` throw.
- close(): Promise\<void\> — 연결 종료. 미연결 상태면 아무 동작 없이 반환(throw 안 함) — 재호출 안전.
- beginTransaction(isolationLevel?: IsolationLevel): Promise\<void\> — 트랜잭션 시작. `isolationLevel` 미지정 시 `config.defaultIsolationLevel`, 그것도 없으면 `READ_UNCOMMITTED` 로 시작. 테스트로 확인된 값: `"READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE"`. 더티 리드 차단이 필요하면 `READ_COMMITTED` 이상.
- commitTransaction(): Promise\<void\> — 진행 중 트랜잭션 커밋, `isInTransaction` 을 `false` 로.
- rollbackTransaction(): Promise\<void\> — 진행 중 트랜잭션 롤백, `isInTransaction` 을 `false` 로.
- execute(queries: string[]): Promise\<Record\<string, unknown\>[][]\> — 원시 SQL 문자열 배열을 순차 실행. 빈/공백 문자열은 건너뜀. 각 쿼리의 결과셋들을 평탄화해 하나의 배열로 묶어 반환. DDL·다건 SQL 일괄 실행에 사용.
- executeParametrized(query: string, params?: unknown[]): Promise\<Record\<string, unknown\>[][]\> — 파라미터 바인딩 쿼리 1건 실행. SQL 인젝션 회피·값 재바인딩 시. 반환은 결과셋 배열(MySQL 멀티스테이트먼트는 statement별로 분리되며 INSERT/UPDATE/DELETE 자리는 빈 배열, PostgreSQL 은 단일 결과셋). `params` 미지정 시 MSSQL 은 배치(`execSqlBatch`) 경로, 지정 시 `execSql` 파라미터 경로로 실행.
- bulkInsert(tableName: string, columnMetas: Record\<string, ColumnMeta\>, records: Record\<string, unknown\>[]): Promise\<void\> — 네이티브 bulk API 로 대량 삽입. `tableName` 은 `database.table` 또는 `database.schema.table`(dialect별 인용 부호 포함된 완전 수식명). `columnMetas` 는 컬럼명 → `ColumnMeta`(`dataType`·`nullable`) 매핑이며 **키 순서가 컬럼 순서를 결정**, `records` 의 각 객체는 이 키들로 값 추출. `records` 가 빈 배열이면 아무 동작 없이 반환. `DateTime`/`DateOnly`/`Time`/`Uuid`/`Uint8Array`/`null` 값은 dialect별로 적절히 변환됨.

dialect별 bulk insert 경로(서버 측 권한·설정에 의존):

- MSSQL — tedious `BulkLoad`. `ColumnMeta.dataType` 을 tedious 타입으로 매핑.
- MySQL — `LOAD DATA LOCAL INFILE`. 임시 CSV 파일을 생성·실행 후 삭제하며, UUID/binary 컬럼은 `UNHEX()` 로 복원.
- PostgreSQL — `COPY FROM STDIN`(CSV 스트림). binary 는 bytea hex 형식으로 인코딩.

```typescript
await conn.beginTransaction("READ_COMMITTED");
const [rows] = await conn.executeParametrized('SELECT * FROM "User" WHERE id = $1', [1]);
await conn.commitTransaction();
```

## DbConnConfig (dialect별 분기)

`MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig` 유니온. `dialect` 리터럴로 분기.

공통 필드:

- dialect — `"mysql" | "mssql" | "mssql-azure" | "postgresql"`. DBMS 선택. `"mssql-azure"` 는 Azure SQL 용으로 드라이버는 mssql 과 동일하되 연결 시 `encrypt` 가 활성화됨. 쿼리 빌더용 dialect 로는 `getDialectFromConfig` 가 `"mssql"` 로 정규화.
- host: string — 접속 호스트.
- port?: number — 포트. 미지정 시 드라이버 기본값(PostgreSQL 은 미지정 시 5432 로 보정).
- username: string — 인증 사용자.
- password: string — 인증 비밀번호.
- database?: string — 접속 기본 DB 이름.
- defaultIsolationLevel?: IsolationLevel — `beginTransaction` 의 `isolationLevel` 미지정 시 적용할 기본 격리 수준. 연결 단위로 기본 격리를 고정하고 싶을 때.

dialect별 추가 필드:

- MysqlDbConnConfig — `dialect: "mysql"`. 공통 필드만(스키마 개념 없음).
- MssqlDbConnConfig — `dialect: "mssql" | "mssql-azure"`. `schema?: string`(예 `dbo`) 추가.
- PostgresqlDbConnConfig — `dialect: "postgresql"`. `schema?: string`(예 `public`) 추가.

```typescript
const cfg: MssqlDbConnConfig = { dialect: "mssql", host: "localhost", port: 21433, username: "sa", password: "...", database: "TestDb", schema: "dbo" };
```

## getDialectFromConfig

```typescript
function getDialectFromConfig(config: DbConnConfig): Dialect
```

`config.dialect` 를 `@simplysm/orm-common` 의 `Dialect` 로 변환. `"mssql-azure"` → `"mssql"` 로 정규화하고 나머지는 그대로 반환. 쿼리 빌더의 dialect 결정에 사용 — Azure 여부와 무관하게 같은 SQL 방언을 써야 할 때.

## NodeDbContextExecutor

```typescript
new NodeDbContextExecutor(config: DbConnConfig)
```

`@simplysm/orm-common` 의 `DbContextExecutor` 를 Node 환경에서 구현한 클래스. `createOrm` 이 내부에서 자동 주입하므로 보통 직접 쓸 일은 없고, `DbContext` 를 `createOrm` 없이 수동 인스턴스화할 때만 사용. 생성자는 `DbConnConfig` 만 받고, 실제 연결은 `connect()` 시점에 `createDbConn` 으로 지연 생성한다.

- constructor(config: DbConnConfig) — `getDialectFromConfig` 로 dialect 를 결정해 보관. 이 시점엔 연결을 열지 않음.
- connect(): Promise\<void\> — `createDbConn(config)` 로 연결 생성 후 수립.
- close(): Promise\<void\> — 연결 종료 후 내부 참조 해제.
- beginTransaction(isolationLevel?: IsolationLevel) / commitTransaction() / rollbackTransaction() — 내부 `DbConn` 에 트랜잭션 제어 위임. `isolationLevel?` 의미는 위 `DbConn.beginTransaction` 과 동일.
- executeParametrized(query: string, params?: unknown[]): Promise\<Record\<string, unknown\>[][]\> — 파라미터 쿼리를 내부 `DbConn` 에 위임.
- bulkInsert(tableName: string, columnMetas: Record\<string, ColumnMeta\>, records: DataRecord[]): Promise\<void\> — bulk insert 를 내부 `DbConn` 에 위임.
- executeDefs\<T\>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise\<T[][]\> — `QueryDef` 배열을 dialect 쿼리 빌더로 SQL 변환해 실행. `resultMetas` 가 전부 `null`/미지정이면(결과 불필요) 모든 def 를 하나의 SQL 로 합쳐 단일 요청으로 보내고 def 수만큼 빈 배열 반환(쓰기 전용 최적화, 인터페이스 계약 유지). 그 외엔 def 마다 개별 실행 후, 해당 위치에 `resultMeta` 가 있으면 `parseQueryResult` 로 타입 변환해 반환, 없으면 raw 결과셋 그대로 반환.
- 모든 실행 메서드는 미연결 상태에서 호출 시 `SdError(DB_CONN_ERRORS.NOT_CONNECTED)` throw.

## 상수

- DB_CONN_CONNECT_TIMEOUT — 연결 수립 타임아웃 `10 * 1000`(10초). 드라이버의 connect 타임아웃으로 전달.
- DB_CONN_DEFAULT_TIMEOUT — 쿼리 기본 타임아웃 `10 * 60 * 1000`(10분). 마지막 활동 후 이 값의 2배가 지나면 연결을 자동 종료(idle 타임아웃)하는 데도 사용.
- DB_CONN_ERRORS — 오류 메시지 상수 객체(`as const`). `NOT_CONNECTED`(미연결 상태에서 실행 시), `ALREADY_CONNECTED`(이미 연결된 상태에서 재연결 시). `expect(...).rejects.toThrow(DB_CONN_ERRORS.NOT_CONNECTED)` 처럼 throw 비교·메시지 매칭에 사용.

## 주의사항

- `createDbConn` 반환 객체는 미연결 상태 — 반드시 `connect()` 호출 후 사용.
- bulk insert 는 dialect별 네이티브 경로가 달라(MySQL 임시파일 + `LOCAL INFILE`, PostgreSQL `COPY`, MSSQL `BulkLoad`) 서버 측 권한·설정에 의존할 수 있음.
- 대부분의 작업은 `createOrm`([README](./README.md))으로 충분. 이 계층은 raw SQL·executor 커스터마이징이 필요한 경우에만.
