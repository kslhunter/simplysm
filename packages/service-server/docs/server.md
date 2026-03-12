# Server

The main server class built on Fastify with WebSocket support, CORS, Helmet security, static file serving, and graceful shutdown.

## `ServiceServer<TAuthInfo>`

**Extends:** `EventEmitter<{ ready: void; close: void }>`

### Constructor

```typescript
new ServiceServer<TAuthInfo>(options: ServiceServerOptions)
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `boolean` | Whether the server is currently listening |
| `fastify` | `FastifyInstance` | The underlying Fastify instance |
| `options` | `ServiceServerOptions` | The server configuration |

### Methods

#### `listen(): Promise<void>`

Starts the server. Registers all Fastify plugins (WebSocket, Helmet, Multipart, Static, CORS), sets up routes (`/api/:service/:method`, `/upload`, `/ws`, `/*`), and begins listening on the configured port.

Emits the `"ready"` event once listening.

#### `close(): Promise<void>`

Closes all WebSocket connections and shuts down the Fastify server. Emits the `"close"` event.

#### `broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>`

Broadcasts a reload message to all connected WebSocket clients.

#### `emitEvent<TInfo, TData>(eventDef, infoSelector, data): Promise<void>`

Emits a typed event to connected clients matching the `infoSelector` filter.

```typescript
await server.emitEvent(
  myEventDef,
  (info) => info.userId === targetUserId,
  { message: "hello" },
);
```

#### `signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>`

Signs a JWT token with the configured secret. Throws if `auth.jwtSecret` is not configured.

#### `verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>`

Verifies and decodes a JWT token. Throws if expired or invalid.

### Events

| Event | Description |
|-------|-------------|
| `ready` | Emitted after the server starts listening |
| `close` | Emitted after the server is closed |

### Graceful Shutdown

The server automatically registers `SIGINT` and `SIGTERM` handlers. On signal, it closes all connections and exits. If shutdown exceeds 10 seconds, the process is force-exited.

---

## `createServiceServer<TAuthInfo>(options): ServiceServer<TAuthInfo>`

Factory function that creates a new `ServiceServer` instance.

---

## `ServiceServerOptions`

```typescript
interface ServiceServerOptions {
  rootPath: string;        // Root directory for www/ static files and configs
  port: number;            // Port to listen on
  ssl?: {
    pfxBytes: Uint8Array;  // PFX certificate bytes
    passphrase: string;    // PFX passphrase
  };
  auth?: {
    jwtSecret: string;     // Secret for JWT signing/verification
  };
  services: ServiceDefinition[];  // Array of service definitions
}
```

## Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/:service/:method` | GET, POST | HTTP service method invocation |
| `/upload` | POST | Multipart file upload (requires auth) |
| `/` or `/ws` | WebSocket | WebSocket connection endpoint |
| `/*` | ALL | Static file serving from `{rootPath}/www/` |
