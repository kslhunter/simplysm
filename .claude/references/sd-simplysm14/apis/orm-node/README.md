# @simplysm/orm-node

Node.js 환경에서 `@simplysm/orm-common` 의 `DbContext` 를 실제 DB(MSSQL/MySQL/PostgreSQL)에 붙여 실행하기 위한 어댑터. 드라이버 모듈(`tedious`/`mysql2`/`pg`/`pg-copy-streams`)은 dialect 선택 시점에 지연 import.

## 사용 트리거 인덱스

- **`createOrm` / `Orm` / `OrmOptions`** — `DbContext` 서브클래스 + `DbConnConfig` 로 ORM 인스턴스를 만들고, 트랜잭션 유/무 콜백을 실행한다. 일반 ORM 사용의 진입점.
- **`createDbConn`** — `DbConnConfig` 만으로 저수준 `DbConn` 인스턴스를 직접 만든다. `DbContext` 없이 raw SQL/bulk insert 가 필요할 때.
- **`NodeDbContextExecutor`** — `DbContext` 의 executor 직접 주입이 필요할 때. 일반적으로는 `createOrm` 이 내부적으로 사용.
- **`MysqlDbConn` / `MssqlDbConn` / `PostgresqlDbConn`** — dialect별 `DbConn` 구현. 직접 `new` 하지 말고 `createDbConn` 사용. 타입 참조용으로만 import.
- **`DbConn` / `DbConnConfig` (+ `MysqlDbConnConfig` / `MssqlDbConnConfig` / `PostgresqlDbConnConfig`)** — 설정/연결 타입. 함수 시그니처·DI 토큰 등에서 참조.
- **`getDialectFromConfig`** — `DbConnConfig` → `Dialect` 변환(`mssql-azure` → `mssql`). 쿼리 빌더 선택 시.
- **`DB_CONN_CONNECT_TIMEOUT` (10s) / `DB_CONN_DEFAULT_TIMEOUT` (10m) / `DB_CONN_ERRORS`** — 타임아웃·에러 메시지 상수.

## createOrm

```ts
function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions, // { database?: string; schema?: string } — config 보다 우선
): Orm<T>;

interface Orm<T> {
  connect<R>(cb: (db: T) => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>; // 트랜잭션
  connectWithoutTransaction<R>(cb: (db: T) => Promise<R>): Promise<R>;                 // 트랜잭션 없음
}
```

`database` 가 `options` 와 `config` 양쪽 모두 없으면 throw. 매 `connect*` 호출마다 새 `DbContext` 인스턴스를 만들어 콜백 종료 시 연결을 닫는다.

```ts
const orm = createOrm(MyDb, { dialect: "mysql", host, port, username, password, database });
await orm.connect(async (db) => db.user().execute());
```

## createDbConn

```ts
function createDbConn(config: DbConnConfig): Promise<DbConn>;
```

dialect 에 따라 드라이버 모듈을 lazy import 한 뒤 해당 `DbConn` 구현 반환. **반환된 객체는 미연결 상태** — 호출자가 `conn.connect()` → 사용 → `conn.close()` 까지 책임. `DbConn` 은 `EventEmitter<{ close: void }>` 이며 다음 메서드 제공: `connect`, `close`, `beginTransaction(isolationLevel?)`, `commitTransaction`, `rollbackTransaction`, `execute(queries: string[])`, `executeParametrized(query, params?)`, `bulkInsert(tableName, columnMetas, records)`. `bulkInsert` 는 dialect별 네이티브 경로 사용(MSSQL: tedious BulkLoad / MySQL: `LOAD DATA LOCAL INFILE` 임시파일 / PostgreSQL: `COPY FROM STDIN`).

## DbConnConfig

dialect 분기 union. 공통 필드: `host`, `port?`, `username`, `password`, `database?`, `defaultIsolationLevel?`.

- `MysqlDbConnConfig` — `dialect: "mysql"`.
- `MssqlDbConnConfig` — `dialect: "mssql" | "mssql-azure"`, `schema?`. `mssql-azure` 는 `encrypt: true` 로 연결.
- `PostgresqlDbConnConfig` — `dialect: "postgresql"`, `schema?`.

## NodeDbContextExecutor

```ts
new NodeDbContextExecutor(config: DbConnConfig)
```

`DbContextExecutor` 구현. `connect` 시 내부에서 `createDbConn` + `conn.connect()` 수행. `executeDefs(defs, resultMetas?)` 는 `@simplysm/orm-common` 의 `createQueryBuilder` + `parseQueryResult` 를 사용해 `QueryDef[]` → SQL → 파싱 결과. `resultMetas` 가 전부 `null` 인 경우 단일 결합 SQL 1회로 묶어 실행. 미연결 상태에서 메서드 호출 시 `DB_CONN_ERRORS.NOT_CONNECTED` SdError throw.
