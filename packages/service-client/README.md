# @simplysm/service-client

Service module (client) -- WebSocket-based service client for communicating with `@simplysm/service-server`.

## Installation

```bash
npm install @simplysm/service-client
```

## Exports

```typescript
import {
  // Main
  ServiceClient,
  createServiceClient,
  type ServiceProxy,
  // Types
  type ServiceConnectionOptions,
  type ServiceProgress,
  type ServiceProgressState,
  // Transport
  type SocketProvider,
  type SocketProviderEvents,
  createSocketProvider,
  type ServiceTransport,
  type ServiceTransportEvents,
  createServiceTransport,
  // Protocol
  type ClientProtocolWrapper,
  createClientProtocolWrapper,
  // Features
  type EventClient,
  createEventClient,
  type FileClient,
  createFileClient,
  type OrmConnectOptions,
  type OrmClientConnector,
  createOrmClientConnector,
  OrmClientDbContextExecutor,
} from "@simplysm/service-client";
```

## Quick Start

```typescript
import { createServiceClient } from "@simplysm/service-client";

const client = createServiceClient("my-app", {
  host: "localhost",
  port: 3000,
});

await client.connect();

// Authenticate
await client.auth(token);

// Call a service method
const service = client.getService<MyServiceType>("MyService");
const result = await service.someMethod("arg1", "arg2");

// Listen for events
await client.addListener(SomeEvent, { id: 1 }, async (data) => {
  // handle event
});

// Upload files
const results = await client.uploadFile(fileList);

// Close
await client.close();
```

## Documentation

- [Types](docs/types.md)
- [Transport](docs/transport.md)
- [Protocol](docs/protocol.md)
- [Features](docs/features.md)
- [ServiceClient](docs/service-client.md)
