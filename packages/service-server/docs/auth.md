# Auth

JWT-based authentication utilities using the `jose` library (HS256 algorithm).

## `AuthTokenPayload`

JWT token payload with roles and custom data. Extends `JWTPayload` from `jose`.

```typescript
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];
  data: TAuthInfo;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `roles` | `string[]` | User roles for permission checking |
| `data` | `TAuthInfo` | Custom auth data (user info, etc.) |

## `signJwt`

Sign a JWT token with HS256 algorithm. Token expires in 12 hours.

```typescript
async function signJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  payload: AuthTokenPayload<TAuthInfo>,
): Promise<string>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `jwtSecret` | `string` | Secret key for signing |
| `payload` | `AuthTokenPayload<TAuthInfo>` | Token payload |

## `verifyJwt`

Verify and decode a JWT token. Throws on expired or invalid tokens.

```typescript
async function verifyJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  token: string,
): Promise<AuthTokenPayload<TAuthInfo>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `jwtSecret` | `string` | Secret key for verification |
| `token` | `string` | JWT token string |

## `decodeJwt`

Decode a JWT token without verification (for reading payload only).

```typescript
function decodeJwt<TAuthInfo = unknown>(token: string): AuthTokenPayload<TAuthInfo>;
```
