# ServiceServer

## ServiceServer

`ServiceServer<TAuthInfo>` extends `EventEmitter` and is the main entry point for creating a server.

**Properties:**

| Property | Type | Description |
|----------|------|------|
| `options` | `ServiceServerOptions` | Server configuration (read-only, passed via constructor) |
| `isOpen` | `boolean` | Whether the server is currently listening |
| `fastify` | `FastifyInstance` | Underlying Fastify instance (read-only, for advanced use) |

**Methods:**

| Method | Returns | Description |
|--------|---------|------|
| `listen()` | `Promise<void>` | Register all plugins/routes and start listening |
| `close()` | `Promise<void>` | Close all WebSocket connections and shut down the server |
| `generateAuthToken(payload)` | `Promise<string>` | Generate a JWT token (HS256, 12-hour expiration) |
| `verifyAuthToken(token)` | `Promise<AuthTokenPayload<TAuthInfo>>` | Verify and decode a JWT token |
| `emitEvent(eventDef, infoSelector, data)` | `Promise<void>` | Publish an event to matching WebSocket clients |
| `broadcastReload(clientName, changedFileSet)` | `Promise<void>` | Send a reload command to all connected clients |

**Events:**

| Event | Payload | Description |
|-------|---------|------|
| `ready` | `void` | Emitted when the server starts listening |
| `close` | `void` | Emitted when the server is closed |

## createServiceServer

Factory function for creating a `ServiceServer` instance:

```typescript
import { createServiceServer } from "@simplysm/service-server";

const server = createServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "my-secret-key" },
  services: [MyService],
});
```

## Server Options (`ServiceServerOptions`)

```typescript
import type { ServiceServerOptions } from "@simplysm/service-server";

interface ServiceServerOptions {
  /** Server root path (base directory for static files and config files) */
  rootPath: string;
  /** Listen port */
  port: number;
  /** SSL/TLS config (enables HTTPS) */
  ssl?: {
    pfxBytes: Uint8Array;
    passphrase: string;
  };
  /** JWT authentication config */
  auth?: {
    jwtSecret: string;
  };
  /** List of service definitions to register */
  services: ServiceDefinition[];
}
```

The following structure is expected under `rootPath`:

```
rootPath/
  .config.json        # Root config file
  www/                # Static file root
    uploads/          # Upload file storage directory
    {clientName}/     # Per-client directory
      .config.json    # Per-client config file
      index.html
```

## SSL/HTTPS Server

```typescript
import { createServiceServer } from "@simplysm/service-server";
import { fsReadFile } from "@simplysm/core-node";

const pfxBytes = await fsReadFile("/path/to/cert.pfx");

const server = createServiceServer({
  port: 443,
  rootPath: "/app/data",
  ssl: {
    pfxBytes,
    passphrase: "certificate-password",
  },
  auth: { jwtSecret: "my-secret-key" },
  services: [],
});

await server.listen();
```

## Custom Service Definition

Define services using the `defineService` function. Service methods are called via RPC from the client.

```typescript
import { defineService } from "@simplysm/service-server";

export const MyService = defineService("My", (ctx) => ({
  hello: async (name: string): Promise<string> => {
    return `Hello, ${name}!`;
  },

  getServerTime: async (): Promise<Date> => {
    return new Date();
  },
}));

// Export type for client-side type sharing
export type MyServiceMethods = import("@simplysm/service-server").ServiceMethods<typeof MyService>;
```

### ServiceContext

The `ctx` parameter provides access to server resources within service methods.

| Property | Type | Description |
|----------|------|------|
| `ctx.server` | `ServiceServer<TAuthInfo>` | Server instance reference |
| `ctx.socket` | `ServiceSocket \| undefined` | WebSocket connection (`undefined` for HTTP calls) |
| `ctx.http` | `{ clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> } \| undefined` | HTTP request context |
| `ctx.legacy` | `{ clientName?: string } \| undefined` | V1 legacy context (auto-update only) |
| `ctx.authInfo` | `TAuthInfo \| undefined` | Authenticated user's custom data (from JWT `data` field) |
| `ctx.clientName` | `string \| undefined` | Client app name (validated against path traversal) |
| `ctx.clientPath` | `string \| undefined` | Resolved per-client directory path (`rootPath/www/{clientName}`) |

### ServiceContext Methods

| Method | Returns | Description |
|--------|---------|------|
| `ctx.getConfig<T>(section)` | `Promise<T>` | Read a section from `.config.json` (root + client configs merged) |

### createServiceContext

Factory function that creates a `ServiceContext` object. Used internally by the server and exported for advanced use cases (e.g., calling services programmatically without an active connection).

