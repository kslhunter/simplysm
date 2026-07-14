# @simplysm/sd-orm-node

Node 런타임에서 `@simplysm/sd-orm-common` 의 `DbContext` 를 실제 DB(MSSQL/MySQL/SQLite)에 연결·실행하는 어댑터. 드라이버(`tedious`/`mysql2`/`sqlite3`)는 peerDependency 로 동적 import 되며 옵셔널임.

## 사용 트리거 인덱스

- **SdOrm** — `DbContext` 서브클래스를 실제 DB에 연결해 트랜잭션 안/밖에서 콜백을 실행할 때. 일반적인 진입점.
- **DbConnFactory** — `TDbConnConf` 로부터 저수준 커넥션(`IDbConn`)을 직접 만들 때(풀링/SQLite 분기 포함). SdOrm 을 안 쓰고 raw 쿼리를 돌릴 때만.
- **NodeDbContextExecutor** — `DbContext` 에 주입하는 실행기. 보통 SdOrm 이 내부에서 생성하므로 직접 다룰 일은 드묾.
- **PooledDbConn / MssqlDbConn / MysqlDbConn / SqliteDbConn** — `DbConnFactory.createAsync` 가 반환하는 `IDbConn` 구현체. 타입 참조·instanceof 분기 외엔 직접 생성할 일 거의 없음.
- **설정 타입(TDbConnConf 등)** — 연결 설정 객체를 만들 때 참조. `@simplysm/sd-orm-common` 에서 재export 되지 않고 그쪽에 정의됨(아래 표기).

## SdOrm

`DbContext` 를 DB에 연결하는 표준 진입점.

```ts
new SdOrm<T extends DbContext>(
  dbContextType: Type<T>,            // 연결할 DbContext 서브클래스 (생성자 자체)
  config: TDbConnConf,               // 연결 설정 (dialect 별 분기, 아래 설정 타입 참조)
  dbContextOpt?: Partial<TDbContextOption>,  // dialect/database/schema 오버라이드. 미지정 시 config 값 사용
)

connectAsync<R>(callback: (conn: T) => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R>
connectWithoutTransactionAsync<R>(callback: (conn: T) => Promise<R>): Promise<R>
```

- `connectAsync` — 연결 후 트랜잭션을 열고 `callback` 실행, 콜백 반환값을 그대로 돌려줌. `isolationLevel` 미지정 시 dialect 기본값(MSSQL `READ_COMMITTED`, MySQL `REPEATABLE_READ`) 적용. 트랜잭션이 필요한 쓰기 작업에 사용.
- `connectWithoutTransactionAsync` — 트랜잭션 없이 연결만 하고 `callback` 실행. DDL이나 읽기 전용/대량작업 등 트랜잭션이 부적합할 때 사용.
- 두 메서드 모두 매 호출마다 `new dbContextType(new NodeDbContextExecutor(config), opt)` 로 새 컨텍스트를 만들고 내부적으로 `DbContext.connectAsync`/`connectWithoutTransactionAsync` 에 위임함. opt 의 `dialect`/`database`/`schema` 는 `dbContextOpt` → `config` 순으로 채워짐(SQLite는 database/schema 없음).

## DbConnFactory

설정으로 저수준 `IDbConn` 을 만드는 정적 팩토리. 드라이버 모듈을 lazy `import` 하고 비-SQLite는 설정별 풀을 캐싱함.

```ts
DbConnFactory.createAsync(config: TDbConnConf): Promise<IDbConn>
```

- `config.dialect === "sqlite"` 이면 풀링을 건너뛰고 매번 새 `SqliteDbConn` 반환(파일 락 회피 목적).
- 그 외 dialect는 `JSON.stringify(config)` 를 키로 `generic-pool` 풀을 만들어 `PooledDbConn` 으로 감싸 반환. 풀 설정은 고정값: `min: 1, max: 10, acquireTimeoutMillis: 30000, idleTimeoutMillis: 30000, testOnBorrow: true`(빌려줄 때 `isConnected` 로 validate, 끊긴 커넥션은 폐기 후 재생성).
- raw 드라이버 매핑: `mysql` → `mysql2/promise` + `MysqlDbConn`, `sqlite` → `sqlite3` + `SqliteDbConn`, 그 외(`mssql`/`mssql-azure`) → `tedious` + `MssqlDbConn`. 동적 import 한 모듈은 정적 `_modules` 캐시에 보관.
- 반환된 `IDbConn` 은 이미 풀에서 connect 까지 끝난 게 아니라, 호출측이 `connectAsync()` 를 호출해야 실제 커넥션을 획득함(`SqliteDbConn` 도 동일).

