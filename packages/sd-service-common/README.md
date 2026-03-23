# @simplysm/sd-service-common

Shared types and protocol utilities for the Simplysm service layer. This package defines the WebSocket message protocol, service interfaces, and event system types used by both `@simplysm/sd-service-server` and `@simplysm/sd-service-client`.

## Installation

```bash
npm install @simplysm/sd-service-common
```

## API Overview

### Protocol

| API | Type | Description |
|-----|------|-------------|
| `SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE` | Constant | Maximum message size (100MB) |
| `TSdServiceMessage` | Type | Union of all message types |
| `TSdServiceServerMessage` | Type | Union of server-to-client message types |
| `TSdServiceServerRawMessage` | Type | Server messages including progress |
| `TSdServiceClientMessage` | Type | Union of client-to-server message types |
| `ISdServiceReloadMessage` | Interface | Server reload command |
| `ISdServiceProgressMessage` | Interface | Message transfer progress notification |
| `ISdServiceErrorMessage` | Interface | Server error notification |
| `ISdServiceAuthMessage` | Interface | Client authentication message |
| `ISdServiceRequestMessage` | Interface | Client service method request |
| `ISdServiceResponseMessage` | Interface | Server method response |
| `ISdServiceAddEventListenerMessage` | Interface | Client event listener registration |
| `ISdServiceRemoveEventListenerMessage` | Interface | Client event listener removal |
| `ISdServiceGetEventListenerInfosMessage` | Interface | Client event listener info request |
| `ISdServiceEmitEventMessage` | Interface | Client event emission |
| `ISdServiceEventMessage` | Interface | Server event notification |
| `SdServiceProtocol` | Class | Message encoding/decoding with auto-splitting |
| `ISdServiceMessageDecodeResult` | Type | Decode result (complete or progress) |

### Service Types

| API | Type | Description |
|-----|------|-------------|
| `ISdAutoUpdateService` | Interface | Auto-update service contract |
| `ISdCryptoService` | Interface | Encryption/decryption service contract |
| `ICryptoConfig` | Interface | Crypto service configuration |
| `ISdOrmService` | Interface | ORM service contract for remote DB access |
| `TDbConnOptions` | Type | Database connection options |
| `ISdSmtpClientService` | Interface | SMTP email sending service contract |
| `ISmtpClientSendAttachment` | Interface | Email attachment definition |
| `ISmtpClientSendByDefaultOption` | Interface | Email options using server-side config |
| `ISmtpClientSendOption` | Interface | Full email send options |
| `ISmtpClientDefaultConfig` | Interface | Default SMTP server configuration |

### Types

| API | Type | Description |
|-----|------|-------------|
| `SdServiceEventListenerBase` | Class | Base class for typed event listeners |
| `ISdServiceUploadResult` | Interface | File upload result |

## API Reference

### `SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE`

Maximum allowed message size in bytes.

```typescript
const SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
```

### `TSdServiceMessage`

Union of all possible service messages (both client and server).

```typescript
type TSdServiceMessage =
  | ISdServiceReloadMessage
  | ISdServiceRequestMessage
  | ISdServiceAuthMessage
  | ISdServiceProgressMessage
  | ISdServiceResponseMessage
  | ISdServiceErrorMessage
  | ISdServiceAddEventListenerMessage
  | ISdServiceRemoveEventListenerMessage
  | ISdServiceGetEventListenerInfosMessage
  | ISdServiceEmitEventMessage
  | ISdServiceEventMessage;
```

### `TSdServiceServerMessage`

Union of messages sent from server to client.

```typescript
type TSdServiceServerMessage =
  | ISdServiceReloadMessage
  | ISdServiceResponseMessage
  | ISdServiceErrorMessage
  | ISdServiceEventMessage;
```

### `TSdServiceServerRawMessage`

Server messages including internal progress notifications.

```typescript
type TSdServiceServerRawMessage = ISdServiceProgressMessage | TSdServiceServerMessage;
```

### `TSdServiceClientMessage`

Union of messages sent from client to server.

