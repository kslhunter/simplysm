# @simplysm/sd-service-common

Shared protocol definitions, message types, and service contracts for the Simplysm service layer. Used by both `@simplysm/sd-service-client` and `@simplysm/sd-service-server`.

## Installation

```bash
yarn add @simplysm/sd-service-common
```

## Main Modules

### Protocol

#### SdServiceProtocol

Binary message protocol with automatic chunking/reassembly for large payloads (>3MB). Uses a 28-byte header (16-byte UUID + 8-byte total size + 4-byte index). This is a **stateful instance** — each side of a connection should maintain its own instance.

```typescript
import { SdServiceProtocol } from "@simplysm/sd-service-common";

const protocol = new SdServiceProtocol();
```

##### `encode(uuid: string, message: TSdServiceMessage): { chunks: Buffer[]; totalSize: number }`

Encodes a message into one or more binary chunks. Automatically splits messages larger than 3MB into 300KB chunks. Throws if the message exceeds 100MB.

```typescript
const { chunks, totalSize } = protocol.encode(uuid, message);
for (const chunk of chunks) {
  socket.send(chunk);
}
```

##### `decode<T extends TSdServiceMessage>(buffer: Buffer): ISdServiceMessageDecodeResult<T>`

Decodes a binary buffer received from a socket. Returns `{ type: "progress" }` for partial messages (chunked transfer still in progress) or `{ type: "complete", uuid, message }` when the full message has been reassembled.

```typescript
const result = protocol.decode(buffer);
if (result.type === "complete") {
  handleMessage(result.uuid, result.message);
} else {
  console.log(`Progress: ${result.completedSize} / ${result.totalSize}`);
}
```

##### `dispose(): void`

Clears the internal accumulator buffers. Call when the connection is closed to free memory.

```typescript
protocol.dispose();
```

#### ISdServiceMessageDecodeResult\<T\>

Return type of `SdServiceProtocol.decode()`.

```typescript
import { ISdServiceMessageDecodeResult } from "@simplysm/sd-service-common";
```

```typescript
type ISdServiceMessageDecodeResult<T extends TSdServiceMessage> =
  | { type: "complete"; uuid: string; message: T }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

#### SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE

Maximum allowed message size constant (100MB).

```typescript
import { SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE } from "@simplysm/sd-service-common";
// 100 * 1024 * 1024 = 104857600
```

---

### Protocol Message Types

All message types used in client-server communication.

```typescript
import {
  TSdServiceMessage,
  TSdServiceClientMessage,
  TSdServiceServerMessage,
  TSdServiceServerRawMessage,
} from "@simplysm/sd-service-common";
```

#### Union Types

| Type                         | Description                             |
| ---------------------------- | --------------------------------------- |
| `TSdServiceMessage`          | All possible messages (client + server) |
| `TSdServiceClientMessage`    | Messages sent by the client             |
| `TSdServiceServerMessage`    | Messages sent by the server             |
| `TSdServiceServerRawMessage` | Server messages including progress      |

#### System Messages

##### ISdServiceReloadMessage

Server → Client. Hot reload notification.

```typescript
interface ISdServiceReloadMessage {
  name: "reload";
  body: {
    clientName: string | undefined;
    changedFileSet: Set<string>;
  };
}
```

##### ISdServiceProgressMessage

Server → Client. Reports progress of receiving a chunked message from the client.

```typescript
interface ISdServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number; // total bytes
    completedSize: number; // bytes received so far
  };
}
```

##### ISdServiceErrorMessage

Server → Client. Error response.

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

##### ISdServiceAuthMessage

Client → Server. Authentication token delivery.

```typescript
interface ISdServiceAuthMessage {
  name: "auth";
  body: string; // token
}
```

#### Service Method Messages

##### ISdServiceRequestMessage

Client → Server. Remote procedure call.

```typescript
interface ISdServiceRequestMessage {
  name: `${string}.${string}`; // "${service}.${method}"
  body: any[]; // params array
}
```

##### ISdServiceResponseMessage

Server → Client. RPC response.

```typescript
interface ISdServiceResponseMessage {
  name: "response";
  body?: any; // result
}
```

#### Event Messages

##### ISdServiceAddEventListenerMessage

Client → Server. Register an event listener.

```typescript
interface ISdServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string; // listener UUID (used to remove later)
    name: string; // event name (EventType.name)
    info: any; // extra info for server-side listener filtering
  };
}
```

##### ISdServiceRemoveEventListenerMessage

Client → Server. Remove a previously registered event listener.

```typescript
interface ISdServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string; // listener UUID
  };
}
```

##### ISdServiceGetEventListenerInfosMessage

Client → Server. Query registered listener infos for an event name.

```typescript
interface ISdServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string; // event name
  };
}
```

##### ISdServiceEmitEventMessage

Client → Server. Emit an event to specific listeners.

```typescript
interface ISdServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[]; // listener UUID list
    data: any; // event data
  };
}
```

##### ISdServiceEventMessage

Server → Client. Delivers emitted event data to registered listeners.

```typescript
interface ISdServiceEventMessage {
  name: "evt:on";
  body: {
    keys: string[]; // listener UUID list
    data: any; // event data
  };
}
```

---

### Service Contracts

#### ISdAutoUpdateService

Auto-update service contract.

```typescript
import { ISdAutoUpdateService } from "@simplysm/sd-service-common";
```

```typescript
interface ISdAutoUpdateService {
  getLastVersion(platform: string): { version: string; downloadPath: string } | undefined;
}
```

#### ISdCryptoService

Encryption service contract.

```typescript
import { ISdCryptoService, ICryptoConfig } from "@simplysm/sd-service-common";
```

```typescript
interface ISdCryptoService {
  encrypt(data: string | Buffer): Promise<string>;
  encryptAes(data: Buffer): Promise<string>;
  decryptAes(encText: string): Promise<Buffer>;
}

