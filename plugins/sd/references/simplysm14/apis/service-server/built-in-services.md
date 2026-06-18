# @simplysm/service-server — 내장 서비스

서버 옵션 `services` 배열에 그대로 추가해 쓰는 미리 정의된 `ServiceDefinition` 두 개. 각각 두 이름(별칭)으로 노출되며, 클라이언트 타입 공유용 `*Methods` 타입도 함께 export 된다. 클라이언트는 짧은 이름 또는 레거시 이름 어느 쪽으로도 호출할 수 있다.

```ts
services: [OrmService, AutoUpdateService, ...앱서비스들]
```

## OrmService / OrmServiceMethods

`["Orm", "SdOrmService"]` 두 이름으로 노출. DB 접속을 원격 실행 RPC 로 제공하는 서비스로, 클라이언트의 ORM 커넥터가 호출한다.

- 전체가 `auth(...)` 래핑이라 **로그인 필요**.
- **WebSocket 전송 전용** — 소켓 단위로 DB 커넥션을 풀링(`WeakMap<ServiceSocket, Map<connId, DbConn>>`)하므로, `ctx.socket` 이 없는 HTTP 호출 시 `"WebSocket 연결이 필요합니다..."` throw.
- DB 접속 정보는 `ctx.getConfig<...>("orm")[configName]` 으로 `rootPath/.config.json` 의 `orm` 섹션에서 읽고, 호출 `opt.config` 로 덮어쓴다. 설정이 없으면 throw.
- 소켓이 닫히면 그 소켓의 열린 모든 커넥션을 자동 정리한다.

메서드(`OrmServiceMethods`):

- `getInfo(opt: DbConnOptions & { configName }): Promise<{ dialect; database?; schema? }>` — 접속 설정의 dialect·database·schema 조회. `dialect` 가 `"mssql-azure"` 면 `"mssql"` 로 정규화해 돌려준다.
- `connect(opt: DbConnOptions & { configName }): Promise<number>` — 새 DB 연결을 풀에 추가하고 정수 `connId` 반환. 같은 소켓의 첫 연결 시 소켓 `close` 핸들러를 걸어 종료 시 정리하도록 등록한다.
- `close(connId: number): Promise<void>` — 해당 연결 종료. 종료 중 에러는 무시(warn 로그)된다.
- `beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>` — 트랜잭션 시작. `isolationLevel` 미지정 시 드라이버 기본값.
- `commitTransaction(connId: number): Promise<void>` / `rollbackTransaction(connId: number): Promise<void>` — `connId` 대상 트랜잭션 커밋·롤백.
- `executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>` — 파라미터 바인딩 SQL 실행.
- `executeDefs(connId: number, defs: QueryDef[], options?: (ResultMeta | undefined)[]): Promise<unknown[][]>` — `QueryDef[]` 를 dialect 에 맞춰 빌드·실행. `options` 가 전부 `null`/`undefined` 면 전체를 한 번에 일괄 실행만 하고 빈 결과를 돌려주며, 각 `options[i]` 가 있으면 해당 결과셋을 파싱해 반환한다.
- `bulkInsert(connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]): Promise<void>` — 대량 삽입.

## AutoUpdateService / AutoUpdateServiceMethods

`["AutoUpdate", "SdAutoUpdateService"]` 두 이름으로 노출. 인증 불필요. 배포된 앱 클라이언트가 최신 설치본을 조회하는 데 쓴다.

- `getLastVersion(platform: string): Promise<{ version: string; downloadPath: string } | undefined>` — `rootPath/www/<clientName>/<platform>/updates` 디렉터리에서 후보 파일을 골라 semver 최대 버전을 찾는다. `platform === "android"` 면 `.apk`, 그 외면 `.exe` 확장자에 파일명이 `^[0-9.]*$` 인 것만 후보. 대상 버전이 있으면 `{ version, downloadPath }`(다운로드 경로는 `/<clientName>/<platform>/updates/<파일>` posix 경로), 없으면 `undefined`. `ctx.clientPath` 가 없으면 throw.

주의: `getLastVersion` 은 ver≠2 레거시 클라이언트의 `SdAutoUpdateService.getLastVersion` fallback 으로도 자동 연결된다(레거시 흐름은 [v1-legacy.md](./v1-legacy.md) 참조).
