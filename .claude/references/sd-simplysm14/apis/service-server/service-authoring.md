# @simplysm/service-server — service-authoring

RPC 서비스(클라이언트가 원격 호출할 메서드 묶음)를 정의하고 인증을 거는 묶음. `defineService`·`auth`·`ServiceContext`·`ServiceMethods` 가 서비스 작성 시 항상 함께 읽힌다. `defineService` 산출물을 `ServiceServerOptions.services` 에 등록한다.

## defineService

`defineService<TMethods>(name: string | string[], factory: (ctx: ServiceContext) => TMethods): ServiceDefinition<TMethods>` — 이름과 팩토리로 서비스를 정의.

- `name: string | string[]` — 서비스 이름. 배열이면 다중 별칭(첫 요소가 primary `name`, 전체가 호출 매칭용 `names`). 클라이언트는 `names` 중 아무 이름으로나 호출 가능. 빈 배열이면 "서비스 이름은 하나 이상 필요합니다." throw.
- `factory: (ctx) => TMethods` — 컨텍스트를 받아 메서드 객체 반환. 메서드 호출마다 새 ctx 로 1회 실행됨. `auth(...)` 로 감싸면 서비스 전체에 인증 부여.

```ts
export const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok" }),
}));
```

## ServiceDefinition

`interface ServiceDefinition<TMethods>` — `defineService` 산출물.

- `name: string` — 대표 이름(`names[0]`).
- `names: string[]` — 호출 매칭에 쓰이는 전체 이름 목록(별칭 포함).
- `factory: (ctx: ServiceContext) => TMethods` — 메서드 생성 팩토리.
- `authPermissions?: string[]` — 서비스 수준 인증 권한. 팩토리를 `auth` 로 감쌌을 때만 존재(빈 배열 = 로그인만 요구, undefined = 인증 없음).

## auth

인증 래퍼. 서비스 팩토리 또는 개별 메서드를 감싼다. 호출 동작은 보존하고 권한 메타데이터만 심볼로 부착하며, 메서드 수준 권한이 서비스 수준보다 우선한다.

- `auth<TFn>(fn): TFn` — 로그인만 요구(권한 무관). 토큰 없으면 "로그인이 필요합니다." throw.
- `auth<TFn>(permissions: string[], fn): TFn` — `roles` 에 `permissions` 중 하나라도 있어야 통과. 빈 배열이면 로그인만 요구. 권한 부족 시 "권한이 부족합니다." throw.
- 적용 위치: 팩토리 전체를 감싸면(서비스 수준) 모든 메서드에, 메서드 1개를 감싸면(메서드 수준) 그 메서드에만 적용.
- 특수 상황: 서버 옵션 `auth === false` 면 검사 스킵(인증 의도적 비활성), `auth` 미설정(null)인데 auth 메서드 호출 시 "auth 설정이 필요합니다." 설정오류 throw.

```ts
export const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
  removeAll: auth(["admin"], () => repo.removeAll()),
})));
```

## ServiceContext

`interface ServiceContext<TAuthInfo>` — 팩토리·메서드 안에서 호출 맥락에 접근.

- `server: ServiceServer<TAuthInfo>` — 현재 서버 인스턴스(이벤트 emit·옵션 접근 등).
- `socket?: ServiceSocket` — WebSocket 호출일 때의 소켓. HTTP/레거시 호출이면 undefined(소켓 의존 서비스는 이걸로 분기).
- `http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> }` — HTTP 호출 컨텍스트.
- `legacy?: { clientName?: string }` — V1 레거시 호출 컨텍스트.
- `authInfo: TAuthInfo | undefined` (getter) — 인증 페이로드의 `data`(socket 우선, 없으면 http). 미인증이면 undefined. 결측을 `?? ""` 등으로 치환하지 말고 그대로 전파.
- `clientName: string | undefined` (getter) — 클라이언트 이름(socket→http→legacy 순). 빈문자·`..`·`/`·`\` 포함 시 "유효하지 않은 클라이언트 이름" throw(경로탐색 가드).
- `clientPath: string | undefined` (getter) — `<rootPath>/www/<clientName>` 절대경로. clientName 없으면 undefined.
- `getConfig<T>(section): Promise<T>` — 루트 `.config.json` 과 클라이언트별 `.config.json` 을 merge 후 `section` 값 반환. 섹션 없으면 "설정 섹션을 찾을 수 없습니다" throw.

## ServiceMethods

`type ServiceMethods<TDefinition> = TDefinition extends ServiceDefinition<infer M> ? M : never` — `ServiceDefinition` 에서 메서드 시그니처 타입만 추출. 클라이언트 측 타입 공유에 사용.

```ts
export type UserServiceType = ServiceMethods<typeof UserService>;
// 클라이언트: client.getService<UserServiceType>("User");
```

## 저수준 (직접 서버 조립·디스패치 시에만)

- `getServiceAuthPermissions(fn): string[] | undefined` — 함수가 `auth()` 래핑됐으면 권한배열, 아니면 undefined.
- `createServiceContext(server, socket?, http?, legacy?): ServiceContext` — 컨텍스트 수동 생성(전송 핸들러용). 인자별로 socket/http/legacy 출처를 지정.
- `executeServiceMethod(server, { serviceName, methodName, params, socket?, http? }): Promise<unknown>` — 서비스 검색→clientName 가드→컨텍스트 생성→팩토리 호출→메서드 검색→인증 검사→실행. 전송 계층이 RPC 를 실제 디스패치하는 진입점. 서비스/메서드 미존재 시 throw.

## 주의사항

- `factory` 는 호출마다 실행되므로 호출 간 공유 상태(예: 소켓별 DB 연결)는 팩토리 외부 `WeakMap` 등에 둔다(OrmService 참고).
- 결측(authInfo/clientName)은 undefined 로 끝까지 전파. `?? ""` 등으로 치환 금지.
