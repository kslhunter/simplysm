# `AuthTokenPayload`

> **읽어야 하는 상황**: JWT 페이로드 타입을 참조하거나 `signAuthToken`/`verifyAuthToken`의 페이로드 구조를 확인할 때.

JWT 페이로드 인터페이스. `jose` 라이브러리의 `JWTPayload`를 확장한다.

```typescript
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];
  data: TAuthInfo;
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `roles` | `string[]` | 사용자 역할 배열. `auth(["admin"], ...)` 등에서 역할 검사에 사용된다 |
| `data` | `TAuthInfo` | 사용자 정의 인증 데이터. `ServiceContext.authInfo`로 접근 가능하다 |
| (JWTPayload 상속) | — | `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti` 등 표준 JWT 클레임 |
