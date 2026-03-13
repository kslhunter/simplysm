# Protocol

Binary message protocol with automatic worker thread offloading for large payloads.

## SdServiceProtocolWrapper

Wraps `SdServiceProtocol` (from `@simplysm/sd-service-common`) with automatic routing between main thread and worker thread based on message size.

```typescript
class SdServiceProtocolWrapper
```

### Behavior

Messages smaller than 30KB are processed on the main thread for low latency. Messages larger than 30KB (or containing `Buffer` data) are offloaded to a shared worker thread with up to 4GB memory.

### Methods

#### `encodeAsync(uuid: string, message: TSdServiceMessage): Promise<{ chunks: Buffer[]; totalSize: number }>`

Encodes a message into binary chunks. Automatically routes to the worker thread when:
- The message body is a `Buffer`.
- The message body is an array containing `Buffer` elements.

#### `decodeAsync(buffer: Buffer): Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>>`

Decodes a binary buffer into a message. Routes to the worker thread when the buffer exceeds 30KB.

Decode results:
- `{ type: "complete", uuid, message }` - Fully decoded message.
- `{ type: "progress", uuid, totalSize, completedSize }` - Partial message (chunked transfer in progress).

#### `dispose(): void`

Cleans up the main-thread protocol instance. The shared worker is a static singleton and not disposed per-instance.

---

## ISdServiceProtocolWorker

Type definition for the worker thread interface.

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

The worker is created from `service-protocol.worker.ts` using `SdWorker` from `@simplysm/sd-core-node` with resource limits of 4096MB for the old generation heap.
