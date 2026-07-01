# @simplysm/orm-node

Node.js 환경에서 `DbContext` 실행자와 실제 DB 연결을 만들고, `DbContext` 서브클래스에 연결·트랜잭션 실행 진입점을 붙이는 패키지. MySQL/MSSQL(Azure 포함)/PostgreSQL 을 지원한다.

## 사용 트리거 인덱스

- **createOrm / Orm / OrmOptions** — `DbContext` 서브클래스로 ORM 진입 객체를 만들고 `connect`(트랜잭션) 또는 `connectWithoutTransaction`(트랜잭션 없음) 경로로 콜백을 실행할 때. 아래 인라인. ORM 쿼리 작성·조회 흐름: [orm.md](../../manuals/orm.md)
- **createDbConn / DbConn / DbConnConfig 계열 / DB 연결 구현체(MysqlDbConn·MssqlDbConn·PostgresqlDbConn) / NodeDbContextExecutor / getDialectFromConfig / 상수** — `createOrm` 추상화 밖에서 저수준 연결·raw SQL·파라미터 쿼리·bulk insert·executor 직접 조립을 다룰 때. 자세히: [db-conn.md](./db-conn.md)

## ORM 진입

`createOrm` 는 `DbContext` 서브클래스 생성자와 연결 설정을 받아, 호출 시점마다 새 컨텍스트 인스턴스를 만들어 콜백을 실행하는 가벼운 진입 객체(`Orm<T>`)를 만든다. 인스턴스를 보관하지 않고 메서드 호출마다 새로 생성한다.

### createOrm

```ts
function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>;
```

- `DbClass`: `new (executor, opt) => T` — ORM 으로 운용할 `DbContext` 서브클래스 생성자. 내부에서 `new DbClass(new NodeDbContextExecutor(config), { database, schema })` 로 인스턴스를 만든다.
- `executor`(생성자 1번째 인자): `DbContextExecutor` — `createOrm` 가 항상 `NodeDbContextExecutor(config)` 를 만들어 넣는다. 소비자가 직접 전달하지 않는다.
- `opt.database`(생성자 2번째 인자 필드): `string` — `options.database` 를 우선 사용하고 없으면 `config.database` 를 쓴다. 둘 다 없거나 빈 문자열이면 `Error("database는 필수입니다")` 를 던진다.
- `opt.schema`(생성자 2번째 인자 필드): `string | undefined` — `options.schema` 를 우선 사용하고 없으면 `config.schema`, 둘 다 없으면 `undefined` 로 전달한다.
- `config`: `DbConnConfig` — dialect별 연결 설정. `NodeDbContextExecutor` 생성에 그대로 쓰인다. (필드 풀이는 [db-conn.md](./db-conn.md))
- `options`: `OrmOptions | undefined` — database/schema 를 `config` 값보다 우선시킬 때 전달한다.
- 반환값: `Orm<T>` — 입력 `DbClass`·`config`·`options` 를 읽기 전용으로 보관하고 `connect`/`connectWithoutTransaction` 을 제공한다.

### Orm

```ts
interface Orm<T extends DbContext> {
  readonly DbClass: new (
    executor: DbContextExecutor,
    opt: { database: string; schema?: string },
  ) => T;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;
  connect<R>(callback: (conn: T) => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  connectWithoutTransaction<R>(callback: (conn: T) => Promise<R>): Promise<R>;
}
```

- `DbClass`: `createOrm` 에 넘긴 `DbContext` 생성자 — 메서드 호출마다 새 인스턴스를 만드는 데 쓴다.
- `config`: `DbConnConfig` — `createOrm` 에 넘긴 연결 설정을 읽기 전용으로 보관한다.
- `options`: `OrmOptions | undefined` — `createOrm` 에 넘긴 생성 옵션을 읽기 전용으로 보관한다.
- `connect`: `(callback, isolationLevel?) => Promise<R>` — 새 `DbContext` 인스턴스를 만든 뒤 `db.connect(async () => callback(db), isolationLevel)` 에 위임한다. 즉 콜백 전체가 한 트랜잭션 안에서 실행된다.
- `callback`(connect/connectWithoutTransaction 공통): `(conn: T) => Promise<R>` — 연결된 컨텍스트 인스턴스를 받아 작업하고 결과 `R` 을 돌려준다. 그 `R` 이 `connect`/`connectWithoutTransaction` 의 반환값이 된다.
- `isolationLevel`: `IsolationLevel | undefined` — `DbContext.connect` 의 2번째 인자로 그대로 전달되는 트랜잭션 격리 수준. orm-node 자체는 기본값을 채우지 않는다(기본 격리 수준 적용은 연결 구현체 층 — [db-conn.md](./db-conn.md)).
- `connectWithoutTransaction`: `(callback) => Promise<R>` — 새 `DbContext` 인스턴스를 만든 뒤 `db.connectWithoutTransaction(async () => callback(db))` 에 위임한다. 트랜잭션을 열지 않고 콜백을 실행한다.

### OrmOptions

```ts
interface OrmOptions {
  database?: string;
  schema?: string;
}
```

- `database`: `string | undefined` — `DbContext` 생성 옵션의 database 값이며 `config.database` 보다 우선한다. 한 연결 설정으로 여러 DB 를 가리킬 때 쓴다.
- `schema`: `string | undefined` — `DbContext` 생성 옵션의 schema 값이며 `config.schema` 보다 우선한다.
