# @simplysm/orm-node

Node.js 환경에서 ORM 실행과 저수준 DB 연결을 다루는 패키지. 세 가지 계층을 제공함: (1) ORM 진입점 `createOrm`/`Orm` — `DbContext` 서브클래스를 래핑해 트랜잭션 맥락에서 콜백 실행, (2) 저수준 연결 팩토리와 인터페이스 — dialect별 구현체와 raw SQL·파라미터 쿼리·bulk insert, (3) DbContext 실행자 — ORM 쿼리를 SQL로 변환·실행.

## 사용 트리거 인덱스

- **createOrm / Orm / OrmOptions** — `DbContext` 서브클래스로 ORM 진입 객체를 만들고, `connect`(트랜잭션 포함) 또는 `connectWithoutTransaction`(트랜잭션 없음)으로 콜백 실행할 때. 사용법: [orm.md](../../manuals/orm.md)
- **createDbConn / DbConn / DbConnConfig 계열 / dialect별 구현체(MysqlDbConn·MssqlDbConn·PostgresqlDbConn) / NodeDbContextExecutor / 상수** — `createOrm` 추상화 밖에서 저수준 연결·raw SQL·파라미터 쿼리·bulk insert를 다룰 때. 자세히: [db-conn.md](./db-conn.md)

## ORM 진입점

### createOrm

```ts
function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>;
```

메서드 호출마다 새 DbContext 인스턴스를 만들어 콜백을 실행하는 ORM 진입 객체를 생성함.

- `DbClass`: `new (executor, opt) => T` — ORM이 운용할 DbContext 서브클래스 생성자. createOrm은 콜백 실행 시 `new DbClass(new NodeDbContextExecutor(config), { database, schema })`로 인스턴스를 생성함.
- `config`: `DbConnConfig` — dialect별 데이터베이스 연결 설정. NodeDbContextExecutor 생성에 그대로 전달됨.
- `options`: `OrmOptions | undefined` — database/schema 값을 config보다 우선시할 때 지정. 미지정 시 config의 값을 사용함.
- 반환값: `Orm<T>` — DbClass·config·options를 읽기 전용으로 보관하고 `connect`/`connectWithoutTransaction` 메서드를 제공하는 ORM 진입 객체.

### Orm<T>

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

DbContext 인스턴스 관리와 콜백 실행 진입점.

- `DbClass`: createOrm에 넘긴 DbContext 생성자 — 메서드 호출마다 새 인스턴스 생성에 사용.
- `config`: createOrm에 넘긴 연결 설정 — 읽기 전용으로 보관됨.
- `options`: createOrm에 넘긴 생성 옵션 — 읽기 전용으로 보관됨.
- `connect<R>`: `(callback, isolationLevel?) => Promise<R>` — 새 DbContext 인스턴스를 만든 뒤 `db.connect(async () => callback(db), isolationLevel)`으로 위임. 콜백 전체가 한 트랜잭션 내에서 실행되고, callback이 반환한 값 R이 connect의 반환값이 됨.
  - `callback`: `(conn: T) => Promise<R>` — 연결된 DbContext 인스턴스를 받아 작업 수행.
  - `isolationLevel`: `IsolationLevel | undefined` — DbContext.connect의 격리 수준 인자로 전달. orm-node는 기본값을 설정하지 않음 (dialect 드라이버의 기본값 사용).
- `connectWithoutTransaction<R>`: `(callback) => Promise<R>` — 새 DbContext 인스턴스를 만든 뒤 `db.connectWithoutTransaction(async () => callback(db))`로 위임. 트랜잭션을 열지 않고 실행.

### OrmOptions

```ts
interface OrmOptions {
  database?: string;
  schema?: string;
}
```

ORM 생성 시 DbConnConfig보다 우선할 database/schema 값.

- `database`: `string | undefined` — DbContext 생성 옵션으로 전달될 database 값. config.database보다 우선. 한 연결 설정으로 여러 DB를 가리킬 때 사용.
- `schema`: `string | undefined` — DbContext 생성 옵션으로 전달될 schema 값. config.schema보다 우선. MSSQL/PostgreSQL에서만 의미 있음.
