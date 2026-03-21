# Auth

JWT-based authentication utilities using the `jose` library (HS256 algorithm).

## `AuthTokenPayload`

JWT token payload structure. Extends `JWTPayload` from `jose`.

```typescript
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];
  data: TAuthInfo;
}
```

## `signJwt`

Sign a JWT token. Tokens expire after 12 hours.

```typescript
async function signJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  payload: AuthTokenPayload<TAuthInfo>,
): Promise<string>;
```

## `verifyJwt`

Verify a JWT token and return the payload.

```typescript
async function verifyJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  token: string,
): Promise<AuthTokenPayload<TAuthInfo>>;
```

Throws:
- `"Token has expired."` if the token is expired
- `"Invalid token."` for all other verification failures

## `decodeJwt`

Decode a JWT token without verification.

```typescript
function decodeJwt<TAuthInfo = unknown>(token: string): AuthTokenPayload<TAuthInfo>;
```
