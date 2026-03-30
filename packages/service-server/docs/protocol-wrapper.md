# Protocol Wrapper

## `ServerProtocolWrapper`

Server-side protocol wrapper that automatically offloads heavy message encoding/decoding to a worker thread. Light operations are processed on the main thread.

```typescript
export interface ServerProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `encode` | `uuid: string, message: ServiceMessage` | `Promise<{ chunks: Bytes[]; totalSize: number }>` | Encodes a message. Offloads to worker for messages with `Uint8Array` bodies |
| `decode` | `bytes: Bytes` | `Promise<ServiceMessageDecodeResult<ServiceMessage>>` | Decodes binary data. Offloads to worker for payloads > 30KB |
| `dispose` | none | `void` | Disposes the underlying protocol's GC timer |

## `createServerProtocolWrapper`

Creates a `ServerProtocolWrapper` instance.

```typescript
export function createServerProtocolWrapper(): ServerProtocolWrapper;
```

**Returns:** `ServerProtocolWrapper`

Worker thread details:
- Uses `@simplysm/core-node` `Worker` (Node.js `worker_threads`)
- Shared singleton worker instance across all protocol wrappers
- Worker memory limit: 4096 MB (old generation)
- Size threshold for worker offloading: 30KB
- Encode uses worker when body contains `Uint8Array` elements
- Decode uses worker when total bytes exceed 30KB
