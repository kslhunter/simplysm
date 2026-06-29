# @simplysm/service-common

서버·클라이언트가 공유하는 서비스 이벤트 정의, 내장 서비스 계약, 앱 구조 타입, WebSocket 바이너리 프로토콜 타입·코덱을 제공한다.

## 사용 트리거 인덱스

- **defineEvent / ServiceEventDef** — 서비스 이벤트 이름과 info/data 타입 마커를 공통 정의 객체로 만들 때. 사용법: [event.md](../../manuals/event.md), [client-service.md](../../manuals/client-service.md)
- **OrmService / DbConnOptions** — 내장 ORM 서비스의 연결·트랜잭션·쿼리 실행 RPC 시그니처를 확인할 때. 사용법: [client-orm.md](../../manuals/client-orm.md), [orm.md](../../manuals/orm.md)
- **AutoUpdateService** — 플랫폼별 최신 앱 버전 조회 서비스의 RPC 시그니처를 확인할 때.
- **ServiceUploadResult** — 업로드 완료 후 서버 저장 경로·원본 파일명·크기를 받는 응답 타입을 확인할 때.
- **AppStructure** — 앱 메뉴/권한/모듈 구조 타입과 권한 평탄화·모듈 사용 가능 여부 유틸을 다룰 때. 자세히: [app-structure.md](./app-structure.md). 사용법: [client-app-structure.md](../../manuals/client-app-structure.md)
- **Service protocol** — 서비스 WebSocket 메시지 타입, 청킹 설정, 인코딩·재조립 코덱을 다룰 때. 자세히: [protocol.md](./protocol.md)

## 이벤트 정의

### defineEvent

```ts
function defineEvent<TInfo = unknown, TData = unknown>(eventName: string): ServiceEventDef<TInfo, TData>
```

- `TInfo = unknown` — `$info` 타입 마커에 들어가는 제네릭. 런타임 값으로는 사용되지 않고 타입 추출용으로만 남는다.
- `TData = unknown` — `$data` 타입 마커에 들어가는 제네릭. 런타임 값으로는 사용되지 않고 타입 추출용으로만 남는다.
- `eventName: string` — 반환 객체의 `eventName` 필드에 저장되는 이벤트 이름 문자열.
- 반환값: `ServiceEventDef<TInfo, TData>` — `eventName`, `$info`, `$data` 를 가진 이벤트 정의 객체.

### ServiceEventDef

```ts
interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;
  readonly $data: TData;
}
```

- `eventName: string` — `defineEvent(eventName)` 의 인자가 그대로 저장되는 이름 필드.
- `$info: TInfo` — info 타입 추출 전용 readonly 마커. JSDoc 기준 런타임에서는 사용되지 않는다.
- `$data: TData` — data 타입 추출 전용 readonly 마커. JSDoc 기준 런타임에서는 사용되지 않는다.

## 내장 서비스 계약

### OrmService

```ts
interface OrmService {
  getInfo(opt: DbConnOptions & { configName: string }): Promise<{ dialect: Dialect; database?: string; schema?: string }>;
  connect(opt: DbConnOptions & { configName: string }): Promise<number>;
  close(connId: number): Promise<void>;
  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;
  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  executeDefs(connId: number, defs: QueryDef[], options?: (ResultMeta | undefined)[]): Promise<unknown[][]>;
  bulkInsert(connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]): Promise<void>;
}
```

- `getInfo(opt)` — DB 연결 정보 조회 RPC. 반환 `dialect: Dialect` 는 DB dialect, `database?: string`/`schema?: string` 은 결과에 포함될 수 있는 DB명·스키마명.
- `connect(opt)` — DB 연결 생성 RPC. 반환 `number` 는 이후 메서드의 `connId` 로 쓰이는 연결 식별자.
- `close(connId)` — `connId: number` 연결 식별자를 받는 연결 종료 RPC.
- `beginTransaction(connId, isolationLevel?)` — `connId` 연결에서 트랜잭션을 시작하는 RPC. `isolationLevel?: IsolationLevel` 은 선택 격리 수준.
- `commitTransaction(connId)` — `connId` 연결의 트랜잭션 커밋 RPC.
- `rollbackTransaction(connId)` — `connId` 연결의 트랜잭션 롤백 RPC.
- `executeParametrized(connId, query, params?)` — 문자열 쿼리 실행 RPC. `query: string` 은 실행 SQL, `params?: unknown[]` 는 선택 파라미터 배열, 반환은 행/컬럼 값 배열 `unknown[][]`.
- `executeDefs(connId, defs, options?)` — `QueryDef[]` 실행 RPC. `defs: QueryDef[]` 는 실행 정의 배열, `options?: (ResultMeta | undefined)[]` 는 정의별 결과 메타 옵션 배열, 반환은 행/컬럼 값 배열 `unknown[][]`.
- `bulkInsert(connId, tableName, columnDefs, records)` — 대량 insert RPC. `tableName: string` 은 대상 테이블명, `columnDefs: Record<string, ColumnMeta>` 는 컬럼 메타 맵, `records: Record<string, unknown>[]` 는 삽입 레코드 배열.

### DbConnOptions

```ts
type DbConnOptions = { configName?: string; config?: Record<string, unknown> }
```

- `configName?: string` — 연결 설정 이름 필드. `OrmService.getInfo`/`connect` 인자에서는 교차 타입으로 필수(`{ configName: string }`)가 된다.
- `config?: Record<string, unknown>` — 연결 설정 값을 담는 임의 키 객체.

### AutoUpdateService

```ts
interface AutoUpdateService {
  getLastVersion(platform: string): Promise<{ version: string; downloadPath: string } | undefined>;
}
```

- `getLastVersion(platform)` — 지정 플랫폼의 최신 버전 정보 조회 RPC. `platform: string` 은 대상 플랫폼 문자열.
- 반환 `version: string` — 최신 버전 문자열.
- 반환 `downloadPath: string` — 최신 버전 다운로드 경로 문자열.
- 반환 `undefined` — JSDoc 기준 해당 플랫폼의 버전 정보가 없을 때의 결과.

## 파일 업로드 결과

### ServiceUploadResult

```ts
interface ServiceUploadResult {
  path: string;
  filename: string;
  size: number;
}
```

- `path: string` — 서버 내 저장 경로.
- `filename: string` — 원본 파일명.
- `size: number` — 파일 크기(바이트).
