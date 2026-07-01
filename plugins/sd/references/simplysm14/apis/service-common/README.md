# @simplysm/service-common

서버·클라이언트가 공유하는 서비스 이벤트 정의, 내장 서비스(ORM·자동업데이트) RPC 계약, 파일 업로드 결과 타입, 앱 메뉴/권한 구조 타입·유틸, 그리고 서비스 WebSocket 바이너리 프로토콜 메시지 타입·코덱을 제공한다.

## 사용 트리거 인덱스

- **defineEvent / ServiceEventDef** — 서비스 이벤트 이름과 info/data 타입을 한 정의 객체로 묶어 클라이언트·서버가 공유할 때. 아래 "이벤트 정의" 절. 사용법: [event.md](../../manuals/event.md), [client-service.md](../../manuals/client-service.md)
- **OrmService / DbConnOptions** — 내장 ORM 서비스의 연결·트랜잭션·쿼리 실행 RPC 시그니처를 확인할 때. 아래 "내장 서비스 계약" 절. 사용법: [client-orm.md](../../manuals/client-orm.md), [orm.md](../../manuals/orm.md)
- **AutoUpdateService** — 플랫폼별 최신 앱 버전 조회 서비스의 RPC 시그니처를 확인할 때. 아래 "내장 서비스 계약" 절.
- **ServiceUploadResult** — 파일 업로드 완료 후 서버 저장 경로·원본 파일명·크기를 받는 응답 타입을 확인할 때. 아래 "파일 업로드 결과" 절.
- **AppStructure 타입·유틸** — 앱 메뉴/권한/모듈 구조 타입과 권한 평탄화·모듈 사용 가능 판정 유틸을 다룰 때. 자세히: [app-structure.md](./app-structure.md). 사용법: [client-app-structure.md](../../manuals/client-app-structure.md)
- **Service protocol** — 서비스 WebSocket 메시지 타입, 청킹 상수, 바이너리 인코딩·재조립 코덱을 다룰 때. 자세히: [protocol.md](./protocol.md)

## 이벤트 정의

서비스 이벤트의 이름과 info/data 타입을 한 객체로 정의한다. `$info`/`$data` 는 JSDoc 기준 런타임에서는 사용되지 않는 타입 추출 전용 마커이고, 런타임 값은 `eventName` 뿐이다.

### defineEvent

```ts
function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string,
): ServiceEventDef<TInfo, TData>;
```

- `TInfo = unknown` — 반환 객체 `$info` 마커의 타입. 이벤트 구독 필터 정보(info)의 타입을 지정할 때 쓴다.
- `TData = unknown` — 반환 객체 `$data` 마커의 타입. 이벤트 데이터(data)의 타입을 지정할 때 쓴다.
- `eventName: string` — 반환 객체의 `eventName` 필드에 그대로 저장되는 이벤트 이름.
- 반환값 — `{ eventName, $info: undefined, $data: undefined }`. 본문에서 `$info`/`$data` 는 `undefined` 를 해당 제네릭으로 캐스팅한 값이라 런타임에는 항상 `undefined` 이다.

### ServiceEventDef

```ts
interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;
  readonly $data: TData;
}
```

- `eventName: string` — `defineEvent` 인자가 저장되는 이벤트 이름 필드.
- `$info: TInfo` (readonly) — info 타입 추출 전용 마커. JSDoc 기준 런타임에서는 사용되지 않는다.
- `$data: TData` (readonly) — data 타입 추출 전용 마커. JSDoc 기준 런타임에서는 사용되지 않는다.

## 내장 서비스 계약

서버가 구현하고 클라이언트가 RPC 로 호출하는 내장 서비스 인터페이스다. 메서드 본문은 이 패키지에 없고 타입 계약만 정의한다.

### OrmService

DB 연결·트랜잭션·쿼리 실행을 제공하는 ORM 서비스 인터페이스. JSDoc 기준 MySQL·MSSQL·PostgreSQL 을 지원한다.

```ts
interface OrmService {
  getInfo(
    opt: DbConnOptions & { configName: string },
  ): Promise<{ dialect: Dialect; database?: string; schema?: string }>;
  connect(opt: DbConnOptions & { configName: string }): Promise<number>;
  close(connId: number): Promise<void>;
  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;
  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  executeDefs(
    connId: number,
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<unknown[][]>;
  bulkInsert(
    connId: number,
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

- `getInfo(opt)` — DB 연결 정보를 조회한다. `opt` 는 `DbConnOptions` 에 `configName: string` 필수가 더해진 교차 타입. 반환의 `dialect: Dialect` 는 DB dialect, `database?`/`schema?` 는 결과에 포함될 수 있는 DB명·스키마명.
- `connect(opt)` — DB 연결을 생성한다. `opt` 는 `getInfo` 와 같은 교차 타입. 반환 `number` 는 이후 메서드의 `connId` 로 쓰는 연결 식별자.
- `close(connId)` — `connId` 연결을 종료한다.
- `beginTransaction(connId, isolationLevel?)` — `connId` 연결에서 트랜잭션을 시작한다. `isolationLevel?: IsolationLevel` 은 선택 격리 수준.
- `commitTransaction(connId)` — `connId` 연결의 트랜잭션을 커밋한다.
- `rollbackTransaction(connId)` — `connId` 연결의 트랜잭션을 롤백한다.
- `executeParametrized(connId, query, params?)` — 파라미터화 문자열 쿼리를 실행한다. `query: string` 은 SQL, `params?: unknown[]` 은 선택 파라미터 배열, 반환 `unknown[][]` 은 결과 행/컬럼 값 배열.
- `executeDefs(connId, defs, options?)` — 쿼리 정의 배열을 실행한다. `defs: QueryDef[]` 는 실행 정의, `options?: (ResultMeta | undefined)[]` 는 정의별 결과 메타(없으면 `undefined`), 반환 `unknown[][]` 은 결과 행/컬럼 값 배열.
- `bulkInsert(connId, tableName, columnDefs, records)` — 대량 insert 를 수행한다. `tableName: string` 은 대상 테이블, `columnDefs: Record<string, ColumnMeta>` 는 컬럼명→컬럼 메타 맵, `records: Record<string, unknown>[]` 은 삽입 레코드 배열.

### DbConnOptions

```ts
type DbConnOptions = { configName?: string; config?: Record<string, unknown> };
```

- `configName?: string` — 연결 설정 이름. 자체로는 선택이지만 `OrmService.getInfo`/`connect` 인자에서는 `& { configName: string }` 으로 필수가 된다.
- `config?: Record<string, unknown>` — 인라인 연결 설정 값을 담는 임의 키 객체.

### AutoUpdateService

클라이언트 앱의 최신 버전 정보를 조회하는 자동 업데이트 서비스 인터페이스.

```ts
interface AutoUpdateService {
  getLastVersion(platform: string): Promise<{ version: string; downloadPath: string } | undefined>;
}
```

- `getLastVersion(platform)` — 지정 플랫폼의 최신 버전 정보를 조회한다. `platform: string` 은 대상 플랫폼(JSDoc 예: `"win32"`, `"darwin"`, `"linux"`).
- 반환 `version: string` — 최신 버전 문자열.
- 반환 `downloadPath: string` — 최신 버전 다운로드 경로.
- 반환 `undefined` — JSDoc 기준 해당 플랫폼의 버전 정보가 없을 때.

## 파일 업로드 결과

### ServiceUploadResult

서버에 업로드된 파일 정보를 담는 응답 타입.

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
