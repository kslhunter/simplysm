# @simplysm/sd-service-client — 원격 ORM 접속

`SdServiceClient` 를 경유해 서버 측 `SdOrmService` 에 붙어 DB 트랜잭션/쿼리를 실행한다. 서버가 실제 DB 커넥션을 보유하고, 클라이언트는 `DbContext`(@simplysm/sd-orm-common) 를 로컬에 구성하되 모든 실행을 RPC 로 위임한다.

## SdOrmServiceClientConnector

`new SdOrmServiceClientConnector(serviceClient: SdServiceClient)` — 접속·콜백 실행 진입점.

- `connectAsync<T extends DbContext, R>(config: ISdOrmServiceConnectConfig<T>, callback: (conn: T) => Promise<R> | R): Promise<R>`
  - 트랜잭션 안에서 `callback` 실행 후 결과 반환. 내부적으로 `DbContext.connectAsync` 사용(begin/commit/rollback 관리).
  - 외래키 위반 에러(메시지에 `a parent row: a foreign key constraint` 또는 `conflicted with the REFERENCE` 포함)는 메시지를 `"경고! 연결된 작업에 의한 처리 거부. 후속작업 확인요망"` 으로 치환 후 재던짐.
- `connectWithoutTransactionAsync<T extends DbContext, R>(config, callback): Promise<R>`
  - 트랜잭션 없이 `callback` 실행(`DbContext.connectWithoutTransactionAsync`). 위 FK 에러 메시지 치환은 적용되지 않음. 조회 위주/대량 작업에 사용.

두 메소드 모두 `executor.getInfoAsync()` 로 서버에서 `dialect`/`database`/`schema` 를 받아 `DbContext` 를 생성한다. `config.dbContextOpt` 가 주어지면 그 `database`/`schema` 가 서버 기본값을 덮어쓴다.

## ISdOrmServiceConnectConfig<T>

`connectAsync`/`connectWithoutTransactionAsync` 의 첫 인자.
- `dbContextType: Type<T>` — 생성할 `DbContext` 파생 클래스 생성자. `new dbContextType(executor, option)` 으로 인스턴스화됨.
- `connOpt: TDbConnOptions & { configName: string }` — 서버 DB 접속 옵션. `configName`(서버 설정 키, 필수) + 선택 `config: Record<string, any>` + 임의 추가 필드(`Record<string, any>`). 서버 `SdOrmService.connect/getInfo` 로 그대로 전달.
- `dbContextOpt?: { database: string; schema: string }` — DbContext 의 대상 DB/스키마 강제 지정. 미지정 시 서버 `getInfo` 반환값 사용.

## SdOrmServiceClientDbContextExecutor

`new SdOrmServiceClientDbContextExecutor(client: SdServiceClient, opt: TDbConnOptions & { configName: string })` — `IDbContextExecutor`(@simplysm/sd-orm-common) 구현체. 위 Connector 가 내부에서 생성하므로 보통 직접 쓰지 않는다. 생성 시 `client.getService<ISdOrmService>("SdOrmService")` 로 원격 서비스 Proxy 확보.

모든 실행 메소드는 `connectAsync` 이전 호출 시(`_connId` 미설정) `"DB에 연결되어있지 않습니다."` throw.
- `getInfoAsync(): Promise<{ dialect; database?; schema? }>` — 서버에서 dialect/db/schema 조회(연결 불필요).
- `connectAsync(): Promise<void>` — 서버에 `connect` 요청, 반환된 `connId` 보관.
- `beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL)` — 트랜잭션 시작. `ISOLATION_LEVEL` 은 sd-orm-common 의 격리수준 enum.
- `commitTransactionAsync()` / `rollbackTransactionAsync()` — 커밋/롤백.
- `closeAsync()` — 커넥션 종료.
- `executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]>` — 쿼리 정의 배열 실행, 정의별 결과 파싱 옵션 지정.
- `executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>` — 파라미터 바인딩 SQL 실행.
- `bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` — 대량 INSERT.
- `bulkUpsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void>` — 대량 UPSERT.

## 사용 예

```ts
const connector = new SdOrmServiceClientConnector(serviceClient);
await connector.connectAsync(
  { dbContextType: MainDbContext, connOpt: { configName: "main" } },
  async (db) => {
    return await db.someTable.where(...).resultAsync();
  },
);
```

주의
- `connOpt.configName` 은 필수. 서버에 사전 등록된 DB 설정 키와 일치해야 한다.
- 트랜잭션 보장이 필요 없으면 `connectWithoutTransactionAsync` 를 쓰되, 이 경우 FK 위반 한글 메시지 치환이 없으므로 원본 DB 에러가 그대로 전파된다.
