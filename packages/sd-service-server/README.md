# @simplysm/sd-service-server

Simplysm service module (server). A Fastify 5.x-based HTTP and WebSocket server framework for building SimplySM services with JWT authentication, ORM integration, file upload, and static file serving.

## Installation

```bash
yarn add @simplysm/sd-service-server
```

## Main Modules

### Authentication

#### `Authorize` decorator

A method or class-level decorator that attaches permission metadata. The `SdServiceExecutor` reads this metadata at runtime to enforce access control.

```typescript
import { Authorize, SdServiceBase } from "@simplysm/sd-service-server";

// Class-level: all methods require login (empty array = login only)
@Authorize()
export class MyService extends SdServiceBase {
  async getData() { ... }
}

// Method-level: specific permission required
export class MyService2 extends SdServiceBase {
  @Authorize(["admin", "manager"])
  async deleteRecord(id: number) { ... }
}
```

#### `SD_SERVICE_AUTH_META`

Symbol used as the metadata key for `Authorize` decorator metadata storage.

```typescript
import { SD_SERVICE_AUTH_META } from "@simplysm/sd-service-server";

const perms = Reflect.getMetadata(SD_SERVICE_AUTH_META, MyService);
```

#### `IAuthTokenPayload<TAuthInfo>`

Interface for the JWT token payload. Extends `JWTPayload` from `jose`.

```typescript
import { IAuthTokenPayload } from "@simplysm/sd-service-server";

interface IMyAuthInfo {
  userId: number;
  userName: string;
}

const payload: IAuthTokenPayload<IMyAuthInfo> = {
  perms: ["admin"],
  data: { userId: 1, userName: "Alice" },
};
```

| Field   | Type        | Description                                      |
| ------- | ----------- | ------------------------------------------------ |
| `perms` | `string[]`  | List of permissions the authenticated user holds |
| `data`  | `TAuthInfo` | Application-specific auth information            |

#### `SdServiceJwtManager<TAuthInfo>`

Manages JWT signing, verification, and decoding using `jose` (HS256, 12-hour expiry).

```typescript
import { SdServiceJwtManager } from "@simplysm/sd-service-server";

// Accessed via SdServiceServer internally; not instantiated directly.
const token = await server.generateAuthTokenAsync({
  perms: ["admin"],
  data: { userId: 1 },
});
const payload = await server.verifyAuthTokenAsync(token);
```

| Method        | Signature                                                    | Description                                      |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `signAsync`   | `(payload: IAuthTokenPayload<TAuthInfo>) => Promise<string>` | Signs and returns a JWT string                   |
| `verifyAsync` | `(token: string) => Promise<IAuthTokenPayload<TAuthInfo>>`   | Verifies signature and expiry; throws on failure |
| `decodeAsync` | `(token: string) => Promise<IAuthTokenPayload<TAuthInfo>>`   | Decodes without verifying signature              |

---

### Core

#### `SdServiceBase<TAuthInfo>`

Abstract base class that every service must extend. Provides access to the server instance, the active socket/HTTP context, and config loading utilities.

```typescript
import { SdServiceBase, Authorize } from "@simplysm/sd-service-server";

@Authorize()
export class OrderService extends SdServiceBase {
  async getOrders(customerId: number) {
    const config = await this.getConfigAsync<{ maxRows: number }>("order");
    // this.authInfo => TAuthInfo of the logged-in user
    // this.clientName => client app name sent by the caller
    return [];
  }
}
```

| Member                       | Type                                                                        | Description                                                             |
| ---------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `server`                     | `SdServiceServer<TAuthInfo>`                                                | The running server instance                                             |
| `socket`                     | `SdServiceSocket \| undefined`                                              | Active WebSocket v2 socket (if called via WS)                           |
| `v1`                         | `{ socket: SdServiceSocketV1; request: ISdServiceRequest } \| undefined`    | Legacy v1 socket context                                                |
| `http`                       | `{ clientName: string; authTokenPayload?: IAuthTokenPayload } \| undefined` | HTTP request context                                                    |
| `authInfo`                   | `TAuthInfo \| undefined`                                                    | Shorthand: decoded auth data from current context                       |
| `clientName`                 | `string \| undefined`                                                       | Validated client name (blocks path traversal)                           |
| `clientPath`                 | `string \| undefined`                                                       | Resolved filesystem path for the client app                             |
| `getConfigAsync<T>(section)` | `Promise<T>`                                                                | Loads config from root `.config.json` merged with client `.config.json` |

