# @simplysm/service-common

서버·클라이언트가 공유하는 서비스 통신 계약. 이벤트 정의, RPC 서비스 인터페이스, 앱 메뉴·권한 구조, 바이너리 와이어 프로토콜을 한곳에 둔다. 발생측·구독측 또는 서버·클라이언트가 같은 정의 객체·타입을 import 해 쓰는 게 핵심.

## 사용 트리거 인덱스

- **defineEvent / ServiceEventDef** — 서버↔클라이언트 또는 클라이언트끼리 실시간 이벤트(알림)를 주고받을 때 공통 패키지에서 이벤트를 정의. 정의 객체를 발생·구독 호출에 그대로 넘김.
- **OrmService / AutoUpdateService / DbConnOptions** — 서버가 구현하고 클라이언트가 프록시로 호출하는 내장 RPC 서비스의 메서드 시그니처를 참조할 때.
- **ServiceUploadResult** — 파일 업로드 응답 형태를 받아 처리할 때.
- **앱 구조(AppStructure)** — 앱 메뉴 트리·화면 권한·기능 모듈 on/off 를 한 배열로 정의하거나, 그 배열에서 평탄 권한 목록을 뽑거나 모듈 활성 여부를 판정할 때. 자세히: [app-structure.md](./app-structure.md)
- **서비스 프로토콜(Protocol)** — WebSocket 위 메시지의 인코딩·청킹·재조립을 직접 다루거나(서비스 클라이언트/서버 내부, worker 위임), 메시지 타입·크기 한계를 확인할 때. 자세히: [protocol.md](./protocol.md)

## 이벤트 정의 (defineEvent / ServiceEventDef)

서버↔클라이언트 실시간 알림의 단일 소스. 공통 패키지에서 한 번 정의해 export 하고, 발생측·구독측이 같은 정의 객체를 값으로 import 한다. 이름·타입이 객체에서 자동 추론되므로 호출부에 문자열 이름이나 `<typeof X>` 를 따로 적지 않는다.

### defineEvent

```ts
function defineEvent<TInfo = unknown, TData = unknown>(eventName: string): ServiceEventDef<TInfo, TData>
```

- `TInfo` — 구독자가 "무엇을 구독하는지" 식별하는 메타데이터 타입. 발생측 selector 가 이 값을 보고 전달 대상을 골라냄. 예: `{ warehouseId: number }`.
- `TData` — 이벤트가 실어 나르는 페이로드 타입. 구독 콜백이 받는 인자 타입. 예: `{ orderId: number; status: string }`.
- `eventName` — 라우팅 키 문자열. 같은 이름이면 같은 이벤트로 취급되므로 앱 내에서 고유해야 함.
- 반환된 `ServiceEventDef` 를 그대로 발생·구독 API 의 첫 인자로 넘기면 이름·타입이 추론됨.

```ts
// 공통 패키지(@<workspace>/common)에서 정의 + export
import { defineEvent } from "@simplysm/service-common";

export const OrderStatusChangedEvent = defineEvent<
  { warehouseId: number },              // TInfo
  { orderId: number; status: string }   // TData
>("OrderStatusChanged");
```

발생·구독은 `@simplysm/service-client`(`addListener`/`emitEvent`/`getEvent`) 또는 서버 `ctx.server.emitEvent` 로 한다. 메커니즘 전반은 매뉴얼 `manuals/event.md` 참조.

### ServiceEventDef

```ts
interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;   // 타입 추출 전용 마커. 런타임 미사용.
  readonly $data: TData;   // 타입 추출 전용 마커. 런타임 미사용.
}
```

- `eventName` — 라우팅 키. `defineEvent` 인자가 그대로 들어감.
- `$info` / `$data` — 타입 추론용 phantom 필드. 런타임 값은 `undefined`. 발생·구독 API 가 이 마커로 `TInfo`/`TData` 를 끌어다 씀. 직접 읽지 말 것.

## 내장 RPC 서비스 인터페이스 (OrmService / AutoUpdateService / DbConnOptions)

서버가 구현하고 클라이언트가 프록시로 호출하는 내장 서비스의 메서드 계약. 직접 구현하기보다, 시그니처(인자·반환)를 확인할 때 참조. 클라이언트 호출은 `client.getService<...>("...")` 프록시 경유.

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

- `getInfo(opt)` — 연결 설정의 dialect/database/schema 메타를 조회. `database`/`schema` 는 설정에 따라 없을 수 있어 optional. 연결 없이 설정만 확인할 때.
- `connect(opt)` — DB 에 연결하고 커넥션 id(`number`)를 반환. 이후 모든 메서드는 이 id 로 대상 커넥션을 지정.
- `close(connId)` — 해당 커넥션을 닫음. 작업 종료 시 호출.
- `beginTransaction(connId, isolationLevel?)` — 트랜잭션 시작. `isolationLevel` 미지정 시 DB 기본 격리수준. 격리수준을 지정해야 할 때만 인자 전달.
- `commitTransaction(connId)` / `rollbackTransaction(connId)` — 트랜잭션 확정/취소.
- `executeParametrized(connId, query, params?)` — 파라미터 바인딩 SQL 을 직접 실행. 결과는 결과셋별 행 배열(`unknown[][]`). `params` 없으면 바인딩 없는 쿼리.
- `executeDefs(connId, defs, options?)` — QueryDef(구조화 쿼리 정의) 배열을 실행. `options` 의 `ResultMeta` 로 각 결과셋의 타입 메타를 지정(요소 단위 생략 가능). 빌더가 만든 쿼리를 일괄 실행할 때.
- `bulkInsert(connId, tableName, columnDefs, records)` — 다건 레코드를 대량 삽입. `columnDefs` 는 컬럼명→`ColumnMeta` 매핑(타입·인코딩 정보). 대량 적재 경로.

`Dialect`/`IsolationLevel`/`QueryDef`/`ColumnMeta`/`ResultMeta` 는 `@simplysm/orm-common` 타입.

### DbConnOptions

```ts
type DbConnOptions = { configName?: string; config?: Record<string, unknown> }
```

- `configName` — 서버에 등록된 DB 연결 설정의 이름으로 연결 대상 선택. 등록된 설정을 쓸 때. (`getInfo`/`connect` 는 `configName` 필수로 좁혀 받음.)
- `config` — 등록 설정 대신 즉석 연결 설정 객체를 직접 전달할 때.

### AutoUpdateService

클라이언트 앱의 최신 버전 정보를 조회하는 서비스 인터페이스.

```ts
interface AutoUpdateService {
  getLastVersion(platform: string): Promise<{ version: string; downloadPath: string } | undefined>;
}
```

- `getLastVersion(platform)` — 지정 플랫폼의 최신 버전·다운로드 경로를 조회. 버전이 없으면 `undefined`(결측 보존). `platform` 예: `"win32"`, `"darwin"`, `"linux"`.

## 파일 업로드 결과 (ServiceUploadResult)

```ts
interface ServiceUploadResult {
  path: string;      // 서버 내 저장 경로
  filename: string;  // 원본 파일명
  size: number;      // 파일 크기 (바이트)
}
```

- `path` — 업로드된 파일이 서버에 저장된 경로. 업로드 후 그 파일을 참조·연결할 때.
- `filename` — 클라이언트가 올린 원본 파일명. 표시·재다운로드 명칭에 사용.
- `size` — 파일 크기(바이트). 용량 표시·검증에 사용.
