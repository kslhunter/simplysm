# Protocol

## ISdServiceProtocolWorker

Type definition for the server-side protocol worker thread interface. Used with `SdWorker` from `@simplysm/sd-core-node`.

```typescript
interface ISdServiceProtocolWorker {
  methods: {
    encode: {
      params: [string, TSdServiceMessage];
      returnType: { chunks: Buffer[]; totalSize: number };
    };
    decode: {
      params: [Buffer];
      returnType: ISdServiceMessageDecodeResult<TSdServiceMessage>;
    };
  };
  events: {};
}
```

### Method Signatures

| Method | Parameters | Return Type |
|--------|-----------|-------------|
| `encode` | `[uuid: string, message: TSdServiceMessage]` | `{ chunks: Buffer[]; totalSize: number }` |
| `decode` | `[buffer: Buffer]` | `ISdServiceMessageDecodeResult<TSdServiceMessage>` |

---

## SdServiceProtocolWrapper

Server-side encoder/decoder that transparently offloads heavy payloads to a Node.js worker thread via `SdWorker`. Small messages (under 30KB) are processed on the main thread; larger messages are delegated to a worker with 4GB heap limit.

### Constructor

```typescript
constructor()
```

No parameters. Internally creates a `SdServiceProtocol` instance for main-thread processing and lazily initializes a shared static worker thread.

### Methods

#### `encodeAsync(uuid, message)`

```typescript
async encodeAsync(
  uuid: string,
  message: TSdServiceMessage,
): Promise<{ chunks: Buffer[]; totalSize: number }>
```

Encodes a message into binary chunks. Delegates to the worker thread when the message body contains Buffers or large arrays.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uuid` | `string` | Unique request identifier |
| `message` | `TSdServiceMessage` | The message to encode |

**Returns:** `Promise<{ chunks: Buffer[]; totalSize: number }>` -- encoded chunks and total byte size.

#### `decodeAsync(buffer)`

```typescript
async decodeAsync(buffer: Buffer): Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>>
```

Decodes a binary buffer into a message. Delegates to the worker thread for buffers larger than 30KB.

| Parameter | Type | Description |
|-----------|------|-------------|
| `buffer` | `Buffer` | Raw binary data received from the WebSocket |

**Returns:** `Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>>` -- decoded result.

#### `dispose()`

```typescript
dispose(): void
```

Disposes the underlying `SdServiceProtocol` instance and clears accumulated state.

### Internal Details

- **Size threshold:** 30KB (`_SIZE_THRESHOLD = 30 * 1024`)
- **Worker memory:** 4GB max old generation size (`maxOldGenerationSizeMb: 4096`)
- **Worker lifecycle:** Static lazy singleton, shared across all `SdServiceProtocolWrapper` instances
- **Heuristic for encode:** Uses worker when message body contains `Buffer` instances or arrays with Buffer elements
