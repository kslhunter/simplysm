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

| Module | Description |
|--------|------|
| `ServiceServer` | Main server class. Creates Fastify instance and configures routes/plugins |
| `ServiceBase` | Service base abstract class. All custom services must inherit from this |
| `ServiceExecutor` | Internal executor that handles service method discovery, auth checks, and execution |

### Authentication

| Module | Description |
|--------|------|
| `JwtManager` | JWT token generation/verification/decoding based on jose library (HS256, 12-hour expiration) |
| `Authorize` | Stage 3 decorator. Sets authentication permissions at class or method level |
| `getAuthPermissions` | Queries auth permissions for a service class/method (used internally by `ServiceExecutor`) |
| `AuthTokenPayload` | JWT payload interface (includes `roles`, `data`) |

### Transport Layer - WebSocket

| Module | Description |
|--------|------|
| `WebSocketHandler` | Handles WebSocket connection management, message routing, and event distribution |
| `ServiceSocket` | Wraps individual WebSocket connections. Manages ping/pong, protocol encoding/decoding, event listener management |

### Transport Layer - HTTP

| Module | Description |
|--------|------|
| `HttpRequestHandler` | Calls service methods via HTTP at `/api/:service/:method` route |
| `UploadHandler` | Handles multipart file upload at `/upload` route (auth required) |
| `StaticFileHandler` | Serves static files. Prevents path traversal and blocks hidden files |

### Protocol

| Module | Description |
|--------|------|
| `ProtocolWrapper` | Message encoding/decoding wrapper. Messages over 30KB are processed in worker threads |

### Built-in Services

| Module | Description |
|--------|------|
| `OrmService` | DB connection/transaction/query execution (WebSocket only, auth required) |
| `CryptoService` | SHA256 hash and AES-256-CBC encryption/decryption |
| `SmtpService` | nodemailer-based email sending |
| `AutoUpdateService` | App auto-update (provides latest version query and download path) |

### Utilities

| Module | Description |
|--------|------|
| `ConfigManager` | JSON config file loading/caching/real-time monitoring (auto expiration based on LazyGcMap) |

### Legacy

| Module | Description |
|--------|------|
| `handleV1Connection` | V1 protocol client compatibility handling (supports auto-update only) |

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

### ServiceServer

`ServiceServer<TAuthInfo>` extends `EventEmitter` and is the main entry point for creating a server.

**Properties:**

| Property | Type | Description |
|----------|------|------|
| `options` | `ServiceServerOptions` | Server configuration (read-only, passed via constructor) |
| `isOpen` | `boolean` | Whether the server is currently listening |
| `fastify` | `FastifyInstance` | Underlying Fastify instance (read-only, for advanced use) |

**Methods:**

| Method | Returns | Description |
|--------|---------|------|
| `listen()` | `Promise<void>` | Register all plugins/routes and start listening |
| `close()` | `Promise<void>` | Close all WebSocket connections and shut down the server |
| `generateAuthToken(payload)` | `Promise<string>` | Generate a JWT token (HS256, 12-hour expiration) |
| `verifyAuthToken(token)` | `Promise<AuthTokenPayload<TAuthInfo>>` | Verify and decode a JWT token |
| `emitEvent(eventType, infoSelector, data)` | `Promise<void>` | Publish an event to matching WebSocket clients |
| `broadcastReload(clientName, changedFileSet)` | `Promise<void>` | Send a reload command to all connected clients |

**Events:**

| Event | Payload | Description |
|-------|---------|------|
| `ready` | `void` | Emitted when the server starts listening |
| `close` | `void` | Emitted when the server is closed |

### Server Options (`ServiceServerOptions`)

```typescript
import type { ServiceServerOptions } from "@simplysm/service-server";

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
import { ServiceServer } from "@simplysm/service-server";
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

#### ServiceBase Properties

`ServiceBase<TAuthInfo>` is an abstract class. The generic `TAuthInfo` type represents the shape of the authenticated user's data stored in the JWT token.

| Property | Type | Description |
|----------|------|------|
| `this.server` | `ServiceServer<TAuthInfo>` | Server instance reference |
| `this.socket` | `ServiceSocket \| undefined` | WebSocket connection (`undefined` for HTTP calls) |
| `this.http` | `{ clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> } \| undefined` | HTTP request context |
| `this.authInfo` | `TAuthInfo \| undefined` | Authenticated user's custom data (from JWT `data` field) |
| `this.clientName` | `string \| undefined` | Client app name (validated against path traversal) |
| `this.clientPath` | `string \| undefined` | Resolved per-client directory path (`rootPath/www/{clientName}`) |

#### ServiceBase Methods

| Method | Returns | Description |
|--------|---------|------|
| `getConfig<T>(section)` | `Promise<T>` | Read a section from `.config.json` (root + client configs merged) |

### Config File Reference

Read sections from `.config.json` files using `ServiceBase.getConfig()`. Root and per-client configs are automatically merged.

```typescript
import { ServiceBase } from "@simplysm/service-server";

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

