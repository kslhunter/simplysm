# @simplysm/sd-service-common

Shared types and protocol utilities for the Simplysm service layer. This package defines the WebSocket message protocol, service interfaces, and event system types used by both `@simplysm/sd-service-server` and `@simplysm/sd-service-client`.

## Installation

```bash
npm install @simplysm/sd-service-common
# or
yarn add @simplysm/sd-service-common
```

## API Reference

### Protocol

#### `SdServiceProtocol`

Binary protocol handler for encoding and decoding WebSocket messages with automatic chunking for large payloads.

```ts
import { SdServiceProtocol } from "@simplysm/sd-service-common";

const protocol = new SdServiceProtocol();
```

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `encode` | `(uuid: string, message: TSdServiceMessage) => { chunks: Buffer[]; totalSize: number }` | Encodes a message into binary chunks. Automatically splits messages larger than 3 MB into 300 KB chunks. Maximum total size is 100 MB. |
| `decode` | `<T extends TSdServiceMessage>(buffer: Buffer) => ISdServiceMessageDecodeResult<T>` | Decodes a binary buffer. Automatically reassembles split messages, returning `{ type: "progress" }` for partial data or `{ type: "complete", message }` when all chunks are received. |
| `dispose` | `() => void` | Clears the internal accumulator buffer, releasing memory for any in-progress message reassembly. |

#### `ISdServiceMessageDecodeResult<T>`

Result type returned by `SdServiceProtocol.decode()`.

```ts
type ISdServiceMessageDecodeResult<T extends TSdServiceMessage> =
  | { type: "complete"; uuid: string; message: T }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

### Message Types

#### `TSdServiceMessage`

Union of all possible message types exchanged over the WebSocket connection.

#### `TSdServiceClientMessage`

Messages sent from client to server:

| Type | `name` | Description |
|------|--------|-------------|
| `ISdServiceRequestMessage` | `` `${service}.${method}` `` | Invokes a service method with parameters. |
| `ISdServiceAuthMessage` | `"auth"` | Sends an authentication token. |
| `ISdServiceAddEventListenerMessage` | `"evt:add"` | Registers an event listener with a key (UUID), event name, and filter info. |
| `ISdServiceRemoveEventListenerMessage` | `"evt:remove"` | Removes an event listener by key. |
| `ISdServiceGetEventListenerInfosMessage` | `"evt:gets"` | Requests the list of listener infos for a given event name. |
| `ISdServiceEmitEventMessage` | `"evt:emit"` | Emits an event to specific listener keys with data. |

#### `TSdServiceServerMessage`

Messages sent from server to client:

| Type | `name` | Description |
|------|--------|-------------|
| `ISdServiceResponseMessage` | `"response"` | Response to a service method request. |
| `ISdServiceErrorMessage` | `"error"` | Error notification with name, message, code, and optional stack/detail. |
| `ISdServiceReloadMessage` | `"reload"` | Instructs the client to reload, optionally filtered by client name, with a set of changed files. |
| `ISdServiceEventMessage` | `"evt:on"` | Notifies the client of an event with listener keys and data. |

#### `TSdServiceServerRawMessage`

Extends `TSdServiceServerMessage` with `ISdServiceProgressMessage` for chunk upload progress tracking.

#### `SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE`

Maximum allowed message size constant: `100 * 1024 * 1024` (100 MB).

### Service Interfaces

Shared interfaces that define the contract between client and server service implementations.

#### `ISdOrmService`

ORM database service interface.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getInfo` | `(opt: TDbConnOptions & { configName: string }) => Promise<{ dialect; database?; schema? }>` | Retrieves connection info (dialect, database, schema). |
| `connect` | `(opt: Record<string, any>) => Promise<number>` | Opens a database connection and returns a connection ID. |
| `close` | `(connId: number) => Promise<void>` | Closes a database connection. |
| `beginTransaction` | `(connId: number, isolationLevel?: ISOLATION_LEVEL) => Promise<void>` | Begins a transaction with an optional isolation level. |
| `commitTransaction` | `(connId: number) => Promise<void>` | Commits the current transaction. |
| `rollbackTransaction` | `(connId: number) => Promise<void>` | Rolls back the current transaction. |
| `executeParametrized` | `(connId: number, query: string, params?: any[]) => Promise<any[][]>` | Executes a parameterized SQL query. |
| `executeDefs` | `(connId: number, defs: TQueryDef[], options?: (IQueryResultParseOption \| undefined)[]) => Promise<any[][]>` | Executes query definitions with optional parse options. |
| `bulkInsert` | `(connId: number, tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]) => Promise<void>` | Performs a bulk insert operation. |
| `bulkUpsert` | `(connId: number, tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]) => Promise<void>` | Performs a bulk upsert (insert or update) operation. |

