# @simplysm/service-client — ORM 원격 실행

서버측 ORM DbContext 를 클라이언트에서 원격으로 실행하는 묶음. 쿼리 자체는 서버 `Orm` 서비스가 DB 에 대해 수행하고, 클라이언트는 커넥션·트랜잭션·쿼리 정의(`QueryDef`)만 RPC 로 전송한다. 쿼리는 `connect`/`connectWithoutTransaction` 콜백 내부에서만 가능. ORM 작업을 트랜잭션 경계로 묶어 실행할 때 함께 읽힌다.

> 앱(Angular)에서는 `OrmConnectOptions`(DbClass·connOpt·dbContextOpt)를 화면에 흩뿌리지 않고 `AppOrmProvider`(root provider) 한 곳에 고정한 뒤 `connectAsync`/`connectWithoutTransAsync` 만 호출한다. 쿼리 작성법은 apis/orm-common 참조. 아래 예시는 connector 직접 호출 형태지만 실제 앱은 manuals/client-orm.md 의 provider 패턴을 따른다.

## createOrmClientConnector / OrmClientConnector

`createOrmClientConnector(serviceClient): OrmClientConnector` — 주어진 `ServiceClient` 위에 ORM 커넥터를 만든다. 내부에서 `serviceClient.getService<OrmService>("Orm")` 프록시로 서버 ORM 서비스를 호출하므로, 사용 전 `ServiceClient.connect()` 로 소켓이 연결돼 있어야 함.

`OrmClientConnector` 메서드:

- connect<T, R>(config, callback): Promise\<R\> — 트랜잭션 안에서 callback 실행. DbContext 생성 → `db.connect(...)`(connect + beginTransaction + callback + commit/rollback) 수행. callback 정상 반환 시 커밋(반환값이 그대로 반환됨), throw 시 롤백되어 콜백 내 다건 작업이 원자 처리됨. callback 에서 발생한 에러 중 외래키 제약 위반 메시지(`a parent row: a foreign key constraint` / `conflicted with the REFERENCE`)는 "경고! 연관된 작업으로 인해 작업이 거부되었습니다. 후속 작업을 확인해 주세요." 로 감싸 throw(원본은 `cause` 에 보존), 그 외 에러는 그대로 throw.
- connectWithoutTransaction<T, R>(config, callback): Promise\<R\> — 트랜잭션 없이 callback 실행(`db.connectWithoutTransaction`). 트랜잭션 안에서 동작하지 않는 작업(예: DB initialize)·조회 전용 작업에 사용. callback 반환값이 그대로 반환됨.

공통 인자:

- config: OrmConnectOptions\<T\> — 아래 섹션. DbContext 클래스·서버 ORM 설정·DB명/스키마.
- callback: (db: T) => Promise\<R\> | R — 생성·연결된 DbContext 를 받아 쿼리하는 콜백. 동기/비동기 반환 모두 허용.

```ts
const connector = createOrmClientConnector(client);
const rows = await connector.connect(
  { DbClass: MainDbContext, connOpt: { configName: "MAIN" }, dbContextOpt: { database: "mydb" } },
  async (db) => db.order().select((item) => ({ id: item.id })).execute(),
); // 콜백 throw 시 자동 롤백
```

## OrmConnectOptions

`connect`/`connectWithoutTransaction` 의 첫 인자. DbContext 1회 실행에 필요한 설정.

- DbClass: `new (executor, opt) => T` — 실행할 DbContext 클래스 생성자. `executor`(아래 `OrmClientDbContextExecutor`)와 `{ database, schema? }` 를 받아 인스턴스화됨. 앱별 DbContext(예: `MainDbContext`)를 그대로 전달.
- connOpt: `DbConnOptions & { configName: string }` — 서버측 ORM 연결 설정. `configName` 은 서버에 등록된 ORM 설정 이름(서버가 이 이름으로 실제 DB 접속 정보를 찾음). 나머지 필드는 `@simplysm/service-common` 의 `DbConnOptions`.
- dbContextOpt?: `{ database: string; schema?: string }` — DbContext 에 적용할 DB명·스키마. 생략 시 서버 `getInfo()` 가 돌려준 `database`/`schema` 를 사용. database 가 옵션·서버 양쪽 모두 비어 있으면 throw("database는 필수입니다." — 결측을 임의 보정하지 않음).
  - database: string — 대상 데이터베이스명.
  - schema?: string — 대상 스키마명(미지정 시 서버 기본값).

## OrmClientDbContextExecutor

`DbContextExecutor`(`@simplysm/orm-common`) 구현체. 모든 메서드를 `client.getService<OrmService>("Orm")` RPC 로 위임. 커넥터가 내부에서 DbContext 에 주입하므로 직접 생성·호출은 보통 불필요.

`new OrmClientDbContextExecutor(client, opt)` — 생성. opt = `DbConnOptions & { configName: string }`. 생성 시 `Orm` 서비스 프록시 확보.

- getInfo(): `Promise<{ dialect; database?; schema? }>` — 서버 ORM 설정 정보(방언·기본 DB명·스키마) 조회. 커넥터가 dbContextOpt 미지정 시 fallback 으로 사용.
- connect(): Promise\<void\> — 서버에 커넥션 생성, 반환된 connId 를 내부 보관. 이후 트랜잭션·쿼리 호출의 핸들. 이후 모든 실행 메서드는 connId 없으면(미연결) throw.
- beginTransaction(isolationLevel?): Promise\<void\> — 트랜잭션 시작. isolationLevel(orm-common `IsolationLevel`) 미지정 시 서버 기본값.
- commitTransaction(): Promise\<void\> — 트랜잭션 커밋.
- rollbackTransaction(): Promise\<void\> — 트랜잭션 롤백.
- close(): Promise\<void\> — 커넥션 종료 후 보관 connId 해제.
- executeDefs\<T\>(defs, options?): Promise\<T[][]\> — 쿼리 정의 배열(`QueryDef[]`)을 서버에서 실행. options 는 정의별 결과 매핑 메타(`(ResultMeta | undefined)[]`, 항목별 nullable)로 행 역직렬화 방식 지정. 정의 1개당 결과 배열 1개를 가진 2차원 배열 반환.
- executeParametrized(query, params?): Promise\<unknown[][]\> — 파라미터 바인딩 raw SQL 실행. query = SQL 문자열, params = 바인딩 값 배열.
- bulkInsert(tableName, columnDefs, records): Promise\<void\> — 대량 삽입. columnDefs(`Record<string, ColumnMeta>`)로 컬럼별 메타를, records 로 삽입할 행 객체 배열을 전달.
