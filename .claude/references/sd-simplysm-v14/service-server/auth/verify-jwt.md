# verifyJwt

JWT 토큰을 검증하고 페이로드를 반환한다. 만료된 토큰은 "토큰이 만료되었습니다." 에러를, 그 외 유효하지 않은 토큰은 "유효하지 않은 토큰입니다." 에러를 던진다.

```typescript
async function verifyJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  token: string,
): Promise<AuthTokenPayload<TAuthInfo>>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `jwtSecret` | `string` | HMAC 서명 시크릿 |
| `token` | `string` | 검증할 JWT 토큰 문자열 |

## Returns

`Promise<AuthTokenPayload<TAuthInfo>>` — 검증된 JWT 페이로드.

## Related Types

### `decodeJwt`

JWT 토큰을 검증 없이 디코딩한다. 서명 검증이나 만료 확인을 수행하지 않는다.

```typescript
function decodeJwt<TAuthInfo = unknown>(token: string): AuthTokenPayload<TAuthInfo>;
```

| Param | Type | Description |
|-------|------|-------------|
| `token` | `string` | 디코딩할 JWT 토큰 문자열 |
