# defineService

이름과 팩토리 함수로 서비스를 정의한다. 팩토리가 `auth()`로 래핑되어 있으면 자동으로 `authPermissions`를 추출한다.

```typescript
function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string,
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `name` | `string` | 서비스 이름. HTTP에서 `/api/{name}/{method}`, WebSocket에서 `{name}.{method}`로 라우팅된다 |
| `factory` | `(ctx: ServiceContext) => TMethods` | 요청마다 호출되는 팩토리 함수. 메서드 객체를 반환한다 |

## Returns

[`ServiceDefinition<TMethods>`](#servicedefinition) — 서비스 정의 객체.

## Related Types

### `ServiceDefinition`

서비스 정의 구조체.

```typescript
interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 서비스 이름 |
| `factory` | `(ctx: ServiceContext) => TMethods` | 요청마다 호출되는 팩토리 함수 |
| `authPermissions` | `string[]` (optional) | `auth()`로 래핑된 팩토리의 서비스 수준 권한 배열 |

### `ServiceMethods`

`ServiceDefinition`에서 메서드 시그니처를 추출하는 유틸리티 타입. 클라이언트 측 타입 공유에 사용한다.

```typescript
type ServiceMethods<TDefinition> =
  TDefinition extends ServiceDefinition<infer M> ? M : never;
```

사용 예:

```typescript
export type UserServiceType = ServiceMethods<typeof UserService>;
// 클라이언트: client.getService<UserServiceType>("User");
```

## Usage

```typescript
// 기본 서비스 (인증 불필요)
const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok" }),
}));

// 서비스 수준 인증 (모든 메서드에 로그인 필요)
const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
  // 메서드 수준 인증 (admin 역할 필요)
  deleteUser: auth(["admin"], (id: number) => { /* ... */ }),
})));

// 클라이언트에 타입 공유
export type UserServiceType = ServiceMethods<typeof UserService>;
```
