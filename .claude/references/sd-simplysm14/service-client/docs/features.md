# Features

## `EventClient`

서버 이벤트 구독/발행 인터페이스. 재연결 시 자동 재구독된다.

```typescript
export interface EventClient {
  addListener<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    info: TInfo,
    cb: (data: TData) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emit<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
  resubscribeAll(): Promise<void>;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `addListener(eventDef, info, cb)` | `Promise<string>` | 이벤트 리스너 등록. 반환값은 `key` (제거 시 사용) |
| `removeListener(key)` | `Promise<void>` | 등록된 이벤트 리스너 제거 |
| `emit(eventDef, infoSelector, data)` | `Promise<void>` | 서버의 이벤트 리스너 중 `infoSelector`가 참인 대상에게 데이터 발행 |
| `resubscribeAll()` | `Promise<void>` | 재연결 시 모든 리스너를 서버에 재등록. `ServiceClient`가 자동 호출 |

## `createEventClient`

`EventClient` 팩토리 함수.

```typescript
export function createEventClient(transport: ServiceTransport): EventClient;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `transport` | `ServiceTransport` | 서비스 전송 계층 |

## `FileClient`

파일 업로드(POST)/다운로드(GET) 인터페이스.

```typescript
export interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(
    files: File[] | FileCollection | { name: string; data: BlobInput }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]>;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `download(relPath)` | `Promise<Bytes>` | `GET {hostUrl}{relPath}`로 파일 다운로드. `Uint8Array` 반환 |
| `upload(files, authToken)` | `Promise<ServiceUploadResult[]>` | `POST {hostUrl}/upload`로 파일 업로드. `multipart/form-data` 사용 |

`upload` 파라미터:

| Parameter | Type | Description |
|-----------|------|-------------|
| `files` | `File[] \| FileCollection \| { name: string; data: BlobInput }[]` | 업로드할 파일 목록 |
| `authToken` | `string` | 인증 토큰 (`Authorization: Bearer {token}` 헤더로 전송) |

## `createFileClient`

`FileClient` 팩토리 함수.

```typescript
export function createFileClient(hostUrl: string, clientName: string): FileClient;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `hostUrl` | `string` | 서버 기본 URL (`http://host:port` 형식) |
| `clientName` | `string` | 클라이언트 식별자 (`x-sd-client-name` 헤더로 전송) |

## `OrmConnectOptions`

ORM 원격 연결에 필요한 옵션 인터페이스.

```typescript
export interface OrmConnectOptions<T extends DbContext> {
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `DbClass` | `new (...) => T` | 사용할 `DbContext` 서브클래스 생성자 |
| `connOpt` | `DbConnOptions & { configName: string }` | DB 연결 옵션. `configName`은 서버 설정 키 |
| `dbContextOpt` | `{ database: string; schema: string }?` | DB 컨텍스트 옵션. 생략하면 서버에서 조회한 `info.database`/`info.schema` 사용 |

## `OrmClientConnector`

`DbContext` 트랜잭션 연결을 원격 서버에서 실행하는 헬퍼 인터페이스.

```typescript
export interface OrmClientConnector {
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

| Member | Type | Description |
|--------|------|-------------|
| `connect(config, callback)` | `Promise<R>` | 트랜잭션 모드로 연결. FK 제약 위반 시 사용자 친화적 에러 메시지로 변환 |
| `connectWithoutTransaction(config, callback)` | `Promise<R>` | 트랜잭션 없이 연결 |

## `createOrmClientConnector`

`OrmClientConnector` 팩토리 함수.

```typescript
export function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `serviceClient` | `ServiceClient` | 이미 연결된 서비스 클라이언트 |

사용 예:

```typescript
const connector = createOrmClientConnector(client);

const result = await connector.connect(
  { DbClass: MyDbContext, connOpt: { configName: "main" } },
  async (db) => {
    return db.myTable.select((item) => ({ id: item.id, name: item.name }));
  },
);
```

## `OrmClientDbContextExecutor`

`DbContextExecutor` 인터페이스 구현체. `DbContext`의 쿼리 실행을 서버 `OrmService`에 원격 호출한다. 직접 사용보다 `createOrmClientConnector`를 통해 사용하는 것을 권장한다.

```typescript
export class OrmClientDbContextExecutor implements DbContextExecutor {
  constructor(
    private readonly _client: ServiceClient,
    private readonly _opt: DbConnOptions & { configName: string },
  );
  async getInfo(): Promise<{ dialect: Dialect; database?: string; schema?: string }>;
  async connect(): Promise<void>;
  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  async commitTransaction(): Promise<void>;
  async rollbackTransaction(): Promise<void>;
  async close(): Promise<void>;
  async executeDefs<T = Record<string, unknown>>(
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
  async executeParametrized(query: string, params?: unknown[]): Promise<unknown[][]>;
  async bulkInsert(
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `getInfo()` | 서버에서 DB dialect, database, schema 조회 |
| `connect()` | 서버에서 DB 연결 생성. `_connId` 할당 |
| `beginTransaction(isolationLevel?)` | 트랜잭션 시작 |
| `commitTransaction()` | 트랜잭션 커밋 |
| `rollbackTransaction()` | 트랜잭션 롤백 |
| `close()` | DB 연결 종료 및 `_connId` 해제 |
| `executeDefs(defs, options?)` | QueryDef 배열을 서버에서 실행 |
| `executeParametrized(query, params?)` | 파라미터화된 쿼리를 서버에서 실행 |
| `bulkInsert(tableName, columnDefs, records)` | 대량 INSERT를 서버에서 실행 |
