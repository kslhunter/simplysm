# @simplysm/service-client — ORM 원격 실행

클라이언트에서 서버 `Orm` 서비스에 DB 연결을 위임하고 `DbContext` 콜백을 실행하는 API.
실제 DB 작업은 서버에서 일어나며, 클라이언트는 `connId` 기반으로 연결, 트랜잭션, 쿼리 호출을 RPC로 전달.
사용법: [client-orm.md](../../manuals/client-orm.md)

## OrmClientConnector

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

`ServiceClient` 기반 DB 연결 관리. 서버 ORM 서비스로 `connId` 기반 원격 실행.

- `serviceClient: ServiceClient` — 생성자 인자. 내부적으로 `getService<OrmService>("Orm")` 로 서버 ORM 서비스 획득.
- `connect<T, R>(config, callback): Promise<R>` — 트랜잭션 기반 DB 연결.
  - `config: OrmConnectOptions<T>` — DbContext 클래스, 연결 옵션, DB/schema 설정.
  - `callback: (db) => Promise<R> | R` — 생성된 DbContext로 실행할 콜백. 반환값이 메서드 반환값(`R`).
  - 동작: executor 생성 → `_createConfiguredDb(config)` → `db.connect(async () => callback(db))` → 결과 반환.
  - **FK 에러 변환** — callback 에서 throw 된 Error 메시지에 아래 대상 메시지 중 하나 포함 시 `SdError` 로 래핑해 throw.
    - throw 메시지: `"경고! 연관된 작업으로 인해 작업이 거부되었습니다. 후속 작업을 확인해 주세요."`
    - 다른 에러는 그대로 re-throw.
    - 대상 메시지:
      - MySQL: `a parent row: a foreign key constraint`
      - MSSQL: `conflicted with the REFERENCE`
      - PostgreSQL: `violates foreign key constraint`
- `connectWithoutTransaction<T, R>(config, callback): Promise<R>` — 트랜잭션 없이 DB 연결.
  - 동작: executor 생성 → `_createConfiguredDb(config)` → `db.connectWithoutTransaction(async () => callback(db))` → 결과 반환.
  - FK 에러 변환 적용 안 함.

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

DbContext 생성 및 연결 설정.

- `DbClass: new (...) => T` — 생성할 DbContext 클래스 생성자.
  - 인자 1: `executor: DbContextExecutor` — `OrmClientDbContextExecutor` 인스턴스 주입.
  - 인자 2: `opt: { database: string; schema?: string }` — DB/schema 설정.
  - 선택 값 우선순위: `dbContextOpt.database` → 서버 `getInfo().database`. 고른 값이 없거나 빈 문자열이면 `"database는 필수입니다."` throw.
  - schema: `dbContextOpt.schema` → 서버 `getInfo().schema`.
- `connOpt: DbConnOptions & { configName: string }` — 모든 서버 ORM 호출에 전달될 연결 옵션.
  - `configName: string` — 서버 설정 키. 이 패키지는 값을 해석하지 않고 서버 `OrmService` 호출에 그대로 넘김.
- `dbContextOpt?: { database?: string; schema?: string }` — DbContext 생성 옵션 override.
  - 미지정이면 `getInfo()` 결과로 보완.

## OrmClientDbContextExecutor

```ts
class OrmClientDbContextExecutor implements DbContextExecutor {
  constructor(client: ServiceClient, opt: DbConnOptions & { configName: string });
  getInfo(): Promise<{ dialect: Dialect; database?: string; schema?: string }>;
  connect(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  close(): Promise<void>;
  executeDefs<T>(defs: QueryDef[], options?: (ResultMeta | undefined)[]): Promise<T[][]>;
  executeParametrized(query: string, params?: unknown[]): Promise<unknown[][]>;
  bulkInsert(
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

`DbContextExecutor` 구현. 모든 메서드는 서버 `OrmService` RPC로 위임. 내부 `_connId?: number` 보관.

**메서드**:

- `getInfo(): Promise<{ dialect; database?; schema? }>` — 서버 DB 정보 조회. 트랜잭션 전(미연결 상태 호출).
  - `dialect: Dialect` — DB 방언(mysql, mssql, postgresql 등). 필수.
  - `database?: string` — 기본 데이터베이스명. 선택.
  - `schema?: string` — 기본 스키마명. 선택.
- `connect(): Promise<void>` — 서버에 연결. `connId` 를 `_connId` 에 저장.
- `beginTransaction(isolationLevel?): Promise<void>` — 트랜잭션 시작.
  - `isolationLevel?: IsolationLevel` — 격리 수준(예: `"read committed"`). 그대로 서버에 전달. 미지정이면 서버 기본값.
  - `_connId` 없으면 `"데이터베이스에 연결되지 않았습니다."` throw.
- `commitTransaction(): Promise<void>` — 트랜잭션 커밋. `_connId` 필수.
- `rollbackTransaction(): Promise<void>` — 트랜잭션 롤백. `_connId` 필수.
- `close(): Promise<void>` — 연결 종료 후 `_connId = undefined`. `_connId` 필수.
- `executeDefs<T>(defs, options?): Promise<T[][]>` — 쿼리 정의 실행.
  - `defs: QueryDef[]` — 실행할 쿼리 정의 배열.
  - `options?: (ResultMeta | undefined)[]` — 쿼리별 결과 메타. `undefined` 항목 가능.
  - 반환: `T[][]` — 쿼리별 결과 행 배열 배열.
  - `_connId` 필수.
- `executeParametrized(query, params?): Promise<unknown[][]>` — 파라미터 쿼리 실행.
  - `query: string` — SQL 문자열.
  - `params?: unknown[]` — 파라미터 배열. 미지정이면 파라미터 없음.
  - 반환: `unknown[][]` — 결과 행 배열 배열.
  - `_connId` 필수.
- `bulkInsert(tableName, columnDefs, records): Promise<void>` — 일괄 삽입.
  - `tableName: string` — 삽입 대상 테이블명.
  - `columnDefs: Record<string, ColumnMeta>` — 컬럼명 → 메타 정보. 서버가 스키마, 타입 매칭에 사용.
  - `records: Record<string, unknown>[]` — 삽입할 행 객체 배열. 각 행은 컬럼명 키로 값 포함.
  - `_connId` 필수.

**내부 동작**:

- 모든 메서드는 `_connId` 필수(getInfo 제외) — `_connId` 없으면 `"데이터베이스에 연결되지 않았습니다."` throw.
- RPC 호출은 `getService<OrmService>("Orm")` → 메서드명 호출 형태로 전달.
- `connect()` 후 반환된 `connId` 를 `_connId` 에 저장해 이후 메서드들이 사용.
