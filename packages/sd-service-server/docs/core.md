# Core

## SdServiceBase\<TAuthInfo\>

Abstract base class that all service implementations must extend. Provides access to the server instance, socket/HTTP context, authentication info, client paths, and configuration.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `server` | `SdServiceServer<TAuthInfo>` | Reference to the server instance (injected by `SdServiceExecutor`) |
| `socket` | `SdServiceSocket \| undefined` | The v2 WebSocket connection (set for WebSocket requests) |
| `v1` | `{ socket: SdServiceSocketV1; request: ISdServiceRequest } \| undefined` | Legacy v1 socket and request (set for v1 WebSocket requests) |
| `http` | `{ clientName: string; authTokenPayload?: IAuthTokenPayload } \| undefined` | HTTP request context (set for HTTP API requests) |

### Accessors

#### `authInfo`

```typescript
get authInfo(): TAuthInfo | undefined
```

Returns the authenticated user's custom data from the JWT token, reading from either the socket or HTTP context.

#### `clientName`

```typescript
get clientName(): string | undefined
```

Returns the client application name from the request context. Validates against path traversal attacks (rejects names containing `..`, `/`, or `\`).

#### `clientPath`

```typescript
get clientPath(): string | undefined
```

Returns the resolved filesystem path for the client. Uses `pathProxy` if configured, otherwise defaults to `rootPath/www/{clientName}`.

### Methods

#### `getConfigAsync(section)`

```typescript
async getConfigAsync<T>(section: string): Promise<T>
```

Loads configuration from `.config.json` files. Merges root-level config (`rootPath/.config.json`) with client-level config (`clientPath/.config.json`) using deep merge, then returns the specified section.

| Parameter | Type | Description |
|-----------|------|-------------|
| `section` | `string` | Configuration section name (top-level key in the JSON file) |

**Returns:** `Promise<T>` -- the configuration value for the section.

**Throws:** `Error` if the section is not found.

---

## SdServiceExecutor

Resolves service classes, performs authorization checks, and executes service methods. Used internally by HTTP and WebSocket handlers.

### Constructor

```typescript
constructor(private readonly _server: SdServiceServer)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_server` | `SdServiceServer` | Server instance (provides the service class registry) |

### Methods

#### `runMethodAsync(def)`

```typescript
async runMethodAsync(def: {
  serviceName: string;
  methodName: string;
  params: any[];
  socket?: SdServiceSocket;
  v1?: { socket: SdServiceSocketV1; request: ISdServiceRequest };
  http?: { clientName: string; authTokenPayload?: IAuthTokenPayload };
}): Promise<any>
```

Executes a service method with full authorization checking.

| Field | Type | Description |
|-------|------|-------------|
| `serviceName` | `string` | Name of the service class to instantiate |
| `methodName` | `string` | Method name to invoke on the service |
| `params` | `any[]` | Positional arguments for the method |
| `socket` | `SdServiceSocket` | Optional v2 WebSocket context |
| `v1` | `{ socket, request }` | Optional v1 WebSocket context |
| `http` | `{ clientName, authTokenPayload? }` | Optional HTTP context |

**Returns:** `Promise<any>` -- the method's return value.

**Throws:**
- `Error` if the service class is not found in the registered services
- `Error` if the method does not exist on the service
- `Error` if authentication is required but no token is present
- `Error` if the user lacks required permissions
- `Error` if the client name contains path traversal characters

### Authorization Flow

1. Looks up the service class from `server.options.services` by name
2. Validates client name against path traversal attacks
3. Checks method-level `@Authorize` metadata, falls back to class-level
4. If permissions are defined:
   - V1 connections are rejected (security restriction)
   - Missing auth token results in a login error
   - Permission check: at least one required permission must be present in the token
5. Creates a service instance and injects `server`, `socket`, `v1`, `http` context
6. Invokes the method with the provided parameters
