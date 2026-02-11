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

| Module | Path | Description |
|------|------|------|
| `ServiceServer` | `service-server.ts` | Main server class. Creates Fastify instance and configures routes/plugins |
| `ServiceBase` | `core/service-base.ts` | Service base abstract class. All custom services must inherit from this |
| `ServiceExecutor` | `core/service-executor.ts` | Internal executor that handles service method discovery, auth checks, and execution |

### Authentication

| Module | Path | Description |
|------|------|------|
| `JwtManager` | `auth/jwt-manager.ts` | JWT token generation/verification/decoding based on jose library (HS256, 12-hour expiration) |
| `Authorize` | `auth/auth.decorators.ts` | Stage 3 decorator. Sets authentication permissions at class or method level |
| `AuthTokenPayload` | `auth/auth-token-payload.ts` | JWT payload interface (includes `roles`, `data`) |

### Transport Layer - WebSocket

| Module | Path | Description |
|------|------|------|
| `WebSocketHandler` | `transport/socket/websocket-handler.ts` | Handles WebSocket connection management, message routing, and event distribution |
| `ServiceSocket` | `transport/socket/service-socket.ts` | Wraps individual WebSocket connections. Manages ping/pong, protocol encoding/decoding, event listener management |

### Transport Layer - HTTP

| Module | Path | Description |
|------|------|------|
| `HttpRequestHandler` | `transport/http/http-request-handler.ts` | Calls service methods via HTTP at `/api/:service/:method` route |
| `UploadHandler` | `transport/http/upload-handler.ts` | Handles multipart file upload at `/upload` route (auth required) |
| `StaticFileHandler` | `transport/http/static-file-handler.ts` | Serves static files. Prevents path traversal and blocks hidden files |

### Protocol

| Module | Path | Description |
|------|------|------|
| `ProtocolWrapper` | `protocol/protocol-wrapper.ts` | Message encoding/decoding wrapper. Messages over 30KB are processed in worker threads |

### Built-in Services

| Module | Path | Description |
|------|------|------|
| `OrmService` | `services/orm-service.ts` | DB connection/transaction/query execution (WebSocket only, auth required) |
| `CryptoService` | `services/crypto-service.ts` | SHA256 hash and AES-256-CBC encryption/decryption |
| `SmtpService` | `services/smtp-service.ts` | nodemailer-based email sending |
| `AutoUpdateService` | `services/auto-update-service.ts` | App auto-update (provides latest version query and download path) |

### Utilities

| Module | Path | Description |
|------|------|------|
| `ConfigManager` | `utils/config-manager.ts` | JSON config file loading/caching/real-time monitoring (auto expiration based on LazyGcMap) |

### Legacy

| Module | Path | Description |
|------|------|------|
| `handleV1Connection` | `legacy/v1-auto-update-handler.ts` | V1 protocol client compatibility handling (supports auto-update only) |

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

### Server Options (`ServiceServerOptions`)

```typescript
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
  /** List of service classes to register */
  services: Type<ServiceBase>[];
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

### SSL/HTTPS Server

```typescript
import { fsReadFile } from "@simplysm/core-node";

const pfxBytes = await fsReadFile("/path/to/cert.pfx");

