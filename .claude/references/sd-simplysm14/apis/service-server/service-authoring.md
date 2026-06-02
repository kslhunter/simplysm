# @simplysm/service-server — service-authoring

RPC 서비스(클라이언트가 원격 호출할 메서드 묶음)를 정의하고 인증을 거는 묶음. `defineService`·`auth`·`ServiceContext`·`ServiceMethods` 가 서비스 작성 시 항상 함께 읽힌다. `defineService` 산출물을 `ServiceServerOptions.services` 에 등록한다.

## defineService

`defineService<TMethods>(name: string | string[], factory: (ctx: ServiceContext) => TMethods): ServiceDefinition<TMethods>` — 서비스 정의 생성.

- `name` — 서비스 식별 이름. 문자열 1개 또는 배열(별칭 다중 등록, 첫 원소가 primary). 빈 배열이면 throw. 클라이언트는 `"<name>.<method>"` 형태로 호출.
- `factory` — 호출마다 `ctx`(요청 컨텍스트)를 받아 메서드 객체를 반환하는 함수. 요청별로 매번 호출되므로 요청 스코프 상태를 여기 둔다. 인스턴스 간 공유 상태는 팩토리 외부에 둘 것(예: `OrmService` 의 `WeakMap`).

```ts
const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok" }),
}));
```

팩토리 전체를 `auth(...)` 로 감싸면 정의의 `authPermissions` 가 채워져 서비스 전 메서드에 인증이 강제된다(`getServiceAuthPermissions` 로 추출).

## auth

메서드 또는 팩토리를 감싸 인증·권한을 부여하는 래퍼. 호출 동작은 그대로 유지하고 권한 메타데이터만 부착한다.

- `auth(fn)` — 권한 배열 없이 감쌈. 로그인만 필요(역할 무관).
- `auth(permissions: string[], fn)` — 지정 역할 중 하나라도 토큰 `roles` 에 있어야 통과. 빈 배열은 로그인만 요구하는 것과 동일.

적용 수준 두 가지(둘 다 같은 함수):

- 서비스 수준: `auth((ctx) => ({ ... }))` 또는 `auth(["admin"], (ctx) => ({ ... }))` — 모든 메서드에 적용.
- 메서드 수준: 객체 안에서 `someMethod: auth(() => result)` 또는 `auth(["admin"], () => result)` — 그 메서드만.

권한 해석 우선순위(`executeServiceMethod`): 메서드 수준 권한이 있으면 그것을, 없으면 서비스 수준 권한을 사용. 권한이 있는데 서버 `auth` 가 `undefined` 면 설정 오류로 throw, `false` 면 검사 스킵, 객체면 토큰 검증(미인증 시 `"로그인이 필요합니다."`, 권한 부족 시 `"권한이 부족합니다."` throw).

```ts
const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
  adminOnly: auth(["admin"], () => "admin"),
})));
```

`getServiceAuthPermissions(fn: Function): string[] | undefined` — `auth()` 로 감싼 함수에서 권한 배열을 읽음. 감싸지 않았으면 undefined. 보통 내부에서만 사용.

## ServiceContext

팩토리가 받는 요청 컨텍스트. `ServiceContext<TAuthInfo>` 멤버:

- `server: ServiceServer<TAuthInfo>` — 서버 인스턴스. `server.options` 접근 등.
- `socket?: ServiceSocket` — WebSocket 요청이면 해당 소켓(HTTP/레거시 요청이면 undefined).
- `http?: { clientName: string; authTokenPayload? }` — HTTP 요청 메타(WebSocket 요청이면 undefined).
- `legacy?: { clientName? }` — V1 레거시 요청 메타.
- `authInfo` (getter) — `TAuthInfo | undefined`. 소켓/HTTP 토큰 페이로드의 `data`. 미인증이면 undefined.
- `clientName` (getter) — `string | undefined`. 소켓→HTTP→레거시 순으로 클라이언트 이름. `..`·`/`·`\`·빈 문자열 포함 시 보안상 throw.
- `clientPath` (getter) — `string | undefined`. `<rootPath>/www/<clientName>` 절대경로. clientName 없으면 undefined.
- `getConfig<T>(section: string): Promise<T>` — 루트 `.config.json` + 클라이언트별 `.config.json` 을 병합(클라이언트가 루트를 덮어씀)한 뒤 `section` 키를 반환. 해당 섹션 없으면 throw.

## ServiceMethods

`ServiceMethods<TDefinition>` — `ServiceDefinition<M>` 에서 메서드 시그니처 `M` 만 추출하는 타입 유틸. 서버 정의를 클라이언트와 공유해 호출 타입을 맞출 때.

```ts
export type UserServiceType = ServiceMethods<typeof UserService>;
// 클라이언트: client.getService<UserServiceType>("User");
```

## ServiceDefinition

`defineService` 의 반환 타입. `{ name: string; names: string[]; factory: (ctx) => TMethods; authPermissions?: string[] }`. `name` 은 primary 이름, `names` 는 모든 별칭, `authPermissions` 는 팩토리가 `auth()` 로 감싸졌을 때만 채워짐. 보통 직접 만들지 않고 `defineService` 결과를 그대로 `services` 에 넣는다.

## createServiceContext

`createServiceContext<TAuthInfo>(server, socket?, http?, legacy?): ServiceContext<TAuthInfo>` — 위 컨텍스트 객체를 직접 생성. 서버 내부(요청 처리·V1 레거시 fallback)에서 사용하며, 커스텀 호출 경로를 손수 만들 때만 직접 호출.
