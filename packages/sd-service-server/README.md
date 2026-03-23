# @simplysm/sd-service-server

Fastify-based service server with WebSocket support, JWT authentication, HTTP/REST APIs, file upload, static file serving, ORM integration, and real-time event broadcasting. Designed to work with `@simplysm/sd-service-client`.

## Installation

```bash
npm install @simplysm/sd-service-server
```

## API Overview

### Server

| API | Type | Description |
|-----|------|-------------|
| `SdServiceServer` | Class | Main server class built on Fastify with WebSocket, HTTP, and static file support |
| `ISdServiceServerOptions` | Interface | Server configuration options |

-> See [docs/server.md](./docs/server.md) for details.

### Authentication

| API | Type | Description |
|-----|------|-------------|
| `SD_SERVICE_AUTH_META` | Symbol | Metadata key for storing authorization info on classes/methods |
| `Authorize` | Decorator | Decorator to require authentication and optional permissions |
| `IAuthTokenPayload` | Interface | JWT token payload structure with permissions and custom data |
| `SdServiceJwtManager` | Class | JWT sign/verify/decode manager using HS256 |

-> See [docs/auth.md](./docs/auth.md) for details.

### Core

| API | Type | Description |
|-----|------|-------------|
| `SdServiceBase` | Class | Abstract base class for all service implementations |
| `SdServiceExecutor` | Class | Resolves and executes service methods with authorization checks |

-> See [docs/core.md](./docs/core.md) for details.

### Built-in Services

| API | Type | Description |
|-----|------|-------------|
| `SdAutoUpdateService` | Class | Provides latest app version info for auto-update clients |
| `SdCryptoService` | Class | SHA-256 HMAC hashing and AES-256-CBC encryption/decryption |
| `SdOrmService` | Class | Server-side ORM service managing database connections and queries |
| `SdSmtpClientService` | Class | Email sending via SMTP using nodemailer |

-> See [docs/services.md](./docs/services.md) for details.

### Protocol

| API | Type | Description |
|-----|------|-------------|
| `ISdServiceProtocolWorker` | Interface | Type definition for the protocol worker thread interface |
| `SdServiceProtocolWrapper` | Class | Encodes/decodes binary protocol messages with worker thread offloading |

-> See [docs/protocol.md](./docs/protocol.md) for details.

### Transport

| API | Type | Description |
|-----|------|-------------|
| `SdHttpRequestHandler` | Class | Handles HTTP API requests (`/api/:service/:method`) |
| `SdStaticFileHandler` | Class | Serves static files with path proxy and security checks |
| `SdUploadHandler` | Class | Handles multipart file uploads to `/upload` |
| `SdServiceSocket` | Class | Server-side WebSocket wrapper per client connection |
| `SdWebSocketHandler` | Class | Manages all WebSocket connections and routes messages |

-> See [docs/transport.md](./docs/transport.md) for details.

### Utilities

| API | Type | Description |
|-----|------|-------------|
| `SdConfigManager` | Class | Cached JSON config file manager with file-watching and auto-reload |

-> See [docs/utils.md](./docs/utils.md) for details.

### Legacy (Deprecated)

| API | Type | Description |
|-----|------|-------------|
| `ISdServiceMethodCommandInfo` | Interface | Service method command info (deprecated) |
| `SD_SERVICE_SPECIAL_COMMANDS` | Const | Special command constants (deprecated) |
| `TSdServiceSpecialCommand` | Type | Union of special command strings (deprecated) |
| `TSdServiceMethodCommand` | Type | `Service.method` string pattern (deprecated) |
| `TSdServiceCommand` | Type | Union of all command types (deprecated) |
| `TSdServiceMessage` | Type | Union of all v1 messages (deprecated) |
| `TSdServiceS2CMessage` | Type | Server-to-client message union (deprecated) |
| `TSdServiceC2SMessage` | Type | Client-to-server message union (deprecated) |
| `TSdServiceResponse` | Type | Success or error response (deprecated) |
| `ISdServiceSuccessResponse` | Interface | Successful response (deprecated) |
| `ISdServiceErrorResponse` | Interface | Error response (deprecated) |
| `ISdServiceErrorBody` | Interface | Error body with message, code, stack (deprecated) |
| `ISdServiceRequest` | Interface | Client request message (deprecated) |
| `ISdServiceProgress` | Interface | Progress notification (deprecated) |
| `ISdServiceSplitRequest` | Interface | Split request chunk (deprecated) |
| `ISdServiceResponseForSplit` | Interface | ACK for split request (deprecated) |
| `ISdServiceSplitResponse` | Interface | Split response chunk (deprecated) |
| `SdServiceCommandHelperV1` | Class | Command string builder/parser (deprecated) |
| `SdServiceProtocolV1` | Class | JSON-based protocol with split message support (deprecated) |
| `ISdServiceProtocolDecodeResult` | Type | Decode result union (deprecated) |
| `SdServiceSocketV1` | Class | V1 WebSocket wrapper (deprecated) |
| `SdWebSocketHandlerV1` | Class | V1 WebSocket connection handler (deprecated) |

-> See [docs/legacy.md](./docs/legacy.md) for details.

## Usage Examples

### Create a basic server

```typescript
import { SdServiceServer, SdServiceBase } from "@simplysm/sd-service-server";

class GreetingService extends SdServiceBase {
  async hello(name: string): Promise<string> {
    return `Hello, ${name}!`;
  }
}

const server = new SdServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  services: [GreetingService],
});

await server.listenAsync();
```

### Server with authentication

```typescript
import { SdServiceServer, SdServiceBase, Authorize } from "@simplysm/sd-service-server";

@Authorize() // Require login for all methods
class SecureService extends SdServiceBase {
  async getSecret(): Promise<string> {
    return `User: ${JSON.stringify(this.authInfo)}`;
  }

  @Authorize(["admin"]) // Require "admin" permission
  async adminOnly(): Promise<string> {
    return "Admin access granted";
  }
}

const server = new SdServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  auth: { jwtSecret: "my-secret-key" },
  services: [SecureService],
});

await server.listenAsync();
```

### Server with ORM and SMTP services

```typescript
import {
  SdServiceServer,
  SdOrmService,
  SdCryptoService,
  SdSmtpClientService,
} from "@simplysm/sd-service-server";

const server = new SdServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  auth: { jwtSecret: "my-secret-key" },
  services: [SdOrmService, SdCryptoService, SdSmtpClientService],
});

await server.listenAsync();
```
