# @simplysm/service-client — ORM 원격 실행

서버에 연결된 DB 를 클라이언트 측 `DbContext`(`@simplysm/orm-common`)로 트랜잭션 단위 실행하는 기능. 클라이언트가 직접 DB 에 붙지 않고, 모든 쿼리를 `ServiceClient` 의 `Orm` 서비스 RPC 로 서버에 위임한다. `connect` 콜백 내부에서만 쿼리 가능.

## OrmConnectOptions<T extends DbContext>

`OrmClientConnector` 의 `connect`/`connectWithoutTransaction` 에 넘기는 설정.

- `DbClass: new (executor, opt) => T` — DbContext 클래스 생성자. `opt` = `{ database: string; schema?: string }`. 실제 인스턴스를 만들 때 사용.
- `connOpt: DbConnOptions & { configName: string }` — 서버 측 DB 접속 설정. `configName` = 서버에 등록된 DB 설정 이름(서버가 이 이름으로 실제 접속 정보를 찾음).
- `dbContextOpt?: { database: string; schema: string }` — DbContext 가 사용할 데이터베이스/스키마를 명시. 미지정 시 서버 `getInfo()` 가 돌려주는 기본 database/schema 를 사용. `database` 가 config·서버 양쪽에서 모두 비면 `"database는 필수입니다."` throw(결측을 임의 보정하지 않음).

## OrmClientConnector

DbContext 를 만들고 트랜잭션 경계를 잡아 콜백을 실행하는 커넥터. 사용 전 `ServiceClient.connect()` 로 소켓이 연결돼 있어야 함(RPC 의존).

- `createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector` — 커넥터 생성. 내부에서 `OrmClientDbContextExecutor` 로 RPC 위임.
- `connect<T, R>(config, callback): Promise<R>` — DbContext 를 만들고 **트랜잭션 안에서** `callback(db)` 실행. 콜백 정상 반환 시 커밋, throw 시 롤백(콜백 내 다건 작업이 원자 처리됨). 외래키 제약 위반 메시지(`a parent row: a foreign key constraint`, `conflicted with the REFERENCE`)는 사용자용 한국어 메시지로 감싸 `cause` 에 원본을 담아 재 throw.
- `connectWithoutTransaction<T, R>(config, callback): Promise<R>` — 트랜잭션 없이 `callback(db)` 실행. 조회 전용·트랜잭션 불필요 작업에 사용.

```ts
const connector = createOrmClientConnector(client);
await connector.connect(
  { DbClass: MyDb, connOpt: { configName: "main" } },
  async (db) => {
    await db.foo.insertAsync({ /* ... */ });
    return db.foo.where(/* ... */).resultAsync();
  },
); // 콜백 throw 시 자동 롤백
```

## OrmClientDbContextExecutor

`DbContextExecutor`(`@simplysm/orm-common`) 구현체. 모든 메서드를 `ServiceClient.getService<OrmService>("Orm")` RPC 로 위임. 보통 `OrmClientConnector` 가 내부에서 생성하므로 직접 다룰 일은 드묾.

- `new OrmClientDbContextExecutor(client: ServiceClient, opt: DbConnOptions & { configName: string })` — 생성. 생성 시 `Orm` 서비스 프록시 확보.
- `getInfo(): Promise<{ dialect; database?; schema? }>` — 서버 DB 의 dialect 및 기본 database/schema 조회.
- `connect(): Promise<void>` — 서버에 커넥션 생성 요청, 반환된 `connId` 보관. 이후 모든 실행 메서드는 `connId` 없으면(미연결) throw.
- `beginTransaction(isolationLevel?): Promise<void>` — 트랜잭션 시작. `isolationLevel` = 격리 수준(`IsolationLevel`), 미지정 시 서버 기본값.
- `commitTransaction(): Promise<void>` — 커밋.
- `rollbackTransaction(): Promise<void>` — 롤백.
- `close(): Promise<void>` — 서버 커넥션 종료 후 보관한 `connId` 해제.
- `executeDefs<T>(defs: QueryDef[], options?): Promise<T[][]>` — 쿼리 정의 배열 실행, 각 정의별 결과 배열을 반환. `options` = 정의별 `ResultMeta`(결과 매핑 메타, 항목별 nullable).
- `executeParametrized(query: string, params?): Promise<unknown[][]>` — 파라미터 바인딩 raw SQL 실행.
- `bulkInsert(tableName, columnDefs, records): Promise<void>` — 대량 삽입. `columnDefs` = `Record<string, ColumnMeta>`(컬럼별 메타), `records` = 삽입할 행 객체 배열.
