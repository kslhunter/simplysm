# @simplysm/service-common

A package that provides shared communication protocols, message types, and service interface definitions between the service client (`service-client`) and server (`service-server`). It includes binary protocol-based message encoding/decoding, automatic message chunking for large payloads, event system types, and service interfaces for ORM/encryption/SMTP/auto-update.

## Installation

```bash
npm install @simplysm/service-common
# or
pnpm add @simplysm/service-common
```

### Dependencies

| Package | Description |
|--------|------|
| `@simplysm/core-common` | Common utilities (`Uuid`, `LazyGcMap`, `jsonStringify`, `jsonParse`, etc.) |
| `@simplysm/orm-common` | ORM types (`Dialect`, `IsolationLevel`, `QueryDef`, `ColumnMeta`, `ResultMeta`, etc.) |

## Main Modules

### Module Structure

| Module Path | Description |
|-----------|------|
| `protocol/protocol.types` | Protocol constants, message type definitions |
| `protocol/service-protocol` | Message encoding/decoding class |
| `service-types/orm-service.types` | ORM service interface and DB connection options |
| `service-types/crypto-service.types` | Crypto service interface and config |
| `service-types/smtp-service.types` | SMTP service interface and email options |
| `service-types/auto-update-service.types` | Auto-update service interface |
| `types` | `ServiceUploadResult` |
| `define-event` | `defineEvent`, `ServiceEventDef` |

---

## ServiceProtocol

The core interface for encoding/decoding messages into binary format. Created via the `createServiceProtocol()` factory function. Messages exceeding 3MB are automatically split into 300KB chunks, and the receiving side automatically assembles the chunks to restore the original message.

### Binary Header Structure

Each chunk consists of a 28-byte header and body (Big Endian).

| Offset | Size | Field | Description |
|--------|------|------|------|
| 0 | 16 bytes | UUID | Message identifier (binary) |
| 16 | 8 bytes | TotalSize | Total message size (uint64) |
| 24 | 4 bytes | Index | Chunk index (uint32) |

### API

| Method | Return Type | Description |
|--------|-----------|------|
| `encode(uuid, message)` | `{ chunks: Bytes[]; totalSize: number }` | Encodes the message and automatically splits if necessary |
| `decode<T>(bytes)` | `ServiceMessageDecodeResult<T>` | Decodes binary chunks and automatically assembles split messages |
| `dispose()` | `void` | Releases the GC timer of the internal chunk accumulator. Must be called when the instance is no longer used |

### Decode Result Type

`ServiceMessageDecodeResult<T>` is a union type with two states.

| `type` | Fields | Description |
|--------|------|------|
| `"complete"` | `uuid`, `message: T` | All chunks received and message assembly complete |
| `"progress"` | `uuid`, `totalSize`, `completedSize` | Split message in progress (only some chunks arrived) |

### Usage Example

```typescript
import { createServiceProtocol } from "@simplysm/service-common";
import { Uuid } from "@simplysm/core-common";

const protocol = createServiceProtocol();

// Encoding: Convert message to binary chunks
const uuid = Uuid.new().toString();
const { chunks, totalSize } = protocol.encode(uuid, {
  name: "TestService.echo",
  body: ["Hello, world!"],
});

// Decoding: Process received chunks one by one
for (const chunk of chunks) {
  const result = protocol.decode(chunk);
  if (result.type === "complete") {
    console.log(result.message);
    // { name: "TestService.echo", body: ["Hello, world!"] }
  } else {
    // Split message in progress
    const progress = (result.completedSize / result.totalSize) * 100;
    console.log(`Reception progress: ${progress.toFixed(1)}%`);
  }
}

// Clean up instance (release GC timer)
protocol.dispose();
```

---

## Protocol Constants (PROTOCOL_CONFIG)

A constant object that controls protocol behavior.

```typescript
import { PROTOCOL_CONFIG } from "@simplysm/service-common";
```

| Constant | Value | Description |
|------|----|------|
| `MAX_TOTAL_SIZE` | 100MB (104,857,600 bytes) | Maximum size for a single message. `ArgumentError` thrown if exceeded |
| `SPLIT_MESSAGE_SIZE` | 3MB (3,145,728 bytes) | Chunking threshold. Automatically split if this size is exceeded |
| `CHUNK_SIZE` | 300KB (307,200 bytes) | Body size of each chunk when split |
| `GC_INTERVAL` | 10s (10,000ms) | Garbage collection cycle for incomplete messages |
| `EXPIRE_TIME` | 60s (60,000ms) | Expiration time for incomplete messages. Removed from memory if exceeded |

---

## Message Types

