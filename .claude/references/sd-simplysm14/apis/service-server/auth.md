# @simplysm/service-server — 인증

## `auth(fn)` / `auth(permissions, fn)`

서비스 factory 또는 개별 메서드를 래핑해 인증 요구사항을 부착. 래핑 함수는 호출 동작을 그대로 유지하며 내부 심볼에 `permissions: string[]` 저장.

- 서비스 수준: `defineService("X", auth((ctx) => ({ ... })))` — 모든 메서드 로그인 필요.
- 서비스 수준 + 역할: `defineService("X", auth(["admin"], (ctx) => ({ ... })))`.
- 메서드 수준: factory 내부에서 `someMethod: auth(() => result)`.
- 메서드 수준 + 역할: `someMethod: auth(["admin", "owner"], () => result)` — 배열 중 하나라도 매칭하면 통과(OR).

실행 시(`executeServiceMethod`) 동작:

- 메서드 권한이 있으면 서비스 권한을 **덮어쓴다**. 메서드 권한 미부착 시 서비스 권한 사용.
- 권한 요구 + `options.auth == null` → "auth 설정이 필요합니다" throw(서버 설정 오류).
- 권한 요구 + `options.auth === false` → 인증 스킵.
- 권한 요구 + `options.auth = { jwtSecret }` → payload 없으면 "로그인이 필요합니다" throw. `permissions.length > 0` 이면 `payload.roles` 중 하나라도 일치해야 통과, 아니면 "권한이 부족합니다" throw. `permissions.length === 0` (= `auth(fn)`) 이면 토큰만 있으면 통과.

## `AuthTokenPayload<TAuthInfo>`

`jose.JWTPayload` 확장.

- `roles: string[]` — `auth(["role"], fn)` 검사 대상.
- `data: TAuthInfo` — 임의 사용자 데이터. `ctx.authInfo` 로 노출.

## JWT 헬퍼

`server.signAuthToken`/`verifyAuthToken` 이 동일 알고리즘으로 감싸므로 일반 시나리오에선 그쪽을 쓴다. 직접 import 는 서버 인스턴스 없이 토큰을 다루는 경우(테스트, 별도 인증 서버, 디코드 등)만.

- `signJwt<T>(jwtSecret, payload): Promise<string>` — HS256, `iat` 자동, `exp = 12h` 고정. 수명 변경 필요 시 `jose.SignJWT` 직접 사용.
- `verifyJwt<T>(jwtSecret, token): Promise<AuthTokenPayload<T>>` — 만료: "토큰이 만료되었습니다", 그 외 위조: "유효하지 않은 토큰입니다" throw.
- `decodeJwt<T>(token): AuthTokenPayload<T>` — 서명 검증 없이 페이로드만 디코드. 클라이언트 측 만료 표시 등 비보안 용도에만.

## 예

```ts
const token = await signJwt(secret, { roles: ["admin"], data: { userId: "U1" } });
const payload = await verifyJwt<{ userId: string }>(secret, token);
```