```typescript
type TSdServiceClientMessage =
  | ISdServiceRequestMessage
  | ISdServiceAuthMessage
  | ISdServiceAddEventListenerMessage
  | ISdServiceRemoveEventListenerMessage
  | ISdServiceGetEventListenerInfosMessage
  | ISdServiceEmitEventMessage;
```

### `ISdServiceReloadMessage`

Server command telling clients to reload.

```typescript
interface ISdServiceReloadMessage {
  name: "reload";
  body: {
    clientName: string | undefined;
    changedFileSet: Set<string>;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `body.clientName` | `string \| undefined` | Target client name (undefined for all) |
| `body.changedFileSet` | `Set<string>` | Set of changed file paths |

### `ISdServiceProgressMessage`

Server notification about message transfer progress for split messages.

```typescript
interface ISdServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number;
    completedSize: number;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `body.totalSize` | `number` | Total message size in bytes |
| `body.completedSize` | `number` | Completed transfer size in bytes |

### `ISdServiceErrorMessage`

Server error notification.

```typescript
interface ISdServiceErrorMessage {
  name: "error";
  body: {
    name: string;
    message: string;
    code: string;
    stack?: string;
    detail?: any;
    cause?: any;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `body.name` | `string` | Error name |
| `body.message` | `string` | Error message |
| `body.code` | `string` | Error code |
| `body.stack` | `string` | Stack trace (optional) |
| `body.detail` | `any` | Additional detail (optional) |
| `body.cause` | `any` | Error cause (optional) |

### `ISdServiceAuthMessage`

Client authentication message.

```typescript
interface ISdServiceAuthMessage {
  name: "auth";
  body: string; // token
}
```

### `ISdServiceRequestMessage`

Client request to invoke a service method.

```typescript
interface ISdServiceRequestMessage {
  name: `${string}.${string}`; // ${service}.${method}
  body: any[]; // params
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `` `${service}.${method}` `` | Service and method name separated by dot |
| `body` | `any[]` | Method parameters array |

### `ISdServiceResponseMessage`

Server response to a service method request.

```typescript
interface ISdServiceResponseMessage {
  name: "response";
  body?: any; // result
}
```

### `ISdServiceAddEventListenerMessage`

Client request to register an event listener.

```typescript
interface ISdServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string;
    name: string;
    info: any;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `body.key` | `string` | Unique listener key (UUID) for later removal |
| `body.name` | `string` | Event name (Type.name) |
| `body.info` | `any` | Additional listener info for filtering |

### `ISdServiceRemoveEventListenerMessage`

Client request to remove an event listener.

```typescript
interface ISdServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `body.key` | `string` | Listener key to remove |

### `ISdServiceGetEventListenerInfosMessage`

Client request to retrieve event listener info list.

```typescript
interface ISdServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `body.name` | `string` | Event name to query listeners for |

### `ISdServiceEmitEventMessage`

Client request to emit an event to specific listeners.

```typescript
interface ISdServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[];
    data: any;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `body.keys` | `string[]` | Target listener keys |
| `body.data` | `any` | Event data |

### `ISdServiceEventMessage`

Server notification of an event to clients.

```typescript
interface ISdServiceEventMessage {
  name: "evt:on";
  body: {
    keys: string[];
    data: any;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `body.keys` | `string[]` | Listener keys being notified |
| `body.data` | `any` | Event data |

### `SdServiceProtocol`

Handles encoding and decoding of service messages over WebSocket. Automatically splits large messages into chunks (3MB per split, 300KB per chunk) and reassembles them on decode.

```typescript
class SdServiceProtocol {
  encode(uuid: string, message: TSdServiceMessage): {
    chunks: Buffer[];
    totalSize: number;
  };

  decode<T extends TSdServiceMessage>(buffer: Buffer): ISdServiceMessageDecodeResult<T>;

