# Core

Service definition, context, authentication, and method execution.

## ServiceContext

Context object passed to service factory functions.

```typescript
interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;
  http?: {
    clientName: string;
    authTokenPayload?: AuthTokenPayload<TAuthInfo>;
  };
  legacy?: { clientName?: string };

  get authInfo(): TAuthInfo | undefined;
  get clientName(): string | undefined;
  get clientPath(): string | undefined;
  getConfig<T>(section: string): Promise<T>;
}
```

**Properties:**
- `authInfo` -- Authenticated user data (from socket or HTTP auth token)
- `clientName` -- Client application name (validated for path traversal)
- `clientPath` -- Resolved client directory path (`{rootPath}/www/{clientName}`)
- `getConfig(section)` -- Reads config from `.config.json` files (root + client-specific, merged)

### `createServiceContext`

```typescript
function createServiceContext<TAuthInfo = unknown>(
  server: ServiceServer<TAuthInfo>,
  socket?: ServiceSocket,
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> },
  legacy?: { clientName?: string },
): ServiceContext<TAuthInfo>;
```

---

## Auth Helpers

### `getServiceAuthPermissions`

Read auth permissions from an `auth()`-wrapped function. Returns `undefined` if not wrapped.

```typescript
function getServiceAuthPermissions(fn: Function): string[] | undefined;
```

### `auth`

Auth wrapper for service factories and methods.

```typescript
// Login required (no specific roles)
function auth<TFunction extends (...args: any[]) => any>(fn: TFunction): TFunction;

// Login required with specific roles
function auth<TFunction extends (...args: any[]) => any>(
  permissions: string[],
  fn: TFunction,
): TFunction;
```

**Usage levels:**
- Service-level: `auth((ctx) => ({ ... }))` -- all methods require login
- Service-level with roles: `auth(["admin"], (ctx) => ({ ... }))`
- Method-level: `auth(() => result)` -- this method requires login
- Method-level with roles: `auth(["admin"], () => result)`

---

## Service Definition

### `ServiceDefinition`

```typescript
interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}
```

### `defineService`

Define a service with a name and factory function.

```typescript
function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string,
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods>;
```

**Example:**
```typescript
const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok" }),
}));

const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
  adminOnly: auth(["admin"], () => "admin"),
})));
```

### `ServiceMethods`

Extract method signatures from a `ServiceDefinition` for client-side type sharing.

```typescript
type ServiceMethods<TDefinition> =
  TDefinition extends ServiceDefinition<infer M> ? M : never;
```

**Example:**
```typescript
export type UserServiceType = ServiceMethods<typeof UserService>;
// Client: client.getService<UserServiceType>("User");
```

---

## Service Execution

### `executeServiceMethod`

Execute a service method with auth checking.

```typescript
async function executeServiceMethod(
  server: ServiceServer,
  def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
    http?: { clientName: string; authTokenPayload?: AuthTokenPayload };
  },
): Promise<unknown>;
```

**Behavior:**
1. Finds the service definition by name
2. Validates the client name (path traversal guard)
3. Creates a `ServiceContext`
4. Invokes the factory to create the method object
5. Checks auth permissions (method-level first, then service-level fallback)
6. Executes the method with provided params

Throws:
- `"Service [name] not found."` if service is not registered
- `"Method [service.method] not found."` if method does not exist
- `"Login is required."` if auth is required but no token is present
- `"Insufficient permissions."` if the user lacks required roles
