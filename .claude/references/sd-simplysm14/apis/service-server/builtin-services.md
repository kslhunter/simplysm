# @simplysm/service-server — 빌트인 서비스

`options.services` 에 추가해 사용. 각 `*ServiceType` 은 클라이언트의 `client.getService<*ServiceType>("<이름>")` 에 그대로 사용.

## `OrmService`

DB 연결을 WebSocket 세션과 묶어 원격 ORM 사용.

- 별칭: `["Orm", "SdOrmService"]`.
- **WebSocket 전용**. HTTP 호출 시 "WebSocket 연결이 필요합니다…" throw(트랜잭션을 소켓 라이프타임에 묶기 위함).
- `auth()` 래핑이라 로그인 필수. 역할 제한은 없음.
- 설정 소스: `ctx.getConfig<Record<string, DbConnConfig>>("orm")` → `opt.configName` 키 조회. 호출 시 `opt.config` 가 base 설정을 부분 override.
- 연결 ID 는 소켓별 카운터(1부터, 가장 큰 값+1). 소켓 close 시 해당 소켓의 모든 열린 DB 연결 자동 정리(에러는 warn 후 무시).
- `dialect === "mssql-azure"` 는 외부 노출 시 `"mssql"` 로 정규화.

메서드:

- `getInfo(opt)` → `{ dialect, database?, schema? }` (연결 안 만들고 설정 조회만).
- `connect(opt): Promise<number>` — connId 반환.
- `close(connId)`.
- `beginTransaction(connId, isolationLevel?)`, `commitTransaction(connId)`, `rollbackTransaction(connId)`.
- `executeParametrized(connId, query, params?)` — `unknown[][]` (멀티 결과셋).
- `executeDefs(connId, defs: QueryDef[], options?: (ResultMeta | undefined)[])` — `options` 가 전부 null/undefined 면 단일 multi-SQL 실행 후 빈 배열들, 아니면 def 별로 build → execute → `pickResultSets` → opt 있으면 `parseQueryResult`, 없으면 raw.
- `bulkInsert(connId, tableName, columnDefs, records)`.

`opt: DbConnOptions & { configName: string }`. 타입 export: `OrmServiceType`.

## `AutoUpdateService`

- 별칭: `["AutoUpdate", "SdAutoUpdateService"]`. 인증 없음.
- `getLastVersion(platform: string): Promise<{ version, downloadPath } | undefined>` — `<clientPath>/<platform>/updates/` 에서 `platform === "android"` → `.apk`, 그 외 → `.exe` 중 파일명이 `^[0-9.]*$` 인 것만 후보. `semver.maxSatisfying(versions, "*")` 로 최신 선정. clientName 미설정 시 throw, 디렉터리/매칭 파일 없으면 undefined.
- `downloadPath` = `/<clientName>/<platform>/updates/<fileName>` (POSIX 정규화).
- 타입 export: `AutoUpdateServiceType`.

## `AppStructureService(itemsMap)`

다른 두 서비스와 달리 **팩토리 함수**(서비스 정의가 아님). 호출 결과를 `services` 에 등록.

- 시그니처: `AppStructureService(itemsMap: Record<string, AppStructureItem[]>): ServiceDefinition`
- 서비스 이름: `"AppStructure"`. 인증 없음.
- 메서드: `getItems(): Record<string, AppStructureItem[]>` — 주입된 map 그대로 반환.
- 타입 export: `AppStructureServiceType`.

`AppStructureItem` 은 `@simplysm/service-common` 정의(메뉴/라우트 트리 항목).

```ts
services: [AppStructureService({ admin: [...], user: [...] })];
```

## V1 레거시 자동 업데이트

ver≠"2" 로 접속한 구버전 클라이언트 호환. JSON 라인 프로토콜.

### `handleV1Connection(socket, autoUpdateMethods, clientNameSetter?)` / `handleV1Connection(socket, options)`

`ServiceServer` 가 자동 호출. `services` 에 `AutoUpdate` 가 있으면 그 factory 의 `getLastVersion` 을 V1 메서드로 자동 매핑. `legacyV1Handlers` 도 그대로 전달. 둘 다 없으면 1008 거부.

`V1ConnectionOptions`:

- `serviceContext?` 또는 `serviceContextFactory?: (req: V1Request) => ServiceContext` — 핸들러용 컨텍스트(둘 중 하나).
- `handlers?: V1RequestHandler[]` — 우선 실행. 각 핸들러는 `{ handled: true, state?: "success"|"error", body } | { handled: false }` 반환. handled=true 면 즉시 응답.
- `autoUpdateMethods?` 또는 `autoUpdateMethodsFactory?: (ctx) => V1AutoUpdateMethods` — 모든 사용자 핸들러가 미처리 + `command === "SdAutoUpdateService.getLastVersion"` 일 때 fallback.
- `clientNameSetter?: (clientName: string | undefined) => void` — 매 요청의 `clientName` 알림 콜백.
- 어디서도 처리 안 되면 `{ code: "UPGRADE_REQUIRED", message: "앱 업그레이드가 필요합니다." }` 응답.

타입:

- `V1Request = { uuid, command, params: unknown[], clientName? }`
- `V1Response = { name: "response", reqUuid, state: "success" | "error", body }`
- `V1AutoUpdateMethods = { getLastVersion(platform): Promise<unknown> | unknown }`
- `V1RequestHandler`, `V1RequestHandlerContext`, `V1RequestHandlerResult`.
