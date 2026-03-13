# Server

## SdServiceServer

Main server class built on Fastify. Manages HTTP routes, WebSocket connections, static file serving, file uploads, and security headers. Extends `EventEmitter`.

```typescript
class SdServiceServer<TAuthInfo = any> extends EventEmitter
```

### Type Parameter

- `TAuthInfo` - Custom type for authentication payload data (default: `any`).

### Constructor

```typescript
new SdServiceServer(options: ISdServiceServerOptions)
```

### Properties

| Property | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Whether the server is currently listening. |
| `options` | `ISdServiceServerOptions` | The server configuration passed to the constructor. |

### Methods

#### `listenAsync(): Promise<void>`

Starts the server. Registers all Fastify plugins (WebSocket, Helmet, CORS, multipart, static), sets up routes, and begins listening on the configured port. Automatically registers graceful shutdown handlers for `SIGINT` and `SIGTERM`.

Routes registered:
- `POST/GET /api/:service/:method` - Service method invocation via HTTP.
- `POST /upload` - Multipart file upload (requires authentication).
- `GET /` and `GET /ws` - WebSocket endpoints.
- `/* (wildcard)` - Static file serving with path/port proxy support.

```typescript
const server = new SdServiceServer({
  rootPath: process.cwd(),
  port: 3000,
  services: [MyService],
});
await server.listenAsync();
```

#### `closeAsync(): Promise<void>`

Gracefully closes all WebSocket connections and shuts down the Fastify instance. Emits the `"close"` event.

#### `broadcastReloadAsync(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>`

Sends a reload command to all connected WebSocket clients. Used during development for hot-reload.

- `clientName` - Target client application name, or `undefined` for all clients.
- `changedFileSet` - Set of changed file paths.

#### `emitEvent<T>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): Promise<void>`

Broadcasts a server-side event to all subscribed WebSocket clients whose listener info matches the selector.

- `eventType` - The event listener class (must extend `SdServiceEventListenerBase`).
- `infoSelector` - Filter function to select which listeners receive the event.
- `data` - The event data payload.

#### `generateAuthTokenAsync(payload: IAuthTokenPayload<TAuthInfo>): Promise<string>`

Generates a signed JWT token from the given payload. Delegates to `SdServiceJwtManager`.

#### `verifyAuthTokenAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>>`

Verifies and decodes a JWT token. Throws on expired or invalid tokens.

### Events

| Event | Callback | Description |
|---|---|---|
| `"ready"` | `() => void` | Emitted after the server starts listening. |
| `"close"` | `() => void` | Emitted after the server is closed. |

---

## ISdServiceServerOptions

Configuration interface for `SdServiceServer`.

```typescript
interface ISdServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?: {
    pfxBuffer: Buffer | (() => Promise<Buffer> | Buffer);
    passphrase: string;
  };
  auth?: {
    jwtSecret: string;
  };
  pathProxy?: Record<string, string>;
  portProxy?: Record<string, number>;
  services: Type<SdServiceBase>[];
  middlewares?: ((
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (err?: any) => void,
  ) => void)[];
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `rootPath` | `string` | Yes | Root directory for the server. Static files are served from `{rootPath}/www`. |
| `port` | `number` | Yes | Port number to listen on. |
| `ssl` | `object` | No | SSL/TLS configuration for HTTPS. |
| `ssl.pfxBuffer` | `Buffer \| (() => Promise<Buffer> \| Buffer)` | Yes (if `ssl`) | PFX certificate buffer or async factory function. |
| `ssl.passphrase` | `string` | Yes (if `ssl`) | PFX certificate passphrase. |
| `auth` | `object` | No | Authentication configuration. Required for JWT-based auth. |
| `auth.jwtSecret` | `string` | Yes (if `auth`) | Secret key for signing/verifying JWT tokens (HS256). |
| `pathProxy` | `Record<string, string>` | No | Maps URL path prefixes to local directory paths for static file serving. |
| `portProxy` | `Record<string, number>` | No | Maps URL path prefixes to local port numbers for reverse proxying. |
| `services` | `Type<SdServiceBase>[]` | Yes | Array of service classes to register. |
| `middlewares` | `Function[]` | No | Express-style middleware functions (via `@fastify/middie`). |

### Example

```typescript
const server = new SdServiceServer({
  rootPath: "/app",
  port: 443,
  ssl: {
    pfxBuffer: async () => await fs.promises.readFile("/certs/server.pfx"),
    passphrase: "cert-password",
  },
  auth: {
    jwtSecret: "my-secret-key",
  },
  pathProxy: {
    "admin": "/var/www/admin-app",
  },
  portProxy: {
    "legacy-api": 8080,
  },
  services: [MyService, SdOrmService, SdCryptoService, SdSmtpClientService],
});
```
