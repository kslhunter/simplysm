# Core

## `ServiceContext`

Context object passed to service factory functions. Provides access to server, socket, auth info, and configuration.

```typescript
interface ServiceContext<TAuthInfo = unknown> {
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

| Property | Type | Description |
|----------|------|-------------|
| `server` | `ServiceServer<TAuthInfo>` | Server instance |
| `socket` | `ServiceSocket` | WebSocket connection (if via WebSocket) |
| `http` | `object` | HTTP request info (if via HTTP) |
| `legacy` | `object` | V1 legacy context (auto-update only) |
| `authInfo` | `TAuthInfo \| undefined` | Authenticated user data |
| `clientName` | `string \| undefined` | Client name |
| `clientPath` | `string \| undefined` | Resolved client path on disk |
| `getConfig()` | `<T>(section) => Promise<T>` | Read config from `.config.json` files |

## `createServiceContext`

Create a service context instance.

```typescript
function createServiceContext<TAuthInfo = unknown>(
  server: ServiceServer<TAuthInfo>,
  socket?: ServiceSocket,
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> },
  legacy?: { clientName?: string },
): ServiceContext<TAuthInfo>;
```

## `ServiceDefinition`

Service definition object. Contains name, factory function, and optional auth permissions.

```typescript
interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Service name |
| `factory` | `(ctx: ServiceContext) => TMethods` | Factory function that creates method object |
| `authPermissions` | `string[]` | Required permissions (from `auth()` wrapper) |

## `defineService`

Define a service with a name and factory function.

```typescript
function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string,
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Service name |
| `factory` | `(ctx: ServiceContext) => TMethods` | Factory function |

## `auth`

Auth wrapper for service factories and methods. Can be applied at service-level or method-level with optional role requirements.

```typescript
function auth<TFunction extends (...args: any[]) => any>(fn: TFunction): TFunction;
function auth<TFunction extends (...args: any[]) => any>(
  permissions: string[],
  fn: TFunction,
): TFunction;
```

| Overload | Description |
|----------|-------------|
| `auth(fn)` | Require login (any authenticated user) |
| `auth(["admin"], fn)` | Require specific roles |

## `getServiceAuthPermissions`

Read auth permissions from an `auth()`-wrapped function. Returns `undefined` if not wrapped.

```typescript
function getServiceAuthPermissions(fn: Function): string[] | undefined;
```

## `ServiceMethods`

Extract method signatures from a `ServiceDefinition` for client-side type sharing.

```typescript
type ServiceMethods<TDefinition> =
  TDefinition extends ServiceDefinition<infer M> ? M : never;
```

## `executeServiceMethod`

Execute a service method with authentication and authorization checks.

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