Type definitions for messages exchanged between client and server. `ServiceMessage` is a union of all message types.

### Classification by Message Direction

| Union Type | Direction | Included Messages |
|------------|------|------------|
| `ServiceClientMessage` | Client -> Server | Request, Auth, event-related messages |
| `ServiceServerMessage` | Server -> Client | Reload, Response, Error, Event |
| `ServiceServerRawMessage` | Server -> Client (raw) | Progress + `ServiceServerMessage` |
| `ServiceMessage` | Bidirectional (all) | Union of all message types |

### Individual Message Types

#### System Messages

| Type | `name` | Direction | `body` Type | Description |
|------|--------|------|-------------|------|
| `ServiceReloadMessage` | `"reload"` | Server -> Client | `{ clientName: string \| undefined; changedFileSet: Set<string> }` | Client reload command |
| `ServiceProgressMessage` | `"progress"` | Server -> Client | `{ totalSize: number; completedSize: number }` | Split message reception progress |
| `ServiceErrorMessage` | `"error"` | Server -> Client | `{ name, message, code, stack?, detail?, cause? }` | Error notification |
| `ServiceAuthMessage` | `"auth"` | Client -> Server | `string` (token) | Authentication token transmission |

#### Service Method Call Messages

| Type | `name` | Direction | `body` Type | Description |
|------|--------|------|-------------|------|
| `ServiceRequestMessage` | `` `${service}.${method}` `` | Client -> Server | `unknown[]` (parameter array) | RPC method call request |
| `ServiceResponseMessage` | `"response"` | Server -> Client | `unknown` (return value) | Method call response |

#### Event Messages

| Type | `name` | Direction | `body` Type | Description |
|------|--------|------|-------------|------|
| `ServiceAddEventListenerMessage` | `"evt:add"` | Client -> Server | `{ key, name, info }` | Event listener registration |
| `ServiceRemoveEventListenerMessage` | `"evt:remove"` | Client -> Server | `{ key }` | Event listener removal |
| `ServiceGetEventListenerInfosMessage` | `"evt:gets"` | Client -> Server | `{ name }` | Event listener info list query |
| `ServiceEmitEventMessage` | `"evt:emit"` | Client -> Server | `{ keys, data }` | Event emission |
| `ServiceEventMessage` | `"evt:on"` | Server -> Client | `{ keys, data }` | Event notification |

---

## defineEvent / ServiceEventDef

A function for defining event types. Events are used to publish real-time notifications from server to client.

### API

```typescript
function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string
): ServiceEventDef<TInfo, TData>
```

### Type Parameters

| Parameter | Description |
|---------|------|
| `TInfo` | Additional information type for listener filtering |
| `TData` | Data type passed when the event is emitted |

### ServiceEventDef Properties

| Property | Type | Description |
|------|------|------|
| `eventName` | `string` | Unique event identifier |
| `$info` | `TInfo` (declare) | For type extraction. Not used at runtime |
| `$data` | `TData` (declare) | For type extraction. Not used at runtime |

### Usage Example

```typescript
import { defineEvent } from "@simplysm/service-common";

// Custom event definition
export const DataChangeEvent = defineEvent<
  { tableName: string; filter: unknown },
  (string | number)[] | undefined
>("DataChangeEvent");

// Register listener on client (using service-client)
await client.addEventListener(
  DataChangeEvent,
  { tableName: "User", filter: null },
  (data) => {
    console.log("Changed records:", data);
  },
);
```

---

## ServiceUploadResult

An interface representing file upload results.

| Field | Type | Description |
|------|------|------|
| `path` | `string` | Storage path on server |
| `filename` | `string` | Original filename |
| `size` | `number` | File size (bytes) |

---

## Service Interfaces

Service interface definitions that are implemented on the server side and called by the client via RPC.

### OrmService

Defines database connection, transaction management, and query execution capabilities. Supports MySQL, MSSQL, PostgreSQL.

| Method | Parameters | Return Type | Description |
|--------|---------|-----------|------|
| `getInfo` | `opt: DbConnOptions & { configName: string }` | `Promise<{ dialect, database?, schema? }>` | Query DB connection info |
| `connect` | `opt: Record<string, unknown>` | `Promise<number>` | Create DB connection, return connection ID |
| `close` | `connId: number` | `Promise<void>` | Close DB connection |
| `beginTransaction` | `connId, isolationLevel?` | `Promise<void>` | Begin transaction |
| `commitTransaction` | `connId: number` | `Promise<void>` | Commit transaction |
| `rollbackTransaction` | `connId: number` | `Promise<void>` | Rollback transaction |
| `executeParametrized` | `connId, query, params?` | `Promise<unknown[][]>` | Execute parameterized query |
| `executeDefs` | `connId, defs: QueryDef[], options?: (ResultMeta \| undefined)[]` | `Promise<unknown[][]>` | Execute queries with `QueryDef` array |
| `bulkInsert` | `connId, tableName, columnDefs: Record<string, ColumnMeta>, records` | `Promise<void>` | Bulk data insertion |

