# @simplysm/sd-service-client

Browser-side client library for communicating with `@simplysm/sd-service-server`. Provides WebSocket-based RPC, server-sent event subscriptions, file upload/download, and ORM database access -- all over a single persistent WebSocket connection with automatic reconnection, heartbeat monitoring, and chunked binary protocol with Web Worker offloading.

## Installation

```bash
npm install @simplysm/sd-service-client
```

**Peer dependencies:** `@simplysm/sd-core-common`, `@simplysm/sd-orm-common`, `@simplysm/sd-service-common`

## API Overview

### Client

| API | Type | Description |
|-----|------|-------------|
| `SdServiceClient` | Class | Main client for connecting to a Simplysm service server via WebSocket |
| `TRemoteService<T>` | Type | Utility type that wraps all methods of `T` to return `Promise` |

-> See [docs/client.md](./docs/client.md) for details.

### Event

| API | Type | Description |
|-----|------|-------------|
| `SdServiceEventClient` | Class | Manages server-sent event listener registration, removal, and dispatch |

-> See [docs/event.md](./docs/event.md) for details.

### File

| API | Type | Description |
|-----|------|-------------|
| `SdServiceFileClient` | Class | Handles file upload and download over HTTP |

-> See [docs/file.md](./docs/file.md) for details.

### ORM

| API | Type | Description |
|-----|------|-------------|
| `ISdOrmServiceConnectConfig` | Interface | Configuration for connecting to a database through the ORM service |
| `SdOrmServiceClientConnector` | Class | High-level connector that establishes ORM database sessions via the service client |
| `SdOrmServiceClientDbContextExecutor` | Class | Low-level `IDbContextExecutor` implementation that delegates DB operations to the server |

-> See [docs/orm.md](./docs/orm.md) for details.

### Protocol

| API | Type | Description |
|-----|------|-------------|
| `SdServiceClientProtocolWrapper` | Class | Encodes/decodes binary protocol messages with automatic Web Worker offloading for large payloads |

-> See [docs/protocol.md](./docs/protocol.md) for details.

### Transport

| API | Type | Description |
|-----|------|-------------|
| `SdServiceTransport` | Class | Request/response multiplexer over WebSocket with progress tracking |
| `SdSocketProvider` | Class | Low-level WebSocket connection manager with heartbeat and auto-reconnect |

-> See [docs/transport.md](./docs/transport.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `ISdServiceConnectionConfig` | Interface | Connection configuration (host, port, SSL, reconnect) |
| `ISdServiceProgress` | Interface | Progress callback pair for request/response tracking |
| `ISdServiceProgressState` | Interface | Progress state with uuid, totalSize, and completedSize |

-> See [docs/types.md](./docs/types.md) for details.

## Usage Examples

### Connect and call a remote service

```typescript
import { SdServiceClient } from "@simplysm/sd-service-client";

const client = new SdServiceClient("my-app", {
  host: "localhost",
  port: 3000,
});

await client.connectAsync();

// Type-safe remote service proxy
interface IMyService {
  getData(id: number): { name: string };
}
const myService = client.getService<IMyService>("MyService");
const result = await myService.getData(42);

await client.closeAsync();
```

### Authenticate and upload files

```typescript
const client = new SdServiceClient("my-app", {
  host: "localhost",
  port: 3000,
});

await client.connectAsync();

// Authenticate first (required for file upload)
await client.authAsync(jwtToken);

// Upload files
const input = document.querySelector<HTMLInputElement>("#file-input");
const results = await client.uploadFileAsync(input.files);
// results: Array of { path, filename, size }
```

### Subscribe to server events

```typescript
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";

class OrderUpdatedEvent extends SdServiceEventListenerBase<
  { orderId: number },
  { status: string }
> {}

const key = await client.addEventListenerAsync(
  OrderUpdatedEvent,
  { orderId: 123 },
  async (data) => {
    console.log("Order status:", data.status);
  },
);

// Later, unsubscribe
await client.removeEventListenerAsync(key);
```
