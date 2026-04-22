# signJwt

HS256 알고리즘과 12시간 유효기간으로 JWT 토큰을 서명한다.

```typescript
async function signJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  payload: AuthTokenPayload<TAuthInfo>,
): Promise<string>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `jwtSecret` | `string` | HMAC 서명 시크릿 |
| `payload` | [`AuthTokenPayload<TAuthInfo>`](./auth-token-payload.md) | JWT 페이로드 |

## Returns

`Promise<string>` — 서명된 JWT 토큰 문자열.

## Usage

```typescript
const token = await signJwt("my-secret", {
  roles: ["admin"],
  data: { userId: "123" },
});
```
