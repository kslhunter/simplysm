# @simplysm/orm-node

Node.js 환경에서 `@simplysm/orm-common` 의 `DbContext` 를 실제 DB(MySQL/MSSQL/PostgreSQL)에 연결·실행하는 ORM 런타임. 고수준 진입점(`createOrm`)과 저수준 연결(`createDbConn`/`DbConn`)을 함께 제공.

## 사용 트리거 인덱스

- **createOrm / Orm / OrmOptions** — `DbContext` 서브클래스로 ORM 인스턴스를 만들고 트랜잭션 단위로 query 를 돌릴 때. (이 README 아래 "ORM 진입" 군)
- **NodeDbContextExecutor** — `DbContext` 에 직접 주입할 executor 를 손수 만들 때(보통 `createOrm` 이 내부에서 처리하므로 직접 쓸 일은 드묾). (이 README 아래 "ORM 진입" 군)
- **createDbConn / DbConn / 설정 타입 / DB_CONN_\* / getDialectFromConfig** — ORM 없이 raw SQL·bulk insert·트랜잭션을 직접 다루거나 dialect 별 연결을 손수 제어할 때. 자세히: [db-conn.md](./db-conn.md)

## ORM 진입

`DbContext` 서브클래스와 연결 설정을 받아 트랜잭션 경계를 관리하는 고수준 진입. query DSL 자체는 `@simplysm/orm-common` 의 `DbContext` 가 제공하고, 이 군은 그 컨텍스트를 실제 연결에 묶는 역할.

### createOrm

```typescript
function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>
```

`DbContext` 서브클래스를 받아 `Orm<T>` 를 반환. 인스턴스는 메서드 호출마다 새로 만들어지므로 `Orm` 객체는 재사용 가능.

- DbClass: `DbContext` 를 상속한 생성자. `executor`(연결 실행자)와 `{ database, schema? }` 를 받는 시그니처 고정. query 진입점(`this.queryable(Entity)`)을 정의한 사용자 DB 클래스를 넘김.
- config: `DbConnConfig`(dialect 별 분기 유니온, [db-conn.md](./db-conn.md) 참조). 접속 대상·인증 정보.
- options?: `OrmOptions`. config 의 `database`/`schema` 를 덮어쓰는 우선 옵션. 같은 접속 정보로 DB·스키마만 바꿔 쓸 때.

database 해석: `options.database` → `config.database` 순으로 찾고, 둘 다 없거나 빈 문자열이면 `"database는 필수입니다"` throw. schema 도 `options.schema` → `config.schema` 순.

```typescript
class MyDb extends DbContext {
  user = this.queryable(User);
}
const orm = createOrm(MyDb, { dialect: "mysql", host: "localhost", port: 3306, username: "root", password: "pw", database: "mydb" });
await orm.connect(async (db) => db.user().execute());  // 트랜잭션 안
```

### Orm

```typescript
interface Orm<T extends DbContext> {
  readonly DbClass; readonly config: DbConnConfig; readonly options?: OrmOptions;
  connect<R>(callback: (conn: T) => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  connectWithoutTransaction<R>(callback: (conn: T) => Promise<R>): Promise<R>;
}
```

`createOrm` 반환 타입. 매 호출마다 DB 인스턴스를 새로 만들어 연결→콜백→정리.

- connect: 콜백을 **트랜잭션 안에서** 실행. 콜백 정상 종료 시 커밋, throw 시 롤백.
- isolationLevel?: `"READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE"`(`@simplysm/orm-common`). 트랜잭션 격리 수준. 미지정 시 연결의 `defaultIsolationLevel`, 그것도 없으면 `READ_UNCOMMITTED`. 더티 리드를 막아야 하면 `READ_COMMITTED` 이상.
- connectWithoutTransaction: 콜백을 **트랜잭션 없이** 실행. 콜백 내부에서 `db.transaction(...)` 으로 부분 트랜잭션을 직접 열 때 사용(examples 테스트 패턴).
- callback: 연결된 DbContext 인스턴스(`T`)를 받아 query 를 수행하고 임의 값 `R` 을 반환. 그 반환값이 `connect`/`connectWithoutTransaction` 의 결과가 됨.

### OrmOptions

```typescript
interface OrmOptions { database?: string; schema?: string; }
```

`createOrm` 3번째 인자. config 보다 우선 적용.

- database?: 사용할 DB 이름. config 의 `database` 대신 쓸 때. 다중 테넌트처럼 접속 정보는 같고 DB 만 다를 때.
- schema?: 스키마 이름(예: MSSQL `dbo`, PostgreSQL `public`). MySQL 은 스키마 개념이 없어 보통 미지정.

### NodeDbContextExecutor

`DbContextExecutor`(`@simplysm/orm-common`) 의 Node 구현체. `createOrm` 이 내부에서 생성·주입하므로 직접 다룰 일은 드묾. `DbContext` 를 `createOrm` 없이 손수 조립할 때만 사용.

```typescript
class NodeDbContextExecutor implements DbContextExecutor {
  constructor(config: DbConnConfig);
  connect(): Promise<void>; close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>; rollbackTransaction(): Promise<void>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(tableName: string, columnMetas: Record<string, ColumnMeta>, records: DataRecord[]): Promise<void>;
  executeDefs<T>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
}
```

- constructor(config): `DbConnConfig` 로 dialect 를 결정(`getDialectFromConfig`). `connect()` 호출 전까지 실제 연결은 열지 않음.
- connect/close: 내부적으로 `createDbConn` 으로 연결 생성 후 open/close. `connect` 미호출 상태에서 다른 메서드 호출 시 `DB_CONN_ERRORS.NOT_CONNECTED` 로 throw.
- begin/commit/rollbackTransaction: 연결의 트랜잭션 제어를 그대로 위임. `isolationLevel?` 은 위 `Orm.connect` 와 동일 의미.
- executeParametrized: 파라미터 바인딩 query 1건 실행. dialect 별 placeholder 차이는 [db-conn.md](./db-conn.md) 참조.
- bulkInsert: 네이티브 bulk API 로 대량 삽입. tableName, 컬럼명→`ColumnMeta` 매핑, 레코드 배열을 넘김.
- executeDefs: `QueryDef[]` 를 dialect 별 query builder 로 SQL 변환 후 실행하고 `resultMetas` 로 결과 파싱. `resultMetas` 가 전부 null 이면 결과가 불필요한 것으로 보고 모든 def 를 하나의 SQL 로 합쳐 1회 실행, `defs.length` 만큼 빈 배열을 반환(인터페이스 계약 유지). 그 외엔 def 별 개별 실행.