#### `SdServiceExecutor`

Internal class that resolves a service class by name, enforces `@Authorize` permissions, instantiates the service, and invokes the requested method. Used by transport handlers; not instantiated directly.

```typescript
import { SdServiceExecutor } from "@simplysm/sd-service-server";

// Internal usage example (transport layer):
const executor = new SdServiceExecutor(server);
const result = await executor.runMethodAsync({
  serviceName: "OrderService",
  methodName: "getOrders",
  params: [42],
  http: { clientName: "web", authTokenPayload: payload },
});
```

`runMethodAsync` signature:

```typescript
runMethodAsync(def: {
  serviceName: string;
  methodName: string;
  params: any[];
  socket?: SdServiceSocket;
  v1?: { socket: SdServiceSocketV1; request: ISdServiceRequest };
  http?: { clientName: string; authTokenPayload?: IAuthTokenPayload };
}): Promise<any>
```

---

### Server

#### `SdServiceServer<TAuthInfo>`

The main server class. Wraps Fastify 5.x with WebSocket, security headers (Helmet), CORS, multipart upload, static file serving, port/path proxying, and graceful shutdown.

Extends `EventEmitter`. Emits `"ready"` after `listenAsync()` completes and `"close"` after `closeAsync()` completes.

```typescript
import { SdServiceServer } from "@simplysm/sd-service-server";
import { OrderService } from "./services/OrderService";

const server = new SdServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  services: [OrderService],
  auth: { jwtSecret: process.env.JWT_SECRET! },
});

await server.listenAsync();

// Emit an event to all connected clients
await server.emitEvent(MyEventListener, (info) => info.topic === "orders", { orderId: 1 });

// Broadcast a hot-reload signal (used by sd-cli dev mode)
await server.broadcastReloadAsync("web", new Set(["main.js"]));

// Generate / verify auth tokens
const token = await server.generateAuthTokenAsync({ perms: ["admin"], data: { userId: 1 } });
const payload = await server.verifyAuthTokenAsync(token);

await server.closeAsync();
```

| Member                                             | Type                                    | Description                                                                         |
| -------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| `isOpen`                                           | `boolean`                               | `true` after `listenAsync()` succeeds                                               |
| `options`                                          | `ISdServiceServerOptions`               | Constructor options (read-only)                                                     |
| `listenAsync()`                                    | `Promise<void>`                         | Starts Fastify, registers all plugins and routes, begins listening                  |
| `closeAsync()`                                     | `Promise<void>`                         | Closes all sockets and Fastify; emits `"close"` event                               |
| `broadcastReloadAsync(clientName, changedFileSet)` | `Promise<void>`                         | Sends hot-reload command to all connected clients (`clientName` may be `undefined`) |
| `emitEvent(eventType, infoSelector, data)`         | `Promise<void>`                         | Emits a typed server-push event to matching listeners                               |
| `generateAuthTokenAsync(payload)`                  | `Promise<string>`                       | Signs a JWT via `SdServiceJwtManager`                                               |
| `verifyAuthTokenAsync(token)`                      | `Promise<IAuthTokenPayload<TAuthInfo>>` | Verifies and decodes a JWT                                                          |

Routes registered automatically:

| Route                        | Handler                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `POST /api/:service/:method` | HTTP service invocation                                  |
| `GET  /api/:service/:method` | HTTP service invocation (params via `?json=`)            |
| `POST /upload`               | Multipart file upload (requires `Authorization` header)  |
| `GET  /` (WebSocket)         | WebSocket connection (v1 legacy or v2 based on `?ver=2`) |
| `GET  /ws` (WebSocket)       | WebSocket connection (same as above)                     |
| `/*`                         | Static file serving / port proxy / path proxy            |

