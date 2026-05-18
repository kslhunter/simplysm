# @simplysm/service-server — define-service

서비스 정의 + 인증 래퍼 + 컨텍스트. `ServiceServerOptions.services` 에 들어갈 단위를 만든다.

## `defineService(name, factory) → ServiceDefinition<TMethods>`

```ts
defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string | string[],          // 다중 이름 = alias (예: ["Orm", "SdOrmService"])
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods>;
```

`factory` 는 호출마다 실행돼 메서드 객체를 생성한다 (요청별 컨텍스트 캡처). `factory` 가 `auth(...)` 로 감싸져 있으면 서비스 수준 인증으로 승격된다.

## `auth(...)` — 인증 래퍼

```ts
auth(fn)                           // 로그인 필요
auth(["admin", "owner"], fn)       // 해당 역할 중 하나 필요 (OR)
```

- 서비스 수준: `defineService("X", auth((ctx) => ({ ... })))`
- 메서드 수준: 팩토리 안에서 메서드를 `auth(["admin"], () => result)` 로 감싼다. 메서드 권한이 있으면 서비스 권한을 **덮어쓴다**.
- `auth: false` 옵션 시 검증 스킵, `auth: undefined` 인데 auth 필요 서비스 등록 시 `listen()` throw, auth 설정됐는데 토큰 없거나 권한 부족 시 메서드 호출에서 throw (`로그인이 필요합니다.` / `권한이 부족합니다.`).

## `ServiceContext<TAuthInfo>`

서비스 메서드가 받는 요청별 컨텍스트.

```ts
interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;                            // WS 경로일 때만
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> };
  legacy?: { clientName?: string };                  // V1 레거시 경로

  get authInfo(): TAuthInfo | undefined;             // payload.data
  get clientName(): string | undefined;              // socket → http → legacy 순. 위험문자(.. / \) throw
  get clientPath(): string | undefined;              // <rootPath>/www/<clientName>
  getConfig<T>(section: string): Promise<T>;         // root + clientPath 의 .config.json merge, 누락 시 throw
}
```

## `ServiceMethods<TDefinition>`

클라이언트에서 메서드 시그니처만 공유하기 위한 추출 타입.

```ts
export const UserService = defineService("User", (ctx) => ({ ... }));
export type UserServiceType = ServiceMethods<typeof UserService>;
// 클라이언트: client.getService<UserServiceType>("User")
```

## 보조

- `createServiceContext(server, socket?, http?, legacy?)` — 컨텍스트 직조 (커스텀 라우트용).
- `getServiceAuthPermissions(fn)` — `auth()` 가 함수에 심볼로 심어둔 권한 배열을 읽는다 (내부 executor 가 사용).

## 예제

```ts
const HealthService = defineService("Health", () => ({
  check: () => ({ status: "ok" }),
}));

const UserService = defineService("User", auth((ctx) => ({
  me: () => ctx.authInfo,
  adminOnly: auth(["admin"], () => "ok"),
})));
```
