# Services

Service definition API and built-in service definitions for `@simplysm/service-server`.

## Service Definition API

### `ServiceContext<TAuthInfo>`

The context object injected into every service factory. Provides access to the server, connection info, and config loading.

```typescript
import { ServiceContext } from "@simplysm/service-server";

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

  get authInfo(): TAuthInfo | undefined;       // Authenticated user data (from socket or HTTP)
  get clientName(): string | undefined;         // Validated client name
  get clientPath(): string | undefined;         // Resolved path: rootPath/www/<clientName>
  getConfig<T>(section: string): Promise<T>;   // Load config section from .config.json
}
```

### `createServiceContext(server, socket?, http?, legacy?)`

Factory function that creates a `ServiceContext` instance. Used internally; exposed for advanced scenarios.

```typescript
import { createServiceContext } from "@simplysm/service-server";

function createServiceContext<TAuthInfo = unknown>(
  server: ServiceServer<TAuthInfo>,
  socket?: ServiceSocket,
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> },
  legacy?: { clientName?: string },
): ServiceContext<TAuthInfo>;
```

---

### `auth(fn)` / `auth(permissions, fn)`

Wraps a service factory or method function to require authentication. Optionally restricts access to specific roles.

```typescript
import { auth } from "@simplysm/service-server";

// Overloads
function auth<TFunction extends (...args: any[]) => any>(fn: TFunction): TFunction;
function auth<TFunction extends (...args: any[]) => any>(
  permissions: string[],
  fn: TFunction,
): TFunction;
```

Example:

```typescript
// Entire service requires login
const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
  // Only "admin" role can call this method
  deleteUser: auth(["admin"], (id: number) => { /* ... */ }),
})));
```

### `getServiceAuthPermissions(fn)`

Reads the auth permissions attached to a function by `auth()`. Returns `undefined` if the function was not wrapped.

```typescript
import { getServiceAuthPermissions } from "@simplysm/service-server";

function getServiceAuthPermissions(fn: Function): string[] | undefined;
```

---

### `ServiceDefinition<TMethods>`

The shape returned by `defineService`. Holds the service name, factory, and resolved auth permissions.

```typescript
interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}
```

### `defineService(name, factory)`

Defines a named service with a factory function. Pass the result directly to `ServiceServerOptions.services`.

```typescript
import { defineService } from "@simplysm/service-server";

function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string,
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods>;
```

Example:

```typescript
const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok" }),
}));
```

### `ServiceMethods<TDefinition>`

Utility type that extracts the method map type from a `ServiceDefinition`. Use this to share types with the client.

```typescript
import { ServiceMethods } from "@simplysm/service-server";

type ServiceMethods<TDefinition> =
  TDefinition extends ServiceDefinition<infer M> ? M : never;
```

Example:

```typescript
export type HealthServiceType = ServiceMethods<typeof HealthService>;
// Client: client.getService<HealthServiceType>("Health");
```

### `runServiceMethod(server, def)`

Executes a single service method call, performing security validation and auth checks. Used internally by HTTP and WebSocket transports.

```typescript
import { runServiceMethod } from "@simplysm/service-server";

async function runServiceMethod(
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

---

## Built-in Services

### `OrmService`

Pre-built `ServiceDefinition` that exposes database connection management and query execution over WebSocket. Requires authentication (`auth()` wrapped). Clients use `@simplysm/orm-client` to call these methods; do not call them directly.

The service name is `"Orm"`. It reads connection config from the `"orm"` section of `.config.json`.

```typescript
import { OrmService } from "@simplysm/service-server";

// Register with the server
const server = createServiceServer({
  rootPath: ".",
  port: 3000,
  auth: { jwtSecret: "secret" },
  services: [OrmService],
});
```

Methods exposed (all require login):

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `getInfo` | `opt: DbConnOptions & { configName: string }` | `{ dialect, database?, schema? }` | Get connection dialect info |
| `connect` | `opt: DbConnOptions & { configName: string }` | `number` (connId) | Open a DB connection |
| `close` | `connId: number` | `void` | Close a DB connection |
| `beginTransaction` | `connId: number, isolationLevel?: IsolationLevel` | `void` | Begin a transaction |
| `commitTransaction` | `connId: number` | `void` | Commit a transaction |
| `rollbackTransaction` | `connId: number` | `void` | Roll back a transaction |
| `executeParametrized` | `connId: number, query: string, params?: unknown[]` | `unknown[][]` | Execute a parameterized query |
| `executeDefs` | `connId: number, defs: QueryDef[], options?: (ResultMeta \| undefined)[]` | `unknown[][]` | Build and execute query definitions |
| `bulkInsert` | `connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]` | `void` | Bulk insert rows |

### `OrmServiceType`

Type alias for the method map of `OrmService`. Use to type client-side service access.

```typescript
import { OrmServiceType } from "@simplysm/service-server";

export type OrmServiceType = ServiceMethods<typeof OrmService>;
```

---

### `AutoUpdateService`

Pre-built `ServiceDefinition` for mobile/desktop app auto-update. Scans `clientPath/<platform>/updates/` for versioned installer files and returns the latest version info.

The service name is `"AutoUpdate"`. No authentication is required.

```typescript
import { AutoUpdateService } from "@simplysm/service-server";

const server = createServiceServer({
  rootPath: ".",
  port: 3000,
  services: [AutoUpdateService],
});
```

Methods:

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `getLastVersion` | `platform: string` | `{ version: string; downloadPath: string } \| undefined` | Get the latest installer version for the given platform (`"android"` or `"win32"`) |

### `AutoUpdateServiceType`

Type alias for the method map of `AutoUpdateService`.

```typescript
import { AutoUpdateServiceType } from "@simplysm/service-server";

export type AutoUpdateServiceType = ServiceMethods<typeof AutoUpdateService>;
```

---

### `SmtpClientService`

Pre-built `ServiceDefinition` for sending email via SMTP using nodemailer. No authentication is required.

The service name is `"SmtpClient"`. When using `sendByConfig`, connection details are read from the `"smtp"` section of `.config.json`.

```typescript
import { SmtpClientService } from "@simplysm/service-server";

const server = createServiceServer({
  rootPath: ".",
  port: 3000,
  services: [SmtpClientService],
});
```

Methods:

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `send` | `options: SmtpClientSendOption` | `string` (messageId) | Send an email with explicit SMTP settings |
| `sendByConfig` | `configName: string, options: SmtpClientSendByDefaultOption` | `string` (messageId) | Send an email using a named config from `.config.json` |

### `SmtpClientServiceType`

Type alias for the method map of `SmtpClientService`.

```typescript
import { SmtpClientServiceType } from "@simplysm/service-server";

export type SmtpClientServiceType = ServiceMethods<typeof SmtpClientService>;
```