interface ICryptoConfig {
  key: string;
}
```

#### ISdOrmService

ORM service contract for remote database operations. Parameter types come from `@simplysm/sd-orm-common`.

```typescript
import { ISdOrmService, TDbConnOptions } from "@simplysm/sd-service-common";
```

| Method                | Signature                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `getInfo`             | `(opt: TDbConnOptions & { configName: string }) => Promise<{ dialect, database?, schema? }>`                          |
| `connect`             | `(opt: Record<string, any>) => Promise<number>`                                                                       |
| `close`               | `(connId: number) => Promise<void>`                                                                                   |
| `beginTransaction`    | `(connId: number, isolationLevel?: ISOLATION_LEVEL) => Promise<void>`                                                 |
| `commitTransaction`   | `(connId: number) => Promise<void>`                                                                                   |
| `rollbackTransaction` | `(connId: number) => Promise<void>`                                                                                   |
| `executeParametrized` | `(connId: number, query: string, params?: any[]) => Promise<any[][]>`                                                 |
| `executeDefs`         | `(connId: number, defs: TQueryDef[], options?: (IQueryResultParseOption \| undefined)[]) => Promise<any[][]>`         |
| `bulkInsert`          | `(connId: number, tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]) => Promise<void>` |
| `bulkUpsert`          | `(connId: number, tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]) => Promise<void>` |

```typescript
type TDbConnOptions = { configName?: string; config?: Record<string, any> } & Record<string, any>;
```

#### ISdSmtpClientService

SMTP email service contract.

```typescript
import {
  ISdSmtpClientService,
  ISmtpClientSendOption,
  ISmtpClientSendByDefaultOption,
  ISmtpClientSendAttachment,
  ISmtpClientDefaultConfig,
} from "@simplysm/sd-service-common";
```

```typescript
interface ISdSmtpClientService {
  send(options: ISmtpClientSendOption): Promise<string>;
  sendByConfig(configName: string, options: ISmtpClientSendByDefaultOption): Promise<string>;
}
```

##### ISmtpClientSendOption

| Property      | Type                          | Required | Description       |
| ------------- | ----------------------------- | -------- | ----------------- |
| `host`        | `string`                      | Yes      | SMTP server host  |
| `port`        | `number`                      | No       | SMTP server port  |
| `secure`      | `boolean`                     | No       | Use TLS           |
| `user`        | `string`                      | No       | Auth username     |
| `pass`        | `string`                      | No       | Auth password     |
| `from`        | `string`                      | Yes      | Sender address    |
| `to`          | `string`                      | Yes      | Recipient address |
| `cc`          | `string`                      | No       | CC address        |
| `bcc`         | `string`                      | No       | BCC address       |
| `subject`     | `string`                      | Yes      | Email subject     |
| `html`        | `string`                      | Yes      | Email body (HTML) |
| `attachments` | `ISmtpClientSendAttachment[]` | No       | Attachments       |

##### ISmtpClientSendByDefaultOption

Used with `sendByConfig`. Omits SMTP connection properties (host, port, secure, user, pass, from) — those come from the named server config.

| Property      | Type                          | Required | Description       |
| ------------- | ----------------------------- | -------- | ----------------- |
| `to`          | `string`                      | Yes      | Recipient address |
| `cc`          | `string`                      | No       | CC address        |
| `bcc`         | `string`                      | No       | BCC address       |
| `subject`     | `string`                      | Yes      | Email subject     |
| `html`        | `string`                      | Yes      | Email body (HTML) |
| `attachments` | `ISmtpClientSendAttachment[]` | No       | Attachments       |

##### ISmtpClientSendAttachment

```typescript
interface ISmtpClientSendAttachment {
  filename: string;
  content?: Buffer;
  path?: any;
  contentType?: string;
}
```

##### ISmtpClientDefaultConfig

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

---

## Types

### SdServiceEventListenerBase\<I, O\>

Base class for typed event listeners. `I` is the info type used for server-side filtering, `O` is the event data type.

```typescript
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";
```

```typescript
class SdServiceEventListenerBase<I, O> {
  info!: I;
  data!: O;
}
```

### ISdServiceUploadResult

Result of a file upload operation.

```typescript
import { ISdServiceUploadResult } from "@simplysm/sd-service-common";
```

```typescript
interface ISdServiceUploadResult {
  path: string;
  filename: string;
  size: number;
}
```
