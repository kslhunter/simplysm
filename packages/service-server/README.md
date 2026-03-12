# @simplysm/service-server

Fastify-based service server framework with WebSocket support, JWT authentication, service routing, file uploads, and built-in ORM/SMTP/auto-update services.

## Installation

```bash
npm install @simplysm/service-server
```

## Quick Start

```typescript
import { createServiceServer, defineService } from "@simplysm/service-server";

const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok" }),
}));

const server = createServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  services: [HealthService],
});

await server.listen();
```

## Documentation

| Category | File | Description |
|----------|------|-------------|
| Server | [docs/server.md](docs/server.md) | `ServiceServer` class and `createServiceServer` factory |
| Service Definition | [docs/service-definition.md](docs/service-definition.md) | `defineService`, `auth`, `ServiceContext`, `ServiceMethods` |
| Authentication | [docs/authentication.md](docs/authentication.md) | JWT management and `AuthTokenPayload` |
| Transport | [docs/transport.md](docs/transport.md) | WebSocket handler, HTTP request handler, upload handler, static file handler |
| Protocol | [docs/protocol.md](docs/protocol.md) | `ServerProtocolWrapper` with worker thread offloading |
| Built-in Services | [docs/builtin-services.md](docs/builtin-services.md) | `OrmService`, `AutoUpdateService`, `SmtpClientService` |
| Utilities | [docs/utilities.md](docs/utilities.md) | `getConfig` with file watching and caching |
| Legacy | [docs/legacy.md](docs/legacy.md) | V1 auto-update handler for backward compatibility |
