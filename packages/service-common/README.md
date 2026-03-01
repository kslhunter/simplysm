# @simplysm/service-common

Simplysm package - Service module (common)

Shared types, protocol definitions, and service interfaces used by both `@simplysm/service-client` and `@simplysm/service-server`.

## Installation

```bash
pnpm add @simplysm/service-common
```

## Protocol

### `PROTOCOL_CONFIG`

Constants that control the binary wire protocol.

```ts
import { PROTOCOL_CONFIG } from "@simplysm/service-common";

console.log(PROTOCOL_CONFIG.MAX_TOTAL_SIZE);    // 104857600 (100 MB)
console.log(PROTOCOL_CONFIG.SPLIT_MESSAGE_SIZE); // 3145728  (3 MB)
console.log(PROTOCOL_CONFIG.CHUNK_SIZE);         // 307200   (300 KB)
console.log(PROTOCOL_CONFIG.GC_INTERVAL);        // 10000    (10 s)
console.log(PROTOCOL_CONFIG.EXPIRE_TIME);        // 60000    (60 s)
```

| Field | Value | Description |
|---|---|---|
| `MAX_TOTAL_SIZE` | 100 MB | Maximum allowed message size |
| `SPLIT_MESSAGE_SIZE` | 3 MB | Messages larger than this are split into chunks |
| `CHUNK_SIZE` | 300 KB | Size of each chunk |
| `GC_INTERVAL` | 10 s | Interval for GC of incomplete messages |
| `EXPIRE_TIME` | 60 s | Expiry time for incomplete chunked messages |

---

### Message Types

Type union aliases for all WebSocket messages exchanged between client and server.

```ts
import type {
  ServiceMessage,
  ServiceServerMessage,
  ServiceServerRawMessage,
  ServiceClientMessage,
} from "@simplysm/service-common";
```

| Type | Direction | Description |
|---|---|---|
| `ServiceMessage` | both | Union of all possible messages |
| `ServiceServerMessage` | server → client | Messages the server sends to the client |
| `ServiceServerRawMessage` | server → client | `ServiceProgressMessage` plus `ServiceServerMessage` |
| `ServiceClientMessage` | client → server | Messages the client sends to the server |

---

### Individual Message Interfaces

#### `ServiceReloadMessage`

Server-sent notification asking the client to reload.

```ts
import type { ServiceReloadMessage } from "@simplysm/service-common";

const msg: ServiceReloadMessage = {
  name: "reload",
  body: {
    clientName: "my-app",
    changedFileSet: new Set(["main.js"]),
  },
};
```

#### `ServiceProgressMessage`

Server-sent progress notification while a large chunked message is being received.

```ts
import type { ServiceProgressMessage } from "@simplysm/service-common";

const msg: ServiceProgressMessage = {
  name: "progress",
  body: { totalSize: 10_000_000, completedSize: 3_000_000 },
};
```

#### `ServiceErrorMessage`

Server-sent error notification.

```ts
import type { ServiceErrorMessage } from "@simplysm/service-common";

const msg: ServiceErrorMessage = {
  name: "error",
  body: {
    name: "NotFoundError",
    message: "Record not found",
    code: "NOT_FOUND",
    stack: "...",
    detail: { id: 42 },
  },
};
```

#### `ServiceAuthMessage`

Client-sent authentication message carrying a token.

```ts
import type { ServiceAuthMessage } from "@simplysm/service-common";

const msg: ServiceAuthMessage = { name: "auth", body: "<jwt-token>" };
```

#### `ServiceRequestMessage`

Client-sent message to invoke a service method.

```ts
import type { ServiceRequestMessage } from "@simplysm/service-common";

const msg: ServiceRequestMessage = {
  name: "UserService.getUser", // "${service}.${method}"
  body: [42],                  // method arguments
};
```

#### `ServiceResponseMessage`

Server-sent response to a `ServiceRequestMessage`.

```ts
import type { ServiceResponseMessage } from "@simplysm/service-common";

const msg: ServiceResponseMessage = {
  name: "response",
  body: { id: 42, name: "Alice" },
};
```

#### `ServiceAddEventListenerMessage`

Client-sent message to subscribe to a named event.

```ts
import type { ServiceAddEventListenerMessage } from "@simplysm/service-common";

const msg: ServiceAddEventListenerMessage = {
  name: "evt:add",
  body: {
    key: "<uuid>",        // unique listener key for later removal
    name: "OrderUpdated", // event name
    info: { orderId: 1 }, // filter info passed to the server
  },
};
```

#### `ServiceRemoveEventListenerMessage`

Client-sent message to unsubscribe from an event.

```ts
import type { ServiceRemoveEventListenerMessage } from "@simplysm/service-common";

const msg: ServiceRemoveEventListenerMessage = {
  name: "evt:remove",
  body: { key: "<uuid>" },
};
```

#### `ServiceGetEventListenerInfosMessage`

Client-sent message to retrieve listener info objects for a named event.

```ts
import type { ServiceGetEventListenerInfosMessage } from "@simplysm/service-common";

const msg: ServiceGetEventListenerInfosMessage = {
  name: "evt:gets",
  body: { name: "OrderUpdated" },
};
```

#### `ServiceEmitEventMessage`

Client-sent message to emit an event to specific listeners.

```ts
import type { ServiceEmitEventMessage } from "@simplysm/service-common";

const msg: ServiceEmitEventMessage = {
  name: "evt:emit",
  body: {
    keys: ["<uuid1>", "<uuid2>"],
    data: { status: "shipped" },
  },
};
```

#### `ServiceEventMessage`

Server-sent event notification delivered to subscribed clients.

```ts
import type { ServiceEventMessage } from "@simplysm/service-common";

const msg: ServiceEventMessage = {
  name: "evt:on",
  body: {
    keys: ["<uuid1>"],
    data: { status: "shipped" },
  },
};
```

