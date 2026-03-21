# @simplysm/service-common

Simplysm package - Service module (common)

Shared protocol and types used by both `@simplysm/service-client` and `@simplysm/service-server`. Provides binary message encoding/decoding, service interface definitions, and event type system.

## Installation

```bash
npm install @simplysm/service-common
```

## API Overview

### Protocol
| API | Type | Description |
|-----|------|-------------|
| `PROTOCOL_CONFIG` | const | Protocol configuration constants (sizes, timeouts) |
| `ServiceProtocol` | interface | Binary protocol encoder/decoder interface |
| `createServiceProtocol` | function | Create a protocol instance |
| `ServiceMessageDecodeResult` | type | Decode result (complete or progress) |
| `ServiceMessage` | type | Union of all message types |
| `ServiceServerMessage` | type | Server-to-client message union |
| `ServiceServerRawMessage` | type | Server messages including progress |
| `ServiceClientMessage` | type | Client-to-server message union |
| `ServiceReloadMessage` | interface | Server reload command |
| `ServiceProgressMessage` | interface | Chunked message progress notification |
| `ServiceErrorMessage` | interface | Server error notification |
| `ServiceAuthMessage` | interface | Client authentication message |
| `ServiceRequestMessage` | interface | Client service method request |
| `ServiceResponseMessage` | interface | Server method response |
| `ServiceAddEventListenerMessage` | interface | Client add event listener |
| `ServiceRemoveEventListenerMessage` | interface | Client remove event listener |
| `ServiceGetEventListenerInfosMessage` | interface | Client request event listener infos |
| `ServiceEmitEventMessage` | interface | Client emit event |
| `ServiceEventMessage` | interface | Server event notification |

-> See [docs/protocol.md](./docs/protocol.md) for details.

### Service Types
| API | Type | Description |
|-----|------|-------------|
| `OrmService` | interface | ORM service interface (connect, query, transaction) |
| `DbConnOptions` | type | Database connection options |
| `AutoUpdateService` | interface | Auto-update service interface |
| `SmtpClientSendOption` | interface | Full SMTP send options |
| `SmtpClientSendByDefaultOption` | interface | SMTP send with server defaults |
| `SmtpClientSendAttachment` | interface | Email attachment definition |
| `SmtpClientDefaultOptions` | interface | Default SMTP client config |

-> See [docs/service-types.md](./docs/service-types.md) for details.

### Types
| API | Type | Description |
|-----|------|-------------|
| `ServiceUploadResult` | interface | File upload result (path, filename, size) |

-> See [docs/events.md](./docs/events.md) for details.

### Event Definition
| API | Type | Description |
|-----|------|-------------|
| `ServiceEventDef` | interface | Type-safe event definition |
| `defineEvent` | function | Define a service event with typed info and data |

-> See [docs/events.md](./docs/events.md) for details.

## Usage Examples

### Define and Use Events

```typescript
import { defineEvent } from "@simplysm/service-common";

// Define a typed event
const OrderUpdated = defineEvent<
  { orderId: number },      // TInfo: filter info
  { status: string }        // TData: event data
>("OrderUpdated");

// Server: emit event
ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });

// Client: subscribe to event
await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
  console.log(data.status); // typed as string
});
```

### Use Protocol

```typescript
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();

// Encode
const { chunks, totalSize } = protocol.encode(uuid, {
  name: "MyService.myMethod",
  body: [param1, param2],
});

// Decode
const result = protocol.decode(receivedBytes);
if (result.type === "complete") {
  handleMessage(result.message);
}

// Cleanup
protocol.dispose();
```
