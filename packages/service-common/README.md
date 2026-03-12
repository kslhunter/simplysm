# @simplysm/service-common

> Simplysm package - Service module (common)

Shared types and utilities for the simplysm service layer. Provides the binary protocol for client-server communication, type-safe event definitions, and interface contracts for built-in services (ORM, auto-update, SMTP).

## Installation

```bash
npm install @simplysm/service-common
```

## Protocol

The service protocol handles binary encoding/decoding of messages between client and server over WebSocket. Large messages are automatically chunked and reassembled.

### `createServiceProtocol()`

Creates a `ServiceProtocol` encoder/decoder instance.

```typescript
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();

// Encode a request message
const { chunks, totalSize } = protocol.encode(uuid, {
  name: "MyService.getData",
  body: [arg1, arg2],
});

// Decode incoming bytes
const result = protocol.decode(bytes);
if (result.type === "complete") {
  console.log(result.message); // fully reassembled message
} else {
  console.log(`${result.completedSize}/${result.totalSize} bytes received`);
}

// Cleanup when done
protocol.dispose();
```

**`ServiceProtocol` methods:**

| Method | Signature | Description |
|---|---|---|
| `encode` | `(uuid: string, message: ServiceMessage) => { chunks: Bytes[]; totalSize: number }` | Encode a message, auto-splitting into chunks if needed |
| `decode` | `(bytes: Bytes) => ServiceMessageDecodeResult<T>` | Decode bytes, auto-reassembling chunked packets |
| `dispose` | `() => void` | Release the internal chunk accumulator GC timer |

**Binary Protocol V2 header (28 bytes, Big Endian):**

| Offset | Size | Field |
|---|---|---|
| 0 | 16 | UUID (binary) |
| 16 | 8 | TotalSize (uint64) |
| 24 | 4 | Index (uint32) |

### `PROTOCOL_CONFIG`

Protocol configuration constants.

| Constant | Value | Description |
|---|---|---|
| `MAX_TOTAL_SIZE` | 100 MB | Maximum message size |
| `SPLIT_MESSAGE_SIZE` | 3 MB | Chunking threshold |
| `CHUNK_SIZE` | 300 KB | Individual chunk size |
| `GC_INTERVAL` | 10 s | Garbage collection interval for incomplete messages |
| `EXPIRE_TIME` | 60 s | Expiry time for incomplete messages |

### `ServiceMessageDecodeResult<T>`

Union type returned by `decode()`:

- `{ type: "complete"; uuid: string; message: T }` -- all chunks received, message fully reassembled
- `{ type: "progress"; uuid: string; totalSize: number; completedSize: number }` -- chunked message still in progress

### Message Types

All messages exchanged between client and server are typed as `ServiceMessage`, which is a union of the following:

**Client messages (`ServiceClientMessage`):**

| Interface | `name` | Description |
|---|---|---|
| `ServiceAuthMessage` | `"auth"` | Authentication with token |
| `ServiceRequestMessage` | `` `${service}.${method}` `` | Service method invocation |
| `ServiceAddEventListenerMessage` | `"evt:add"` | Subscribe to an event |
| `ServiceRemoveEventListenerMessage` | `"evt:remove"` | Unsubscribe from an event |
| `ServiceGetEventListenerInfosMessage` | `"evt:gets"` | Query event listener info |
| `ServiceEmitEventMessage` | `"evt:emit"` | Emit an event to listeners |

**Server messages (`ServiceServerMessage`):**

| Interface | `name` | Description |
|---|---|---|
| `ServiceReloadMessage` | `"reload"` | Hot-reload command to client |
| `ServiceResponseMessage` | `"response"` | Response to a service method request |
| `ServiceErrorMessage` | `"error"` | Error notification |
| `ServiceEventMessage` | `"evt:on"` | Event notification to subscribers |

**Internal server messages (`ServiceServerRawMessage`):**

| Interface | `name` | Description |
|---|---|---|
| `ServiceProgressMessage` | `"progress"` | Chunk upload progress notification |

## Events

### `defineEvent<TInfo, TData>(eventName)`

Define a type-safe service event. Returns a `ServiceEventDef` descriptor used by the client and server to subscribe, emit, and handle events with full type inference.

```typescript
import { defineEvent } from "@simplysm/service-common";

// Define an event with typed info (filter) and data (payload)
const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// Server emit
ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });

// Client subscribe
await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
  console.log(data.status); // typed as string
});
```

### `ServiceEventDef<TInfo, TData>`