---

### `createServiceProtocol`

Factory function that creates a `ServiceProtocol` encoder/decoder.

Implements Binary Protocol V2:
- Header: 28 bytes (UUID 16 + TotalSize 8 + Index 4), Big Endian
- Body: UTF-8 JSON
- Automatically splits messages larger than 3 MB into 300 KB chunks
- Automatically reassembles chunked packets on decode

```ts
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();

// Encode
const uuid = crypto.randomUUID();
const { chunks, totalSize } = protocol.encode(uuid, {
  name: "UserService.getUser",
  body: [42],
});
// Send each chunk over a WebSocket

// Decode (call for every incoming binary frame)
const result = protocol.decode(incomingBytes);
if (result.type === "complete") {
  console.log(result.uuid, result.message);
} else {
  // result.type === "progress"
  console.log(`${result.completedSize} / ${result.totalSize} bytes received`);
}

// Release internal GC timer when done
protocol.dispose();
```

---

### `ServiceProtocol`

Interface returned by `createServiceProtocol`.

```ts
import type { ServiceProtocol } from "@simplysm/service-common";

interface ServiceProtocol {
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;
  dispose(): void;
}
```

---

### `ServiceMessageDecodeResult`

Union type returned by `ServiceProtocol.decode`.

```ts
import type { ServiceMessageDecodeResult } from "@simplysm/service-common";

type ServiceMessageDecodeResult<TMessage extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: TMessage }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

## Service Types

Pre-defined service interfaces for common backend services. Implement these interfaces on the server side and consume them on the client side.

### `OrmService`

Interface for ORM database access over the service layer.

```ts
import type { OrmService } from "@simplysm/service-common";
```

| Method | Description |
|---|---|
| `getInfo(opt)` | Returns dialect, database, and schema for a connection config |
| `connect(opt)` | Opens a connection and returns a connection ID |
| `close(connId)` | Closes the connection |
| `beginTransaction(connId, isolationLevel?)` | Begins a transaction |
| `commitTransaction(connId)` | Commits the current transaction |
| `rollbackTransaction(connId)` | Rolls back the current transaction |
| `executeParametrized(connId, query, params?)` | Executes a parameterized SQL query |
| `executeDefs(connId, defs, options?)` | Executes a list of `QueryDef` objects |
| `bulkInsert(connId, tableName, columnDefs, records)` | Performs a bulk insert |

---

### `DbConnOptions`

Options for selecting a database connection configuration.

```ts
import type { DbConnOptions } from "@simplysm/service-common";

type DbConnOptions = {
  configName?: string;           // Named config key
  config?: Record<string, unknown>; // Inline config object
};
```

---

### `AutoUpdateService`

Interface for retrieving the latest client application version.

```ts
import type { AutoUpdateService } from "@simplysm/service-common";

// Server implementation example
class MyAutoUpdateService implements AutoUpdateService {
  async getLastVersion(platform: string) {
    if (platform === "win32") {
      return { version: "1.2.3", downloadPath: "/updates/app-1.2.3.exe" };
    }
    return undefined;
  }
}
```

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `getLastVersion` | `platform: string` | `Promise<{ version: string; downloadPath: string } \| undefined>` | Returns the latest version info for the given platform, or `undefined` if none exists |

---

### `SmtpClientSendAttachment`

Attachment descriptor for outgoing emails.

```ts
import type { SmtpClientSendAttachment } from "@simplysm/service-common";

interface SmtpClientSendAttachment {
  filename: string;
  content?: string | Uint8Array; // Inline content
  path?: any;                    // File path (node)
  contentType?: string;
}
```

---

### `SmtpClientSendByDefaultOption`

Email send options when using a pre-configured SMTP default.

```ts
import type { SmtpClientSendByDefaultOption } from "@simplysm/service-common";

interface SmtpClientSendByDefaultOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpClientSendAttachment[];
}
```

---

### `SmtpClientSendOption`

Full email send options including explicit SMTP connection details.

```ts
import type { SmtpClientSendOption } from "@simplysm/service-common";

interface SmtpClientSendOption {
  host: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;

  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpClientSendAttachment[];
}
```

---

### `SmtpClientDefaultConfig`

Configuration for a default SMTP sender used server-side.

```ts
import type { SmtpClientDefaultConfig } from "@simplysm/service-common";

interface SmtpClientDefaultConfig {
  senderName: string;
  senderEmail?: string;
  user?: string;
  pass?: string;
  host: string;
  port?: number;
  secure?: boolean;
}
```

## Types

### `ServiceUploadResult`

Describes a file that has been uploaded to the server.

```ts
import type { ServiceUploadResult } from "@simplysm/service-common";

interface ServiceUploadResult {
  path: string;     // Storage path on the server
  filename: string; // Original filename
  size: number;     // File size in bytes
}
```

## Define

### `defineEvent`

Creates a type-safe event definition object used to subscribe and emit events through the service layer.

```ts
import { defineEvent } from "@simplysm/service-common";

// Define a typed event
const OrderUpdated = defineEvent<
  { orderId: number }, // TInfo — filter info sent with addEventListener
  { status: string }  // TData — data payload delivered to the listener
>("OrderUpdated");

// Server: emit the event
ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });

// Client: subscribe to the event
await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
  console.log(data.status); // typed as string
});
```

**Signature**

```ts
function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string,
): ServiceEventDef<TInfo, TData>
```

---

### `ServiceEventDef`

The object type returned by `defineEvent`. The `$info` and `$data` fields are compile-time type markers only and hold no runtime value.

```ts
import type { ServiceEventDef } from "@simplysm/service-common";

interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;  // type extraction only
  readonly $data: TData;  // type extraction only
}
```