## NodeDbContextExecutor

`IDbContextExecutor` 구현. `DbContext` 생성자에 주입해 쿼리를 실제 커넥션으로 흘려보냄. 대부분 `SdOrm` 이 내부에서 생성함.

```ts
new NodeDbContextExecutor(config: TDbConnConf)
```

- `getInfoAsync()` — `{ dialect, database?, schema? }` 반환. SQLite면 database/schema 생략, 그 외엔 config 값 포함.
- `connectAsync()` — `DbConnFactory.createAsync(config)` 로 `IDbConn` 을 얻고 `conn.connectAsync()` 까지 수행. 이후 아래 메서드들은 연결 안 됐으면 `"DB에 연결되어있지 않습니다."` throw.
- `beginTransactionAsync(isolationLevel?)` / `commitTransactionAsync()` / `rollbackTransactionAsync()` — 보유 커넥션에 위임.
- `closeAsync()` — 커넥션에 위임(`PooledDbConn` 이면 풀에 반환, raw면 실제 종료).
- `executeParametrizedAsync(query, params?)` — 파라미터 바인딩 쿼리 실행, `any[][]` 반환.
- `bulkInsertAsync(tableName, columnDefs, records)` / `bulkUpsertAsync(...)` — 대량 입력/업서트를 커넥션에 위임. `columnDefs: IQueryColumnDef[]`, `records: Record<string, any>[]`.
- `executeDefsAsync(defs: TQueryDef[], options?)` — `QueryBuilder(dialect).query(def)` 로 SQL 생성 후 실행. `options` 가 전부 `null` 이면 모든 def를 개행으로 합쳐 단일 요청으로 보냄(결과 파싱 불필요한 경우 최적화). 아니면 def별로 실행 후 `SdOrmUtils.parseQueryResultAsync(item, options[i])` 로 파싱.

## IDbConn 구현체 (반환 타입)

`DbConnFactory.createAsync` 가 돌려주는 커넥션들. 모두 `EventEmitter` 를 상속하며 `"close"` 이벤트를 발생시키고 `IDbConn` 인터페이스(`config`, `isConnected`, `isOnTransaction`, `connectAsync`, `closeAsync`, `begin/commit/rollbackTransactionAsync`, `executeAsync`, `executeParametrizedAsync`, `bulkInsertAsync`, `bulkUpsertAsync`)를 구현함.

### PooledDbConn

```ts
new PooledDbConn(pool: Pool<IDbConn>, initialConfig: TDbConnConf)
```

- 비-SQLite dialect에서 `DbConnFactory` 가 반환하는 풀 래퍼. `connectAsync()` 가 풀에서 raw 커넥션을 `acquire` 하고, `closeAsync()` 는 끊지 않고 풀에 `release` 한 뒤 자체 `"close"` 이벤트 발생.
- raw 커넥션이 타임아웃 등으로 끊기면 raw의 `"close"` 를 받아 참조 해제 후 자신도 `"close"` 재발생.
- `connectAsync()` 를 두 번 호출하면 `"이미 'Connection'이 연결되어있습니다."` throw. 트랜잭션/실행 메서드는 미연결 시 `"'Connection'이 연결되어있지 않습니다. (Pool Connection is not acquired)"` throw.
- `config` / `isConnected` / `isOnTransaction` 은 raw 커넥션 값에 위임(없으면 각각 initialConfig / false / false).

### MssqlDbConn

```ts
new MssqlDbConn(tedious: typeof import("tedious"), config: IDefaultDbConnConf)
```

- `tedious` 기반 MSSQL 커넥션. `config.dialect === "mssql-azure"` 일 때만 `encrypt: true`. `trustServerCertificate: true`, `useUTC: false` 고정. requestTimeout 10분, connectTimeout 50분. 마지막 활동 후 20분 idle 타임아웃이면 자동 `closeAsync`.
- `beginTransactionAsync` 의 격리수준은 `isolationLevel ?? config.defaultIsolationLevel ?? "READ_COMMITTED"`.
- `executeParametrizedAsync` 는 params를 `@p0, @p1...` 순서로 바인딩(타입은 값으로 추론: string→NVarChar, 정수→BigInt, 소수→Decimal, boolean→Bit, DateTime→DateTime2, DateOnly→Date, Time→Time, Uuid→UniqueIdentifier, Buffer→VarBinary). params 없으면 `execSqlBatch`.
- `bulkInsertAsync` — `newBulkLoad` 사용. `bulkUpsertAsync` — **미지원**, 호출 시 `"'bulk upsert'는 'MSSQL'에서 지원되지 않는 기능입니다."` throw.

