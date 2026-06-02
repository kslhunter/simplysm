# @simplysm/orm-node

Node.js 환경에서 `@simplysm/orm-common` 의 `DbContext` 를 실 DB(MSSQL/MySQL/PostgreSQL)에 연결해 구동하는 ORM 실행 계층. 고수준 `createOrm` 팩토리와 저수준 연결(`DbConn`) 계층을 함께 제공.

## 사용 트리거 인덱스

- **createOrm / Orm / OrmOptions** — `DbContext` 서브클래스 + 연결설정으로 ORM 인스턴스를 만들고 `connect`/`connectWithoutTransaction` 콜백 안에서 쿼리 실행할 때. 앱에서 ORM 을 쓰는 일반 진입점. (아래 인라인 군)
- **저수준 DB 연결 계층** (`createDbConn`, `DbConn`, `DbConnConfig`+dialect별 Config, `NodeDbContextExecutor`, `getDialectFromConfig`, `DB_CONN_*` 상수) — ORM 추상화 없이 직접 SQL·파라미터 쿼리·bulk insert·수동 트랜잭션을 다루거나 `DbContext` 의 executor 를 직접 구성할 때. 자세히: [db-conn.md](./db-conn.md)

## ORM 팩토리 (createOrm)

`DbContext` 서브클래스와 연결설정을 받아, 호출마다 새 `DbContext` 인스턴스를 만들고 트랜잭션 단위 실행을 관리하는 가장 일반적인 진입점.

### createOrm

```typescript
createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>
```

- `DbClass` — `@simplysm/orm-common` 의 `DbContext` 를 상속한 사용자 클래스 생성자. 내부에서 `NodeDbContextExecutor(config)` 와 `{ database, schema }` 를 주입해 인스턴스화함.
- `config: DbConnConfig` — DB 접속 정보. `dialect` 로 DBMS 분기. 상세 필드는 db-conn.md.
- `options?: OrmOptions` — `config` 의 `database`/`schema` 보다 **우선** 적용(값이 있을 때만 덮어씀). 같은 `config` 로 DB/스키마만 바꿔 붙일 때 사용.
- 반환 `Orm<T>` — 아래 필드·메서드를 가진 객체.

`database` 가 `options` 와 `config` 양쪽 모두에서 없거나 빈 문자열이면 연결 시 `"database는 필수입니다"` throw.

### OrmOptions

- `database?: string` — DB 이름. 지정 시 `config.database` 대신 사용(우선).
- `schema?: string` — 스키마 이름(MSSQL `dbo`, PostgreSQL `public` 등). 지정 시 `config.schema` 대신 사용(우선). MySQL 은 스키마 개념이 없어 보통 생략.

### Orm<T>

- `DbClass` (readonly) — 생성에 쓰인 `DbContext` 생성자 그대로 노출.
- `config` (readonly) — 생성에 쓰인 `DbConnConfig` 그대로 노출.
- `options?` (readonly) — 생성에 쓰인 `OrmOptions` 그대로 노출.
- `connect<R>(callback: (conn: T) => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>` — 새 `DbContext` 를 만들어 **트랜잭션 안에서** 콜백 실행하고 콜백 반환값을 그대로 반환. `isolationLevel` 로 격리수준 지정(미지정 시 연결설정의 기본 격리수준). 커밋·롤백·연결 종료는 `DbContext.connect` 가 관리.
- `connectWithoutTransaction<R>(callback: (conn: T) => Promise<R>): Promise<R>` — **트랜잭션 없이** 연결만 열고 콜백 실행. DDL 처럼 트랜잭션 밖에서 돌려야 하거나 콜백 내부에서 `db.transaction(...)` 을 직접 제어할 때 사용.

사용 예:

```typescript
class MyDb extends DbContext {
  user = this.queryable(User);
}
const orm = createOrm(MyDb, { dialect: "mysql", host: "localhost", username: "root", password: "pw", database: "mydb" });
const users = await orm.connect(async (db) => db.user().execute(), "READ_COMMITTED");
await orm.connectWithoutTransaction(async (db) => db.transaction(async () => { /* ... */ }));
```