#### `getAuthPermissions`

Query auth permissions for a given service class and method. Primarily used internally by `ServiceExecutor`, but exported for advanced use cases.

```typescript
import { getAuthPermissions } from "@simplysm/service-server";

// Returns string[] if permissions are set, or undefined for public (no decorator)
const perms = getAuthPermissions(UserService, "deleteUser");
// ["admin"]

const classPerms = getAuthPermissions(UserService);
// [] (empty array = login required, no specific role)

const publicPerms = getAuthPermissions(PublicService, "healthCheck");
// undefined (no auth required)
```

### JWT Token Management

#### JwtManager

`JwtManager<TAuthInfo>` handles JWT operations internally. Access its functionality through `ServiceServer` methods.

| Method | Returns | Description |
|--------|---------|------|
| `sign(payload)` | `Promise<string>` | Generate a JWT token (HS256, 12-hour expiration) |
| `verify(token)` | `Promise<AuthTokenPayload<TAuthInfo>>` | Verify token signature and expiration, return payload |
| `decode(token)` | `AuthTokenPayload<TAuthInfo>` | Decode token without verification (synchronous) |

Generate and verify JWT tokens through the `ServiceServer` instance:

```typescript
import { ServiceServer } from "@simplysm/service-server";

const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "my-secret-key" },
  services: [],
});

// Generate token (12-hour expiration, HS256 algorithm)
const token = await server.generateAuthToken({
  roles: ["admin", "user"],
  data: { userId: 1, name: "John" },
});

// Verify token
const payload = await server.verifyAuthToken(token);
// payload.roles: ["admin", "user"]
// payload.data: { userId: 1, name: "John" }
```

#### `AuthTokenPayload`

```typescript
import type { AuthTokenPayload } from "@simplysm/service-server";

interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  /** User role list (used for permission check in Authorize decorator) */
  roles: string[];
  /** Custom auth info (generic type) */
  data: TAuthInfo;
}
```

### ServiceSocket

`ServiceSocket` extends `EventEmitter` and wraps an individual WebSocket connection. It is available in service methods as `this.socket` when the request comes via WebSocket.

**Properties:**

| Property | Type | Description |
|----------|------|------|
| `clientName` | `string` | Client app name (from WebSocket query parameter) |
| `connectedAtDateTime` | `DateTime` | Connection timestamp |
| `authTokenPayload` | `AuthTokenPayload \| undefined` | Authenticated token payload (set after `auth` message) |
| `connReq` | `FastifyRequest` | Original Fastify request that initiated the WebSocket upgrade |

**Methods:**

| Method | Returns | Description |
|--------|---------|------|
| `send(uuid, msg)` | `Promise<number>` | Send a message to this client. Returns total bytes sent |
| `close()` | `void` | Terminate the WebSocket connection |
| `addEventListener(key, eventName, info)` | `void` | Register an event listener for this socket |
| `removeEventListener(key)` | `void` | Remove an event listener by key |
| `getEventListeners(eventName)` | `{ key, info }[]` | Get all event listeners for a given event name |

**Events:**

| Event | Payload | Description |
|-------|---------|------|
| `error` | `Error` | WebSocket error occurred |
| `close` | `number` | Connection closed (payload is the close code) |
| `message` | `{ uuid: string; msg: ServiceClientMessage }` | Decoded message received from client |

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
import { ServiceServer } from "@simplysm/service-server";
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
import { ServiceServer, OrmService } from "@simplysm/service-server";

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

| Method | Returns | Description |
|--------|---------|------|
| `getInfo(opt)` | `Promise<{ dialect, database?, schema? }>` | Query DB connection info |
| `connect(opt)` | `Promise<number>` | Create DB connection. Returns connection ID |
| `close(connId)` | `Promise<void>` | Close DB connection |
| `beginTransaction(connId, isolationLevel?)` | `Promise<void>` | Begin transaction |
| `commitTransaction(connId)` | `Promise<void>` | Commit transaction |
| `rollbackTransaction(connId)` | `Promise<void>` | Rollback transaction |
| `executeParametrized(connId, query, params?)` | `Promise<unknown[][]>` | Execute parameterized query |
| `executeDefs(connId, defs, options?)` | `Promise<unknown[][]>` | Execute QueryDef-based queries |
| `bulkInsert(connId, tableName, columnDefs, records)` | `Promise<void>` | Bulk INSERT |

When a WebSocket connection is closed, all DB connections opened from that socket are automatically cleaned up.

### Built-in Service: CryptoService

Provides SHA256 hash and AES-256-CBC symmetric key encryption/decryption.

