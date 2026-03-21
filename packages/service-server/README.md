# @simplysm/service-server

Service module (server) -- Fastify-based service server with WebSocket support, JWT authentication, and built-in ORM/SMTP/auto-update services.

## Installation

```bash
npm install @simplysm/service-server
```

## Exports

```typescript
import {
  // Main
  ServiceServer,
  createServiceServer,
  type ServiceServerOptions,
  // Auth
  type AuthTokenPayload,
  signJwt,
  verifyJwt,
  decodeJwt,
  // Core
  type ServiceContext,
  createServiceContext,
  getServiceAuthPermissions,
  auth,
  type ServiceDefinition,
  defineService,
  type ServiceMethods,
  executeServiceMethod,
  // Transport - Socket
  type WebSocketHandler,
  createWebSocketHandler,
  type ServiceSocket,
  createServiceSocket,
  // Transport - HTTP
  handleHttpRequest,
  handleUpload,
  handleStaticFile,
  // Protocol
  type ServerProtocolWrapper,
  createServerProtocolWrapper,
  // Services
  OrmService,
  type OrmServiceType,
  AutoUpdateService,
  type AutoUpdateServiceType,
  SmtpClientService,
  type SmtpClientServiceType,
  // Utils
  getConfig,
  // Legacy
  handleV1Connection,
} from "@simplysm/service-server";
```

## Quick Start

```typescript
import {
  createServiceServer,
  defineService,
  auth,
  OrmService,
  AutoUpdateService,
} from "@simplysm/service-server";

// Define a custom service
const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok" }),
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

## Documentation

- [Auth](docs/auth.md)
- [Core](docs/core.md)
- [Transport](docs/transport.md)
- [Built-in Services](docs/services.md)
- [Server](docs/server.md)
