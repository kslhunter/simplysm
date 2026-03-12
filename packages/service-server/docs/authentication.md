# Authentication

JWT-based authentication using the `jose` library with HS256 algorithm.

## `AuthTokenPayload<TAuthInfo>`

```typescript
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];    // Role strings for permission checks
  data: TAuthInfo;    // Custom application-specific auth data
}
```

---

## `signJwt<TAuthInfo>(jwtSecret, payload): Promise<string>`

Signs a JWT token with HS256 algorithm. Tokens are issued with the current timestamp and expire after 12 hours.

```typescript
import { signJwt } from "@simplysm/service-server";

const token = await signJwt("my-secret", {
  roles: ["admin"],
  data: { userId: 123, name: "John" },
});
```

---

## `verifyJwt<TAuthInfo>(jwtSecret, token): Promise<AuthTokenPayload<TAuthInfo>>`

Verifies a JWT token and returns the decoded payload. Throws a descriptive error for expired or invalid tokens.

```typescript
import { verifyJwt } from "@simplysm/service-server";

try {
  const payload = await verifyJwt("my-secret", token);
  console.log(payload.roles, payload.data);
} catch (err) {
  // "Token has expired." or "Invalid token."
}
```

---

## `decodeJwt<TAuthInfo>(token): AuthTokenPayload<TAuthInfo>`

Decodes a JWT token **without** verifying its signature. Useful for reading token contents when verification is not needed.

```typescript
import { decodeJwt } from "@simplysm/service-server";

const payload = decodeJwt(token);
```

---

## Server-level Auth Helpers

`ServiceServer` provides convenience methods that delegate to the JWT functions using the configured `auth.jwtSecret`:

```typescript
// Sign a token
const token = await server.signAuthToken({ roles: ["user"], data: myAuthInfo });

// Verify a token
const payload = await server.verifyAuthToken(token);
```