---

### Built-in Services

#### `SdAutoUpdateService`

Service for auto-update scenarios (Cordova/Capacitor). Scans the client's `{clientPath}/{platform}/updates/` directory for the latest installer.

Decorated with no `@Authorize` — public by default.

```typescript
import { SdAutoUpdateService } from "@simplysm/sd-service-server";

// Register in server options:
const server = new SdServiceServer({
  services: [SdAutoUpdateService],
  ...
});
```

| Method           | Signature                                                                      | Description                                                                                          |
| ---------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `getLastVersion` | `(platform: string) => { version: string; downloadPath: string } \| undefined` | Returns the latest semver update file for the given platform (`"android"` → `.apk`, others → `.exe`) |

#### `SdCryptoService`

Provides HMAC-SHA256 hashing and AES-256-CBC encryption/decryption. Reads key from config section `"crypto"`.

Implements `ISdCryptoService` from `@simplysm/sd-service-common`.

```typescript
import { SdCryptoService } from "@simplysm/sd-service-server";

// Config required: { "crypto": { "key": "32-byte-hex-key" } }

const server = new SdServiceServer({
  services: [SdCryptoService],
  ...
});
```

| Method       | Signature                                     | Description                                                |
| ------------ | --------------------------------------------- | ---------------------------------------------------------- |
| `encrypt`    | `(data: string \| Buffer) => Promise<string>` | HMAC-SHA256 hex digest                                     |
| `encryptAes` | `(data: Buffer) => Promise<string>`           | AES-256-CBC encrypt; returns `"<iv_hex>:<ciphertext_hex>"` |
| `decryptAes` | `(encText: string) => Promise<Buffer>`        | AES-256-CBC decrypt                                        |

#### `SdOrmService`

Provides database access over WebSocket. Manages per-socket DB connection pools. Decorated with `@Authorize()` (login required). Reads connection config from config section `"orm"`.

Implements `ISdOrmService` from `@simplysm/sd-service-common`.

```typescript
import { SdOrmService } from "@simplysm/sd-service-server";

// Config required: { "orm": { "main": { dialect: "mssql", host: "...", ... } } }

const server = new SdServiceServer({
  services: [SdOrmService],
  ...
});
```

| Method                | Signature                                                   | Description                                      |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `getInfo`             | `(opt) => Promise<{ dialect; database?; schema? }>`         | Returns connection dialect/db/schema info        |
| `connect`             | `(opt) => Promise<number>`                                  | Opens a DB connection and returns its numeric ID |
| `close`               | `(connId: number) => Promise<void>`                         | Closes a specific DB connection                  |
| `beginTransaction`    | `(connId, isolationLevel?) => Promise<void>`                | Begins a transaction                             |
| `commitTransaction`   | `(connId) => Promise<void>`                                 | Commits a transaction                            |
| `rollbackTransaction` | `(connId) => Promise<void>`                                 | Rolls back a transaction                         |
| `executeParametrized` | `(connId, query, params?) => Promise<any[][]>`              | Executes a parameterized SQL query               |
| `executeDefs`         | `(connId, defs, options?) => Promise<any[][]>`              | Executes ORM query definitions                   |
| `bulkInsert`          | `(connId, tableName, columnDefs, records) => Promise<void>` | Bulk inserts records                             |
| `bulkUpsert`          | `(connId, tableName, columnDefs, records) => Promise<void>` | Bulk upserts records                             |

#### `SdSmtpClientService`

Sends emails via SMTP using `nodemailer`. Can be called with explicit SMTP settings or by referencing a named config from section `"smtp"`.

Implements `ISdSmtpClientService` from `@simplysm/sd-service-common`.

