# Main ServiceServer

## `ServiceServer`

Main server class built on Fastify with WebSocket support, JWT authentication, and graceful shutdown. Extends `EventEmitter` with `ready` and `close` events.

```typescript
export class ServiceServer<TAuthInfo = unknown> extends EventEmitter<{
  ready: void;
  close: void;
}> {
  constructor(options: ServiceServerOptions);
}
```

### Events

| Event | Data Type | Description |
|-------|-----------|-------------|
| `ready` | `void` | Emitted when the server starts listening |
| `close` | `void` | Emitted when the server is closed |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `options` | `ServiceServerOptions` (readonly) | Server configuration options |
| `fastify` | `FastifyInstance` (readonly) | The underlying Fastify instance for custom route registration |
| `isOpen` | `boolean` | Whether the server is currently listening |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `listen` | `listen(): Promise<void>` | Starts the server. Registers all plugins, routes, and WebSocket handlers. Listens on `0.0.0.0:{port}` |
| `close` | `close(): Promise<void>` | Closes all WebSocket connections and stops the Fastify server |
| `emitEvent` | `emitEvent<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, infoSelector: (item: TInfo) => boolean, data: TData): Promise<void>` | Broadcasts an event to connected clients matching the info selector |
| `signAuthToken` | `signAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>` | Signs a JWT token using the server's secret |
| `verifyAuthToken` | `verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>` | Verifies a JWT token using the server's secret |

### Registered Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/:service/:method` | GET, POST | HTTP RPC endpoint |
| `/upload` | POST | Multipart file upload endpoint |
| `/` | WebSocket | WebSocket endpoint (V1 and V2) |
| `/ws` | WebSocket | WebSocket endpoint (V1 and V2) |
| `/*` | GET, POST, PUT, DELETE, PATCH, HEAD | Static file handler |

### Registered Plugins

- `@fastify/websocket` -- WebSocket support
- `@fastify/helmet` -- Security headers (CSP configured for permissive defaults)
- `@fastify/multipart` -- File upload support
- `@fastify/static` -- Static file serving (manual serving via handler)
- `@fastify/cors` -- Cross-origin support (allows all origins)

### Graceful Shutdown

Registers `SIGINT` and `SIGTERM` handlers that:
1. Close all WebSocket connections
2. Stop the Fastify server
3. Force exit after 10 seconds if shutdown hangs

## `createServiceServer`

Factory function to create a `ServiceServer` instance.

```typescript
export function createServiceServer<TAuthInfo = unknown>(
  options: ServiceServerOptions,
): ServiceServer<TAuthInfo>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `ServiceServerOptions` | Server configuration options |

**Returns:** `ServiceServer<TAuthInfo>`
