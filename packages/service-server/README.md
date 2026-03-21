# @simplysm/service-server

Simplysm package - service module (server)

Fastify-based service server with WebSocket support, JWT authentication, and built-in ORM/SMTP/auto-update services. Works with `@simplysm/service-client` for client-server communication.

## Installation

```bash
npm install @simplysm/service-server
```

## API Overview

### Types
| API | Type | Description |
|-----|------|-------------|
| `ServiceServerOptions` | interface | Server config (rootPath, port, ssl, auth, services) |

-> See [docs/server.md](./docs/server.md) for details.

### Auth
| API | Type | Description |
|-----|------|-------------|
| `AuthTokenPayload` | interface | JWT payload with roles and custom data |
| `signJwt` | function | Sign a JWT token (HS256, 12h expiry) |
| `verifyJwt` | function | Verify and decode a JWT token |
| `decodeJwt` | function | Decode JWT without verification |

-> See [docs/auth.md](./docs/auth.md) for details.

### Core
| API | Type | Description |
|-----|------|-------------|
| `ServiceContext` | interface | Context with server, socket, auth, config access |
| `createServiceContext` | function | Create a service context |
| `ServiceDefinition` | interface | Service definition (name, factory, auth) |
| `defineService` | function | Define a service with name and factory |
| `auth` | function | Auth wrapper for services/methods (login/roles) |
| `getServiceAuthPermissions` | function | Read auth permissions from wrapped function |
| `ServiceMethods` | type | Extract method types from ServiceDefinition |
| `executeServiceMethod` | function | Execute service method with auth checks |

-> See [docs/core.md](./docs/core.md) for details.

### Transport - Socket
| API | Type | Description |
|-----|------|-------------|
| `WebSocketHandler` | interface | Multi-connection WebSocket manager |
| `createWebSocketHandler` | function | Create WebSocket handler |
| `ServiceSocket` | interface | Single WebSocket connection manager |
| `createServiceSocket` | function | Create service socket |

-> See [docs/transport.md](./docs/transport.md) for details.

### Transport - HTTP
| API | Type | Description |
|-----|------|-------------|
| `handleHttpRequest` | function | Handle HTTP API requests |
| `handleUpload` | function | Handle file upload (multipart) |
| `handleStaticFile` | function | Serve static files from www/ |

-> See [docs/transport.md](./docs/transport.md) for details.

### Protocol
| API | Type | Description |
|-----|------|-------------|
| `ServerProtocolWrapper` | interface | Server protocol with worker thread offloading |
| `createServerProtocolWrapper` | function | Create server protocol wrapper |

-> See [docs/transport.md](./docs/transport.md) for details.

### Services
| API | Type | Description |
|-----|------|-------------|
| `OrmService` | const | Built-in ORM service (DB connection, queries) |
| `AutoUpdateService` | const | Built-in auto-update service |
| `SmtpClientService` | const | Built-in SMTP email service |

-> See [docs/services.md](./docs/services.md) for details.

### Utils
| API | Type | Description |
|-----|------|-------------|
| `getConfig` | function | Read JSON config with caching and live-reload |

-> See [docs/server.md](./docs/server.md) for details.

### Main
| API | Type | Description |
|-----|------|-------------|
| `ServiceServer` | class | Main server (Fastify, WebSocket, auth, events) |
| `createServiceServer` | function | Factory to create ServiceServer |

-> See [docs/server.md](./docs/server.md) for details.

### Legacy
| API | Type | Description |
|-----|------|-------------|
| `handleV1Connection` | function | V1 legacy client handler (auto-update only) |

-> See [docs/server.md](./docs/server.md) for details.

## Usage Examples

### Basic Server Setup

```typescript
import { createServiceServer, defineService, auth } from "@simplysm/service-server";
import { OrmService, AutoUpdateService } from "@simplysm/service-server";

// Define a custom service
const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok", time: new Date().toISOString() }),
}));

// Define an authenticated service
const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ctx.authInfo,
  adminOnly: auth(["admin"], () => "admin-only data"),
})));

// Create and start server
const server = createServiceServer({
  rootPath: "/app",
  port: 3000,
  auth: { jwtSecret: "my-secret" },
  services: [HealthService, UserService, OrmService, AutoUpdateService],
});

await server.listen();
```

### JWT Authentication

```typescript
import { signJwt, verifyJwt } from "@simplysm/service-server";

// Sign token (in login handler)
const token = await server.signAuthToken({
  roles: ["user", "admin"],
  data: { userId: 123, name: "John" },
});

// Verify token
const payload = await server.verifyAuthToken(token);
console.log(payload.data.name); // "John"
```

### Server-Side Event Emission

```typescript
import { defineEvent } from "@simplysm/service-common";

const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// Emit to all listeners with matching orderId
await server.emitEvent(
  OrderUpdated,
  (info) => info.orderId === 123,
  { status: "shipped" },
);
```