```typescript
import { SdSmtpClientService } from "@simplysm/sd-service-server";

// Config required (for sendByConfig):
// { "smtp": { "myMail": { user, pass, host, port, secure, senderName, senderEmail } } }

const server = new SdServiceServer({
  services: [SdSmtpClientService],
  ...
});
```

| Method         | Signature                                                                          | Description                                                     |
| -------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `send`         | `(options: ISmtpClientSendOption) => Promise<string>`                              | Sends an email with explicit SMTP settings; returns `messageId` |
| `sendByConfig` | `(configName: string, options: ISmtpClientSendByDefaultOption) => Promise<string>` | Sends using a named SMTP config entry; returns `messageId`      |

---

### Transport (HTTP)

#### `SdHttpRequestHandler`

Internal Fastify route handler for `POST/GET /api/:service/:method`. Parses `Authorization` header, extracts `x-sd-client-name` header, and delegates to `SdServiceExecutor`. Not typically used directly.

```typescript
import { SdHttpRequestHandler } from "@simplysm/sd-service-server";

// Internal to SdServiceServer. Signature:
handleAsync(req: FastifyRequest, reply: FastifyReply): Promise<void>
```

#### `SdStaticFileHandler`

Internal handler for static file serving. Resolves paths relative to `rootPath/www`, supports `pathProxy` remapping, blocks hidden files (`.`-prefixed), and returns HTML error pages.

```typescript
import { SdStaticFileHandler } from "@simplysm/sd-service-server";

// Internal to SdServiceServer. Signature:
handleAsync(req: FastifyRequest, reply: FastifyReply, urlPath: string): Promise<void>
```

#### `SdUploadHandler`

Internal handler for `POST /upload`. Requires a valid `Authorization` JWT. Saves uploaded files to `rootPath/www/uploads/` with UUID-based filenames and returns an array of `ISdServiceUploadResult`.

```typescript
import { SdUploadHandler } from "@simplysm/sd-service-server";

// Internal to SdServiceServer. Signature:
handleAsync(req: FastifyRequest, reply: FastifyReply): Promise<void>
```

---

### Transport (WebSocket)

#### `SdServiceSocket`

Represents a single v2 WebSocket client connection. Handles ping/pong keepalive (5-second interval), message encoding/decoding via `SdServiceProtocolWrapper` (with worker-thread offloading for large payloads), and event listener registration.

```typescript
import { SdServiceSocket } from "@simplysm/sd-service-server";

// Provided to SdServiceBase.socket during WebSocket calls.
// Key members:
socket.clientName; // string: client app name
socket.authTokenPayload; // IAuthTokenPayload | undefined
socket.connectedAtDateTime; // DateTime
socket.connReq; // FastifyRequest: original HTTP upgrade request
socket.close(); // terminate connection
await socket.sendAsync(uuid, message);
```

| Member                                   | Description                                             |
| ---------------------------------------- | ------------------------------------------------------- |
| `clientName`                             | Client application name from connection query parameter |
| `authTokenPayload`                       | Set after successful `auth` message exchange            |
| `connectedAtDateTime`                    | `DateTime` when the socket connected                    |
| `connReq`                                | Original `FastifyRequest` from the HTTP upgrade         |
| `close()`                                | Forcefully terminates the WebSocket                     |
| `sendAsync(uuid, msg)`                   | Encodes and sends a `TSdServiceServerMessage`           |
| `addEventListener(key, eventName, info)` | Registers an event subscription                         |
| `removeEventListener(key)`               | Removes an event subscription                           |
| `getEventListners(eventName)`            | Returns listeners matching the event name               |
| `filterEventTargetKeys(targetKeys)`      | Filters registered keys against a target list           |

Events emitted: `"close"`, `"message"`

#### `SdWebSocketHandler`

Internal manager for all active v2 WebSocket connections. Handles connection lifecycle, message routing to `SdServiceExecutor`, event broadcasting, and JWT-based `auth` message processing.

