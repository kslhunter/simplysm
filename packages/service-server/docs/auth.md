# Authentication (JWT)

## `AuthTokenPayload`

JWT token payload extending `JWTPayload` from `jose`. Contains roles and custom authentication data.

```typescript
export interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];
  data: TAuthInfo;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `roles` | `string[]` | User roles for permission checking |
| `data` | `TAuthInfo` | Custom authentication data (user info, etc.) |
| *(inherited from JWTPayload)* | | Standard JWT claims (`iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`) |

## `signJwt`

Signs a JWT token using HS256 algorithm with 12-hour expiration.

```typescript
export async function signJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  payload: AuthTokenPayload<TAuthInfo>,
): Promise<string>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `jwtSecret` | `string` | JWT signing secret |
| `payload` | `AuthTokenPayload<TAuthInfo>` | Token payload with roles and data |

**Returns:** `Promise<string>` -- Signed JWT token string.

## `verifyJwt`

Verifies a JWT token and returns the decoded payload. Throws on expired or invalid tokens.

```typescript
export async function verifyJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  token: string,
): Promise<AuthTokenPayload<TAuthInfo>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `jwtSecret` | `string` | JWT verification secret |
| `token` | `string` | JWT token string to verify |

**Returns:** `Promise<AuthTokenPayload<TAuthInfo>>` -- Decoded token payload.

**Throws:**
- `Error("Token expired")` when the token has expired
- `Error("Invalid token")` for any other verification failure

## `decodeJwt`

Decodes a JWT token without verification. Useful for reading claims before verification.

```typescript
export function decodeJwt<TAuthInfo = unknown>(
  token: string,
): AuthTokenPayload<TAuthInfo>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | JWT token string to decode |

**Returns:** `AuthTokenPayload<TAuthInfo>` -- Decoded token payload (not verified).
