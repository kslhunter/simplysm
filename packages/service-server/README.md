# @simplysm/service-server

Fastify-based RPC server with WebSocket support, JWT authentication, service definitions, file upload/download, static file serving, and built-in ORM/auto-update services. Depends on `@simplysm/service-common` for shared protocol and types.

## Installation

```bash
npm install @simplysm/service-server
```

## API Overview

### Server Options
| API | Type | Description |
|-----|------|-------------|
| `ServiceServerOptions` | `interface` | Server configuration (rootPath, port, SSL, auth, services) |

-> See [docs/server-options.md](./docs/server-options.md) for details.

### Authentication (JWT)
| API | Type | Description |
|-----|------|-------------|
| `AuthTokenPayload` | `interface` | JWT token payload with roles and custom data |
| `signJwt` | `function` | Signs a JWT token (HS256, 12h expiry) |
| `verifyJwt` | `function` | Verifies a JWT token |
| `decodeJwt` | `function` | Decodes a JWT token without verification |

-> See [docs/auth.md](./docs/auth.md) for details.

### Service Definition/Context
| API | Type | Description |
|-----|------|-------------|
| `ServiceContext` | `interface` | Service execution context (server, socket, auth, config) |
| `createServiceContext` | `function` | Creates a service context instance |
| `getServiceAuthPermissions` | `function` | Reads auth permissions from an auth-wrapped function |
| `auth` | `function` | Authentication wrapper for service factories and methods |
| `ServiceDefinition` | `interface` | Service definition with name and factory |
| `defineService` | `function` | Defines a named service with a factory function |
| `ServiceMethods` | `type` | Extracts method signatures from a ServiceDefinition |

-> See [docs/service-definition.md](./docs/service-definition.md) for details.

### Service Executor
| API | Type | Description |
|-----|------|-------------|
| `executeServiceMethod` | `function` | Executes a service method with auth checking |

-> See [docs/service-executor.md](./docs/service-executor.md) for details.

### WebSocket Handler
| API | Type | Description |
|-----|------|-------------|
| `WebSocketHandler` | `interface` | Multi-connection WebSocket handler with event broadcasting |
| `createWebSocketHandler` | `function` | Creates a WebSocket handler instance |

-> See [docs/websocket-handler.md](./docs/websocket-handler.md) for details.

### Service Socket
| API | Type | Description |
|-----|------|-------------|
| `ServiceSocket` | `interface` | Single WebSocket connection with protocol and events |
| `createServiceSocket` | `function` | Creates a service socket instance |

-> See [docs/service-socket.md](./docs/service-socket.md) for details.

### HTTP Handlers
| API | Type | Description |
|-----|------|-------------|
| `handleHttpRequest` | `function` | Handles HTTP RPC requests (GET/POST) |
| `handleUpload` | `function` | Handles multipart file uploads |
| `handleStaticFile` | `function` | Serves static files with security guards |

-> See [docs/http-handlers.md](./docs/http-handlers.md) for details.

### Protocol Wrapper
| API | Type | Description |
|-----|------|-------------|
| `ServerProtocolWrapper` | `interface` | Server-side protocol wrapper with worker thread offloading |
| `createServerProtocolWrapper` | `function` | Creates a server protocol wrapper instance |

-> See [docs/protocol-wrapper.md](./docs/protocol-wrapper.md) for details.

### ORM/AutoUpdate Services
| API | Type | Description |
|-----|------|-------------|
| `OrmService` | `const (ServiceDefinition)` | Built-in ORM service definition |
| `OrmServiceType` | `type` | ORM service method signatures |
| `AutoUpdateService` | `const (ServiceDefinition)` | Built-in auto-update service definition |
| `AutoUpdateServiceType` | `type` | Auto-update service method signatures |

-> See [docs/built-in-services.md](./docs/built-in-services.md) for details.

### Config Manager
| API | Type | Description |
|-----|------|-------------|
| `getConfig` | `function` | Loads JSON config with file-watching and caching |

-> See [docs/config-manager.md](./docs/config-manager.md) for details.

### Legacy V1
| API | Type | Description |
|-----|------|-------------|
| `handleV1Connection` | `function` | V1 legacy WebSocket handler (auto-update only) |

-> See [docs/legacy-v1.md](./docs/legacy-v1.md) for details.

### Main ServiceServer
| API | Type | Description |
|-----|------|-------------|
| `ServiceServer` | `class` | Main server class (Fastify + WebSocket + auth) |
| `createServiceServer` | `function` | Factory function to create a ServiceServer |

-> See [docs/service-server.md](./docs/service-server.md) for details.

## Usage Examples

### Basic Server Setup

```typescript
import { createServiceServer, defineService, auth } from "@simplysm/service-server";

const GreetService = defineService("Greet", (ctx) => ({
  hello(name: string) {
    return \`Hello, \${name}!\`;
  },
  secret: auth(["admin"], (msg: string) => {
    return \`Secret for \${ctx.authInfo}: \${msg}\`;
  }),
}));

const server = createServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  auth: { jwtSecret: "my-secret" },
  services: [GreetService],
});

await server.listen();
```

### JWT Authentication

```typescript
import { signJwt, verifyJwt } from "@simplysm/service-server";

const token = await signJwt("my-secret", {
  roles: ["admin"],
  data: { userId: 1 },
});

const payload = await verifyJwt("my-secret", token);
```

### Event Broadcasting

```typescript
import { defineEvent } from "@simplysm/service-common";

const NotifyEvent = defineEvent<{ userId: number }, { text: string }>("Notify");
await server.emitEvent(NotifyEvent, (info) => info.userId === 42, { text: "Hello!" });
```

### Built-in ORM Service

```typescript
import { createServiceServer, OrmService } from "@simplysm/service-server";

const server = createServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  auth: { jwtSecret: "my-secret" },
  services: [OrmService],
});
```
