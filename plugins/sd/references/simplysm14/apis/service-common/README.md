# @simplysm/service-common

서버·클라이언트가 공유하는 서비스 통신 계약. 실시간 이벤트 정의(`defineEvent`), 내장 RPC 서비스 인터페이스 시그니처, 앱 메뉴·권한·모듈 구조(`AppStructure`), WebSocket 바이너리 프로토콜·메시지 타입을 한곳에 둔다. 발생측·구독측 또는 서버·클라이언트가 같은 정의 객체·타입을 import 해 쓰는 게 핵심.

## 사용 트리거 인덱스

- **defineEvent / ServiceEventDef** — 서버↔클라이언트 또는 클라이언트끼리 실시간 이벤트(알림)를 주고받을 때 공통 패키지에서 이벤트를 정의·export. 정의 객체를 발생·구독 호출에 그대로 넘김.
- **OrmService / DbConnOptions** — 서버가 구현하고 클라이언트가 프록시로 호출하는 내장 ORM RPC 서비스의 메서드 시그니처를 참조할 때.
- **AutoUpdateService** — 클라이언트 앱의 최신 버전 정보를 서버에 질의하는 내장 RPC 서비스 시그니처를 참조할 때.
- **ServiceUploadResult** — 파일 업로드 응답 형태를 받아 처리할 때.
- **AppStructure (앱 구조·권한·모듈)** — 앱 메뉴 트리·화면 권한·기능 모듈 on/off 를 한 배열로 정의하거나, 그 배열에서 평탄 권한 목록을 뽑거나 모듈 활성 여부를 판정할 때. 자세히: [app-structure.md](./app-structure.md)
- **WebSocket 프로토콜 (메시지·바이너리)** — WebSocket 위 메시지의 인코딩·청킹·재조립을 직접 다루거나(서비스 클라이언트/서버 내부, worker 위임), 메시지 타입·크기 한계를 확인할 때. 자세히: [protocol.md](./protocol.md)

## 이벤트 정의 (defineEvent / ServiceEventDef)

서버↔클라이언트 실시간 알림의 단일 소스. 공통 패키지에서 한 번 정의해 export 하고, 발생측·구독측이 같은 정의 객체를 값으로 import 한다. 이름·타입이 객체에서 자동 추론되므로 호출부에 문자열 이름이나 `<typeof X>` 를 따로 적지 않는다.

### defineEvent

```ts
function defineEvent<TInfo = unknown, TData = unknown>(eventName: string): ServiceEventDef<TInfo, TData>
```

- `TInfo` (제네릭) — 구독자가 "무엇을 구독하는지" 식별하는 메타데이터 타입. 발생측 selector 가 이 값을 보고 전달 대상을 골라냄. 미지정 시 `unknown`.
- `TData` (제네릭) — 이벤트가 실어 나르는 페이로드 타입. 구독 콜백이 받는 인자 타입. 미지정 시 `unknown`.
- `eventName` (인자) — 라우팅 키 문자열. `ServiceEventDef.eventName` 에 그대로 들어가며 런타임에 실제로 쓰이는 유일한 값. 같은 이름이면 같은 이벤트로 취급되므로 앱 내에서 고유해야 함.
- 반환된 `ServiceEventDef` 를 그대로 발생·구독 API 의 첫 인자로 넘기면 이름·타입이 추론됨.

```ts
import { defineEvent } from "@simplysm/service-common";

// 공통 패키지(@<workspace>/common)에서 정의 + export
export const OrderStatusChangedEvent = defineEvent<
  { warehouseId: number },              // TInfo: 구독·필터 기준 메타데이터
  { orderId: number; status: string }   // TData: 전달 페이로드
>("OrderStatusChanged");
```

발생·구독은 `@simplysm/service-client`(`addListener`/`emitEvent`/`getEvent`) 또는 서버 `ctx.server.emitEvent` 로 한다. 여기서는 정의만 담당한다.

### ServiceEventDef

```ts
interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;
  readonly $data: TData;
}
```

