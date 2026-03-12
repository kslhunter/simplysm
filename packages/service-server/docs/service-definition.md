# Service Definition

APIs for defining services, applying authentication, and sharing types with clients.

## `defineService<TMethods>(name, factory): ServiceDefinition<TMethods>`

Creates a service definition with a name and a factory function that receives a `ServiceContext` and returns an object of methods.

```typescript
import { defineService } from "@simplysm/service-server";

const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok" }),
  getClientName: () => ctx.clientName,
}));
```

---

## `auth(fn): Function`

Wraps a service factory or individual method to require authentication. Accepts an optional array of role permissions.

### Overloads

```typescript
// Require login (any authenticated user)
auth(fn)

// Require specific roles
auth(["admin", "editor"], fn)
```

### Service-level auth

All methods in the service require authentication:

```typescript
const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
  updateProfile: (data: any) => { /* ... */ },
})));
```

### Method-level auth

Only specific methods require authentication or specific roles:

```typescript
const MixedService = defineService("Mixed", (ctx) => ({
  publicMethod: () => "anyone can call this",
  protectedMethod: auth(() => "login required"),
  adminMethod: auth(["admin"], () => "admin only"),
}));
```

### Permission resolution

- Method-level auth takes precedence over service-level auth.
- If `requiredPerms` is an empty array (`auth(fn)`), any authenticated user can access.
- If `requiredPerms` contains roles (`auth(["admin"], fn)`), the user must have at least one matching role.

---

## `ServiceContext<TAuthInfo>`

The context object passed to service factory functions.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `server` | `ServiceServer<TAuthInfo>` | The server instance |
| `socket` | `ServiceSocket \| undefined` | WebSocket connection (if called via WebSocket) |
| `http` | `{ clientName: string; authTokenPayload?: AuthTokenPayload } \| undefined` | HTTP request info (if called via HTTP) |
| `legacy` | `{ clientName?: string } \| undefined` | V1 legacy context (auto-update only) |

### Computed Properties

| Property | Type | Description |
|----------|------|-------------|
| `authInfo` | `TAuthInfo \| undefined` | The authenticated user's data from the JWT payload |
| `clientName` | `string \| undefined` | Client application name (validated for path safety) |
| `clientPath` | `string \| undefined` | Resolved path: `{rootPath}/www/{clientName}` |

### Methods

#### `getConfig<T>(section: string): Promise<T>`

Reads a configuration section from `.config.json` files. Merges root-level config (`{rootPath}/.config.json`) with client-level config (`{clientPath}/.config.json`), where client values override root values.

```typescript
const dbConfig = await ctx.getConfig<DbSettings>("database");
```

---

## `ServiceDefinition<TMethods>`

```typescript
interface ServiceDefinition<TMethods> {
  name: string;
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}
```

---

## `ServiceMethods<TDefinition>`

Type utility that extracts method signatures from a `ServiceDefinition`. Useful for sharing types with the client.

```typescript
const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
})));

// Export for client-side usage
export type UserServiceType = ServiceMethods<typeof UserService>;

// Client side:
// client.getService<UserServiceType>("User");
```

---

## `executeServiceMethod(server, def): Promise<unknown>`

Internal function that locates and invokes a service method. Performs service lookup, client name validation, context creation, auth checking, and method execution.

## `getServiceAuthPermissions(fn): string[] | undefined`

Reads auth permissions metadata from an `auth()`-wrapped function. Returns `undefined` if the function is not wrapped.
