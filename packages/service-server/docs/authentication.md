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

Query auth permissions for a given service definition or method. Primarily used internally by `ServiceExecutor`, but exported for advanced use cases.

```typescript
import { defineService, auth, getServiceAuthPermissions } from "@simplysm/service-server";

// For a method with auth wrapper
const methodPerms = getServiceAuthPermissions(someMethod);
// string[] if permissions are set, or undefined for public (no auth wrapper)

// For a service definition
const servicePerms = someServiceDef.authPermissions;
// string[] if service-level auth is set, or undefined for public
```

## JWT Token Management

### JwtManager

`JwtManager<TAuthInfo>` handles JWT operations internally. Access its functionality through `ServiceServer` methods.

| Method | Returns | Description |
|--------|---------|------|
| `sign(payload)` | `Promise<string>` | Generate a JWT token (HS256, 12-hour expiration) |
| `verify(token)` | `Promise<AuthTokenPayload<TAuthInfo>>` | Verify token signature and expiration, return payload |
| `decode(token)` | `AuthTokenPayload<TAuthInfo>` | Decode token without verification (synchronous) |

Generate and verify JWT tokens through the `ServiceServer` instance:

```typescript
import { createServiceServer } from "@simplysm/service-server";

const server = createServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "my-secret-key" },
  services: [],
});

// Generate token (12-hour expiration, HS256 algorithm)
const token = await server.generateAuthToken({
  roles: ["admin", "user"],
  data: { userId: 1, name: "John" },
});

// Verify token
const payload = await server.verifyAuthToken(token);
// payload.roles: ["admin", "user"]
// payload.data: { userId: 1, name: "John" }
```

### AuthTokenPayload

```typescript
import type { AuthTokenPayload } from "@simplysm/service-server";

interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  /** User role list (used for permission check in auth wrapper) */
  roles: string[];
  /** Custom auth info (generic type) */
  data: TAuthInfo;
}
```
