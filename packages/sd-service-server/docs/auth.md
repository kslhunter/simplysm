# Authentication

## SD_SERVICE_AUTH_META

```typescript
const SD_SERVICE_AUTH_META: unique symbol
```

Symbol used as the metadata key for storing authorization requirements on service classes and methods via `Reflect.defineMetadata`.

---

## Authorize

```typescript
function Authorize(permissions: string[] = []): ClassDecorator & MethodDecorator
```

Decorator that marks a service class or method as requiring authentication. Can be applied at the class level (all methods require auth) or at the method level (only that method requires auth).

| Parameter | Type | Description |
|-----------|------|-------------|
| `permissions` | `string[]` | Required permission strings. Empty array means login is required but no specific permissions are checked |

### Usage

```typescript
@Authorize() // All methods require login
class MyService extends SdServiceBase {
  async publicMethod() { /* ... */ } // Still requires login (class-level)

  @Authorize(["admin"]) // Requires "admin" permission
  async adminMethod() { /* ... */ }
}
```

When applied at the class level, the metadata is stored on the class constructor. When applied at the method level, it is stored on the prototype with the method name as key. Method-level metadata takes precedence over class-level.

---

## IAuthTokenPayload\<TAuthInfo\>

JWT token payload interface. Extends `JWTPayload` from the `jose` library.

```typescript
interface IAuthTokenPayload<TAuthInfo = any> extends JWTPayload {
  perms: string[];
  data: TAuthInfo;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `perms` | `string[]` | Array of permission strings granted to the user |
| `data` | `TAuthInfo` | Custom application-specific auth data (user info, roles, etc.) |

Inherits standard JWT fields from `JWTPayload` including `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`.

---

## SdServiceJwtManager\<TAuthInfo\>

Manages JWT token signing, verification, and decoding using the HS256 algorithm via the `jose` library.

### Constructor

```typescript
constructor(private readonly _server: SdServiceServer<TAuthInfo>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_server` | `SdServiceServer<TAuthInfo>` | Server instance (reads `options.auth.jwtSecret`) |

### Methods

#### `signAsync(payload)`

```typescript
async signAsync(payload: IAuthTokenPayload<TAuthInfo>): Promise<string>
```

Signs a JWT token with the configured secret. Sets `iat` (issued at) automatically and `exp` (expiration) to 12 hours.

| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `IAuthTokenPayload<TAuthInfo>` | Token payload |

**Returns:** `Promise<string>` -- the signed JWT string.

**Throws:** `Error` if `auth.jwtSecret` is not configured.

#### `verifyAsync(token)`

```typescript
async verifyAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>>
```

Verifies a JWT token's signature and expiration.

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | JWT token to verify |

**Returns:** `Promise<IAuthTokenPayload<TAuthInfo>>` -- the decoded payload.

**Throws:** `Error` with message "Token expired" if the token has expired, or "Invalid token" for other verification failures.

#### `decodeAsync(token)`

```typescript
async decodeAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>>
```

Decodes a JWT token without verifying the signature. Useful for reading token contents from untrusted sources.

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | JWT token to decode |

**Returns:** `Promise<IAuthTokenPayload<TAuthInfo>>` -- the decoded payload.
