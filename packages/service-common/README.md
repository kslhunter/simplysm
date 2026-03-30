# @simplysm/service-common

Shared types and protocol for the Simplysm service framework. Provides the binary protocol V2 encoder/decoder, message type definitions, service interface contracts (ORM, auto-update), and event definition utilities used by both `@simplysm/service-client` and `@simplysm/service-server`.

## Installation

```bash
npm install @simplysm/service-common
```

## API Overview

### Protocol Types
| API | Type | Description |
|-----|------|-------------|
| `PROTOCOL_CONFIG` | `const` | Protocol configuration constants (max size, chunk size, GC interval, expiry) |
| `ServiceMessage` | `type` | Union of all message types |
| `ServiceServerMessage` | `type` | Union of server-to-client message types |
| `ServiceServerRawMessage` | `type` | Union of progress + server message types |
| `ServiceClientMessage` | `type` | Union of client-to-server message types |
| `ServiceProgressMessage` | `interface` | Chunked message progress notification |
| `ServiceErrorMessage` | `interface` | Error notification from server |
| `ServiceAuthMessage` | `interface` | Authentication message from client |
| `ServiceRequestMessage` | `interface` | Service method request from client |
| `ServiceResponseMessage` | `interface` | Service method response from server |
| `ServiceAddEventListenerMessage` | `interface` | Add event listener request |
| `ServiceRemoveEventListenerMessage` | `interface` | Remove event listener request |
| `ServiceGetEventListenerInfosMessage` | `interface` | Get event listener infos request |
| `ServiceEmitEventMessage` | `interface` | Emit event request |
| `ServiceEventMessage` | `interface` | Event notification from server |

-> See [docs/protocol-types.md](./docs/protocol-types.md) for details.

### Service Protocol
| API | Type | Description |
|-----|------|-------------|
| `ServiceProtocol` | `interface` | Binary protocol encoder/decoder interface |
| `ServiceMessageDecodeResult` | `type` | Decode result union (complete or progress) |
| `createServiceProtocol` | `function` | Creates a protocol encoder/decoder instance |

-> See [docs/service-protocol.md](./docs/service-protocol.md) for details.

### ORM Service Types
| API | Type | Description |
|-----|------|-------------|
| `OrmService` | `interface` | ORM service interface for DB operations |
| `DbConnOptions` | `type` | Database connection options |

-> See [docs/orm-service-types.md](./docs/orm-service-types.md) for details.

### Auto-Update Service Types
| API | Type | Description |
|-----|------|-------------|
| `AutoUpdateService` | `interface` | Auto-update service interface |

-> See [docs/auto-update-service-types.md](./docs/auto-update-service-types.md) for details.

### Common Types
| API | Type | Description |
|-----|------|-------------|
| `ServiceUploadResult` | `interface` | File upload result containing path, filename, and size |

-> See [docs/common-types.md](./docs/common-types.md) for details.

### Events
| API | Type | Description |
|-----|------|-------------|
| `ServiceEventDef` | `interface` | Type-safe event definition with info and data markers |
| `defineEvent` | `function` | Creates a typed service event definition |

-> See [docs/events.md](./docs/events.md) for details.

## Usage Examples

### Creating a Protocol Instance

```typescript
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();

// Encode a message
const { chunks, totalSize } = protocol.encode("some-uuid", {
  name: "SomeService.someMethod",
  body: [arg1, arg2],
});

// Decode received bytes
const result = protocol.decode(receivedBytes);
if (result.type === "complete") {
  console.log(result.message);
} else {
  console.log(`Progress: ${result.completedSize}/${result.totalSize}`);
}

// Dispose when done
protocol.dispose();
```

### Defining a Typed Event

```typescript
import { defineEvent } from "@simplysm/service-common";

const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// Server: emit event
await server.emitEvent(OrderUpdated, (info) => info.orderId === 123, { status: "shipped" });

// Client: subscribe
await client.addListener(OrderUpdated, { orderId: 123 }, async (data) => {
  console.log(data.status);
});
```
