# Core

## `createDbConn`

dialect 기반 DbConn 팩토리. 네이티브 드라이버를 지연 로딩하여 DbConn 인스턴스를 생성한다.

```typescript
async function createDbConn(config: DbConnConfig): Promise<DbConn>;
```

`config.dialect`에 따라 적절한 DbConn 구현체를 생성한다:

| dialect | 반환 타입 | 로드하는 패키지 |
|---------|-----------|----------------|
| `"mysql"` | `MysqlDbConn` | `mysql2/promise` |
| `"postgresql"` | `PostgresqlDbConn` | `pg`, `pg-copy-streams` |
| `"mssql"` / `"mssql-azure"` | `MssqlDbConn` | `tedious` |

네이티브 드라이버 패키지는 최초 호출 시에만 동적 import로 로드하고 모듈 수준 캐시에 보관한다. 이후 호출에서는 캐시된 모듈을 재사용한다.

반환된 `DbConn`은 아직 연결되지 않은 상태이므로 `connect()`를 별도로 호출해야 한다.

```typescript
const conn = await createDbConn({ dialect: "mysql", host: "...", username: "...", password: "..." });
await conn.connect(); // 연결 수립
```

## `NodeDbContextExecutor`

`orm-common`의 `DbContextExecutor` 인터페이스를 구현하는 Node.js 환경용 실행자. `DbContext`에서 내부적으로 사용한다.

```typescript
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

내부적으로 `createDbConn()`으로 DB 연결을 생성하고 관리한다.

**`executeDefs()`**: `QueryDef` 배열을 SQL로 변환하여 실행한다. 처리 방식:
- `resultMetas`가 모두 `undefined`이면 쿼리를 단일 문자열로 결합하여 한 번의 요청으로 실행한다 (결과 불필요 최적화).
- 그 외에는 각 def를 개별 실행하고 `ResultMeta`가 있으면 `parseQueryResult()`로 결과를 파싱한다.
- `buildResult.resultSetIndex`가 지정된 경우 해당 인덱스의 결과 집합을 사용한다.

일반적으로 직접 사용하지 않는다. `createOrm()`이 내부적으로 이 클래스를 생성하여 `DbContext`에 전달한다.

## `createOrm`

Node.js ORM 팩토리 함수. `DbContext` 서브클래스와 DB 연결 설정을 받아 트랜잭션을 관리하는 `Orm<T>` 인스턴스를 반환한다.

```typescript
function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>;
```

`options.database` / `options.schema`는 `config`의 동일 필드보다 우선 적용된다. `database`는 필수이며, `config`와 `options` 양쪽 모두 `database`가 없으면 에러를 throw한다.

```typescript
class MyDb extends DbContext {
  user = this.queryable(User);
}

const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  username: "root",
  password: "password",
  database: "mydb",
});

await orm.connect(async (db) => {
  return db.user().execute();
});
```

## `Orm`

`createOrm()`에서 반환하는 객체의 타입.

```typescript
interface Orm<T extends DbContext> {
  readonly DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;
  connect<R>(callback: (conn: T) => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  connectWithoutTransaction<R>(callback: (conn: T) => Promise<R>): Promise<R>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `DbClass` | constructor | DbContext 서브클래스 생성자 |
| `config` | `DbConnConfig` | DB 연결 설정 |
| `options` | `OrmOptions?` | ORM 옵션 |
| `connect(callback, isolationLevel?)` | `Promise<R>` | 트랜잭션 내에서 콜백을 실행한다. 콜백 완료 후 자동 커밋, 예외 발생 시 자동 롤백 |
| `connectWithoutTransaction(callback)` | `Promise<R>` | 트랜잭션 없이 콜백을 실행한다 |

## `OrmOptions`

`createOrm()`의 세 번째 인수로 전달하는 옵션. `DbConnConfig`의 동일 필드보다 우선 적용된다.

```typescript
interface OrmOptions {
  database?: string;
  schema?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string?` | 데이터베이스 이름. `DbConnConfig`의 `database` 대신 사용된다 |
| `schema` | `string?` | 스키마 이름 (MSSQL: `dbo`, PostgreSQL: `public`). `DbConnConfig`의 `schema` 대신 사용된다 |
