# Service Packages Functional Refactoring Design

## Overview

Convert all remaining class-based code in `service-common`, `service-client`, and `service-server` packages to functional style, following the same patterns established in the ORM functional refactoring (`defineDbContext` / `createDbContext`).

## Design Decisions

| Decision | Choice |
|----------|--------|
| EventEmitter replacement | Keep `on/off` API, remove class inheritance (use composition internally) |
| ServiceServer class | Remove immediately, `createServiceServer()` only |
| ServiceClient class | Replace with `createServiceClient()` |
| Return types | Explicit interface definitions |
| ServiceEventListener | Remove immediately, `defineEvent()` only |

## Consumer API Changes

### service-common

- **Remove:** `ServiceEventListener` abstract class
- **Keep:** `defineEvent()`, `ServiceEventDef`, `ServiceUploadResult`, `createServiceProtocol()`

### service-client

```typescript
// Before
import { ServiceClient } from "@simplysm/service-client";
const client = new ServiceClient("my-app", { host, port, ssl });

// After
import { createServiceClient, type ServiceClient } from "@simplysm/service-client";
const client = createServiceClient("my-app", { host, port, ssl });

// Usage remains identical
client.on("state", (s) => { ... });
await client.connect();
const svc = client.getService<MyMethods>("MyService");
await client.close();
```

**ServiceClient interface (explicit):**

```typescript
export interface ServiceClient {
  readonly name: string;
  readonly options: ServiceConnectionConfig;
  readonly connected: boolean;
  readonly hostUrl: string;

  connect(): Promise<void>;
  close(): Promise<void>;
  send(serviceName: string, methodName: string, params: unknown[], progress?: ServiceProgress): Promise<unknown>;
  auth(token: string): Promise<void>;
  getService<T>(serviceName: string): RemoteService<T>;
  addEventListener<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, info: TInfo, cb: (data: TData) => PromiseLike<void>): Promise<string>;
  removeEventListener(key: string): Promise<void>;
  emitToServer<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, infoSelector: (item: TInfo) => boolean, data: TData): Promise<void>;
  uploadFile(files: File[] | FileList | { name: string; data: BlobPart }[]): Promise<ServiceUploadResult[]>;
  downloadFileBuffer(relPath: string): Promise<Uint8Array>;

  on<K extends keyof ServiceClientEvents>(event: K, handler: (data: ServiceClientEvents[K]) => void): void;
  off<K extends keyof ServiceClientEvents>(event: K, handler: (data: ServiceClientEvents[K]) => void): void;
}
```

**ORM Connector:**

```typescript
// Before
import { OrmClientConnector } from "@simplysm/service-client";
const connector = new OrmClientConnector(client);
await connector.connect(config, async (db) => { ... });

// After
import { connectOrm } from "@simplysm/service-client";
await connectOrm(client, config, async (db) => { ... });
```

### service-server

```typescript
// Before (solid-demo-server etc.)
import { ServiceServer } from "@simplysm/service-server";
const server = new ServiceServer({ ... });

// After
import { createServiceServer } from "@simplysm/service-server";
const server = createServiceServer({ ... });

// Usage remains identical
await server.listen();
server.emitEvent(MyEvent, (info) => ..., data);
await server.close();
```

## Internal Architecture

### service-client internals

All internal classes become `create*` factory functions with closure-based state:

| Class | Replacement | Type |
|-------|-------------|------|
| `SocketProvider` | `createSocketProvider()` | stateful (closure) |
| `ServiceTransport` | `createServiceTransport()` | stateful (closure) |
| `ClientProtocolWrapper` | `createClientProtocolWrapper()` | stateful (worker singleton) |
| `EventClient` | `createEventClient()` | stateful (listener map) |
| `FileClient` | `createFileClient()` | stateless |
| `OrmClientConnector` | `connectOrm()` | pure function |
| `OrmClientDbContextExecutor` | internal, interface impl | stateful (connId) |

### service-server internals

| Class | Replacement | Type |
|-------|-------------|------|
| `WebSocketHandler` | `createWebSocketHandler()` | stateful (socket map) |
| `ServiceSocket` | `createServiceSocket()` | stateful (connection state) |
| `ProtocolWrapper` | `createProtocolWrapper()` | stateful (worker singleton) |
| `ServiceExecutor` | `executeServiceMethod()` | pure function |
| `JwtManager` | `signJwt()`, `verifyJwt()` | pure functions |
| `HttpRequestHandler` | `handleHttpRequest()` | pure function |
| `UploadHandler` | `handleUpload()` | pure function |
| `StaticFileHandler` | `handleStaticFile()` | pure function |
| `ConfigManager` | `getConfig()` | module-level function |

### service-common internals

| Class | Replacement | Type |
|-------|-------------|------|
| `ServiceProtocol` | `createServiceProtocol()` | stateful (accumulator) |
| `ServiceEventListener` | **removed** | `defineEvent()` only |

### Stateful closure pattern

```typescript
function createSocketProvider(wsUrl: string, clientName: string, maxReconnectCount: number): SocketProvider {
  let ws: WebSocket | undefined;
  let reconnectCount = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let isManualClose = false;
  const listeners = new Map<string, Set<Function>>();

  return {
    get connected() { return ws?.readyState === WebSocket.OPEN; },
    async connect() { ... },
    async close() { ... },
    send(data: Uint8Array) { ... },
    on(event, handler) { ... },
    off(event, handler) { ... },
  };
}
```

### Stateless pure function pattern

```typescript
export function signJwt(secret: string, payload: unknown): Promise<string> { ... }
export function verifyJwt(secret: string, token: string): Promise<unknown> { ... }
export async function handleHttpRequest(req, reply, options) { ... }
export async function handleUpload(req, reply, options) { ... }
export async function handleStaticFile(req, reply, urlPath, options) { ... }
```

## Migration Order

Bottom-up by dependency:

```
Step 1: service-common (no dependencies)
  - Remove ServiceEventListener
  - ServiceProtocol → createServiceProtocol()

Step 2: service-server (depends on service-common)
  - Stateless classes → pure functions (JwtManager, HttpRequestHandler, etc.)
  - Stateful classes → create* functions (WebSocketHandler, ServiceSocket, etc.)
  - ServiceServer class → createServiceServer() fully functional
  - Update solid-demo-server

Step 3: service-client (depends on service-common)
  - Stateless → pure functions (FileClient)
  - Stateful → create* (SocketProvider, ServiceTransport, etc.)
  - ServiceClient class → createServiceClient() + interface
  - OrmClientConnector → connectOrm()

Step 4: Consumer updates
  - solid/ServiceClientProvider internal update
  - tests/service updates
  - README.md updates
```

## What Does NOT Change

- `defineEvent()` function
- `ServiceEventDef` type
- `RemoteService<T>` type
- `ServiceConnectionConfig` and other config types
- Package `index.ts` export structure (only removed classes are dropped)
- All consumer-facing method signatures and behavior
