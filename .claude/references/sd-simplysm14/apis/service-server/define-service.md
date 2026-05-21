# @simplysm/service-server — 서비스 정의

## `defineService(name, factory): ServiceDefinition<TMethods>`

- `name: string | string[]` — 단일 또는 별칭 목록. 첫 요소가 primary(`def.name`), 전체가 `def.names`. RPC 라우팅은 `names.includes(요청서비스명)` 매칭. 빈 배열이면 throw.
- `factory: (ctx: ServiceContext) => TMethods` — 매 요청마다 호출되어 메서드 객체 생성(컨텍스트 캡처). factory 자체가 `auth(...)` 래핑이면 `authPermissions` 가 자동 추출돼 서비스 수준 인증으로 승격.

반환 `ServiceDefinition<TMethods>`:

- `name: string`
- `names: string[]`
- `factory`
- `authPermissions?: string[]`

## `ServiceContext<TAuthInfo>`

서비스 factory 가 받는 요청별 컨텍스트.

- `server: ServiceServer<TAuthInfo>`
- `socket?: ServiceSocket` — WebSocket 경로일 때만.
- `http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> }` — HTTP 경로.
- `legacy?: { clientName?: string }` — V1 경로.
- `get authInfo(): TAuthInfo | undefined` — socket 의 payload.data 우선, 없으면 http.
- `get clientName(): string | undefined` — socket → http → legacy 순. 빈 문자/`..`/`/`/`\\` 포함 시 throw.
- `get clientPath(): string | undefined` — `<rootPath>/www/<clientName>`. clientName 없으면 undefined.
- `getConfig<T>(section: string): Promise<T>` — `<rootPath>/.config.json` + `<clientPath>/.config.json` 을 `obj.merge` 한 뒤 `section` 키 반환. 섹션 없으면 throw. 설정 파일은 `FsWatcher` 로 변경 감시되어 자동 리로드.

## `ServiceMethods<TDefinition>` 타입

`ServiceDefinition<M>` 에서 `M` 추출. 클라이언트의 `client.getService<MyServiceType>("MyService")` 에 사용.

```ts
export const UserService = defineService("User", (ctx) => ({
  getProfile: () => ({ name: "kim" }),
}));
export type UserServiceType = ServiceMethods<typeof UserService>;
```

## 보조 export

- `createServiceContext(server, socket?, http?, legacy?): ServiceContext` — 컨텍스트 직조. 커스텀 라우트/테스트용.
- `getServiceAuthPermissions(fn): string[] | undefined` — `auth()` 가 함수에 심어둔 권한 배열 추출. 래핑 안 됐으면 undefined. 내부 executor 가 사용.

## 예

```ts
const HealthService = defineService("Health", () => ({
  check: () => ({ status: "ok" }),
}));

const UserService = defineService(["User", "MyUser"], auth((ctx) => ({
  me: () => ctx.authInfo,
  adminOnly: auth(["admin"], () => "ok"),
})));
```
