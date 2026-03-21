# Server

## ServiceServerOptions

Server configuration options.

```typescript
interface ServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?: {
    pfxBytes: Uint8Array;
    passphrase: string;
  };
  auth?: {
    jwtSecret: string;
  };
  services: ServiceDefinition[];
}
```

## ServerProtocolWrapper

Server-side protocol wrapper. Automatically offloads heavy message encoding/decoding to a worker thread while using main thread for lightweight operations.

```typescript
interface ServerProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
```

### `createServerProtocolWrapper`

```typescript
function createServerProtocolWrapper(): ServerProtocolWrapper;
```

**Behavior:**
- Messages with `Uint8Array` body or arrays containing `Uint8Array` are encoded via worker thread
- Messages larger than 30KB are decoded via worker thread
- Worker is a lazy singleton shared across all protocol wrappers (4GB memory limit)
- Small messages are processed on the main thread using `createServiceProtocol()`

---

## Config Utilities

### `getConfig`

Read and cache a JSON config file with automatic live-reload via file watcher.

```typescript
async function getConfig<TConfig>(filePath: string): Promise<TConfig | undefined>;
```

**Behavior:**
- Returns `undefined` if file does not exist
- Caches loaded config in a `LazyGcMap` (expires after 1 hour, GC runs every 10 minutes)
- Registers a file watcher that live-reloads config on changes
- Watcher is cleaned up when the cache entry expires

---

## Legacy

### `handleV1Connection`

V1 legacy client handler. Only auto-update is supported; all other requests return an upgrade-required error.

```typescript
function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: { getLastVersion: (platform: string) => Promise<any> },
  clientNameSetter?: (clientName: string | undefined) => void,
): void;
```

---

## ServiceServer

Main server class. Extends `EventEmitter<{ ready: void; close: void }>`.

```typescript
class ServiceServer<TAuthInfo = unknown> extends EventEmitter<{ ready: void; close: void }> {
  isOpen: boolean;
  readonly fastify: FastifyInstance;
  readonly options: ServiceServerOptions;

  constructor(options: ServiceServerOptions);

  async listen(): Promise<void>;
  async close(): Promise<void>;
  async broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>;
  async emitEvent<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
  async signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>;
  async verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>;
}
```

### `listen`

Start the server. Registers all Fastify plugins and routes:

- `@fastify/websocket` -- WebSocket support
- `@fastify/helmet` -- Security headers
- `@fastify/multipart` -- File upload support
- `@fastify/static` -- Static file serving
- `@fastify/cors` -- Cross-origin resource sharing

**Routes:**
- `GET/POST /api/:service/:method` -- HTTP API endpoint
- `POST /upload` -- File upload endpoint
- `GET /ws` or `GET /` (WebSocket) -- WebSocket connection (V2 protocol with V1 legacy fallback)
- `GET/POST/PUT/DELETE/PATCH/HEAD /*` -- Static file wildcard handler

Registers graceful shutdown handlers for `SIGINT` and `SIGTERM` (10s timeout before force exit).

### `close`

Close all WebSocket connections and shut down the Fastify server.

### `broadcastReload`

Broadcast a reload message to all connected WebSocket clients.

```typescript
async broadcastReload(
  clientName: string | undefined,
  changedFileSet: Set<string>,
): Promise<void>;
```

### `emitEvent`

Emit an event to matching WebSocket clients.

```typescript
async emitEvent<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  infoSelector: (item: TInfo) => boolean,
  data: TData,
): Promise<void>;
```

### `signAuthToken`

Sign a JWT auth token.

```typescript
async signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>;
```

### `verifyAuthToken`

Verify a JWT auth token.

```typescript
async verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>;
```

## `createServiceServer`

Factory function.

```typescript
function createServiceServer<TAuthInfo = unknown>(
  options: ServiceServerOptions,
): ServiceServer<TAuthInfo>;
```

## Example

```typescript
import {
  createServiceServer,
  defineService,
  auth,
  OrmService,
  AutoUpdateService,
  SmtpClientService,
} from "@simplysm/service-server";

const MyService = defineService("My", auth((ctx) => ({
  hello: (name: string) => `Hello, ${name}!`,
})));

const server = createServiceServer({
  rootPath: "/app",
  port: 3000,
  auth: { jwtSecret: process.env.JWT_SECRET! },
  services: [MyService, OrmService, AutoUpdateService, SmtpClientService],
});

server.on("ready", () => {
  console.log("Server is ready");
});

await server.listen();
```
