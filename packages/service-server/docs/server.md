# Server

## `ServiceServerOptions`

Configuration options for `ServiceServer`.

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

| Field | Type | Description |
|-------|------|-------------|
| `rootPath` | `string` | Root path for static files, uploads, and config |
| `port` | `number` | Server port |
| `ssl` | `object` | SSL/TLS config (PFX certificate) |
| `ssl.pfxBytes` | `Uint8Array` | PFX certificate bytes |
| `ssl.passphrase` | `string` | Certificate passphrase |
| `auth` | `object` | Authentication config |
| `auth.jwtSecret` | `string` | JWT signing secret |
| `services` | `ServiceDefinition[]` | Service definitions to register |

## `ServiceServer`

Fastify-based service server with WebSocket support, JWT authentication, and built-in services. Extends `EventEmitter`.

```typescript
class ServiceServer<TAuthInfo = unknown> extends EventEmitter<{
  ready: void;
  close: void;
}> {
  isOpen: boolean;
  readonly fastify: FastifyInstance;
  readonly options: ServiceServerOptions;

  constructor(options: ServiceServerOptions);

  listen(): Promise<void>;
  close(): Promise<void>;
  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>;
  emitEvent<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
  signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>;
  verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `boolean` | Whether server is listening |
| `fastify` | `FastifyInstance` | Underlying Fastify instance |
| `options` | `ServiceServerOptions` | Server options |

| Method | Description |
|--------|-------------|
| `listen()` | Start the server (registers plugins, routes, WebSocket, graceful shutdown) |
| `close()` | Stop the server (close all connections) |
| `broadcastReload()` | Broadcast reload to all connected clients |
| `emitEvent()` | Emit event to matching clients |
| `signAuthToken()` | Sign a JWT token |
| `verifyAuthToken()` | Verify and decode a JWT token |

### Registered Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/:service/:method` | GET/POST | HTTP service method endpoint |
| `/upload` | POST | File upload endpoint (multipart) |
| `/ws` | WebSocket | WebSocket service endpoint (Protocol V2) |
| `/` | WebSocket | WebSocket endpoint (V1 legacy + V2) |
| `/*` | GET | Static file serving from `www/` |

### Registered Plugins

- `@fastify/websocket` - WebSocket support
- `@fastify/helmet` - Security headers (CSP, HSTS)
- `@fastify/multipart` - File upload
- `@fastify/static` - Static file serving
- `@fastify/cors` - CORS support

## `createServiceServer`

Factory function to create a `ServiceServer` instance.

```typescript
function createServiceServer<TAuthInfo = unknown>(
  options: ServiceServerOptions,
): ServiceServer<TAuthInfo>;
```

## Utils

### `getConfig`

Read JSON configuration from file with caching and live-reload via file watcher. Cache expires after 1 hour.

```typescript
async function getConfig<TConfig>(filePath: string): Promise<TConfig | undefined>;
```

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