- `eventName: string` — 라우팅 키. `defineEvent` 인자가 그대로 들어가며 런타임에 실제로 쓰이는 유일한 값.
- `$info: TInfo` (readonly) — `TInfo` 타입 추출 전용 마커. 런타임 값은 `undefined`(사용되지 않음). 발생·구독 API 가 이 마커로 `TInfo` 를 끌어다 씀. 직접 읽지 말 것.
- `$data: TData` (readonly) — `TData` 타입 추출 전용 마커. 런타임 값은 `undefined`(사용되지 않음). 직접 읽지 말 것.

## 내장 RPC 서비스 시그니처 (OrmService / AutoUpdateService)

서버가 구현하고 클라이언트가 프록시로 호출하는 내장 서비스의 메서드 계약. 직접 구현하기보다 시그니처(인자·반환)를 확인할 때 참조. 클라이언트 호출은 `client.getService<...>("...")` 프록시 경유.

### OrmService

데이터베이스 연결·트랜잭션·쿼리 실행을 제공하는 서비스 인터페이스. MySQL/MSSQL/PostgreSQL 지원.

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

- `getInfo(opt)` — 연결 설정의 dialect/database/schema 메타를 조회. `database`/`schema` 는 dialect 에 따라 없을 수 있어 optional. 연결을 열지 않고 설정 메타만 볼 때.
- `connect(opt)` — DB 에 연결하고 커넥션 id(`number`)를 반환. 이후 모든 메서드는 이 id 로 대상 커넥션을 지정.
- `close(connId)` — 해당 커넥션을 닫음. 작업 종료 시 호출.
- `beginTransaction(connId, isolationLevel?)` — 트랜잭션 시작. `isolationLevel` 미지정 시 DB 기본 격리수준. 격리수준을 지정해야 할 때만 인자 전달.
- `commitTransaction(connId)` — 트랜잭션 확정.
- `rollbackTransaction(connId)` — 트랜잭션 취소.
- `executeParametrized(connId, query, params?)` — 파라미터 바인딩 raw SQL 직접 실행. `params` 는 플레이스홀더에 순서대로 바인딩(없으면 바인딩 없는 쿼리). 결과는 결과셋별 행 배열(`unknown[][]`).
- `executeDefs(connId, defs, options?)` — ORM 코어가 만든 `QueryDef` 배열을 일괄 실행. `options[i]` 는 `defs[i]` 결과셋의 컬럼 파싱 메타(`ResultMeta`)로, 메타 불필요한 def 자리는 `undefined`.
- `bulkInsert(connId, tableName, columnDefs, records)` — 다건 레코드 대량 삽입. `columnDefs` 는 컬럼명→`ColumnMeta` 매핑, `records` 는 삽입할 행 배열.

`Dialect`/`IsolationLevel`/`QueryDef`/`ColumnMeta`/`ResultMeta` 는 `@simplysm/orm-common` 타입.

### DbConnOptions

```ts
type DbConnOptions = { configName?: string; config?: Record<string, unknown> }
```

- `configName?: string` — 서버에 등록된 DB 연결 설정의 이름. 이 이름으로 서버가 접속 정보를 찾음. `getInfo`/`connect` 는 이 필드를 필수로 교차해(`& { configName: string }`) 받음.
- `config?: Record<string, unknown>` — 등록 설정 대신 직접 넘기는 즉석 접속 설정 객체. `configName` 으로 가리킬 수 없을 때 사용.

### AutoUpdateService

클라이언트 앱의 최신 버전 정보를 조회하는 서비스 인터페이스.

```ts
interface AutoUpdateService {
  getLastVersion(platform: string): Promise<{ version: string; downloadPath: string } | undefined>;
}
```

- `getLastVersion(platform)` — 지정 플랫폼(예: `"win32"`·`"darwin"`·`"linux"`)의 최신 버전·다운로드 경로를 조회. 등록된 버전이 없으면 `undefined`(결측 보존).

## 파일 업로드 결과 (ServiceUploadResult)

```ts
interface ServiceUploadResult {
  path: string;
  filename: string;
  size: number;
}
```

- `path: string` — 업로드된 파일이 서버에 저장된 경로. 업로드 후 그 파일을 참조·연결할 때.
- `filename: string` — 클라이언트가 올린 원본 파일명. 표시·재다운로드 명칭에 사용.
- `size: number` — 파일 크기(바이트). 용량 표시·검증에 사용.
