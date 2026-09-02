---
name: service
description: "@simplysm/service-server·service-common·service-client(WebSocket RPC 서버·클라이언트, 실시간 이벤트, JWT 인증, 파일 전송, 원격 ORM, 앱 구조 타입)의 인덱스. Use when 서비스 서버를 세우거나, 서비스 메서드·이벤트를 정의·호출·구독하거나, 인증·파일 업로드·정적 서빙·앱 구조(AppStructureItem)를 다루는 모든 작업 — 착수 전에 먼저 읽는다. API 를 안다고 생각해도 읽는다(설치된 버전의 프로토콜·재연결 규약이 학습 지식과 다르다). 대상: createServiceServer·ServiceServerOptions, defineService·auth·ServiceContext·ServiceMethods, defineEvent, createServiceClient·getService·getEvent·addListener·emitEvent, uploadFile, OrmService·.config.json, AutoUpdateService, AppStructureItem."
---

@simplysm/service-* 사용 안내입니다. 서버(Fastify + WebSocket)·공통 계약·클라이언트 세 패키지가 한 프로토콜을 공유합니다. 세 패키지 모두 `src/` 원본을 함께 배포하므로 상세 API 는 설치된 소스에서 직접 확인합니다 — 이 문서는 어디를 볼지와, 소스 한 파일만 읽어서는 놓치는 배선·규약만 담습니다. 업무 로직을 클라이언트에 두는 규칙은 세션에 주입된 rules 가 정본입니다.

## 소스 위치

- `node_modules/@simplysm/service-server/src/` — `createServiceServer`, `defineService`/`auth`, JWT(`signJwt`/`verifyJwt`), HTTP·업로드·정적 파일 핸들러, 내장 `OrmService`/`AutoUpdateService`, `getConfig`, V1 레거시.
- `node_modules/@simplysm/service-common/src/` — `defineEvent`/`ServiceEventDef`, 내장 서비스 계약(`OrmService`/`DbConnOptions`/`AutoUpdateService`), `ServiceUploadResult`, `AppStructureItem` 계열 타입과 `getFlatPermissions`/`isUsableModules`, 프로토콜 메시지 타입·코덱.
- `node_modules/@simplysm/service-client/src/` — `createServiceClient`/`ServiceClient`, `ServiceProxy`, 이벤트 클라이언트, 파일 클라이언트, `createOrmClientConnector`, 소켓·전송·Worker 오프로딩.
- 공개 API 는 각 패키지의 `src/index.ts`.

## 배선

- 서버: `createServiceServer({ rootPath, port, ssl?, auth: { jwtSecret } | false, services: [...] }).listen()`. 정적 파일은 `rootPath/www/`, 업로드는 `rootPath/www/uploads/<uuid>.<ext>`, SPA 폴백은 확장자 없는 경로에서 상위로 올라가며 `index.csr.html` 을 찾습니다.
- 서비스: `defineService("Name", (ctx) => ({ method: async (...) => … }))`. 인증은 `auth(fn)`(로그인만) / `auth(["perm"], fn)`(roles 중 하나) 로 서비스 전체 또는 메서드 개별 래핑(메서드가 우선). `ctx.authInfo`·`ctx.clientName`·`ctx.clientPath`·`ctx.getConfig(section)`·`ctx.server.emitEvent`. 클라이언트 타입 공유는 `export type XServiceMethods = ServiceMethods<typeof XService>`.
- 클라이언트: `createServiceClient(clientName, { host, port, ssl?, maxReconnectCount? })` → `await client.connect()` → 로그인 후 `client.auth(token)` → `client.getService<XServiceMethods>("Name").method(...)`. Angular 앱은 `AppServiceProvider` 가 이 배선을 감쌉니다(`angular` 스킬).
- 이벤트: 공통 패키지에서 `export const XEvent = defineEvent<TInfo, TData>("X")`. 구독 `const key = await client.getEvent(XEvent).addListener(info, cb)`, 해제 `client.removeListener(key)`, 발생 `client.emitEvent(XEvent, (info) => …, data)` 또는 서버 `ctx.server.emitEvent(...)`. 정의 객체를 그대로 넘기면 이름·타입이 추론되므로 문자열 이름이나 `<typeof X>` 를 따로 적지 않습니다.
- 내장 ORM: 서버 `services` 에 `OrmService` 를 넣고 `.config.json` 의 `orm` 섹션에 `configName` 키로 `DbConnConfig` 를 둡니다(`getConfig` 는 `rootPath` 와 `clientPath` 설정을 병합, clientPath 우선). 클라이언트는 `createOrmClientConnector(client).connect({ DbClass, connOpt: { configName }, dbContextOpt }, cb)`.
- 앱 구조: `AppStructureItem[]` — 그룹은 `children`, 화면(leaf)은 `perms: ["use","edit"]`·`subPerms`·`url`·`isNotMenu`. `code` 는 부모부터 dot 으로 이어져 fullCode(라우팅 경로·권한 키). `modules` 는 OR, `requiredModules` 는 AND 조건이고 `usableModules` 가 `undefined` 면 모듈 조건이 있는 항목은 통과하지 못합니다.

