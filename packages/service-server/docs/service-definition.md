# Service Definition/Context

## `ServiceContext`

Service execution context providing access to the server, socket, authentication info, and configuration.

```typescript
export interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;
  http?: {
    clientName: string;
    authTokenPayload?: AuthTokenPayload<TAuthInfo>;
  };
  legacy?: {
    clientName?: string;
  };

  get authInfo(): TAuthInfo | undefined;
  get clientName(): string | undefined;
  get clientPath(): string | undefined;
  getConfig<T>(section: string): Promise<T>;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `server` | `ServiceServer<TAuthInfo>` | The server instance |
| `socket` | `ServiceSocket?` | WebSocket connection (undefined for HTTP requests) |
| `http` | `{ clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> }?` | HTTP request context (undefined for WebSocket requests) |
| `legacy` | `{ clientName?: string }?` | V1 legacy context (auto-update only) |
| `authInfo` | `TAuthInfo \| undefined` (getter) | Authenticated user data from socket or HTTP auth token |
| `clientName` | `string \| undefined` (getter) | Client name from socket, HTTP, or legacy context. Validates against path traversal |
| `clientPath` | `string \| undefined` (getter) | Resolved client path: `{rootPath}/www/{clientName}` |
| `getConfig<T>(section)` | `(section: string) => Promise<T>` | Loads config section from root and client `.config.json` files (merged) |

## `createServiceContext`

Creates a `ServiceContext` instance.

```typescript
export function createServiceContext<TAuthInfo = unknown>(
  server: ServiceServer<TAuthInfo>,
  socket?: ServiceSocket,
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> },
  legacy?: { clientName?: string },
): ServiceContext<TAuthInfo>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `server` | `ServiceServer<TAuthInfo>` | The server instance |
| `socket` | `ServiceSocket?` | WebSocket connection |
| `http` | `{ clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> }?` | HTTP request context |
| `legacy` | `{ clientName?: string }?` | V1 legacy context |

## `getServiceAuthPermissions`

Reads auth permissions from a function wrapped by `auth()`. Returns `undefined` for unwrapped functions.

```typescript
export function getServiceAuthPermissions(fn: Function): string[] | undefined;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fn` | `Function` | The function to check for auth permissions |

**Returns:** `string[] | undefined` -- Permission array if auth-wrapped, `undefined` otherwise.

## `auth`

Authentication wrapper for service factories and methods. Marks functions as requiring authentication, optionally with specific role permissions.

```typescript
// No role restriction (login required)
export function auth<TFunction extends (...args: any[]) => any>(fn: TFunction): TFunction;

// Role restriction (specific roles required)
export function auth<TFunction extends (...args: any[]) => any>(
  permissions: string[],
  fn: TFunction,
): TFunction;
```

Usage levels:
- **Service level:** `auth((ctx) => ({ ... }))` -- All methods require login
- **Service level with roles:** `auth(["admin"], (ctx) => ({ ... }))` -- All methods require specific roles
- **Method level:** `auth(() => result)` -- Specific method requires login
- **Method level with roles:** `auth(["admin"], () => result)` -- Specific method requires specific roles

## `ServiceDefinition`

Service definition with a name and factory function.

```typescript
export interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Service name (used in RPC routing) |
| `factory` | `(ctx: ServiceContext) => TMethods` | Factory function that creates service methods from a context |
| `authPermissions` | `string[]?` | Service-level auth permissions (extracted from `auth()` wrapper) |

## `defineService`

Defines a named service with a factory function.

```typescript
export function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string,
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Service name |
| `factory` | `(ctx: ServiceContext) => TMethods` | Factory function creating service methods |

**Returns:** `ServiceDefinition<TMethods>`

**Example:**

```typescript
const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
  adminOnly: auth(["admin"], () => "admin-data"),
})));
```

## `ServiceMethods`

Type utility that extracts method signatures from a `ServiceDefinition`. Useful for sharing types between server and client.

```typescript
export type ServiceMethods<TDefinition> =
  TDefinition extends ServiceDefinition<infer M> ? M : never;
```

**Example:**

```typescript
export type UserServiceType = ServiceMethods<typeof UserService>;
// Client: client.getService<UserServiceType>("User");
```
