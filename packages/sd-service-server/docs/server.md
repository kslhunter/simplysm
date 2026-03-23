# Server

## SdServiceServer\<TAuthInfo\>

Main server class built on Fastify. Provides WebSocket communication, HTTP API routes, static file serving, file upload, JWT authentication, and real-time event broadcasting. Extends `EventEmitter`.

### Constructor

```typescript
constructor(readonly options: ISdServiceServerOptions)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `ISdServiceServerOptions` | Server configuration |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `options` | `ISdServiceServerOptions` | Server configuration passed to the constructor |
| `isOpen` | `boolean` | Whether the server is currently listening |

### Methods

#### `listenAsync()`

```typescript
async listenAsync(): Promise<void>
```

Starts the Fastify server with all plugins and routes:
- Registers `@fastify/websocket`, `@fastify/helmet`, `@fastify/multipart`, `@fastify/middie`, `@fastify/reply-from`, `@fastify/static`, `@fastify/cors`
- Sets up API route: `POST|GET /api/:service/:method`
- Sets up upload route: `POST /upload`
- Sets up WebSocket routes: `/` and `/ws`
- Sets up wildcard static file handler with path/port proxy support
- Registers graceful shutdown handlers for `SIGINT` and `SIGTERM`
- Emits `"ready"` event when listening

#### `closeAsync()`

```typescript
async closeAsync(): Promise<void>
```

Gracefully shuts down the server. Closes all WebSocket connections (both v1 and v2), closes the Fastify instance, and emits `"close"`.

#### `broadcastReloadAsync(clientName, changedFileSet)`

```typescript
async broadcastReloadAsync(
  clientName: string | undefined,
  changedFileSet: Set<string>,
): Promise<void>
```

Sends a reload notification to all connected WebSocket clients.

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientName` | `string \| undefined` | Target client name filter, or `undefined` for all |
| `changedFileSet` | `Set<string>` | Set of file paths that changed |

#### `emitEvent(eventType, infoSelector, data)`

```typescript
async emitEvent<T extends SdServiceEventListenerBase<any, any>>(
  eventType: Type<T>,
  infoSelector: (item: T["info"]) => boolean,
  data: T["data"],
): Promise<void>
```

Emits an event to all matching listeners across all connected clients (both v1 and v2).

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventType` | `Type<T>` | Event listener class |
| `infoSelector` | `(item: T["info"]) => boolean` | Filter function to select target listeners |
| `data` | `T["data"]` | Event payload |

#### `generateAuthTokenAsync(payload)`

```typescript
async generateAuthTokenAsync(
  payload: IAuthTokenPayload<TAuthInfo>,
): Promise<string>
```

Generates a signed JWT token with the given payload.

| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `IAuthTokenPayload<TAuthInfo>` | Token payload containing permissions and auth data |

**Returns:** `Promise<string>` -- the signed JWT string.

#### `verifyAuthTokenAsync(token)`

```typescript
async verifyAuthTokenAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>>
```

Verifies and decodes a JWT token.

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | JWT token string |

**Returns:** `Promise<IAuthTokenPayload<TAuthInfo>>` -- the decoded payload.

### Events

| Event | Description |
|-------|-------------|
| `"ready"` | Emitted when the server starts listening |
| `"close"` | Emitted when the server shuts down |

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

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `rootPath` | `string` | Root directory for the server. Static files are served from `rootPath/www` |
| `port` | `number` | Port number to listen on |
| `ssl` | `{ pfxBuffer, passphrase }` | Optional SSL/TLS configuration. `pfxBuffer` can be a `Buffer` or an async factory function |
| `auth` | `{ jwtSecret: string }` | Optional JWT authentication configuration |
| `pathProxy` | `Record<string, string>` | Maps URL path prefixes to local filesystem directories |
| `portProxy` | `Record<string, number>` | Maps URL path prefixes to proxy target ports on `127.0.0.1` |
| `services` | `Type<SdServiceBase>[]` | Array of service classes to register |
| `middlewares` | `Function[]` | Optional Connect-style middleware functions |