```typescript
import { createServiceContext } from "@simplysm/service-server";

const ctx = createServiceContext(server, socket, httpContext, legacyContext);
```

## Config File Reference

Read sections from `.config.json` files using `ctx.getConfig()`. Root and per-client configs are automatically merged.

```typescript
import { defineService } from "@simplysm/service-server";

export const MyService = defineService("My", (ctx) => ({
  getDbHost: async (): Promise<string> => {
    // Read "mySection" key from rootPath/.config.json or clientPath/.config.json
    const config = await ctx.getConfig<{ host: string }>("mySection");
    return config.host;
  },
}));
```

`.config.json` example:

```json
{
  "mySection": {
    "host": "localhost"
  },
  "orm": {
    "default": {
      "dialect": "mysql",
      "host": "localhost",
      "port": 3306,
      "database": "mydb",
      "user": "root",
      "password": "password"
    }
  }
}
```

Config files are cached and automatically refreshed on file changes (LazyGcMap-based, auto expires after 1 hour).

## getConfig

A standalone function that loads, caches, and watches JSON config files. Used internally by `ctx.getConfig()`.

```typescript
import { getConfig } from "@simplysm/service-server";

// Returns undefined if the file does not exist
const config = await getConfig<MyConfig>("/path/to/.config.json");
```

| Signature | Returns | Description |
|-----------|---------|------|
| `getConfig<T>(filePath: string)` | `Promise<T \| undefined>` | Load and cache a JSON config file. Returns `undefined` if file not found |

Behavior:
- Caches file in `LazyGcMap` on first load.
- Registers file change watch (`FsWatcher`) to auto-refresh cache on changes.
- Cache auto-expires after 1 hour of no access, and associated watcher is released.
- GC runs every 10 minutes to check for expired entries.

## Server Route Structure

The following routes are automatically registered when `ServiceServer.listen()` is called:

| Route | Method | Description |
|--------|--------|------|
| `/api/:service/:method` | GET, POST | Service method call via HTTP |
| `/upload` | POST | Multipart file upload (auth required) |
| `/` | WebSocket | WebSocket connection endpoint |
| `/ws` | WebSocket | WebSocket connection endpoint (alias) |
| `/*` | GET, etc. | Static file serving (based on `rootPath/www/`) |

## Full Server Example

```typescript
import { createServiceServer, defineService, auth, OrmService } from "@simplysm/service-server";
import { defineEvent } from "@simplysm/service-common";

// Define a custom service with auth
export const UserService = defineService("User", auth((ctx) => ({
  getProfile: async (): Promise<{ name: string }> => {
    const userId = (ctx.authInfo as { userId: number; role: string })?.userId;
    // Use ctx.getConfig(), ctx.socket, ctx.server, etc.
    return { name: "John" };
  },

  deleteUser: auth(["admin"], async (targetId: number): Promise<void> => {
    // Admin-only operation
  }),
})));

export const PublicService = defineService("Public", (ctx) => ({
  healthCheck: async (): Promise<string> => {
    return "OK";
  },
}));

// Create and start server
const server = createServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "my-secret-key" },
  services: [UserService, PublicService, OrmService],
});

server.on("ready", () => {
  console.log("Server is ready on port 8080");
});

await server.listen();

// Generate auth token for a user
const token = await server.generateAuthToken({
  roles: ["admin"],
  data: { userId: 1, role: "admin" },
});

// Emit events to connected clients
const UserUpdatedEvent = defineEvent<
  { userId: number },
  { action: string }
>("UserUpdatedEvent");

await server.emitEvent(
  UserUpdatedEvent,
  (info) => info.userId === 1,
  { action: "profile-updated" },
);
```

## Security

- **Helmet**: `@fastify/helmet` plugin automatically sets security headers like CSP, HSTS.
- **CORS**: `@fastify/cors` plugin configures CORS.
- **Path Traversal Prevention**: Static file handler and client name validation block `..`, `/`, `\` characters.
- **Hidden File Blocking**: Files starting with `.` return a 403 response.
- **Graceful Shutdown**: Detects `SIGINT`/`SIGTERM` signals to safely close open WebSocket connections and server (10-second timeout).

## Caveats

- `OrmService` is WebSocket-only. Cannot be used via HTTP requests.
- Config files (`.config.json`) contain sensitive information (DB passwords, JWT secrets, etc.), so hidden files (starting with `.`) are automatically blocked by the static file handler.
- WebSocket connection requires query parameters `ver=2`, `clientId`, `clientName`. Without these parameters, it operates in V1 legacy mode.
- If SSL is not configured, the `upgrade-insecure-requests` CSP directive is disabled.
