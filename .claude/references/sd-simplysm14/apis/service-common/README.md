# @simplysm/service-common

서버·클라이언트가 공유하는 서비스 통신 계약. 바이너리 프로토콜(인코딩/청킹/재조립)과 메시지 타입, 서비스 인터페이스 타입(ORM·자동업데이트·업로드), 타입 안전 이벤트 정의, 앱 메뉴/권한 구조 모델을 한 패키지에 둔다. 구현체가 아니라 양쪽이 합의하는 타입·프로토콜만 제공한다.

## 사용 트리거 인덱스

- **서비스 프로토콜** — 서버·클라이언트 간 메시지를 바이너리로 인코딩/디코딩하거나, 3MB 초과 메시지의 청킹·재조립을 다룰 때. 메시지 타입·`PROTOCOL_CONFIG` 상수 포함. 자세히: [protocol.md](./protocol.md)
- **앱 구조 / 권한** — 메뉴 트리(`AppStructureItem`)를 정의하거나, 사용자 활성 모듈 기준으로 권한을 평탄화·필터링할 때. 자세히: [app-structure.md](./app-structure.md)
- **defineEvent / ServiceEventDef** — 서버·클라 공통 패키지에서 타입 안전 서비스 이벤트를 정의해 emit/구독에 쓸 때. (아래 인라인)
- **OrmService / DbConnOptions** — DB 연결·트랜잭션·쿼리 실행 서비스 시그니처를 구현/호출할 때. (아래 인라인)
- **AutoUpdateService** — 클라이언트 자동 업데이트 최신 버전 조회 서비스를 구현/호출할 때. (아래 인라인)
- **ServiceUploadResult** — 파일 업로드 응답 결과를 다룰 때. (아래 인라인)

## 이벤트 정의 (defineEvent / ServiceEventDef)

서버·클라이언트가 공유하는 공통 패키지에서 이벤트를 1회 정의해, 양쪽이 동일 객체를 import 해 emit/구독한다. 정의 객체를 그대로 `emitEvent`/`addListener` 에 넘기면 이름·info·data 타입이 자동 추론된다.

```ts
function defineEvent<TInfo = unknown, TData = unknown>(eventName: string): ServiceEventDef<TInfo, TData>;

interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;
  readonly $data: TData;
}
```

- `defineEvent` 의 `eventName: string` — 이벤트 식별 문자열. 서버/클라가 같은 정의를 import 하므로 충돌 없게 유일해야 함.
- `TInfo` — 구독자 필터링용 정보 타입(예: 특정 orderId 만 수신). 서버 emit 시 필터 함수가 받는 인자 타입.
- `TData` — 이벤트 페이로드 타입. 리스너 콜백이 받는 데이터 타입.
- `ServiceEventDef.eventName: string` — 런타임 식별자. emit/구독 매칭에 실제 사용되는 유일한 필드.
- `$info: TInfo` / `$data: TData` (readonly) — 타입 추출 전용 마커. 런타임 값은 `undefined`(미사용)이며 제네릭 추론용으로만 존재. 직접 읽지 말 것.

```ts
// 공통 패키지: 정의 + export
export const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");
// 서버: 정의 객체 전달 → 이름·타입 자동 추론
await server.emitEvent(OrderUpdated, (info) => info.orderId === 123, { status: "shipped" });
// 클라이언트: 구독 (data 타입 추론됨)
await client.addListener(OrderUpdated, { orderId: 123 }, async (data) => console.log(data.status));
```

## 서비스 인터페이스 타입

서버가 구현하고 클라이언트가 프록시로 호출하는 서비스 계약. 본 패키지는 타입만 제공한다.

### OrmService

DB 연결·트랜잭션·쿼리 실행. MySQL/MSSQL/PostgreSQL 지원. 인자는 `@simplysm/orm-common` 의 `Dialect`/`IsolationLevel`/`QueryDef`/`ColumnMeta`/`ResultMeta` 사용.

- `getInfo(opt: DbConnOptions & { configName: string }): Promise<{ dialect: Dialect; database?: string; schema?: string }>` — 연결 대상의 `dialect`/`database?`/`schema?` 메타 조회. `database`/`schema` 는 dialect 에 따라 없을 수 있어 optional(결측 그대로 전파). (`configName` 필수.)
- `connect(opt: DbConnOptions & { configName: string }): Promise<number>` — 연결 후 `connId`(이후 모든 호출에 쓸 연결 핸들) 반환. (`configName` 필수.)
- `close(connId: number): Promise<void>` — 해당 연결 해제.
- `beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>` — 트랜잭션 시작. `isolationLevel` 생략 시 드라이버 기본 격리수준.
- `commitTransaction(connId: number): Promise<void>` — 트랜잭션 커밋.
- `rollbackTransaction(connId: number): Promise<void>` — 트랜잭션 롤백.
- `executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>` — 파라미터 바인딩 raw SQL 직접 실행. 다중 결과셋이라 결과셋별 행 배열(`unknown[][]`) 반환. `params` 생략 시 바인딩 없는 평문 쿼리.
- `executeDefs(connId: number, defs: QueryDef[], options?: (ResultMeta | undefined)[]): Promise<unknown[][]>` — `QueryDef[]` 구조화 쿼리 일괄 실행. `options[i]` 는 `defs[i]` 결과의 `ResultMeta`(컬럼 타입 변환 지정); 메타 불필요한 def 자리엔 `undefined`(결측 보존, 빈 값 치환 금지).
- `bulkInsert(connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]): Promise<void>` — 대량 INSERT. `columnDefs`=컬럼명→`ColumnMeta`(타입/변환), `records`=컬럼명→값 객체 배열.

```ts
type DbConnOptions = { configName?: string; config?: Record<string, unknown> };
```

- `configName?: string` — 서버에 사전 등록된 DB 설정 이름 참조. `getInfo`/`connect` 시그니처에서는 `& { configName: string }` 으로 교차되어 필수가 됨.
- `config?: Record<string, unknown>` — 인라인 연결 설정 객체. 등록 이름 대신 직접 접속 정보를 줄 때.

### AutoUpdateService

클라이언트 앱의 최신 배포 버전을 조회하는 원격 서비스 인터페이스.

- `getLastVersion(platform: string): Promise<{ version: string; downloadPath: string } | undefined>` — `platform`(대상 OS 식별자, 예: `"win32"`/`"darwin"`/`"linux"`) 별 최신 버전 정보. 등록된 버전이 없으면 `undefined`(결측 그대로 전파, 빈 객체로 치환하지 않음). `version`=최신 버전 문자열, `downloadPath`=설치 파일 다운로드 경로.

## ServiceUploadResult

서버에 업로드된 파일 1건의 응답 정보.

```ts
interface ServiceUploadResult { path: string; filename: string; size: number; }
```

- `path: string` — 서버 내 저장 경로.
- `filename: string` — 원본 파일명(클라이언트가 보낸 이름).
- `size: number` — 파일 크기(바이트).
