# Protocol

## SdServiceClientProtocolWrapper

Encodes and decodes binary protocol messages (`TSdServiceMessage`) with automatic Web Worker offloading. Small messages are processed on the main thread; large messages (above 30KB) are delegated to a Web Worker to avoid blocking the UI.

### Constructor

```typescript
constructor()
```

No parameters. Internally creates a `SdServiceProtocol` instance for main-thread processing and lazily initializes a shared Web Worker for heavy payloads.

### Methods

#### `encodeAsync(uuid, message)`

```typescript
async encodeAsync(
  uuid: string,
  message: TSdServiceMessage,
): Promise<{ chunks: Buffer[]; totalSize: number }>
```

Encodes a message into binary chunks. Automatically delegates to a Web Worker when the message body is large (contains Buffers, long strings, or large arrays).

| Parameter | Type | Description |
|-----------|------|-------------|
| `uuid` | `string` | Unique request identifier |
| `message` | `TSdServiceMessage` | The message to encode |

**Returns:** `Promise<{ chunks: Buffer[]; totalSize: number }>` -- encoded chunks and total byte size.

#### `decodeAsync(buffer)`

```typescript
async decodeAsync(buffer: Buffer): Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>>
```

Decodes a binary buffer into a message. Uses Web Worker for buffers larger than 30KB with zero-copy `Transferable` handoff. Automatically restores class instances (e.g., `DateTime`) from plain objects via `TransferableConvert.decode`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `buffer` | `Buffer` | Raw binary data received from the WebSocket |

**Returns:** `Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>>` -- decoded result containing the message or progress information.

### Internal Details

- **Size threshold:** 30KB (`_SIZE_THRESHOLD = 30 * 1024`)
- **Worker lifecycle:** Static singleton, lazily initialized on first use
- **Worker timeout:** Requests that remain unresolved for 60 seconds are automatically rejected and cleaned up via `LazyGcMap`
- **GC interval:** Stale worker requests are checked every 5 seconds