#### `TDbConnOptions`

Database connection options type.

```ts
type TDbConnOptions = { configName?: string; config?: Record<string, any> } & Record<string, any>;
```

#### `ISdCryptoService`

Cryptography service interface.

| Method | Signature | Description |
|--------|-----------|-------------|
| `encrypt` | `(data: string \| Buffer) => Promise<string>` | Encrypts data and returns the encrypted string. |
| `encryptAes` | `(data: Buffer) => Promise<string>` | Encrypts data using AES and returns the encrypted string. |
| `decryptAes` | `(encText: string) => Promise<Buffer>` | Decrypts an AES-encrypted string and returns the buffer. |

#### `ICryptoConfig`

Configuration for the crypto service.

```ts
interface ICryptoConfig {
  key: string;
}
```

#### `ISdSmtpClientService`

SMTP email sending service interface.

| Method | Signature | Description |
|--------|-----------|-------------|
| `send` | `(options: ISmtpClientSendOption) => Promise<string>` | Sends an email with full SMTP configuration. |
| `sendByConfig` | `(configName: string, options: ISmtpClientSendByDefaultOption) => Promise<string>` | Sends an email using a named server configuration. |

#### `ISmtpClientSendOption`

Full SMTP send options.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `host` | `string` | Yes | SMTP server host. |
| `port` | `number` | No | SMTP server port. |
| `secure` | `boolean` | No | Whether to use TLS. |
| `user` | `string` | No | SMTP authentication username. |
| `pass` | `string` | No | SMTP authentication password. |
| `from` | `string` | Yes | Sender email address. |
| `to` | `string` | Yes | Recipient email address. |
| `cc` | `string` | No | CC recipients. |
| `bcc` | `string` | No | BCC recipients. |
| `subject` | `string` | Yes | Email subject. |
| `html` | `string` | Yes | Email body in HTML. |
| `attachments` | `ISmtpClientSendAttachment[]` | No | File attachments. |

#### `ISmtpClientSendByDefaultOption`

Simplified send options for use with a named configuration.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `to` | `string` | Yes | Recipient email address. |
| `cc` | `string` | No | CC recipients. |
| `bcc` | `string` | No | BCC recipients. |
| `subject` | `string` | Yes | Email subject. |
| `html` | `string` | Yes | Email body in HTML. |
| `attachments` | `ISmtpClientSendAttachment[]` | No | File attachments. |

#### `ISmtpClientSendAttachment`

Email attachment definition.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `filename` | `string` | Yes | Attachment filename. |
| `content` | `Buffer` | No | Attachment content as a buffer. |
| `path` | `any` | No | File path for the attachment. |
| `contentType` | `string` | No | MIME content type. |

#### `ISmtpClientDefaultConfig`

Default SMTP server configuration.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `senderName` | `string` | Yes | Display name of the sender. |
| `senderEmail` | `string` | No | Sender email address. |
| `user` | `string` | No | SMTP authentication username. |
| `pass` | `string` | No | SMTP authentication password. |
| `host` | `string` | Yes | SMTP server host. |
| `port` | `number` | No | SMTP server port. |
| `secure` | `boolean` | No | Whether to use TLS. |

#### `ISdAutoUpdateService`

Auto-update service interface for mobile/desktop clients.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getLastVersion` | `(platform: string) => { version: string; downloadPath: string } \| undefined` | Returns the latest version info and download path for the given platform, or `undefined` if no update is available. |

### Event System

#### `SdServiceEventListenerBase<I, O>`

Base class for defining typed event listeners. Use as a type marker for event listener registration.

```ts
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";

class MyEvent extends SdServiceEventListenerBase<{ userId: number }, { message: string }> {}
```

| Property | Type | Description |
|----------|------|-------------|
| `info` | `I` | Listener filter information used to match events to specific listeners. |
| `data` | `O` | Event payload data type. |

### Upload Types

#### `ISdServiceUploadResult`

Result returned after a file upload operation.

| Property | Type | Description |
|----------|------|-------------|
| `path` | `string` | Server path where the file was stored. |
| `filename` | `string` | Original filename. |
| `size` | `number` | File size in bytes. |
