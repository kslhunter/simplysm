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

### Core Classes

- [`ServiceServer`](docs/server.md#serviceserver) - Main server class. Creates Fastify instance and configures routes/plugins
- [`ServiceBase`](docs/server.md#custom-service-definition) - Service base abstract class. All custom services must inherit from this
- `ServiceExecutor` - Internal executor that handles service method discovery, auth checks, and execution

### Authentication

- [`Authorize`](docs/authentication.md#authorize-decorator) - Stage 3 decorator. Sets authentication permissions at class or method level
- [`JwtManager`](docs/authentication.md#jwtmanager) - JWT token generation/verification/decoding based on jose library (HS256, 12-hour expiration)
- [`getAuthPermissions`](docs/authentication.md#getauthpermissions) - Queries auth permissions for a service class/method (used internally by `ServiceExecutor`)
- [`AuthTokenPayload`](docs/authentication.md#authtokenpayload) - JWT payload interface (includes `roles`, `data`)

### Transport Layer - WebSocket

- `WebSocketHandler` - Handles WebSocket connection management, message routing, and event distribution
- [`ServiceSocket`](docs/transport.md#servicesocket) - Wraps individual WebSocket connections. Manages ping/pong, protocol encoding/decoding, event listener management

### Transport Layer - HTTP

- `HttpRequestHandler` - Calls service methods via HTTP at `/api/:service/:method` route
- [`UploadHandler`](docs/transport.md#file-upload) - Handles multipart file upload at `/upload` route (auth required)
- `StaticFileHandler` - Serves static files. Prevents path traversal and blocks hidden files

### Protocol

- [`ProtocolWrapper`](docs/transport.md#protocolwrapper) - Message encoding/decoding wrapper. Messages over 30KB are processed in worker threads

### Built-in Services

- [`OrmService`](docs/built-in-services.md#ormservice) - DB connection/transaction/query execution (WebSocket only, auth required)
- [`CryptoService`](docs/built-in-services.md#cryptoservice) - SHA256 hash and AES-256-CBC encryption/decryption
- [`SmtpService`](docs/built-in-services.md#smtpservice) - nodemailer-based email sending
- [`AutoUpdateService`](docs/built-in-services.md#autoupdateservice) - App auto-update (provides latest version query and download path)

### Utilities

- [`ConfigManager`](docs/server.md#configmanager) - JSON config file loading/caching/real-time monitoring (auto expiration based on LazyGcMap)

### Legacy

- [`handleV1Connection`](docs/transport.md#legacy-handlev1connection) - V1 protocol client compatibility handling (supports auto-update only)

## Usage

### Basic Server Configuration

```typescript
import { ServiceServer } from "@simplysm/service-server";

const server = new ServiceServer({
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

Services are defined by inheriting from `ServiceBase`. Service methods are called via RPC from the client.

```typescript
import { ServiceBase } from "@simplysm/service-server";

class MyService extends ServiceBase {
  async hello(name: string): Promise<string> {
    return `Hello, ${name}!`;
  }

  async getServerTime(): Promise<Date> {
    return new Date();
  }
}
```

See [Custom Service Definition](docs/server.md#custom-service-definition) for more details on `ServiceBase` properties and methods.

### Authentication

Use the `@Authorize()` decorator to set authentication requirements:

```typescript
import { ServiceBase, Authorize } from "@simplysm/service-server";

@Authorize()
class UserService extends ServiceBase<{ userId: number; role: string }> {
  async getProfile(): Promise<unknown> {
    const userId = this.authInfo?.userId;
    // ...
  }

  @Authorize(["admin"])
  async deleteUser(targetId: number): Promise<void> {
    // Only users with admin role can call
  }
}
```

See [Authentication](docs/authentication.md) for JWT token management and permission handling.

### HTTP/WebSocket Communication

Service methods can be called via HTTP or WebSocket:

```
GET /api/MyService/hello?json=["World"]
POST /api/MyService/hello
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
import { ServiceEventListener } from "@simplysm/service-common";

class OrderUpdatedEvent extends ServiceEventListener<
  { orderId: number },
  { status: string }
> {
  readonly eventName = "OrderUpdatedEvent";
}

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
- [`CryptoService`](docs/built-in-services.md#cryptoservice) - Hashing and encryption
- [`SmtpService`](docs/built-in-services.md#smtpservice) - Email sending
- [`AutoUpdateService`](docs/built-in-services.md#autoupdateservice) - Client app auto-updates

Register them like any other service:

```typescript
const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "secret" },
  services: [OrmService, CryptoService, SmtpService],
});
```

## Security

- **Helmet**: `@fastify/helmet` plugin automatically sets security headers like CSP, HSTS
- **CORS**: `@fastify/cors` plugin configures CORS
- **Path Traversal Prevention**: Static file handler and client name validation block `..`, `/`, `\` characters
- **Hidden File Blocking**: Files starting with `.` return a 403 response
- **Graceful Shutdown**: Detects `SIGINT`/`SIGTERM` signals to safely close WebSocket connections and server (10-second timeout)

See [Security](docs/server.md#security) for more details.

## License

Apache-2.0