```typescript
import { ServiceServer, CryptoService } from "@simplysm/service-server";

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

| Method | Returns | Description |
|--------|---------|------|
| `encrypt(data)` | `Promise<string>` | Generate SHA256 HMAC hash (one-way). `data` is `string \| Uint8Array` |
| `encryptAes(data)` | `Promise<string>` | AES-256-CBC encryption. `data` is `Uint8Array`. Returns hex string in `iv:encrypted` format |
| `decryptAes(encText)` | `Promise<Uint8Array>` | AES-256-CBC decryption. Returns original binary |

### Built-in Service: SmtpService

A nodemailer-based email sending service. Can pass SMTP config directly or reference server config file.

```typescript
import { ServiceServer, SmtpService } from "@simplysm/service-server";

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

| Method | Returns | Description |
|--------|---------|------|
| `send(options)` | `Promise<string>` | Send email by directly passing SMTP config. Returns message ID |
| `sendByConfig(configName, options)` | `Promise<string>` | Send email by referencing SMTP config in config file. Returns message ID |

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
import { ServiceServer, AutoUpdateService } from "@simplysm/service-server";

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

| Method | Returns | Description |
|--------|---------|------|
| `getLastVersion(platform)` | `Promise<{ version: string; downloadPath: string } \| undefined>` | Returns latest version and download path for the platform. Returns `undefined` if no update |

Return value example:

```typescript
{
  version: "1.0.1",
  downloadPath: "/my-app/android/updates/1.0.1.apk",
}
```

### ConfigManager

A static utility class that manages loading, caching, and real-time monitoring of JSON config files. Used internally by `ServiceBase.getConfig()`.

```typescript
import { ConfigManager } from "@simplysm/service-server";

// Returns undefined if the file does not exist
const config = await ConfigManager.getConfig<MyConfig>("/path/to/.config.json");
```

| Method | Returns | Description |
|--------|---------|------|
| `ConfigManager.getConfig<T>(filePath)` | `Promise<T \| undefined>` | Load and cache a JSON config file. Returns `undefined` if file not found |

Behavior:
- Caches file in `LazyGcMap` on first load.
- Registers file change watch (`FsWatcher`) to auto-refresh cache on changes.
- Cache auto-expires after 1 hour of no access, and associated watch is released.
- GC runs every 10 minutes to check for expired entries.

### ProtocolWrapper

Handles encoding/decoding of WebSocket messages. Automatically branches between main thread and worker thread based on message size.

```typescript
import { ProtocolWrapper } from "@simplysm/service-server";

const protocol = new ProtocolWrapper();

// Encode a message into chunks
const { chunks, totalSize } = await protocol.encode(uuid, message);

// Decode received bytes
const result = await protocol.decode(bytes);

// Clean up
protocol.dispose();
```

| Method | Returns | Description |
|--------|---------|------|
| `encode(uuid, message)` | `Promise<{ chunks: Uint8Array[]; totalSize: number }>` | Encode a message into transmittable chunks |
| `decode(bytes)` | `Promise<ServiceMessageDecodeResult>` | Decode received bytes into a message |
| `dispose()` | `void` | Clean up internal protocol resources |

Worker thread branching:

| Condition | Processing Method |
|------|-----------|
| 30KB or less | Processed directly in main thread |
| Over 30KB | Processed in worker thread (max 4GB memory allocation) |

Messages containing large binary data (Uint8Array) also branch to worker thread.

### Legacy: handleV1Connection

Handles V1 protocol WebSocket clients. Only supports the `SdAutoUpdateService.getLastVersion` command. All other requests return an upgrade-required error.

```typescript
import { handleV1Connection, AutoUpdateService } from "@simplysm/service-server";

// Used internally by ServiceServer for WebSocket connections without ver=2 query parameter
handleV1Connection(webSocket, autoUpdateService);
```

## Full Server Example

```typescript
import { ServiceServer, ServiceBase, Authorize, OrmService, CryptoService } from "@simplysm/service-server";
import { ServiceEventListener } from "@simplysm/service-common";

// Define a custom service
@Authorize()
class UserService extends ServiceBase<{ userId: number; role: string }> {
  async getProfile(): Promise<{ name: string }> {
    const userId = this.authInfo?.userId;
    // Use this.getConfig(), this.socket, this.server, etc.
    return { name: "John" };
  }

  @Authorize(["admin"])
  async deleteUser(targetId: number): Promise<void> {
    // Admin-only operation
  }
}

class PublicService extends ServiceBase {
  async healthCheck(): Promise<string> {
    return "OK";
  }
}

// Create and start server
const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "my-secret-key" },
  services: [UserService, PublicService, OrmService, CryptoService],
});

server.on("ready", () => {
  console.log("Server is ready on port 8080");
});

await server.listen();

// Generate auth token for a user
const token = await server.generateAuthToken({
  roles: ["admin"],
  data: { userId: 1, role: "admin" },
});

// Emit events to connected clients
class UserUpdatedEvent extends ServiceEventListener<
  { userId: number },
  { action: string }
> {
  readonly eventName = "UserUpdatedEvent";
}

await server.emitEvent(
  UserUpdatedEvent,
  (info) => info.userId === 1,
  { action: "profile-updated" },
);
```

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
