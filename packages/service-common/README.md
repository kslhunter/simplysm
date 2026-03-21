# @simplysm/service-common

Service module (common) -- shared protocol and types used by both `@simplysm/service-client` and `@simplysm/service-server`.

## Installation

```bash
npm install @simplysm/service-common
```

## Exports

```typescript
import {
  // Protocol
  PROTOCOL_CONFIG,
  type ServiceMessage,
  type ServiceServerMessage,
  type ServiceServerRawMessage,
  type ServiceClientMessage,
  type ServiceProtocol,
  type ServiceMessageDecodeResult,
  createServiceProtocol,
  // Service Types
  type OrmService,
  type DbConnOptions,
  type AutoUpdateService,
  type SmtpClientSendAttachment,
  type SmtpClientSendByDefaultOption,
  type SmtpClientSendOption,
  type SmtpClientDefaultOptions,
  // Events + Types
  type ServiceEventDef,
  defineEvent,
  type ServiceUploadResult,
} from "@simplysm/service-common";
```

## Quick Start

```typescript
import { createServiceProtocol, defineEvent } from "@simplysm/service-common";

// Create protocol encoder/decoder
const protocol = createServiceProtocol();
const { chunks, totalSize } = protocol.encode(uuid, { name: "auth", body: token });
const result = protocol.decode(chunks[0]);
protocol.dispose();

// Define a typed event
const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");
```

## Documentation

- [Protocol](docs/protocol.md)
- [Service Types](docs/service-types.md)
- [Events and Types](docs/events.md)
