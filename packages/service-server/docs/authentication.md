# Authentication

## Authorize Decorator

Use Stage 3 decorators to set authentication requirements on services or methods. Only works when `ServiceServerOptions.auth` is configured.

```typescript
import { ServiceBase, Authorize } from "@simplysm/service-server";

// Class level: all methods require login
@Authorize()
class UserService extends ServiceBase<{ userId: number; role: string }> {
  // Login only required (inherits from class level)
  async getProfile(): Promise<unknown> {
    const userId = this.authInfo?.userId;
    // ...
  }

  // Method level: specific role required (overrides class level)
  @Authorize(["admin"])
  async deleteUser(targetId: number): Promise<void> {
    // Only users with admin role can call
  }
}

// No authentication required (no decorator)
class PublicService extends ServiceBase {
  async healthCheck(): Promise<string> {
    return "OK";
  }
}
```

Decorator behavior:

| Target | `@Authorize()` | `@Authorize(["admin"])` |
|-----------|----------------|-------------------------|
| Class | All methods require login | All methods require admin role |
| Method | Method requires login | Method requires admin role |
| None | No auth required (Public) | - |

Method-level decorators override class-level settings.

## getAuthPermissions

Query auth permissions for a given service class and method. Primarily used internally by `ServiceExecutor`, but exported for advanced use cases.

```typescript
import { getAuthPermissions } from "@simplysm/service-server";

// Returns string[] if permissions are set, or undefined for public (no decorator)
const perms = getAuthPermissions(UserService, "deleteUser");
// ["admin"]

const classPerms = getAuthPermissions(UserService);
// [] (empty array = login required, no specific role)

const publicPerms = getAuthPermissions(PublicService, "healthCheck");
// undefined (no auth required)
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
import { ServiceServer } from "@simplysm/service-server";

const server = new ServiceServer({
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
  /** User role list (used for permission check in Authorize decorator) */
  roles: string[];
  /** Custom auth info (generic type) */
  data: TAuthInfo;
}
```
