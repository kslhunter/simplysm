# Protocol

Client-side protocol wrapper that optionally offloads encoding/decoding to a Web Worker for large payloads.

## `ClientProtocolWrapper`

**Interface** -- encodes outgoing messages into binary chunks and decodes incoming binary data.

```typescript
interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
}
```

### Methods

#### `encode(uuid, message)`

Encodes a service message into one or more binary chunks for transmission.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uuid` | `string` | Request identifier |
| `message` | `ServiceMessage` | The message to encode |

**Returns:** `{ chunks: Bytes[]; totalSize: number }`

#### `decode(bytes)`

Decodes a binary chunk received from the server.

| Parameter | Type | Description |
|-----------|------|-------------|
| `bytes` | `Bytes` | Raw binary data |

**Returns:** `ServiceMessageDecodeResult<ServiceMessage>`

---

## `createClientProtocolWrapper()`

**Factory function** -- creates a `ClientProtocolWrapper` that delegates to a Web Worker for large payloads.

```typescript
function createClientProtocolWrapper(
  protocol: ServiceProtocol,
): ClientProtocolWrapper
```

### Worker Offloading Strategy

The wrapper applies a **30 KB threshold** to decide whether to process on the main thread or offload to a dedicated Web Worker:

**Encode** (main thread when any of these are false):
- Message body is a `Uint8Array`
- Message body is a string longer than 30 KB
- Message body is an array with more than 100 elements, or contains `Uint8Array` items

**Decode** (main thread when):
- Payload size is 30 KB or less

When a Web Worker is unavailable (e.g., in environments without `Worker` support), all processing falls back to the main thread.

### Worker Lifecycle

- A single shared `Worker` instance is created lazily on first use (singleton pattern).
- Worker tasks are tracked with a `LazyGcMap` that auto-expires entries after 60 seconds, preventing memory leaks from orphaned requests.
- For decode operations, binary data is transferred via zero-copy (`Transferable`) to avoid cloning overhead.
