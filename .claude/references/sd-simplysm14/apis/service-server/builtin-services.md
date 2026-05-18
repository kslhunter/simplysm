# @simplysm/service-server — builtin-services

`ServiceServerOptions.services` 에 그대로 푸시해서 쓰는 사전 정의 서비스. 각각의 `*ServiceType` 은 클라이언트 측에서 `client.getService<*ServiceType>("<이름>")` 로 타입 공유한다.

## `OrmService` / `OrmServiceType`

이름 alias: `["Orm", "SdOrmService"]`. **WebSocket 전용** (HTTP 호출 시 throw — 트랜잭션을 소켓 라이프타임에 묶기 위함). `auth()` 로 감싸져 있어 로그인 필요.

설정: `ctx.getConfig("orm")` 으로 `Record<string, DbConnConfig>` 를 읽고 `opt.configName` 으로 선택. 클라이언트가 `opt.config` 로 일부 필드 override 가능.

메서드: `getInfo`, `connect → connId`, `close(connId)`, `beginTransaction(connId, isolation?)`, `commitTransaction`, `rollbackTransaction`, `executeParametrized(connId, sql, params?)`, `executeDefs(connId, defs, optionsMeta?)`, `bulkInsert(connId, table, colDefs, records)`. 소켓 close 시 그 소켓의 모든 연결을 자동 정리.

## `AutoUpdateService` / `AutoUpdateServiceType`

이름 alias: `["AutoUpdate", "SdAutoUpdateService"]`. 인증 없음.

`getLastVersion(platform)` — `<clientPath>/<platform>/updates/` 디렉토리에서 `android` 는 `.apk`, 그 외는 `.exe` 중 `semver.maxSatisfying("*")` 으로 최신을 골라 `{ version, downloadPath }` 반환. 없으면 `undefined`.

## `AppStructureService(itemsMap) → ServiceDefinition` / `AppStructureServiceType`

다른 두 서비스와 달리 **팩토리 호출 결과**를 등록한다. 이름 `"AppStructure"`, 인증 없음.

```ts
import { AppStructureService } from "@simplysm/service-server";
import type { AppStructureItem } from "@simplysm/service-common";

const itemsMap: Record<string, AppStructureItem[]> = { admin: [...], shop: [...] };
services: [AppStructureService(itemsMap)];
```

`getItems()` 한 메서드만 노출. 클라이언트 메뉴/라우트 트리 공급용.

## 등록 예제

```ts
import { createServiceServer, OrmService, AutoUpdateService, AppStructureService } from "@simplysm/service-server";

createServiceServer({
  rootPath, port: 50080, auth: { jwtSecret },
  services: [
    OrmService,
    AutoUpdateService,
    AppStructureService(appItemsMap),
    MyAppService,
  ],
});
```
