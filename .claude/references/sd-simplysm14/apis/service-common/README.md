# @simplysm/service-common

서버·클라이언트가 공유하는 서비스 통신 계약. 바이너리 프로토콜(인코딩/청킹/재조립), 서비스 인터페이스 타입(ORM·자동업데이트·업로드), 타입 안전 이벤트 정의, 앱 메뉴/권한 구조 모델을 한 패키지에 둔다.

## 사용 트리거 인덱스

- **서비스 프로토콜** — 서버·클라이언트 간 메시지를 바이너리로 인코딩/디코딩하거나, 3MB 초과 메시지의 청킹·재조립을 다룰 때. 메시지 타입·`PROTOCOL_CONFIG` 상수 포함. (자세히: [protocol.md](./protocol.md))
- **앱 구조 / 권한** — 메뉴 트리(`AppStructureItem`)를 정의하거나, 사용자 활성 모듈 기준으로 권한을 평탄화·필터링할 때. (자세히: [app-structure.md](./app-structure.md))
- **defineEvent / ServiceEventDef** — 서버·클라 공통 패키지에서 타입 안전한 서비스 이벤트를 정의해 emit/구독에 쓸 때. (아래 인라인)
- **OrmService / DbConnOptions** — DB 연결·트랜잭션·쿼리 실행 서비스 시그니처를 구현/호출할 때. (아래 인라인)
- **AutoUpdateService** — 클라이언트 자동 업데이트 최신 버전 조회 서비스를 구현/호출할 때. (아래 인라인)
- **ServiceUploadResult** — 파일 업로드 응답 결과를 다룰 때. (아래 인라인)

## 이벤트 정의 (defineEvent / ServiceEventDef)

서버·클라이언트가 공유하는 공통 패키지에서 이벤트를 1회 정의해 양쪽에서 동일 객체로 emit/구독한다. 정의 객체를 `emitEvent`/`addListener` 에 그대로 넘기면 이름·타입이 자동 추론된다.

```ts
function defineEvent<TInfo = unknown, TData = unknown>(eventName: string): ServiceEventDef<TInfo, TData>;

interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;
  readonly $data: TData;
}
```

- `defineEvent(eventName)` 의 `eventName` — 이벤트 식별 문자열. 서버/클라가 같은 정의를 import 하므로 충돌 없게 유일해야 함.
- `TInfo` — 구독자 필터링용 정보 타입(예: 특정 orderId 만 수신). 서버 emit 시 필터 함수 인자 타입.
- `TData` — 이벤트 페이로드 타입. 리스너 콜백이 받는 데이터 타입.
- `eventName: string` (필드) — 런타임 식별자.
- `$info: TInfo` / `$data: TData` — 타입 추출 전용 마커. 런타임 값은 `undefined` 이며 직접 읽지 말 것.

```ts
export const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");
await server.emitEvent(OrderUpdated, (info) => info.orderId === 123, { status: "shipped" });
await client.addListener(OrderUpdated, { orderId: 123 }, async (data) => console.log(data.status));
```

## 서비스 인터페이스 타입

서버가 구현하고 클라이언트가 프록시로 호출하는 서비스 계약. 본 패키지는 구현체가 아니라 타입만 제공한다.

### OrmService

DB 연결·트랜잭션·쿼리 실행. MySQL/MSSQL/PostgreSQL 지원.

- `getInfo(opt: DbConnOptions & { configName: string })` — 연결 설정의 `dialect`/`database?`/`schema?` 메타 조회. 실제 연결 전 정보 확인용(`configName` 필수).
- `connect(opt: DbConnOptions & { configName: string }): Promise<number>` — 연결 후 `connId`(이후 호출에 쓸 핸들) 반환.
- `close(connId)` — 해당 연결 해제.
- `beginTransaction(connId, isolationLevel?)` — 트랜잭션 시작. `isolationLevel` 생략 시 드라이버 기본값.
- `commitTransaction(connId)` / `rollbackTransaction(connId)` — 트랜잭션 커밋 / 롤백.
- `executeParametrized(connId, query, params?): Promise<unknown[][]>` — 파라미터 바인딩 SQL 직접 실행. 결과는 결과셋 배열의 행 배열(다중 결과셋).
- `executeDefs(connId, defs, options?): Promise<unknown[][]>` — `QueryDef[]` 구조화 쿼리 일괄 실행. `options` 는 각 def 의 `ResultMeta`(컬럼 타입 변환 지정, 항목별 `undefined` 허용).
- `bulkInsert(connId, tableName, columnDefs, records)` — `columnDefs`(컬럼명→`ColumnMeta`) 기반 대량 INSERT.

`DbConnOptions = { configName?: string; config?: Record<string, unknown> }`
- `configName` — 서버에 사전 등록된 DB 설정 이름 참조. `config` — 인라인 연결 설정 객체. 둘 중 하나로 연결 대상을 지정하며, `getInfo`/`connect` 시그니처에서는 `configName` 이 필수로 교차됨.

### AutoUpdateService

- `getLastVersion(platform: string): Promise<{ version; downloadPath } | undefined>` — `platform`(예: `"win32"`/`"darwin"`/`"linux"`) 별 최신 버전 정보 반환. 등록된 버전이 없으면 `undefined`(결측 그대로 전파).

## ServiceUploadResult

서버에 업로드된 파일의 응답 정보.

- `path: string` — 서버 내 저장 경로.
- `filename: string` — 원본 파일명(클라이언트가 보낸 이름).
- `size: number` — 파일 크기(바이트).
