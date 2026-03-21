# @simplysm/service-client

Simplysm package - Service module (client)

WebSocket-based service client for communicating with `@simplysm/service-server`. Provides type-safe service method calls, event pub/sub, file upload/download, and client-side ORM connectivity.

## Installation

```bash
npm install @simplysm/service-client
```

## API Overview

### Types
| API | Type | Description |
|-----|------|-------------|
| `ServiceConnectionOptions` | interface | Connection options (host, port, ssl, reconnect) |
| `ServiceProgress` | interface | Progress callback config for requests |
| `ServiceProgressState` | interface | Progress state (uuid, totalSize, completedSize) |

-> See [docs/types.md](./docs/types.md) for details.

### Transport
| API | Type | Description |
|-----|------|-------------|
| `SocketProvider` | interface | WebSocket connection provider |
| `SocketProviderEvents` | interface | Socket events (message, state) |
| `createSocketProvider` | function | Create socket with heartbeat and auto-reconnect |
| `ServiceTransport` | interface | Message routing and request/response correlation |
| `ServiceTransportEvents` | interface | Transport events (reload, event) |
| `createServiceTransport` | function | Create transport instance |

-> See [docs/transport.md](./docs/transport.md) for details.

### Protocol
| API | Type | Description |
|-----|------|-------------|
| `ClientProtocolWrapper` | interface | Protocol wrapper with Web Worker offloading |
| `createClientProtocolWrapper` | function | Create protocol wrapper |

-> See [docs/protocol.md](./docs/protocol.md) for details.

### Features (Event, File, ORM)
| API | Type | Description |
|-----|------|-------------|
| `EventClient` | interface | Event listener management |
| `createEventClient` | function | Create event client |
| `FileClient` | interface | File upload/download |
| `createFileClient` | function | Create file client |
| `OrmConnectOptions` | interface | ORM connection options |
| `OrmClientConnector` | interface | Client-side ORM connector |
| `createOrmClientConnector` | function | Create ORM connector |
| `OrmClientDbContextExecutor` | class | DbContext executor via service protocol |

-> See [docs/features.md](./docs/features.md) for details.

### Main
| API | Type | Description |
|-----|------|-------------|
| `ServiceClient` | class | Main client (connect, auth, service calls, events, files) |
| `ServiceClientEvents` | interface | Client events (progress, state, reload) |
| `ServiceProxy` | type | Type wrapper for remote service methods |
| `createServiceClient` | function | Factory to create ServiceClient |

-> See [docs/service-client.md](./docs/service-client.md) for details.

## Usage Examples

### Connect and Call Service Methods

```typescript
import { createServiceClient } from "@simplysm/service-client";

const client = createServiceClient("my-app", {
  host: "localhost",
  port: 3000,
});

await client.connect();
await client.auth(jwtToken);

// Type-safe service proxy
interface UserService {
  getProfile(): Promise<{ name: string; email: string }>;
  updateName(name: string): Promise<void>;
}

const userService = client.getService<UserService>("User");
const profile = await userService.getProfile();
await userService.updateName("New Name");
```

### Client-Side ORM

```typescript
import { createOrmClientConnector } from "@simplysm/service-client";

const orm = createOrmClientConnector(client);

const users = await orm.connect(
  { dbContextDef: MyDb, connOpt: { configName: "main" } },
  async (db) => {
    return db.user().where((u) => [expr.eq(u.status, "active")]).execute();
  },
);
```

### Event Subscription

```typescript
import { defineEvent } from "@simplysm/service-common";

const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

const key = await client.addListener(
  OrderUpdated,
  { orderId: 123 },
  async (data) => {
    console.log("Order status:", data.status);
  },
);

// Later: unsubscribe
await client.removeListener(key);
```
