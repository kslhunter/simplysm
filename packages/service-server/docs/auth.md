# Auth

JWT-based authentication utilities for `@simplysm/service-server`.

## `AuthTokenPayload<TAuthInfo>`

JWT payload shape used for authentication tokens. Extends the `JWTPayload` interface from `jose`.

```typescript
import { AuthTokenPayload } from "@simplysm/service-server";

interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];    // Permission roles assigned to this token
  data: TAuthInfo;    // Application-specific auth info
}
```

---

## `signJwt(jwtSecret, payload)`

Signs an `AuthTokenPayload` and returns a JWT string. The token expires in 12 hours and uses HS256.

```typescript
import { signJwt } from "@simplysm/service-server";

async function signJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  payload: AuthTokenPayload<TAuthInfo>,
): Promise<string>;
```

Example:

```typescript
const token = await signJwt("my-secret", {
  roles: ["admin"],
  data: { userId: 1 },
});
```

---

## `verifyJwt(jwtSecret, token)`

Verifies a JWT string and returns the decoded `AuthTokenPayload`. Throws `"Token has expired."` or `"Invalid token."` on failure.

```typescript
import { verifyJwt } from "@simplysm/service-server";

async function verifyJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  token: string,
): Promise<AuthTokenPayload<TAuthInfo>>;
```

---

## `decodeJwt(token)`

Decodes a JWT without verifying the signature. Useful for reading claims without secret access.

```typescript
import { decodeJwt } from "@simplysm/service-server";

function decodeJwt<TAuthInfo = unknown>(token: string): AuthTokenPayload<TAuthInfo>;
```