```typescript
import { SdWebSocketHandler } from "@simplysm/sd-service-server";

// Internal to SdServiceServer. Key methods:
addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void
closeAll(): void
broadcastReloadAsync(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>
emitAsync(eventType, infoSelector, data): Promise<void>
```

---

### Protocol

#### `ISdServiceProtocolWorker`

Interface describing the worker thread API for `SdServiceProtocolWrapper`. Defines the `encode` and `decode` method contracts used by `SdWorker`.

```typescript
import { ISdServiceProtocolWorker } from "@simplysm/sd-service-server";

// Worker method signatures:
// encode(uuid: string, message: TSdServiceMessage) => { chunks: Buffer[]; totalSize: number }
// decode(buffer: Buffer) => ISdServiceMessageDecodeResult<TSdServiceMessage>
```

#### `SdServiceProtocolWrapper`

Wraps `SdServiceProtocol` from `@simplysm/sd-service-common` and automatically offloads certain payloads to a dedicated worker thread (4 GB heap limit) while processing others on the main thread.

Encoding heuristic: uses the worker thread when the message body is a `Buffer`, or is an array that contains at least one `Buffer` element. Otherwise, encodes on the main thread.

Decoding heuristic: uses the worker thread when the incoming buffer exceeds 30 KB. Otherwise, decodes on the main thread.

```typescript
import { SdServiceProtocolWrapper } from "@simplysm/sd-service-server";

// Used internally by SdServiceSocket. Public API:
const wrapper = new SdServiceProtocolWrapper();
const { chunks } = await wrapper.encodeAsync(uuid, message);
const result = await wrapper.decodeAsync(buffer);
wrapper.dispose(); // clears GC timers
```

| Method        | Signature                                                                                        | Description                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `encodeAsync` | `(uuid: string, message: TSdServiceMessage) => Promise<{ chunks: Buffer[]; totalSize: number }>` | Encodes a message; uses worker for Buffer-containing payloads                 |
| `decodeAsync` | `(buffer: Buffer) => Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>>`                  | Decodes/reassembles message chunks; uses worker for buffers larger than 30 KB |
| `dispose`     | `() => void`                                                                                     | Releases protocol GC timer resources                                          |

---

### Utilities

#### `SdConfigManager`

Static class for reading and watching `.config.json` files with in-memory caching (1-hour TTL, GC every 10 minutes). File changes are detected via `SdFsWatcher` and the cache is updated automatically.

```typescript
import { SdConfigManager } from "@simplysm/sd-service-server";

// SdServiceBase.getConfigAsync() uses this internally.
// Direct usage:
const config = await SdConfigManager.getConfigAsync<{ apiKey: string }>("/path/to/.config.json");
```

| Method              | Signature                                       | Description                                                                                 |
| ------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `getConfigAsync<T>` | `(filePath: string) => Promise<T \| undefined>` | Reads, caches, and watches the JSON config file. Returns `undefined` if file does not exist |

---

## Types

#### `ISdServiceServerOptions`

Options passed to the `SdServiceServer` constructor.

```typescript
import { ISdServiceServerOptions } from "@simplysm/sd-service-server";

const options: ISdServiceServerOptions = {
  rootPath: process.cwd(), // Root filesystem path for static files and configs
  port: 3000, // TCP port to listen on
  services: [OrderService], // Service classes (must extend SdServiceBase)
  auth: {
    jwtSecret: "my-secret", // JWT signing secret
  },
  ssl: {
    // Optional HTTPS (PFX format)
    pfxBuffer: Buffer | (() => Promise<Buffer> | Buffer), // sync or async factory
    passphrase: "pfx-passphrase",
  },
  pathProxy: {
    // Map URL prefix -> filesystem path
    "admin/": "/opt/admin-app",
  },
  portProxy: {
    // Map URL prefix -> port (reverse proxy)
    "api2/": 4000,
  },
  middlewares: [
    // Express-style middleware functions
    (req, res, next) => {
      next();
    },
  ],
};
```

