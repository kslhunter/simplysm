# @simplysm/service-common

A package that provides shared communication protocols, message types, and service interface definitions between the service client (`service-client`) and server (`service-server`). It includes binary protocol-based message encoding/decoding, automatic message chunking for large payloads, event system types, and service interfaces for ORM and auto-update.

## Installation

```bash
npm install @simplysm/service-common
# or
pnpm add @simplysm/service-common
```

## Main Modules

### Module Structure

| Module Path | Description |
|-------------|-------------|
| `protocol/protocol.types` | Protocol constants, message type definitions |
| `protocol/service-protocol` | `ServiceProtocol` interface, `ServiceMessageDecodeResult` type, `createServiceProtocol()` factory |
| `service-types/orm-service.types` | `OrmService` interface and `DbConnOptions` type |
| `service-types/auto-update-service.types` | `AutoUpdateService` interface |
| `types` | `ServiceUploadResult` interface |
| `define-event` | `defineEvent()` function, `ServiceEventDef` interface |

## Protocol

### ServiceProtocol

The core interface for encoding and decoding messages in binary format. Created via the `createServiceProtocol()` factory function. Messages exceeding 3MB are automatically split into 300KB chunks, and the receiving side automatically assembles the chunks to restore the original message.

#### Binary Header Structure

Each chunk consists of a 28-byte header followed by a JSON body (Big Endian).

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 16 bytes | UUID | Message identifier (binary) |
| 16 | 8 bytes | TotalSize | Total message size (uint64) |
| 24 | 4 bytes | Index | Chunk index (uint32) |

#### API

| Method | Return Type | Description |
|--------|-------------|-------------|
| `encode(uuid, message)` | `{ chunks: Bytes[]; totalSize: number }` | Encodes the message and automatically splits into chunks if it exceeds `SPLIT_MESSAGE_SIZE` |
| `decode<TMessage extends ServiceMessage>(bytes)` | `ServiceMessageDecodeResult<TMessage>` | Decodes binary chunks and automatically assembles split messages |
| `dispose()` | `void` | Releases the GC timer of the internal chunk accumulator. Must be called when the instance is no longer used |

#### ServiceMessageDecodeResult

`ServiceMessageDecodeResult<TMessage extends ServiceMessage>` is a union type with two states.

| `type` | Fields | Description |
|--------|--------|-------------|
| `"complete"` | `uuid: string`, `message: TMessage` | All chunks received and message assembly complete |
| `"progress"` | `uuid: string`, `totalSize: number`, `completedSize: number` | Split message in progress (only some chunks have arrived) |

#### Usage Example

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

### PROTOCOL_CONFIG

A constant object that controls protocol behavior.

```typescript
import { PROTOCOL_CONFIG } from "@simplysm/service-common";
```

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_TOTAL_SIZE` | 100MB (104,857,600 bytes) | Maximum size for a single message. `ArgumentError` thrown if exceeded |
| `SPLIT_MESSAGE_SIZE` | 3MB (3,145,728 bytes) | Chunking threshold. Messages larger than this are automatically split |
| `CHUNK_SIZE` | 300KB (307,200 bytes) | Body size of each chunk when split |
| `GC_INTERVAL` | 10s (10,000ms) | Garbage collection cycle for incomplete messages |
| `EXPIRE_TIME` | 60s (60,000ms) | Expiration time for incomplete messages. Removed from memory if exceeded |

### Message Types

Type definitions for messages exchanged between client and server. `ServiceMessage` is a union of all message types.

#### Classification by Message Direction

| Union Type | Direction | Included Messages |
|------------|-----------|-------------------|
| `ServiceClientMessage` | Client -> Server | Request, Auth, event-related messages |
| `ServiceServerMessage` | Server -> Client | Reload, Response, Error, Event |
| `ServiceServerRawMessage` | Server -> Client (raw) | Progress + `ServiceServerMessage` |
| `ServiceMessage` | Bidirectional (all) | Union of all message types |

#### Individual Message Types

##### System Messages

| Type | `name` | Direction | `body` Type | Description |
|------|--------|-----------|-------------|-------------|
| `ServiceReloadMessage` | `"reload"` | Server -> Client | `{ clientName: string \| undefined; changedFileSet: Set<string> }` | Client reload command |
| `ServiceProgressMessage` | `"progress"` | Server -> Client | `{ totalSize: number; completedSize: number }` | Split message reception progress |
| `ServiceErrorMessage` | `"error"` | Server -> Client | `{ name: string; message: string; code: string; stack?: string; detail?: unknown; cause?: unknown }` | Error notification |
| `ServiceAuthMessage` | `"auth"` | Client -> Server | `string` (token) | Authentication token transmission |

##### Service Method Call Messages

| Type | `name` | Direction | `body` Type | Description |
|------|--------|-----------|-------------|-------------|
| `ServiceRequestMessage` | `` `${string}.${string}` `` | Client -> Server | `unknown[]` (parameter array) | RPC method call request |
| `ServiceResponseMessage` | `"response"` | Server -> Client | `unknown \| undefined` (optional return value) | Method call response |

##### Event Messages

| Type | `name` | Direction | `body` Type | Description |
|------|--------|-----------|-------------|-------------|
| `ServiceAddEventListenerMessage` | `"evt:add"` | Client -> Server | `{ key: string; name: string; info: unknown }` | Event listener registration |
| `ServiceRemoveEventListenerMessage` | `"evt:remove"` | Client -> Server | `{ key: string }` | Event listener removal |
| `ServiceGetEventListenerInfosMessage` | `"evt:gets"` | Client -> Server | `{ name: string }` | Event listener info list query |
| `ServiceEmitEventMessage` | `"evt:emit"` | Client -> Server | `{ keys: string[]; data: unknown }` | Event emission |
| `ServiceEventMessage` | `"evt:on"` | Server -> Client | `{ keys: string[]; data: unknown }` | Event notification |

## defineEvent / ServiceEventDef

A function for defining type-safe service events. Events are used to publish real-time notifications from server to client.

### API

```typescript
function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string,
): ServiceEventDef<TInfo, TData>
```

### Type Parameters

| Parameter | Description |
|-----------|-------------|
| `TInfo` | Additional information type for listener filtering |
| `TData` | Data type passed when the event is emitted |

### ServiceEventDef Properties

| Property | Type | Description |
|----------|------|-------------|
| `eventName` | `string` | Unique event identifier |
| `$info` | `TInfo` (declare) | For TypeScript type extraction only. Not used at runtime |
| `$data` | `TData` (declare) | For TypeScript type extraction only. Not used at runtime |

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

## ServiceUploadResult

An interface representing file upload results.

```typescript
import { ServiceUploadResult } from "@simplysm/service-common";
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Storage path on the server |
| `filename` | `string` | Original filename |
| `size` | `number` | File size (bytes) |