## 소스 한 파일만 읽어서는 틀리기 쉬운 것

- `getService("Name")` 의 문자열은 `defineService` 의 이름(별칭 배열 포함)과 일치해야 합니다. `ServiceProxy` 는 빈 객체 위 `Proxy` 라 어떤 이름을 불러도 함수가 나오고, 없는 메서드는 서버에서 에러로 돌아옵니다.
- 구독(`addListener`)은 클라이언트에만 있고 서버는 발생 전용. `addListener` 는 소켓이 `connected` 가 아니면 throw 하므로 `connect()` 완료 뒤에. 재연결 시 보관 토큰 재인증과 리스너 재구독은 자동이라 수동으로 다시 등록하지 않습니다. 키 없이 일괄 해제하는 API 는 없으니 키를 보관해 파기 시점에 `removeListener`(미해제 리스너는 재연결마다 누적).
- 클라이언트 발생의 `infoSelector` 는 발생 클라이언트에서 실행됩니다(서버로 직렬화되지 않음) — `evt:gets` 로 리스너 info 목록을 받아 거른 뒤 대상 키로 `evt:emit`. 아무 구독에도 안 걸리면 전송 자체가 생략. 자기 구독도 걸리면 자기 콜백이 실행됩니다.
- 이벤트는 그 시점에 연결된 클라이언트에만 전달되고 오프라인 보관·재전송이 없습니다 — 놓치면 안 되는 상태는 이벤트가 아니라 재조회로 확정.
- `uploadFile` 은 `auth()` 로 토큰을 보관한 뒤에만(없으면 throw). HTTP 업로드 `POST /upload` 도 JWT 필수.
- HTTP RPC 는 `GET/POST /api/:service/:method`(GET 은 `?json=[...]`), 헤더 `x-sd-client-name` 필수, `Authorization: Bearer`.
- JWT 는 HS256, `signAuthToken(payload, expiresHours = 12)`. 권한은 `AuthTokenPayload.roles: string[]` 로 판정하고 `data` 가 앱 정의 인증 정보.
- 프로토콜 한도: 메시지 본문 100MB 초과는 `ArgumentError`, 3MB 초과는 300KB 청크 분할. 30KB 초과 JSON 파싱과 `Uint8Array` 인코딩은 Worker 로 위임(미가용 시 메인 스레드 fallback).
- 소켓은 5초 ping, 30초 무응답이면 끊김으로 보고 3초 간격 재연결(`maxReconnectCount` 기본 10, 0 이면 재연결 없음). 끊기면 대기 중 요청은 전부 reject.
- `ServiceClient` 생성 시 `globalThis.WebSocket` 이 없으면 `ws` 를 동적 import 해 polyfill(Node).
- `AutoUpdateService.getLastVersion(platform)` 은 `clientPath/<platform>/updates/` 의 `<버전>.apk|.exe` 중 semver 최대를 고릅니다(파일명은 숫자와 점만).
