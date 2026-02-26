# @simplysm/service-server

Simplysm package - service module (server)

## Installation

pnpm add @simplysm/service-server

## Source Index

### Types

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/types/server-options.ts` | `ServiceServerOptions` | Configuration interface for the service server (port, SSL, auth, services) | - |

### Auth

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/auth/auth-token-payload.ts` | `AuthTokenPayload` | JWT payload interface extending JWTPayload with roles and auth data | - |
| `src/auth/jwt-manager.ts` | `signJwt`, `verifyJwt`, `decodeJwt` | Sign, verify, and decode HS256 JWT tokens using the jose library | - |

### Core

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/core/define-service.ts` | `ServiceContext`, `createServiceContext`, `getServiceAuthPermissions`, `auth`, `ServiceDefinition`, `defineService`, `ServiceMethods` | Define services with typed context, auth wrappers, and method type extraction | `define-service.spec.ts` |
| `src/core/service-executor.ts` | `runServiceMethod` | Resolve a service method call and enforce auth permission checks | `service-executor.spec.ts` |

### Transport - Socket

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/transport/socket/websocket-handler.ts` | `WebSocketHandler`, `createWebSocketHandler` | Manage multiple WebSocket connections, route messages, and broadcast events | - |
| `src/transport/socket/service-socket.ts` | `ServiceSocket`, `createServiceSocket` | Manage a single WebSocket connection with protocol encoding and keep-alive | - |

### Transport - HTTP

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/transport/http/http-request-handler.ts` | `handleHttpRequest` | Handle HTTP GET/POST API requests with JWT auth and parameter parsing | - |
| `src/transport/http/upload-handler.ts` | `handleUpload` | Handle multipart file uploads with JWT auth and UUID-based storage | - |
| `src/transport/http/static-file-handler.ts` | `handleStaticFile` | Serve static files from the www directory with path traversal protection | - |

### Protocol

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/protocol/protocol-wrapper.ts` | `ProtocolWrapper`, `createProtocolWrapper` | Encode/decode service messages with automatic worker thread offloading | - |

### Services

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/services/orm-service.ts` | `OrmService`, `OrmServiceType` | Built-in service exposing ORM database operations over WebSocket | `orm-service.spec.ts` |
| `src/services/auto-update-service.ts` | `AutoUpdateService`, `AutoUpdateServiceType` | Built-in service for serving the latest app update package by platform | - |

### Utils

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/utils/config-manager.ts` | `getConfig` | Load and cache JSON config files with live-reload via file watcher | - |

### Legacy

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/legacy/v1-auto-update-handler.ts` | `handleV1Connection` | Handle V1 legacy WebSocket clients for auto-update only | - |

### Main

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/service-server.ts` | `ServiceServer`, `createServiceServer` | Main Fastify-based HTTP/WebSocket server with routing and graceful shutdown | - |

## License

Apache-2.0