## Service Interfaces

Service interface definitions that are implemented on the server side and called by the client via RPC.

### OrmService

Defines database connection, transaction management, and query execution capabilities. Supports MySQL, MSSQL, and PostgreSQL.

```typescript
import type { OrmService } from "@simplysm/service-common";
```

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `getInfo` | `opt: DbConnOptions & { configName: string }` | `Promise<{ dialect: Dialect; database?: string; schema?: string }>` | Query DB connection info |
| `connect` | `opt: Record<string, unknown>` | `Promise<number>` | Create DB connection, return connection ID |
| `close` | `connId: number` | `Promise<void>` | Close DB connection |
| `beginTransaction` | `connId: number, isolationLevel?: IsolationLevel` | `Promise<void>` | Begin transaction |
| `commitTransaction` | `connId: number` | `Promise<void>` | Commit transaction |
| `rollbackTransaction` | `connId: number` | `Promise<void>` | Rollback transaction |
| `executeParametrized` | `connId: number, query: string, params?: unknown[]` | `Promise<unknown[][]>` | Execute a parameterized query |
| `executeDefs` | `connId: number, defs: QueryDef[], options?: (ResultMeta \| undefined)[]` | `Promise<unknown[][]>` | Execute queries defined as `QueryDef` array |
| `bulkInsert` | `connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]` | `Promise<void>` | Bulk data insertion |

#### DbConnOptions

```typescript
import type { DbConnOptions } from "@simplysm/service-common";
```

| Field | Type | Description |
|-------|------|-------------|
| `configName?` | `string` | Config name to reference in server settings |
| `config?` | `Record<string, unknown>` | Directly passed connection config |

### AutoUpdateService

Defines a service for querying the latest version information of a client application.

```typescript
import type { AutoUpdateService } from "@simplysm/service-common";
```

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `getLastVersion` | `platform: string` | `Promise<{ version: string; downloadPath: string } \| undefined>` | Query latest version info for the specified platform. Returns `undefined` if none exists |

Pass values like `"win32"`, `"darwin"`, or `"linux"` to `platform`.

## Caveats

- `ServiceProtocol` instances are created via the `createServiceProtocol()` factory function and internally use `LazyGcMap` to manage incomplete split messages. After use, you must call `dispose()` to release the GC timer.
- Encoding or decoding messages exceeding `PROTOCOL_CONFIG.MAX_TOTAL_SIZE` (100MB) will throw an `ArgumentError`.
- Passing binary data less than 28 bytes to `decode()` will throw an `ArgumentError`.
- `ServiceResponseMessage.body` is optional (`body?: unknown`) — the server may return `undefined` for void methods.
- Service interfaces (`OrmService`, `AutoUpdateService`) only provide type definitions. Actual implementations are handled by the `@simplysm/service-server` package.
- The `$info` and `$data` properties of `ServiceEventDef` are declared with `declare` and do not exist at runtime; they are only used for TypeScript type extraction.

## License

Apache-2.0
