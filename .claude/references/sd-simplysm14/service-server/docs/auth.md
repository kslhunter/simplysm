# Auth

## `AuthTokenPayload`

JWT 페이로드 인터페이스. `jose` 라이브러리의 `JWTPayload`를 확장한다.

```typescript
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];
  data: TAuthInfo;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `roles` | `string[]` | 사용자 역할 배열. `auth(["admin"], ...)` 등에서 역할 검사에 사용된다 |
| `data` | `TAuthInfo` | 사용자 정의 인증 데이터. `ServiceContext.authInfo`로 접근 가능하다 |
| (JWTPayload 상속) | — | `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti` 등 표준 JWT 클레임 |

## `signJwt`

HS256 알고리즘과 12시간 유효기간으로 JWT 토큰을 서명한다.

```typescript
async function signJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  payload: AuthTokenPayload<TAuthInfo>,
): Promise<string>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `jwtSecret` | `string` | HMAC 서명 시크릿 |
| `payload` | `AuthTokenPayload<TAuthInfo>` | JWT 페이로드 |

반환값: 서명된 JWT 토큰 문자열.

## `verifyJwt`

JWT 토큰을 검증하고 페이로드를 반환한다. 만료된 토큰은 "토큰이 만료되었습니다." 에러를, 그 외 유효하지 않은 토큰은 "유효하지 않은 토큰입니다." 에러를 던진다.

```typescript
async function verifyJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  token: string,
): Promise<AuthTokenPayload<TAuthInfo>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `jwtSecret` | `string` | HMAC 서명 시크릿 |
| `token` | `string` | 검증할 JWT 토큰 문자열 |

## `decodeJwt`

JWT 토큰을 검증 없이 디코딩한다. 서명 검증이나 만료 확인을 수행하지 않는다.

```typescript
function decodeJwt<TAuthInfo = unknown>(token: string): AuthTokenPayload<TAuthInfo>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | 디코딩할 JWT 토큰 문자열 |
