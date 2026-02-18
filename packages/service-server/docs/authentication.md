# Authentication

## auth() Wrapper

Use the `auth()` wrapper to set authentication requirements on services or methods. Only works when `ServiceServerOptions.auth` is configured.

```typescript
import { defineService, auth } from "@simplysm/service-server";

// Service-level auth: all methods require login
export const UserService = defineService("User", auth((ctx) => ({
  // Login only required (inherits from service level)
  getProfile: async (): Promise<unknown> => {
    const userId = (ctx.authInfo as { userId: number; role: string })?.userId;
    // ...
  },

  // Method-level auth: specific role required (overrides service level)
  deleteUser: auth(["admin"], async (targetId: number): Promise<void> => {
    // Only users with admin role can call
  }),
})));

// No authentication required (no auth wrapper)
export const PublicService = defineService("Public", (ctx) => ({
  healthCheck: async (): Promise<string> => {
    return "OK";
  },
}));
```

Auth behavior:

| Target | `auth(factory)` | `auth(["admin"], fn)` |
|-----------|----------------|-------------------------|
| Service | All methods require login | All methods require admin role |
| Method | Method requires login | Method requires admin role |
| None | No auth required (Public) | - |

Method-level `auth()` overrides service-level settings.

## getServiceAuthPermissions

Read auth permissions from an `auth()`-wrapped function. Returns `undefined` if the function is not wrapped with `auth()`. Primarily used internally by `runServiceMethod`, but exported for advanced use cases.

```typescript
import { defineService, auth, getServiceAuthPermissions } from "@simplysm/service-server";

// For a method with auth wrapper
const methodPerms = getServiceAuthPermissions(someMethod);
// string[] if permissions are set, or undefined for public (no auth wrapper)

// For a service definition
const servicePerms = someServiceDef.authPermissions;
// string[] if service-level auth is set, or undefined for public
```

| Signature | Returns | Description |
|-----------|---------|------|
| `getServiceAuthPermissions(fn: Function)` | `string[] \| undefined` | Returns the permission array attached by `auth()`, or `undefined` if not wrapped |

## JWT Functions

Standalone functions for JWT token generation and verification using the `jose` library (HS256 algorithm, 12-hour expiration).

```typescript
import { signJwt, verifyJwt, decodeJwt } from "@simplysm/service-server";

// Generate token (12-hour expiration, HS256 algorithm)
const token = await signJwt("my-secret-key", {
  roles: ["admin", "user"],
  data: { userId: 1, name: "John" },
});

// Verify token (throws on expiry or invalid signature)
const payload = await verifyJwt("my-secret-key", token);
// payload.roles: ["admin", "user"]
// payload.data: { userId: 1, name: "John" }

// Decode token without verification (synchronous, no secret needed)
const decoded = decodeJwt(token);
```

| Function | Returns | Description |
|----------|---------|------|
| `signJwt<TAuthInfo>(jwtSecret, payload)` | `Promise<string>` | Generate a JWT token (HS256, 12-hour expiration) |
| `verifyJwt<TAuthInfo>(jwtSecret, token)` | `Promise<AuthTokenPayload<TAuthInfo>>` | Verify token signature and expiration, return payload. Throws on invalid or expired tokens |
| `decodeJwt<TAuthInfo>(token)` | `AuthTokenPayload<TAuthInfo>` | Decode token without verification (synchronous) |

In most cases, use `ServiceServer` methods instead of calling these functions directly:

```typescript
// Generate token via server (preferred)
const token = await server.generateAuthToken({
  roles: ["admin"],
  data: { userId: 1 },
});

// Verify token via server (preferred)
const payload = await server.verifyAuthToken(token);
```

## AuthTokenPayload

```typescript
import type { AuthTokenPayload } from "@simplysm/service-server";

interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  /** User role list (used for permission check in auth wrapper) */
  roles: string[];
  /** Custom auth info (generic type) */
  data: TAuthInfo;
}
```
