# @simplysm/service-server

Simplysm package - service module (server)

Provides a full-featured HTTP/WebSocket server built on Fastify for hosting Simplysm services. Includes JWT-based authentication, ORM integration, file upload/static serving, SMTP email, and auto-update capabilities.

## Installation

```bash
pnpm add @simplysm/service-server
```

## Architecture Overview

The package is organized into four areas:

- **Auth** — JWT token signing, verification, and decoding (`signJwt`, `verifyJwt`, `decodeJwt`, `AuthTokenPayload`).
- **Services** — Service definition API (`defineService`, `auth`, `ServiceContext`, `runServiceMethod`) and three ready-to-use built-in services (`OrmService`, `AutoUpdateService`, `SmtpClientService`).
- **Transport** — WebSocket connection management (`WebSocketHandler`, `ServiceSocket`), HTTP route handlers (`handleHttpRequest`, `handleUpload`, `handleStaticFile`), and the binary protocol layer (`ProtocolWrapper`). Also includes the legacy v1 compatibility handler.
- **Server** — The `ServiceServer` class and `createServiceServer` factory that wire everything together, plus the `getConfig` utility for reading `.config.json`.

## Quick Start

```typescript
import { createServiceServer, defineService, OrmService } from "@simplysm/service-server";

const GreetService = defineService("Greet", (ctx) => ({
  hello: (name: string) => `Hello, ${name}!`,
}));

const server = createServiceServer({
  rootPath: "./dist",
  port: 3000,
  auth: { jwtSecret: "my-secret" },
  services: [GreetService, OrmService],
});

await server.listen();
```

## Exported Types

| Type | Description |
|---|---|
| `ServiceServerOptions` | Options object for `ServiceServer` / `createServiceServer` |
| `AuthTokenPayload<TAuthInfo>` | JWT payload with `roles` and typed `data` |
| `ServiceContext<TAuthInfo>` | Context injected into every service factory |
| `ServiceDefinition<TMethods>` | Return type of `defineService` |
| `ServiceMethods<TDefinition>` | Extracts method map type from a `ServiceDefinition` |
| `WebSocketHandler` | Manages all active WebSocket connections |
| `ServiceSocket` | Represents a single active WebSocket connection |
| `ProtocolWrapper` | Encode/decode service messages with optional worker offload |
| `OrmServiceType` | Method map type for `OrmService` |
| `AutoUpdateServiceType` | Method map type for `AutoUpdateService` |
| `SmtpClientServiceType` | Method map type for `SmtpClientService` |

## Detailed Documentation

- [docs/auth.md](docs/auth.md) — `AuthTokenPayload`, `signJwt`, `verifyJwt`, `decodeJwt`
- [docs/services.md](docs/services.md) — `defineService`, `auth`, `ServiceContext`, `runServiceMethod`, `OrmService`, `AutoUpdateService`, `SmtpClientService`
- [docs/transport.md](docs/transport.md) — `WebSocketHandler`, `ServiceSocket`, `handleHttpRequest`, `handleUpload`, `handleStaticFile`, `ProtocolWrapper`, legacy handler
- [docs/server.md](docs/server.md) — `ServiceServerOptions`, `ServiceServer`, `createServiceServer`, `getConfig`