#### DbConnOptions

| Field | Type | Description |
|------|------|------|
| `configName?` | `string` | Config name to reference in server settings |
| `config?` | `Record<string, unknown>` | Directly passed connection config |

### CryptoService

Defines SHA256 hash generation and AES symmetric key encryption/decryption capabilities.

| Method | Parameters | Return Type | Description |
|--------|---------|-----------|------|
| `encrypt` | `data: string \| Bytes` | `Promise<string>` | Generate SHA256 hash |
| `encryptAes` | `data: Bytes` | `Promise<string>` | AES encryption |
| `decryptAes` | `encText: string` | `Promise<Bytes>` | AES decryption |

#### CryptoConfig

| Field | Type | Description |
|------|------|------|
| `key` | `string` | AES encryption key |

### SmtpService

Defines email sending capabilities. Can send by directly passing SMTP settings or by referencing server config.

| Method | Parameters | Return Type | Description |
|--------|---------|-----------|------|
| `send` | `options: SmtpSendOption` | `Promise<string>` | Send email with direct SMTP settings |
| `sendByConfig` | `configName, options: SmtpSendByConfigOption` | `Promise<string>` | Send email by referencing server config |

#### SmtpSendOption

A type combining `SmtpConnectionOptions` and `SmtpEmailContentOptions`, with an additional `from` field.

| Field | Type | Required | Description |
|------|------|------|------|
| `host` | `string` | Y | SMTP host |
| `port` | `number` | N | SMTP port |
| `secure` | `boolean` | N | TLS usage |
| `user` | `string` | N | SMTP auth user |
| `pass` | `string` | N | SMTP auth password |
| `from` | `string` | Y | Sender address |
| `to` | `string` | Y | Recipient address |
| `cc` | `string` | N | CC |
| `bcc` | `string` | N | BCC |
| `subject` | `string` | Y | Subject |
| `html` | `string` | Y | Body (HTML) |
| `attachments` | `SmtpSendAttachment[]` | N | Attachment list |

#### SmtpSendByConfigOption

Same as `SmtpEmailContentOptions`. SMTP connection info is referenced from server config (`configName`).

#### SmtpSendAttachment

| Field | Type | Required | Description |
|------|------|------|------|
| `filename` | `string` | Y | Attachment filename |
| `content` | `Bytes` | N | File content (binary). Specify one of `path` or `content` |
| `path` | `string` | N | File path on server. Specify one of `path` or `content` |
| `contentType` | `string` | N | MIME type (e.g., `"application/pdf"`) |

#### SmtpConfig

Server-side SMTP configuration type.

| Field | Type | Required | Description |
|------|------|------|------|
| `host` | `string` | Y | SMTP host |
| `port` | `number` | N | SMTP port |
| `secure` | `boolean` | N | TLS usage |
| `user` | `string` | N | SMTP auth user |
| `pass` | `string` | N | SMTP auth password |
| `senderName` | `string` | Y | Sender display name |
| `senderEmail` | `string` | N | Sender email address |

### AutoUpdateService

Defines a service for querying the latest version information of a client application.

| Method | Parameters | Return Type | Description |
|--------|---------|-----------|------|
| `getLastVersion` | `platform: string` | `Promise<{ version: string; downloadPath: string } \| undefined>` | Query latest version info for the specified platform. Returns `undefined` if none |

Pass values like `"win32"`, `"darwin"`, `"linux"` to `platform`.

---

## Caveats

- `ServiceProtocol` instances are created via `createServiceProtocol()` factory function and internally use `LazyGcMap` to manage incomplete split messages. After use, you must call `dispose()` to release the GC timer.
- Encoding or decoding messages exceeding `PROTOCOL_CONFIG.MAX_TOTAL_SIZE` (100MB) will throw an `ArgumentError`.
- Passing binary data less than 28 bytes during decoding will throw an `ArgumentError`.
- Service interfaces (`OrmService`, `CryptoService`, etc.) only provide type definitions. Actual implementations are handled by the `@simplysm/service-server` package.
- The `$info` and `$data` properties of `ServiceEventDef` are declared with `declare` and do not exist at runtime; they are only used for TypeScript type extraction.

## License

Apache-2.0