  dispose(): void;
}
```

| Method | Description |
|--------|-------------|
| `encode(uuid, message)` | Encodes a message into one or more binary chunks with a 28-byte header (UUID + totalSize + index) |
| `decode(buffer)` | Decodes a binary chunk; returns `"complete"` with the full message or `"progress"` if more chunks are needed |
| `dispose()` | Clears the internal accumulator, releasing memory |

### `ISdServiceMessageDecodeResult`

Decode result type -- either a complete message or a progress indicator.

```typescript
type ISdServiceMessageDecodeResult<T extends TSdServiceMessage> =
  | { type: "complete"; uuid: string; message: T }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

### `ISdAutoUpdateService`

Service interface for application auto-update.

```typescript
interface ISdAutoUpdateService {
  getLastVersion(platform: string): {
    version: string;
    downloadPath: string;
  } | undefined;
}
```

| Method | Description |
|--------|-------------|
| `getLastVersion(platform)` | Returns the latest version and download path for the given platform, or `undefined` if none |

### `ISdCryptoService`

Service interface for encryption/decryption operations.

```typescript
interface ISdCryptoService {
  encrypt(data: string | Buffer): Promise<string>;
  encryptAes(data: Buffer): Promise<string>;
  decryptAes(encText: string): Promise<Buffer>;
}
```

| Method | Description |
|--------|-------------|
| `encrypt(data)` | Encrypts a string or Buffer and returns the encrypted string |
| `encryptAes(data)` | Encrypts a Buffer using AES |
| `decryptAes(encText)` | Decrypts an AES-encrypted string back to a Buffer |

### `ICryptoConfig`

Configuration for the crypto service.

```typescript
interface ICryptoConfig {
  key: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Encryption key |

### `ISdOrmService`

Service interface for remote database operations via WebSocket.

```typescript
interface ISdOrmService {
  getInfo(opt: TDbConnOptions & { configName: string }): Promise<{
    dialect: TDbContextOption["dialect"];
    database?: string;
    schema?: string;
  }>;
  connect(opt: Record<string, any>): Promise<number>;
  close(connId: number): Promise<void>;
  beginTransaction(connId: number, isolationLevel?: ISOLATION_LEVEL): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;
  executeParametrized(connId: number, query: string, params?: any[]): Promise<any[][]>;
  executeDefs(
    connId: number,
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]>;
  bulkInsert(
    connId: number,
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
  bulkUpsert(
    connId: number,
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `getInfo(opt)` | Returns dialect, database, and schema info for a connection config |
| `connect(opt)` | Opens a connection and returns a connection ID |
| `close(connId)` | Closes a connection by ID |
| `beginTransaction(connId, isolationLevel?)` | Begins a transaction |
| `commitTransaction(connId)` | Commits a transaction |
| `rollbackTransaction(connId)` | Rolls back a transaction |
| `executeParametrized(connId, query, params?)` | Executes a parameterized query |
| `executeDefs(connId, defs, options?)` | Executes query definitions with parse options |
| `bulkInsert(connId, tableName, columnDefs, records)` | Bulk inserts records |
| `bulkUpsert(connId, tableName, columnDefs, records)` | Bulk upserts records |

### `TDbConnOptions`

Database connection options type.

```typescript
type TDbConnOptions = { configName?: string; config?: Record<string, any> } & Record<string, any>;
```

### `ISdSmtpClientService`

Service interface for sending emails via SMTP.

```typescript
interface ISdSmtpClientService {
  send(options: ISmtpClientSendOption): Promise<string>;
  sendByConfig(configName: string, options: ISmtpClientSendByDefaultOption): Promise<string>;
}
```

| Method | Description |
|--------|-------------|
| `send(options)` | Sends an email with full SMTP configuration |
| `sendByConfig(configName, options)` | Sends an email using a named server-side SMTP config |

### `ISmtpClientSendAttachment`

Email attachment definition.

```typescript
interface ISmtpClientSendAttachment {
  filename: string;
  content?: Buffer;
  path?: any;
  contentType?: string;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | `string` | Yes | Attachment filename |
| `content` | `Buffer` | No | Attachment content as Buffer |
| `path` | `any` | No | File path for the attachment |
| `contentType` | `string` | No | MIME content type |

### `ISmtpClientSendByDefaultOption`

Email options when using server-side default SMTP configuration.

```typescript
interface ISmtpClientSendByDefaultOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: ISmtpClientSendAttachment[];
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | `string` | Yes | Recipient email address |
| `cc` | `string` | No | CC email address |
| `bcc` | `string` | No | BCC email address |
| `subject` | `string` | Yes | Email subject |
| `html` | `string` | Yes | Email body as HTML |
| `attachments` | `ISmtpClientSendAttachment[]` | No | File attachments |

### `ISmtpClientSendOption`

Full email send options including SMTP server configuration.

```typescript
interface ISmtpClientSendOption {
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
  attachments?: ISmtpClientSendAttachment[];
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `host` | `string` | Yes | SMTP server hostname |
| `port` | `number` | No | SMTP server port |
| `secure` | `boolean` | No | Whether to use TLS |
| `user` | `string` | No | SMTP username |
| `pass` | `string` | No | SMTP password |
| `from` | `string` | Yes | Sender email address |
| `to` | `string` | Yes | Recipient email address |
| `cc` | `string` | No | CC email address |
| `bcc` | `string` | No | BCC email address |
| `subject` | `string` | Yes | Email subject |
| `html` | `string` | Yes | Email body as HTML |
| `attachments` | `ISmtpClientSendAttachment[]` | No | File attachments |

### `ISmtpClientDefaultConfig`

Default SMTP server configuration stored server-side.

```typescript
interface ISmtpClientDefaultConfig {
  senderName: string;
  senderEmail?: string;
  user?: string;
  pass?: string;
  host: string;
  port?: number;
  secure?: boolean;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `senderName` | `string` | Yes | Display name of the sender |
| `senderEmail` | `string` | No | Sender email address |
| `user` | `string` | No | SMTP username |
| `pass` | `string` | No | SMTP password |
| `host` | `string` | Yes | SMTP server hostname |
| `port` | `number` | No | SMTP server port |
| `secure` | `boolean` | No | Whether to use TLS |

### `SdServiceEventListenerBase`

Base class for typed event listeners. Provides type parameters for listener info and event data.

```typescript
class SdServiceEventListenerBase<I, O> {
  info!: I;
  data!: O;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `info` | `I` | Listener filter info type |
| `data` | `O` | Event data type |

### `ISdServiceUploadResult`

Result returned after a file upload.

```typescript
interface ISdServiceUploadResult {
  path: string;
  filename: string;
  size: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Server-side path of the uploaded file |
| `filename` | `string` | Original filename |
| `size` | `number` | File size in bytes |

## Usage Examples

### Using the protocol for message encoding/decoding

```typescript
import { SdServiceProtocol } from "@simplysm/sd-service-common";
import { Uuid } from "@simplysm/sd-core-common";

const protocol = new SdServiceProtocol();

// Encode a request message
const { chunks, totalSize } = protocol.encode(Uuid.new().toString(), {
  name: "MyService.getData",
  body: [1, "filter"],
});

// Send chunks over WebSocket...

// Decode received buffer
const result = protocol.decode(receivedBuffer);
if (result.type === "complete") {
  console.log(result.message.name); // "MyService.getData"
} else {
  console.log(`Progress: ${result.completedSize}/${result.totalSize}`);
}

// Clean up
protocol.dispose();
```

### Implementing a service interface

```typescript
import type { ISdCryptoService, ICryptoConfig } from "@simplysm/sd-service-common";

class CryptoService implements ISdCryptoService {
  async encrypt(data: string | Buffer): Promise<string> {
    // encryption implementation
  }

  async encryptAes(data: Buffer): Promise<string> {
    // AES encryption implementation
  }

  async decryptAes(encText: string): Promise<Buffer> {
    // AES decryption implementation
  }
}
```

### Defining a typed event listener

```typescript
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";

class OrderUpdatedEvent extends SdServiceEventListenerBase<
  { orderId: number },  // filter info
  { status: string }    // event data
> {}
```
