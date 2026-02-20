# @simplysm/service-server

A Fastify-based HTTP/WebSocket server package. Provides server features needed for full-stack applications, including RPC-style service invocation, JWT authentication, file upload, static file serving, and real-time events.

Used together with `@simplysm/service-client` to configure WebSocket/HTTP communication between client and server.

## Installation

```bash
npm install @simplysm/service-server
# or
pnpm add @simplysm/service-server
```

## Main Modules

### Core Functions and Classes

- [`createServiceServer`](#basic-server-configuration) - Factory function for creating a `ServiceServer` instance
- [`ServiceServer`](docs/server.md#serviceserver) - Main server class. Creates a Fastify instance and configures routes/plugins
- [`defineService`](#custom-services) - Defines a service with a name and factory function
- [`ServiceContext`](docs/server.md#servicecontext) - Context object passed to service factory functions
- [`createServiceContext`](docs/server.md#createservicecontext) - Factory function that creates a `ServiceContext` (exported for advanced use)
- [`runServiceMethod`](docs/server.md#runservicemethod) - Dispatches a service method call with auth checks and execution
- [`ServiceDefinition`](docs/server.md#servicedefinition) - Type describing a registered service (name + factory + authPermissions)
- [`ServiceMethods`](docs/server.md#servicemethods) - Type utility that extracts method signatures from a `ServiceDefinition`

### Authentication

- [`auth`](#authentication) - Wrapper that sets authentication requirements at service or method level
- [`getServiceAuthPermissions`](docs/authentication.md#getserviceauthpermissions) - Reads auth permissions from an `auth()`-wrapped function
- [`signJwt`](docs/authentication.md#jwt-functions) - Generate a JWT token (HS256, 12-hour expiration)
- [`verifyJwt`](docs/authentication.md#jwt-functions) - Verify and decode a JWT token
- [`decodeJwt`](docs/authentication.md#jwt-functions) - Decode a JWT token without verification (synchronous)
- [`AuthTokenPayload`](docs/authentication.md#authtokenpayload) - JWT payload interface (includes `roles`, `data`)

### Transport Layer - WebSocket

- [`WebSocketHandler`](docs/transport.md#websockethandler) - Interface for managing multiple WebSocket connections, routing messages, and broadcasting events
- `createWebSocketHandler` - Factory function that creates a `WebSocketHandler` instance
- [`ServiceSocket`](docs/transport.md#servicesocket) - Interface wrapping a single WebSocket connection. Manages ping/pong, protocol encoding/decoding, event listener management
- `createServiceSocket` - Factory function that creates a `ServiceSocket` instance

### Transport Layer - HTTP

- `handleHttpRequest` - Handles service method calls via HTTP at `/api/:service/:method`
- `handleUpload` - Handles multipart file upload at `/upload` (auth required)
- `handleStaticFile` - Serves static files from `rootPath/www/`. Prevents path traversal and blocks hidden files

### Protocol

- [`ProtocolWrapper`](docs/transport.md#protocolwrapper) - Interface for message encoding/decoding. Messages over 30KB are processed in worker threads
- `createProtocolWrapper` - Factory function that creates a `ProtocolWrapper` instance

### Built-in Services

- [`OrmService`](docs/built-in-services.md#ormservice) - DB connection/transaction/query execution (WebSocket only, auth required)
- `OrmServiceType` - Type alias for `OrmService` method signatures (for client-side type sharing)
- [`AutoUpdateService`](docs/built-in-services.md#autoupdateservice) - App auto-update (provides latest version query and download path)
- `AutoUpdateServiceType` - Type alias for `AutoUpdateService` method signatures (for client-side type sharing)

### Utilities

- [`getConfig`](docs/server.md#getconfig) - JSON config file loading with caching and real-time file watching

### Legacy

- [`handleV1Connection`](docs/transport.md#legacy-handlev1connection) - V1 protocol client compatibility handling (supports auto-update only)

## Usage

### Basic Server Configuration

```typescript
import { createServiceServer } from "@simplysm/service-server";

const server = createServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [MyService],
});

// Start server
await server.listen();

// Receive events
server.on("ready", () => {
  console.log("Server ready");
});

server.on("close", () => {
  console.log("Server closed");
});

// Close server
await server.close();
```

### Server Options

See [`ServiceServerOptions`](docs/server.md#server-options-serviceserveroptions) for detailed configuration options including SSL, authentication, and directory structure.

### Custom Services

Services are defined using the `defineService` function. Service methods are called via RPC from the client.

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

#### ServiceContext

The `ctx` parameter provides access to server resources:

- `ctx.server` - ServiceServer instance
- `ctx.socket` - ServiceSocket instance (WebSocket only, undefined for HTTP)
- `ctx.http` - HTTP request/reply objects (HTTP only, undefined for WebSocket)
- `ctx.authInfo` - Authentication info (set via JWT token)
- `ctx.clientName` - Client identifier
- `ctx.clientPath` - Resolved per-client directory path (`rootPath/www/{clientName}`)
- `ctx.getConfig(section)` - Get server config by section name

### Authentication

Use the `auth()` wrapper to set authentication requirements at service or method level:

```typescript
import { defineService, auth } from "@simplysm/service-server";

interface UserAuthInfo {
  userId: number;
  role: string;
}

// Service-level auth: all methods require authentication
export const UserService = defineService("User", auth((ctx) => ({
  getProfile: async (): Promise<unknown> => {
    const userId = (ctx.authInfo as UserAuthInfo)?.userId;
    // ...
  },

  deleteUser: auth(["admin"], async (targetId: number): Promise<void> => {
    // Only users with admin role can call
  }),
})));

export type UserServiceMethods = import("@simplysm/service-server").ServiceMethods<typeof UserService>;
```

#### Auth Patterns

**Method-level auth only:**
```typescript
export const MyService = defineService("My", (ctx) => ({
  publicMethod: async (): Promise<void> => {
    // No auth required
  },

  protectedMethod: auth(async (): Promise<void> => {
    // Auth required
  }),

  adminMethod: auth(["admin"], async (): Promise<void> => {
    // Auth + admin role required
  }),
}));
```

**Service-level auth with method override:**
```typescript
// All methods require authentication by default
export const SecureService = defineService("Secure", auth((ctx) => ({
  normalMethod: async (): Promise<void> => {
    // Auth required (inherited from service level)
  },

  adminMethod: auth(["admin"], async (): Promise<void> => {
    // Auth + admin role required
  }),
})));
```

See [Authentication](docs/authentication.md) for JWT token management and permission handling.

### HTTP/WebSocket Communication

Service methods can be called via HTTP or WebSocket:

```
GET /api/My/hello?json=["World"]
POST /api/My/hello
```

See [HTTP API Call](docs/transport.md#http-api-call) and [ServiceSocket](docs/transport.md#servicesocket) for transport layer details.

### File Upload

Upload files via multipart request to the `/upload` endpoint:

```typescript
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/upload", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

See [File Upload](docs/transport.md#file-upload) for more details.

### Event Publishing

Publish real-time events to connected WebSocket clients:

```typescript
import { defineEvent } from "@simplysm/service-common";

export const OrderUpdatedEvent = defineEvent<
  { orderId: number },
  { status: string }
>("OrderUpdatedEvent");

await server.emitEvent(
  OrderUpdatedEvent,
  (info) => info.orderId === 123,
  { status: "completed" },
);
```

See [Real-time Event Publishing](docs/transport.md#real-time-event-publishing) for more details.

### Built-in Services

The package provides several built-in services:

- [`OrmService`](docs/built-in-services.md#ormservice) - Database operations (MySQL, MSSQL, PostgreSQL)
- [`AutoUpdateService`](docs/built-in-services.md#autoupdateservice) - Client app auto-updates

Register them like any other service:

```typescript
import { createServiceServer, OrmService } from "@simplysm/service-server";

const server = createServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "secret" },
  services: [OrmService],
});
```

## Security

- **Helmet**: `@fastify/helmet` plugin automatically sets security headers like CSP, HSTS
- **CORS**: `@fastify/cors` plugin configures CORS
- **Path Traversal Prevention**: Static file handler and client name validation block `..`, `/`, `\` characters
- **Hidden File Blocking**: Files starting with `.` return a 403 response
- **Directory Trailing Slash Redirect**: Directory requests without a trailing slash are redirected to the same path with a trailing slash (standard web server behavior)
- **Graceful Shutdown**: Detects `SIGINT`/`SIGTERM` signals to safely close WebSocket connections and server (10-second timeout)

See [Security](docs/server.md#security) for more details.

## License

Apache-2.0