Event definition object returned by `defineEvent()`.

| Property | Type | Description |
|---|---|---|
| `eventName` | `string` | Event name identifier |
| `$info` | `TInfo` | Type-only marker for filter info (not used at runtime) |
| `$data` | `TData` | Type-only marker for event data (not used at runtime) |

## Service Interfaces

Contracts for built-in services. These interfaces are implemented on the server and consumed by the client.

### `OrmService`

Database connection, transaction management, and query execution. Supports MySQL, MSSQL, and PostgreSQL.

| Method | Signature | Description |
|---|---|---|
| `getInfo` | `(opt: DbConnOptions & { configName: string }) => Promise<{ dialect; database?; schema? }>` | Get database connection info |
| `connect` | `(opt: Record<string, unknown>) => Promise<number>` | Open a connection, returns connection ID |
| `close` | `(connId: number) => Promise<void>` | Close a connection |
| `beginTransaction` | `(connId: number, isolationLevel?: IsolationLevel) => Promise<void>` | Begin a transaction |
| `commitTransaction` | `(connId: number) => Promise<void>` | Commit a transaction |
| `rollbackTransaction` | `(connId: number) => Promise<void>` | Rollback a transaction |
| `executeParametrized` | `(connId: number, query: string, params?: unknown[]) => Promise<unknown[][]>` | Execute a parameterized query |
| `executeDefs` | `(connId: number, defs: QueryDef[], options?: (ResultMeta \| undefined)[]) => Promise<unknown[][]>` | Execute query definitions |
| `bulkInsert` | `(connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]) => Promise<void>` | Bulk insert records |

### `DbConnOptions`

```typescript
type DbConnOptions = { configName?: string; config?: Record<string, unknown> };
```

### `AutoUpdateService`

Retrieves the latest version info for client applications.

| Method | Signature | Description |
|---|---|---|
| `getLastVersion` | `(platform: string) => Promise<{ version: string; downloadPath: string } \| undefined>` | Get latest version info for a platform (e.g., `"win32"`, `"darwin"`, `"linux"`) |

### SMTP Types

Types for the SMTP email sending service.

**`SmtpClientSendOption`** -- Full SMTP send configuration:

| Property | Type | Required | Description |
|---|---|---|---|
| `host` | `string` | Yes | SMTP server host |
| `port` | `number` | No | SMTP server port |
| `secure` | `boolean` | No | Use TLS |
| `user` | `string` | No | Authentication username |
| `pass` | `string` | No | Authentication password |
| `from` | `string` | Yes | Sender address |
| `to` | `string` | Yes | Recipient address |
| `cc` | `string` | No | CC address |
| `bcc` | `string` | No | BCC address |
| `subject` | `string` | Yes | Email subject |
| `html` | `string` | Yes | Email body (HTML) |
| `attachments` | `SmtpClientSendAttachment[]` | No | File attachments |

**`SmtpClientSendByDefaultOption`** -- Send using pre-configured defaults (omits host/auth/from):

| Property | Type | Required | Description |
|---|---|---|---|
| `to` | `string` | Yes | Recipient address |
| `cc` | `string` | No | CC address |
| `bcc` | `string` | No | BCC address |
| `subject` | `string` | Yes | Email subject |
| `html` | `string` | Yes | Email body (HTML) |
| `attachments` | `SmtpClientSendAttachment[]` | No | File attachments |

**`SmtpClientDefaultOptions`** -- Default SMTP configuration:

| Property | Type | Required | Description |
|---|---|---|---|
| `senderName` | `string` | Yes | Display name for sender |
| `senderEmail` | `string` | No | Sender email address |
| `user` | `string` | No | Authentication username |
| `pass` | `string` | No | Authentication password |
| `host` | `string` | Yes | SMTP server host |
| `port` | `number` | No | SMTP server port |
| `secure` | `boolean` | No | Use TLS |

**`SmtpClientSendAttachment`** -- Email attachment:

| Property | Type | Required | Description |
|---|---|---|---|
| `filename` | `string` | Yes | Attachment filename |
| `content` | `string \| Uint8Array` | No | Inline content |
| `path` | `any` | No | File path |
| `contentType` | `string` | No | MIME type |

## Common Types

### `ServiceUploadResult`

File upload result returned by the server.

| Property | Type | Description |
|---|---|---|
| `path` | `string` | Storage path on the server |
| `filename` | `string` | Original filename |
| `size` | `number` | File size in bytes |
