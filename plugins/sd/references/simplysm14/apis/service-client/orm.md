# @simplysm/service-client — ORM 원격 실행

`ServiceClient` 위에서 서버 `Orm` 서비스에 연결하고 `DbContext` 콜백을 실행하는 API 묶음. 실제 DB 동작은 서버에서 일어나며, 클라이언트는 connId 기반으로 연결·트랜잭션·쿼리 호출을 원격 위임한다. 사용법: [client-orm.md](../../manuals/client-orm.md), [orm.md](../../manuals/orm.md)

## createOrmClientConnector / OrmClientConnector

```ts
function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector;
interface OrmClientConnector {
  connect<T extends DbContext, R>(
    config: OrmConnectOptions<T>,
    callback: (db: T) => Promise<R> | R,
  ): Promise<R>;
  connectWithoutTransaction<T extends DbContext, R>(
    config: OrmConnectOptions<T>,
    callback: (db: T) => Promise<R> | R,
  ): Promise<R>;
}
```

- `serviceClient: ServiceClient` — ORM RPC 의 기반 클라이언트. executor 생성 시 `serviceClient.getService<OrmService>("Orm")` 로 서버 ORM 서비스를 얻는다.
- `config: OrmConnectOptions<T>` — DbContext 클래스·ORM 연결 옵션·DbContext 옵션 묶음. 아래 `OrmConnectOptions` 참조.
- `callback: (db: T) => Promise<R> | R` — 생성된 DbContext 로 실행할 콜백. 반환값이 `connect`/`connectWithoutTransaction` 의 반환값(`R`)이 된다.
- `connect` — DbContext 를 만들고 `db.connect(() => callback(db))`(트랜잭션 포함)로 실행한다.
- `connect` 의 FK 에러 변환 — callback 에서 난 Error 메시지에 MySQL `a parent row: a foreign key constraint`, MSSQL `conflicted with the REFERENCE`, PostgreSQL `violates foreign key constraint` 중 하나가 포함되면, 원본 Error 를 `SdError` 로 감싸 `"경고! 연관된 작업으로 인해 작업이 거부되었습니다. 후속 작업을 확인해 주세요."` 메시지로 throw 한다. 그 외 에러는 그대로 re-throw.
- `connectWithoutTransaction` — DbContext 를 만들고 `db.connectWithoutTransaction(() => callback(db))` 로 실행한다(FK 에러 변환 없음).

## OrmConnectOptions

```ts
interface OrmConnectOptions<T extends DbContext> {
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema?: string;
  };
}
```

- `DbClass` — 생성할 DbContext 클래스 생성자. 커넥터가 `new DbClass(executor, { database, schema })` 로 인스턴스화한다.
- `DbClass` 의 `executor: DbContextExecutor` — 생성자 1번 인자. 실제로는 `OrmClientDbContextExecutor` 인스턴스가 주입된다.
- `DbClass` 의 `opt.database: string` — 생성자 2번 인자의 database. `dbContextOpt.database` 가 있으면 그 값, 없으면 서버 `getInfo().database` 를 쓴다. 둘 다 없거나 빈 문자열이면 `"database는 필수입니다."` 를 throw.
- `DbClass` 의 `opt.schema?: string` — 생성자 2번 인자의 schema. `dbContextOpt.schema` 가 있으면 그 값, 없으면 서버 `getInfo().schema` 를 쓴다.
- `connOpt: DbConnOptions & { configName: string }` — `OrmClientDbContextExecutor` 생성자와 모든 서버 ORM 연결 호출에 전달되는 옵션.
- `configName: string` — `connOpt` 에 추가로 요구되는 문자열 필드. 이 패키지는 값을 해석하지 않고 서버 ORM 서비스 호출에 그대로 넘긴다(서버 config 키).
- `dbContextOpt?: { database; schema? }` — DbContext 생성 옵션 override. 생략하면 서버 `getInfo()` 결과로 보완한다.
- `dbContextOpt.database: string` — 대상 database override.
- `dbContextOpt.schema?: string` — 대상 schema override.

## OrmClientDbContextExecutor

`DbContextExecutor` 구현체. 모든 메서드는 `_client.getService<OrmService>("Orm")` 로 얻은 서버 ORM 서비스에 원격 호출을 위임한다.

```ts
class OrmClientDbContextExecutor implements DbContextExecutor {
  constructor(client: ServiceClient, opt: DbConnOptions & { configName: string });
  getInfo(): Promise<{ dialect: Dialect; database?: string; schema?: string }>;
  connect(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  close(): Promise<void>;
  executeDefs<T = Record<string, unknown>>(
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
  executeParametrized(query: string, params?: unknown[]): Promise<unknown[][]>;
  bulkInsert(
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

- `client: ServiceClient` — 생성자 1번 인자. 생성 시 `getService<OrmService>("Orm")` 호출에 쓰인다.
- `opt: DbConnOptions & { configName: string }` — 생성자 2번 인자. `getInfo`·`connect` 호출에 그대로 전달되는 ORM 연결 옵션.
- 내부 `_connId?: number` — `connect()` 성공 후 보관되는 서버 커넥션 식별자. 연결이 필요한 메서드의 첫 인자로 전달되며, 없으면 해당 메서드는 `"데이터베이스에 연결되지 않았습니다."` 를 throw 한다.
- `getInfo()` — `_connId` 없이 `getInfo(opt)` 를 호출한다. 반환 필드는 `dialect`(필수)·`database`(선택)·`schema`(선택)이며, `OrmClientConnector` 가 `database`/`schema` 보완에 쓴다.
- `connect()` — `connect(opt)` 결과 connId 를 `_connId` 에 저장한다.
- `beginTransaction(isolationLevel?)` — `_connId` 와 함께 서버 beginTransaction 을 호출한다.
- `isolationLevel?: IsolationLevel` — 트랜잭션 격리 수준. 그대로 서버에 전달된다.
- `commitTransaction()` — `_connId` 로 서버 commitTransaction 을 호출한다.
- `rollbackTransaction()` — `_connId` 로 서버 rollbackTransaction 을 호출한다.
- `close()` — `_connId` 로 서버 close 를 호출한 뒤 `_connId` 를 `undefined` 로 되돌린다.
- `executeDefs<T>(defs, options?)` — `_connId`·`defs`·`options` 로 서버 executeDefs 를 호출하고 결과를 `T[][]` 로 반환한다.
- `defs: QueryDef[]` — 서버에 전달할 쿼리 정의 배열.
- `options?: (ResultMeta | undefined)[]` — 쿼리별 결과 메타 배열. 항목은 `undefined` 일 수 있고 그대로 서버에 전달된다.
- `executeParametrized(query, params?)` — `_connId`·`query`·`params` 로 서버 executeParametrized 를 호출하고 `unknown[][]` 를 반환한다.
- `query: string` — 서버에 전달할 SQL 문자열.
- `params?: unknown[]` — SQL 파라미터 배열(선택). 그대로 서버에 전달된다.
- `bulkInsert(tableName, columnDefs, records)` — `_connId`·인자들로 서버 bulkInsert 를 호출한다.
- `tableName: string` — 삽입 대상 테이블명.
- `columnDefs: Record<string, ColumnMeta>` — 컬럼명별 메타 정보.
- `records: Record<string, unknown>[]` — 삽입할 행 객체 배열.