| Field         | Type                                                                             | Required | Description                                               |
| ------------- | -------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| `rootPath`    | `string`                                                                         | Yes      | Filesystem root; static files served from `rootPath/www/` |
| `port`        | `number`                                                                         | Yes      | Port to listen on                                         |
| `services`    | `Type<SdServiceBase>[]`                                                          | Yes      | Service classes to register                               |
| `ssl`         | `{ pfxBuffer: Buffer \| (() => Promise<Buffer> \| Buffer); passphrase: string }` | No       | PFX buffer (or sync/async factory) for HTTPS              |
| `auth`        | `{ jwtSecret: string }`                                                          | No       | JWT secret; required to use `@Authorize`                  |
| `pathProxy`   | `Record<string, string>`                                                         | No       | Maps URL path prefixes to filesystem paths                |
| `portProxy`   | `Record<string, number>`                                                         | No       | Maps URL path prefixes to proxy ports                     |
| `middlewares` | `Function[]`                                                                     | No       | Express-compatible middleware functions                   |

---

## Legacy (deprecated)

The following exports are marked `@deprecated` and exist only for backward compatibility with old clients that use the v1 WebSocket protocol. Do not use in new code.

| Export                           | Description                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ISdServiceMethodCommandInfo`    | Command descriptor: `{ serviceName, methodName }`                                                                                                                                |
| `SD_SERVICE_SPECIAL_COMMANDS`    | Special command constants (`addEventListener`, `removeEventListener`, etc.)                                                                                                      |
| `TSdServiceSpecialCommand`       | Union type of special command strings                                                                                                                                            |
| `TSdServiceMethodCommand`        | Template literal type `"Service.method"`                                                                                                                                         |
| `TSdServiceCommand`              | Union of `TSdServiceSpecialCommand` and `TSdServiceMethodCommand`                                                                                                                |
| `TSdServiceMessage`              | Union of all v1 message shapes                                                                                                                                                   |
| `TSdServiceS2CMessage`           | Server-to-client message union                                                                                                                                                   |
| `TSdServiceC2SMessage`           | Client-to-server message union                                                                                                                                                   |
| `TSdServiceResponse`             | Success or error response                                                                                                                                                        |
| `ISdServiceSuccessResponse`      | `{ name: "response"; reqUuid; state: "success"; body }`                                                                                                                          |
| `ISdServiceErrorResponse`        | `{ name: "response"; reqUuid; state: "error"; body: ISdServiceErrorBody }`                                                                                                       |
| `ISdServiceErrorBody`            | `{ message; code; stack? }`                                                                                                                                                      |
| `ISdServiceRequest`              | `{ name: "request"; clientName; uuid; command; params }`                                                                                                                         |
| `ISdServiceProgress`             | Upload progress: `{ name: "progress"; uuid; totalSize; receivedSize }`                                                                                                           |
| `ISdServiceSplitRequest`         | Chunked request packet                                                                                                                                                           |
| `ISdServiceResponseForSplit`     | ACK for chunked request                                                                                                                                                          |
| `ISdServiceSplitResponse`        | Chunked response packet                                                                                                                                                          |
| `SdServiceCommandHelperV1`       | Builds and parses `"Service.method"` command strings (`buildMethodCommand`, `parseMethodCommand`)                                                                                |
| `SdServiceProtocolV1`            | v1 protocol encode/decode with automatic chunk splitting (3 MB threshold, 300 KB chunks)                                                                                         |
| `ISdServiceProtocolDecodeResult` | `{ type: "complete"; message } \| { type: "accumulating"; uuid; completedSize; totalSize }`                                                                                      |
| `SdServiceSocketV1`              | v1 WebSocket wrapper with ping/pong; methods: `getClientIdAsync()`, `send(msg)`, `addEventListener`, `removeEventListener`, `getEventListners`, `emitByKeys`, `close`            |
| `SdWebSocketHandlerV1`           | v1 WebSocket connection manager; methods: `addSocket(socket, remoteAddress)`, `closeAll()`, `broadcastReload(clientName, changedFileSet)`, `emit(eventType, infoSelector, data)` |
