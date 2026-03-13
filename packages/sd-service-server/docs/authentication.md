# Authentication

JWT-based authentication system using the `jose` library with HS256 signing.

## @Authorize Decorator

Class or method-level decorator that enforces authentication and permission checks.

```typescript
function Authorize(permissions: string[] = []): ClassDecorator & MethodDecorator
```

- When applied with an empty array `@Authorize()`, only login is required (any authenticated user).
- When applied with permissions `@Authorize(["admin", "editor"])`, the user must have at least one of the listed permissions.
- Methods without `@Authorize` are public and require no authentication.
- Method-level decorators take precedence over class-level decorators.

### Examples

```typescript
import { SdServiceBase, Authorize } from "@simplysm/sd-service-server";

// Class-level: all methods require login
@Authorize()
class UserService extends SdServiceBase {
  // Inherits class-level @Authorize() - requires login
  async getProfile(): Promise<any> {
    return this.authInfo;
  }

  // Method-level override: requires "admin" permission
  @Authorize(["admin"])
  async deleteUser(id: number): Promise<void> {
    // ...
  }
}

// No decorator: all methods are public
class PublicService extends SdServiceBase {
  async getVersion(): Promise<string> {
    return process.env["SD_VERSION"] ?? "unknown";
  }
}
```

### Symbol

```typescript
const SD_SERVICE_AUTH_META: Symbol
```

Metadata key used internally to store authorization permissions via `Reflect.defineMetadata`.

---

## SdServiceJwtManager

Handles JWT token signing, verification, and decoding. Used internally by `SdServiceServer`.

```typescript
class SdServiceJwtManager<TAuthInfo = any>
```

### Methods

#### `signAsync(payload: IAuthTokenPayload<TAuthInfo>): Promise<string>`

Creates a signed JWT token with HS256 algorithm. Tokens expire after 12 hours.

- Throws if `options.auth.jwtSecret` is not configured.

#### `verifyAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>>`

Verifies the token signature and expiration. Returns the decoded payload.

- Throws `"Token expired"` if the token has expired.
- Throws `"Invalid token"` for any other verification failure.

#### `decodeAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>>`

Decodes a JWT token without verifying the signature. Useful for reading expired tokens.

---

## IAuthTokenPayload

Token payload interface extending `jose.JWTPayload`.

```typescript
interface IAuthTokenPayload<TAuthInfo = any> extends JWTPayload {
  perms: string[];
  data: TAuthInfo;
}
```

| Property | Type | Description |
|---|---|---|
| `perms` | `string[]` | List of permission strings assigned to the user. |
| `data` | `TAuthInfo` | Custom application-specific authentication data. |

### Example: Generating and Verifying Tokens

```typescript
const server = new SdServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  auth: { jwtSecret: "my-secret" },
  services: [LoginService],
});

// Generate a token
const token = await server.generateAuthTokenAsync({
  perms: ["admin", "editor"],
  data: { userId: 123, name: "Alice" },
});

// Verify a token
const payload = await server.verifyAuthTokenAsync(token);
// payload.perms === ["admin", "editor"]
// payload.data === { userId: 123, name: "Alice" }
```
