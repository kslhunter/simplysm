# @simplysm/service-client

WebSocket-based service client for communicating with `@simplysm/service-server`. Provides RPC-style service calls, real-time event subscriptions, file upload/download, and ORM database access -- all over a single persistent connection with automatic reconnection and heartbeat monitoring.

## Installation

```bash
npm install @simplysm/service-client
```

## Quick Start

```typescript
import { createServiceClient } from "@simplysm/service-client";

// Create and connect
const client = createServiceClient("my-app", {
  host: "localhost",
  port: 3000,
});
await client.connect();

// Authenticate
await client.auth(token);

// Call a remote service method
const userService = client.getService<UserService>("User");
const users = await userService.getList();

// Upload files
const results = await client.uploadFile(fileList);

// Listen to real-time events
const key = await client.addListener(myEventDef, { roomId: 1 }, async (data) => {
  console.log("Event received:", data);
});

// Clean up
await client.removeListener(key);
await client.close();
```

## Documentation

| Category | File | Description |
|----------|------|-------------|
| Service Client | [docs/service-client.md](docs/service-client.md) | Main `ServiceClient` class and factory function |
| Types | [docs/types.md](docs/types.md) | Connection options, progress types |
| Transport | [docs/transport.md](docs/transport.md) | Socket provider and service transport layer |
| Protocol | [docs/protocol.md](docs/protocol.md) | Client protocol wrapper with Web Worker offloading |
| Features | [docs/features.md](docs/features.md) | Event client, file client, ORM connector |

## Architecture

```
ServiceClient (main facade)
  |-- SocketProvider          WebSocket connection + heartbeat + reconnection
  |-- ServiceTransport        Request/response multiplexing over socket
  |     \-- ClientProtocolWrapper   Encode/decode with optional Web Worker
  |-- EventClient             Server-sent event subscriptions
  \-- FileClient              HTTP file upload/download
```

## Dependencies

- `@simplysm/core-common` -- EventEmitter, Uuid, transfer utilities
- `@simplysm/service-common` -- Protocol definitions, message types
- `@simplysm/orm-common` -- ORM types (for ORM connector feature)
