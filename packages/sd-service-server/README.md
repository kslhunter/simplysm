# @simplysm/sd-service-server

Fastify-based service server with WebSocket support, JWT authentication, HTTP/REST APIs, file upload, static file serving, ORM integration, and real-time event broadcasting.

## Installation

```bash
npm install @simplysm/sd-service-server
# or
yarn add @simplysm/sd-service-server
```

## Quick Start

```typescript
import { SdServiceServer, SdServiceBase, SdOrmService, SdCryptoService } from "@simplysm/sd-service-server";

// Define a custom service
class MyService extends SdServiceBase {
  async hello(name: string): Promise<string> {
    return `Hello, ${name}!`;
  }
}

// Create and start the server
const server = new SdServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  services: [MyService, SdOrmService, SdCryptoService],
});

await server.listenAsync();
// Server is now running on port 3000
```

## Documentation

| Category | File | Description |
|---|---|---|
| Server | [docs/server.md](docs/server.md) | `SdServiceServer`, `ISdServiceServerOptions` |
| Authentication | [docs/authentication.md](docs/authentication.md) | `@Authorize`, `SdServiceJwtManager`, `IAuthTokenPayload` |
| Services | [docs/services.md](docs/services.md) | `SdServiceBase`, `SdServiceExecutor`, built-in services |
| Transport | [docs/transport.md](docs/transport.md) | HTTP handlers, WebSocket handlers, `SdServiceSocket` |
| Protocol | [docs/protocol.md](docs/protocol.md) | `SdServiceProtocolWrapper`, worker types |
| Utilities | [docs/utilities.md](docs/utilities.md) | `SdConfigManager` |
| Legacy (v1) | [docs/legacy.md](docs/legacy.md) | Deprecated v1 protocol and socket types |