### MysqlDbConn

```ts
new MysqlDbConn(mysql2: typeof import("mysql2/promise"), config: IDefaultDbConnConf)
```

- `mysql2/promise` 기반. `multipleStatements: true`, `charset: "utf8mb4"`. `username === "root"` 이면 database 생략. timeout 5분, idle 10분 시 자동 종료.
- `beginTransactionAsync` 는 `beginTransaction()` 후 `SET SESSION TRANSACTION ISOLATION LEVEL <level>` 실행. level = `isolationLevel ?? config.defaultIsolationLevel ?? "REPEATABLE_READ"`(언더스코어를 공백으로 치환).
- `bulkInsertAsync` — `INSERT INTO ... VALUES (...)` 일괄 생성. `bulkUpsertAsync` — 동일 INSERT + `ON DUPLICATE KEY UPDATE`(autoIncrement 컬럼 제외하고 `col = VALUES(col)`).

### SqliteDbConn

```ts
new SqliteDbConn(sqlite3: typeof import("sqlite3"), config: ISqliteDbConnConf)
```

- `sqlite3` 기반, `config.filePath` 파일 열기. 풀링 안 함. idle 타임아웃 약 10분(timeout 300000 × 2).
- 트랜잭션은 `BEGIN;` / `COMMIT;` / `ROLLBACK;` 직접 실행. `beginTransactionAsync` 의 `isolationLevel` 인자는 무시됨(SQLite 무관).
- `executeParametrizedAsync` 는 `conn.all(query, params ?? [], ...)`. `bulkUpsertAsync` 는 MySQL 문법(`ON DUPLICATE KEY UPDATE`)을 그대로 생성하므로 표준 SQLite에서는 동작 보장 안 됨(코드상 `QueryHelper("mysql")` 사용).

## 설정 타입 (config 작성 시 참조)

`TDbConnConf` 등은 본 패키지가 아니라 `@simplysm/sd-orm-common` 에 정의돼 있으나 `config` 인자로 항상 필요하므로 여기 정리함.

`TDbConnConf = IDefaultDbConnConf | ISqliteDbConnConf` (dialect 로 판별).

**IDefaultDbConnConf** (MySQL/MSSQL):

- `dialect: "mysql" | "mssql" | "mssql-azure"` — 드라이버·암호화 분기. `mssql-azure` 만 TLS encrypt 켬.
- `host: string` — 서버 주소.
- `port?: number` — 포트. 미지정 시 드라이버 기본.
- `username: string` / `password: string` — 인증 정보. MySQL은 `root` 면 database 무시.
- `database?: string` — 기본 DB명.
- `schema?: string` — 기본 스키마(MSSQL 등).
- `defaultIsolationLevel?: ISOLATION_LEVEL` — beginTransaction 시 격리수준 미지정이면 사용할 기본값.

**ISqliteDbConnConf** (SQLite):

- `dialect: "sqlite"` — 판별 리터럴.
- `filePath: string` — DB 파일 경로.

**ISOLATION_LEVEL** = `"READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE"` — 트랜잭션 격리수준. 높을수록 일관성↑·동시성↓.

**TDbContextOption = IDefaultDbContextOption | ISqliteDbContextOption** — SdOrm 의 `dbContextOpt` 로 넘기는 컨텍스트 옵션. 기본형은 `{ dialect, database?, schema? }`, SQLite형은 `{ dialect: "sqlite" }`.

**IQueryColumnDef** (bulk 메서드의 `columnDefs` 항목):

- `name: string` — 컬럼명.
- `dataType: Type<TQueryValue> | TSdOrmDataType | string` — 컬럼 타입. JS 생성자(String/Number/...), `{ type: "STRING"|"TEXT"|"DECIMAL"|"FIXSTRING"|"BINARY", ... }` 객체, 또는 `"NVARCHAR(255)"` 같은 문자열.
- `autoIncrement?: boolean` — true면 upsert 의 UPDATE 절에서 제외.
- `nullable?: boolean` — NULL 허용 여부(MSSQL bulk 기본 false).
