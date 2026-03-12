# Protocol

Message encoding/decoding with automatic worker thread offloading for heavy payloads.

## `ServerProtocolWrapper`

```typescript
interface ServerProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
```

## `createServerProtocolWrapper(): ServerProtocolWrapper`

Creates a protocol wrapper instance that automatically delegates heavy operations to a shared worker thread.

### Worker delegation strategy

**Encoding** is offloaded to the worker when:
- The message body is a `Uint8Array`
- The message body is an array containing `Uint8Array` elements

**Decoding** is offloaded to the worker when:
- The incoming bytes exceed 30 KB

Lightweight operations stay on the main thread for lower latency.

### Worker details

- Uses a lazy singleton worker thread shared across all protocol wrappers
- Worker has a 4 GB memory limit (`maxOldGenerationSizeMb: 4096`)
- Built on `@simplysm/core-node` `Worker` / `WorkerProxy`
