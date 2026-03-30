# @simplysm/service-client

WebSocket-based RPC client SDK with type-safe service proxy, event subscription, file upload/download, and ORM connector. Depends on `@simplysm/service-common` for protocol and shared types.

## Installation

```bash
npm install @simplysm/service-client
```

## API Overview

### Browser Compat Types
| API | Type | Description |
|-----|------|-------------|
| `BlobInput` | `type` | Blob constructor data type (DOM BlobPart replacement) |
| `FileCollection` | `interface` | File collection interface (DOM FileList replacement) |
| `WorkerLike` | `interface` | Web Worker interface (DOM Worker replacement) |
| `isWorkerSupported` | `function` | Checks Web Worker API availability |
| `createBrowserWorker` | `function` | Creates a Web Worker (returns undefined if unsupported) |

-> See [docs/browser-compat-types.md](./docs/browser-compat-types.md) for details.

### Connection Options
| API | Type | Description |
|-----|------|-------------|
| `ServiceConnectionOptions` | `interface` | Connection options (host, port, SSL, reconnect) |

-> See [docs/connection-options.md](./docs/connection-options.md) for details.

### Progress Types
| API | Type | Description |
|-----|------|-------------|
| `ServiceProgress` | `interface` | Progress callback hooks for request/response/server |
| `ServiceProgressState` | `interface` | Progress state (uuid, totalSize, completedSize) |

-> See [docs/progress-types.md](./docs/progress-types.md) for details.

### Socket Provider
| API | Type | Description |
|-----|------|-------------|
| `SocketProviderEvents` | `interface` | Socket provider event map |
| `SocketProvider` | `interface` | Low-level WebSocket abstraction with auto-reconnect |
| `createSocketProvider` | `function` | Creates a socket provider instance |

-> See [docs/socket-provider.md](./docs/socket-provider.md) for details.

### Service Transport
| API | Type | Description |
|-----|------|-------------|
| `ServiceTransportEvents` | `interface` | Transport event map |
| `ServiceTransport` | `interface` | Service-level message transport |
| `createServiceTransport` | `function` | Creates a service transport instance |

-> See [docs/service-transport.md](./docs/service-transport.md) for details.

### Client Protocol Wrapper
| API | Type | Description |
|-----|------|-------------|
| `ClientProtocolWrapper` | `interface` | Client-side protocol encoder/decoder with Web Worker offloading |
| `createClientProtocolWrapper` | `function` | Creates a client protocol wrapper |

-> See [docs/client-protocol-wrapper.md](./docs/client-protocol-wrapper.md) for details.

### Event/File/ORM Client
| API | Type | Description |
|-----|------|-------------|
| `EventClient` | `interface` | Event subscription client |
| `createEventClient` | `function` | Creates an event client |
| `FileClient` | `interface` | File upload/download client |
| `createFileClient` | `function` | Creates a file client |
| `OrmConnectOptions` | `interface` | ORM connection options |
| `OrmClientConnector` | `interface` | ORM client connector (with/without transaction) |
| `createOrmClientConnector` | `function` | Creates an ORM client connector |
| `OrmClientDbContextExecutor` | `class` | ORM DbContext executor for client-side use |

-> See [docs/features.md](./docs/features.md) for details.

### Main ServiceClient
| API | Type | Description |
|-----|------|-------------|
| `ServiceClient` | `class` | Main service client class with events, RPC, auth, file ops |
| `ServiceProxy` | `type` | Type-safe service proxy mapping |
| `createServiceClient` | `function` | Factory function to create a ServiceClient |

-> See [docs/service-client.md](./docs/service-client.md) for details.

## Usage Examples

```typescript
import { createServiceClient } from "@simplysm/service-client";
import { defineEvent } from "@simplysm/service-common";

// Create and connect
const client = createServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
});
await client.connect();

// Type-safe RPC calls via proxy
interface MyService {
  greet(name: string): Promise<string>;
}
const myService = client.getService<MyService>("MyService");
const result = await myService.greet("world");

// Authenticate
await client.auth(token);

// File upload
const uploadResults = await client.uploadFile(fileList);

// File download
const bytes = await client.downloadFileBuffer("uploads/file.txt");

// Event subscription
const ChatEvent = defineEvent<{ roomId: number }, { text: string }>("ChatEvent");
const listenerKey = await client.addListener(ChatEvent, { roomId: 1 }, async (data) => {
  // handle event
});
await client.removeListener(listenerKey);

// Clean up
await client.close();
```
