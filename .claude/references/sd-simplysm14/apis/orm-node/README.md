# @simplysm/orm-node

Node.js 환경에서 `@simplysm/orm-common` 의 `DbContext` 를 실제 DB(MySQL/MSSQL/PostgreSQL)에 연결·실행하는 ORM 런타임. 고수준 진입점(`createOrm`)과 저수준 연결(`createDbConn`/`DbConn`)을 함께 노출.

## 사용 트리거 인덱스

- **createOrm / Orm / OrmOptions** — `DbContext` 서브클래스로 ORM 인스턴스를 만들고 `connect`/`connectWithoutTransaction` 으로 트랜잭션 경계를 잡아 query 를 돌릴 때. (아래 "ORM 진입" 군)
- **NodeDbContextExecutor** — `DbContext` 에 직접 주입할 executor 를 손수 만들 때(`createOrm` 이 내부에서 자동 생성하므로 직접 쓸 일은 드묾). (아래 "ORM 진입" 군 및 db-conn.md)
- **createDbConn / DbConn / DbConnConfig 계열 / getDialectFromConfig / DB_CONN_\* 상수** — ORM 없이 raw SQL·파라미터 쿼리·bulk insert·수동 트랜잭션을 직접 다루거나 dialect별 접속 설정을 작성할 때. 자세히: [db-conn.md](./db-conn.md)

## ORM 진입

`DbContext` 서브클래스와 접속 설정을 받아 연결·트랜잭션 경계를 관리하는 고수준 진입. query DSL 자체는 `@simplysm/orm-common` 의 `DbContext` 가 제공하고, 이 군은 그 컨텍스트를 실제 DB 연결에 묶는 역할.

### createOrm

```typescript
function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>
```

`DbContext` 서브클래스를 받아 `Orm<T>` 를 반환. DB 인스턴스는 `connect`/`connectWithoutTransaction` 호출마다 새로 생성되므로 반환된 `Orm` 객체 자체는 재사용 가능.

- DbClass — `DbContext` 를 상속한 생성자. `(executor, { database, schema? })` 시그니처 고정. query 진입점(`this.queryable(Entity)`)을 정의한 사용자 DB 클래스를 넘김. 어떤 엔티티 집합을 다룰지 결정하는 자리.
- config — `DbConnConfig`(dialect별 분기 유니온, [db-conn.md](./db-conn.md) 참조). 접속 대상·인증 정보. DBMS 종류·호스트·계정이 여기서 정해짐.
- options? — `OrmOptions`. config 의 `database`/`schema` 를 덮어쓰는 우선 옵션. 같은 접속 정보로 DB·스키마만 바꿔 쓸 때(다중 테넌트 등) 지정.

database 해석: `options.database` → `config.database` 순으로 찾고, 둘 다 없거나 빈 문자열이면 `"database는 필수입니다"` throw. schema 해석도 `options.schema` → `config.schema` 순(없으면 `undefined` 유지).

```typescript
class TestDb extends DbContext {
  user = this.queryable(User);
}
const orm = createOrm(TestDb, mysqlConfig, { database: "TestDb" });
await orm.connect(async (db) => {
  await db.user().insert([{ id: 100, name: "orm-test" }]);
  return db.user().execute();
}); // 트랜잭션 안에서 실행 후 자동 커밋
```

### Orm

```typescript
interface Orm<T extends DbContext> {
  readonly DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;
  connect<R>(callback: (conn: T) => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  connectWithoutTransaction<R>(callback: (conn: T) => Promise<R>): Promise<R>;
}
```

`createOrm` 반환 타입. 각 메서드 호출마다 DB 인스턴스를 새로 만들어 연결→콜백→정리.

- DbClass / config / options — `createOrm` 에 넘긴 값을 그대로 읽기 전용으로 보관. 같은 설정으로 재연결·진단할 때 참조.
- connect — 콜백을 **트랜잭션 안에서** 실행. 콜백이 정상 종료하면 커밋, throw 하면 롤백 후 그 오류를 다시 throw. 여러 쓰기를 원자적으로 묶어야 할 때.
- isolationLevel? — `"READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE"`(`@simplysm/orm-common`). 트랜잭션 격리 수준. 미지정 시 연결의 `defaultIsolationLevel`, 그것도 없으면 `READ_UNCOMMITTED`. 더티 리드를 막아야 하면 `READ_COMMITTED` 이상으로 올림.
- connectWithoutTransaction — 콜백을 **트랜잭션 없이** 실행. 읽기 전용이거나, 콜백 내부에서 `db.transaction(...)` 으로 부분 트랜잭션을 직접 열어 일부 구간만 원자화할 때.
- callback — 연결된 DbContext 인스턴스(`T`)를 받아 query 를 수행하고 임의 값 `R` 을 반환. 그 반환값이 `connect`/`connectWithoutTransaction` 의 결과가 됨.

```typescript
// 읽기는 트랜잭션 없이, 그 안에서 일부 쓰기만 부분 트랜잭션으로
await orm.connectWithoutTransaction(async (db) => {
  await db.transaction(async () => {
    await db.user().insert([{ id: 300, name: "partial-tx" }]);
  });
  return db.user().execute();
});
```

### OrmOptions

```typescript
interface OrmOptions {
  database?: string;
  schema?: string;
}
```

`createOrm` 3번째 인자. config 보다 우선 적용.

- database? — 사용할 DB 이름. config 의 `database` 대신 쓸 때. 접속 정보는 같고 DB 만 다른 다중 테넌트 상황에서 인스턴스별로 지정.
- schema? — 스키마 이름(예: MSSQL `dbo`, PostgreSQL `public`). MySQL 은 스키마 개념이 없어 보통 미지정.

### NodeDbContextExecutor

`@simplysm/orm-common` 의 `DbContextExecutor` 를 Node 환경에서 구현한 클래스. `createOrm` 이 내부에서 생성·주입하므로 직접 다룰 일은 드묾. `DbContext` 를 `createOrm` 없이 손수 조립할 때만 사용. 생성자·메서드 전체 시그니처와 동작은 [db-conn.md](./db-conn.md) 의 동명 섹션 참조.
