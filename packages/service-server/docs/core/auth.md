# auth

서비스 팩토리 또는 메서드에 인증을 요구하는 래퍼 함수. 래핑된 함수에 `AUTH_PERMISSIONS` 심볼로 권한 배열을 부착한다.

```typescript
function auth<TFunction extends (...args: any[]) => any>(fn: TFunction): TFunction;
function auth<TFunction extends (...args: any[]) => any>(
  permissions: string[],
  fn: TFunction,
): TFunction;
```

## Overloads

| Overload | Description |
|----------|-------------|
| `auth(fn)` | 로그인만 요구 (역할 검사 없음). 권한 배열은 `[]` |
| `auth(permissions, fn)` | 지정된 역할 중 하나를 가진 사용자만 허용 |

사용 위치:
- 서비스 수준: `defineService("Name", auth((ctx) => ({ ... })))` — 모든 메서드에 인증 적용
- 메서드 수준: `{ methodName: auth(() => result) }` — 해당 메서드만 인증 적용
- 메서드 수준 권한이 서비스 수준 권한보다 우선한다

## Related Types

### `getServiceAuthPermissions`

`auth()`로 래핑된 함수에서 인증 권한 배열을 읽는다. 래핑되지 않은 함수는 `undefined`를 반환한다.

```typescript
function getServiceAuthPermissions(fn: Function): string[] | undefined;
```

| Param | Type | Description |
|-------|------|-------------|
| `fn` | `Function` | 검사할 함수 |

## Usage

```typescript
// 서비스 수준: 모든 메서드에 로그인 필요
const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
})));

// 역할 지정
const AdminService = defineService("Admin", auth(["admin"], (ctx) => ({
  deleteAll: () => { /* ... */ },
})));

// 메서드 수준
const MixedService = defineService("Mixed", (ctx) => ({
  publicMethod: () => "ok",
  privateMethod: auth(() => ctx.authInfo),
  adminMethod: auth(["admin"], () => "admin only"),
}));
```