const server = new ServiceServer({
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

### Custom Service Definition

Define services by inheriting from `ServiceBase`. Service methods are called via RPC from the client.

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

Context accessible within services:

| Property | Type | Description |
|------|------|------|
| `this.server` | `ServiceServer` | Server instance reference |
| `this.socket` | `ServiceSocket \| undefined` | WebSocket connection (`undefined` for HTTP calls) |
| `this.http` | `{ clientName, authTokenPayload? }` | HTTP request context |
| `this.authInfo` | `TAuthInfo \| undefined` | Authenticated user info |
| `this.clientName` | `string \| undefined` | Client app name |
| `this.clientPath` | `string \| undefined` | Per-client directory path |

### Config File Reference

Read sections from `.config.json` files using `ServiceBase.getConfig()`. Root and per-client configs are automatically merged.

```typescript
class MyService extends ServiceBase {
  async getDbHost(): Promise<string> {
    // Read "mySection" key from rootPath/.config.json or clientPath/.config.json
    const config = await this.getConfig<{ host: string }>("mySection");
    return config.host;
  }
}
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

`ConfigManager` caches config files and automatically refreshes the cache on file changes (LazyGcMap-based, auto expires after 1 hour).

### Authentication (`Authorize` Decorator)

Use Stage 3 decorators to set authentication requirements on services or methods. Only works when `ServiceServerOptions.auth` is configured.

```typescript
import { ServiceBase, Authorize } from "@simplysm/service-server";

// Class level: all methods require login
@Authorize()
class UserService extends ServiceBase<{ userId: number; role: string }> {
  // Login only required (inherits from class level)
  async getProfile(): Promise<unknown> {
    const userId = this.authInfo?.userId;
    // ...
  }

  // Method level: specific role required (overrides class level)
  @Authorize(["admin"])
  async deleteUser(targetId: number): Promise<void> {
    // Only users with admin role can call
  }
}

// No authentication required (no decorator)
class PublicService extends ServiceBase {
  async healthCheck(): Promise<string> {
    return "OK";
  }
}
```

Decorator behavior:

| Target | `@Authorize()` | `@Authorize(["admin"])` |
|-----------|----------------|-------------------------|
| Class | All methods require login | All methods require admin role |
| Method | Method requires login | Method requires admin role |
| None | No auth required (Public) | - |

Method-level decorators override class-level settings.

### JWT Token Management

Generate and verify JWT tokens through the `ServiceServer` instance.

```typescript
// Generate token (12-hour expiration, HS256 algorithm)
const token = await server.generateAuthToken({
  roles: ["admin", "user"],
  data: { userId: 1, name: "홍길동" },
});

// Verify token
const payload = await server.verifyAuthToken(token);
// payload.roles: ["admin", "user"]
// payload.data: { userId: 1, name: "홍길동" }
```

`AuthTokenPayload` interface:

```typescript
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  /** User role list (used for permission check in Authorize decorator) */
  roles: string[];
  /** Custom auth info (generic type) */
  data: TAuthInfo;
}
```

### HTTP API Call

Service methods can also be called via HTTP through the `/api/:service/:method` path.

**GET Request:**

```
GET /api/MyService/hello?json=["World"]
Header: x-sd-client-name: my-app
Header: Authorization: Bearer <token>  (optional)
```

**POST Request:**

```
POST /api/MyService/hello
Header: Content-Type: application/json
Header: x-sd-client-name: my-app
Header: Authorization: Bearer <token>  (optional)
Body: ["World"]
```

- The `x-sd-client-name` header is required.
- Parameters are passed in array form (in the order of method arguments).
- For GET requests, pass a JSON-serialized array in the `json` query parameter.

### File Upload

Upload files via multipart request to the `/upload` endpoint. Auth token is required.

```typescript
// Client-side example
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

// Response: ServiceUploadResult[]
const results = await response.json();
// [{ path: "uploads/uuid.ext", filename: "original-filename.ext", size: 12345 }]
```

Uploaded files are stored in the `rootPath/www/uploads/` directory with UUID-based filenames.

### Real-time Event Publishing

Publish events to connected clients from the server.

```typescript
import { ServiceEventListener } from "@simplysm/service-common";

// Event definition (from service-common)
class OrderUpdatedEvent extends ServiceEventListener<
  { orderId: number },
  { status: string }
> {
  readonly eventName = "OrderUpdatedEvent";
}

// Publish event from server
await server.emitEvent(
  OrderUpdatedEvent,
  (info) => info.orderId === 123,    // Target filter
  { status: "completed" },           // Data to send
);

// Send reload command to all clients
await server.broadcastReload("my-app", new Set(["main.js"]));
```

### Built-in Service: OrmService

Provides database connection/query/transaction via WebSocket. `@Authorize()` decorator is applied, requiring login.

```typescript
const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "secret" },
  services: [OrmService],
});
```

Define ORM config in `.config.json`:

```json
{
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

Methods provided by `OrmService`:

| Method | Description |
|--------|------|
| `getInfo(opt)` | Query DB connection info (dialect, database, schema) |
| `connect(opt)` | Create DB connection. Returns connection ID |
| `close(connId)` | Close DB connection |
| `beginTransaction(connId, isolationLevel?)` | Begin transaction |
| `commitTransaction(connId)` | Commit transaction |
| `rollbackTransaction(connId)` | Rollback transaction |
| `executeParametrized(connId, query, params?)` | Execute parameterized query |
| `executeDefs(connId, defs, options?)` | Execute QueryDef-based queries |
| `bulkInsert(connId, tableName, columnDefs, records)` | Bulk INSERT |

When a WebSocket connection is closed, all DB connections opened from that socket are automatically cleaned up.

### Built-in Service: CryptoService

Provides SHA256 hash and AES-256-CBC symmetric key encryption/decryption.

```typescript
const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [CryptoService],
});
```

`.config.json` config:

```json
{
  "crypto": {
    "key": "your-32-byte-secret-key-here!!"
  }
}
```

| Method | Description |
|--------|------|
| `encrypt(data)` | Generate SHA256 HMAC hash (one-way) |
| `encryptAes(data)` | AES-256-CBC encryption. Returns hex string in `iv:encrypted` format |
| `decryptAes(encText)` | AES-256-CBC decryption. Returns original binary |

### Built-in Service: SmtpService

A nodemailer-based email sending service. Can pass SMTP config directly or reference server config file.

```typescript
const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [SmtpService],
});
```

`.config.json` config (when using config reference method):

```json
{
  "smtp": {
    "default": {
      "host": "smtp.example.com",
      "port": 587,
      "secure": false,
      "user": "user@example.com",
      "pass": "password",
      "senderName": "My App",
      "senderEmail": "noreply@example.com"
    }
  }
}
```

| Method | Description |
|--------|------|
| `send(options)` | Send email by directly passing SMTP config |
| `sendByConfig(configName, options)` | Send email by referencing SMTP config in config file |

`send()` options:

```typescript
interface SmtpSendOption {
  host: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpSendAttachment[];
}
```

### Built-in Service: AutoUpdateService

Supports auto-update for client apps. Searches for latest version files by platform in the client directory.

```typescript
const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [AutoUpdateService],
});
```

Update file structure:

```
rootPath/www/{clientName}/{platform}/updates/
  1.0.0.exe    (Windows)
  1.0.1.exe
  1.0.0.apk    (Android)
  1.0.1.apk
```

| Method | Description |
|--------|------|
| `getLastVersion(platform)` | Returns latest version and download path for the platform. Returns `undefined` if no update |

Return value:

```typescript
{
  version: string;       // e.g., "1.0.1"
  downloadPath: string;  // e.g., "/my-app/android/updates/1.0.1.apk"
}
```

### ConfigManager

A static utility class that manages loading, caching, and real-time monitoring of JSON config files. Used internally by `ServiceBase.getConfig()`.

```typescript
import { ConfigManager } from "@simplysm/service-server";

const config = await ConfigManager.getConfig<MyConfig>("/path/to/.config.json");
```

Behavior:
- Caches file in `LazyGcMap` on first load.
- Registers file change watch (`FsWatcher`) to auto-refresh cache on changes.
- Cache auto-expires after 1 hour of no access, and associated watch is released.

### ProtocolWrapper

Handles encoding/decoding of WebSocket messages. Automatically branches between main thread and worker thread based on message size.

| Condition | Processing Method |
|------|-----------|
| 30KB or less | Processed directly in main thread |
| Over 30KB | Processed in worker thread (max 4GB memory allocation) |

Messages containing large binary data (Uint8Array) also branch to worker thread.

## Server Route Structure

The following routes are automatically registered when `ServiceServer.listen()` is called:

| Route | Method | Description |
|--------|--------|------|
| `/api/:service/:method` | GET, POST | Service method call via HTTP |
| `/upload` | POST | Multipart file upload (auth required) |
| `/` | WebSocket | WebSocket connection endpoint |
| `/ws` | WebSocket | WebSocket connection endpoint (alias) |
| `/*` | GET, etc. | Static file serving (based on `rootPath/www/`) |

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

## License

Apache-2.0
