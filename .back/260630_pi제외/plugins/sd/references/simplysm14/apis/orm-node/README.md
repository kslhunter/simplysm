# @simplysm/orm-node

Node.js 환경에서 `DbContext` 실행자와 DB 연결을 만들고, `DbContext` 서브클래스에 연결·트랜잭션 실행 진입점을 붙이는 패키지.

## 사용 트리거 인덱스

- **createOrm / Orm / OrmOptions** — `DbContext` 서브클래스로 ORM 진입 객체를 만들고 `DbContext.connect` 또는 `DbContext.connectWithoutTransaction` 경로로 콜백을 실행할 때. 사용법: [orm.md](../../manuals/orm.md)
- **createDbConn / DbConn / DbConnConfig 계열 / DB 연결 구현체 / NodeDbContextExecutor / 상수** — `createOrm` 대신 저수준 연결·raw SQL·bulk insert·직접 executor 조립을 다룰 때. 자세히: [db-conn.md](./db-conn.md)

## ORM 진입

### createOrm

```ts
function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>
```

- `DbClass`: `new (executor, opt)` 로 생성되는 `DbContext` 서브클래스 — 내부에서 `NodeDbContextExecutor(config)` 와 `{ database, schema }` 를 받아 새 컨텍스트 인스턴스를 만든다.
- `executor`: `DbContextExecutor` — `DbClass` 생성자 첫 번째 인자로 전달되는 실행자 타입이다.
- `opt.database`: `string` — `options.database` 를 우선 사용하고 없으면 `config.database` 를 사용하며, 둘 다 없거나 빈 문자열이면 `"database는 필수입니다"` 오류가 발생한다.
- `opt.schema`: `string | undefined` — `options.schema` 를 우선 사용하고 없으면 `config.schema` 를 사용하며, 없으면 `undefined` 로 전달된다.
- `config`: `DbConnConfig` — `NodeDbContextExecutor` 생성에 그대로 쓰이는 dialect별 연결 설정이다.
- `options`: `OrmOptions | undefined` — `DbContext` 생성 옵션의 database/schema 값을 `config` 보다 우선하게 할 때 전달한다.
- 반환값: `Orm<T>` — 입력 `DbClass`, `config`, `options` 를 보관하고 콜백 실행 메서드를 제공한다.

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

- `DbClass`: `createOrm` 에 전달한 `DbContext` 생성자 — 메서드 호출 때마다 새 인스턴스 생성에 사용된다.
- `config`: `DbConnConfig` — `createOrm` 에 전달한 연결 설정을 읽기 전용으로 보관한다.
- `options`: `OrmOptions | undefined` — `createOrm` 에 전달한 `DbContext` 생성 옵션을 읽기 전용으로 보관한다.
- `connect`: `(callback, isolationLevel?) => Promise<R>` — 새 `DbContext` 인스턴스를 만든 뒤 `db.connect(async () => callback(db), isolationLevel)` 에 위임한다.
- `callback`: `(conn: T) => Promise<R>` — 연결된 컨텍스트 인스턴스를 받아 작업하고 그 결과 `R` 을 반환한다.
- `isolationLevel`: `IsolationLevel | undefined` — `DbContext.connect` 의 두 번째 인자로 전달되는 트랜잭션 격리 수준이다.
- `connectWithoutTransaction`: `(callback) => Promise<R>` — 새 `DbContext` 인스턴스를 만든 뒤 `db.connectWithoutTransaction(async () => callback(db))` 에 위임한다.

### OrmOptions

```ts
interface OrmOptions {
  database?: string;
  schema?: string;
}
```

- `database`: `string | undefined` — `DbContext` 생성 옵션의 database 값이며 `config.database` 보다 우선한다.
- `schema`: `string | undefined` — `DbContext` 생성 옵션의 schema 값이며 `config.schema` 보다 우선한다.
