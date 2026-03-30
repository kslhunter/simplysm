# Client Protocol Wrapper

## `ClientProtocolWrapper`

Client-side protocol encoder/decoder wrapper. Automatically offloads heavy encode/decode operations to a Web Worker when available, falling back to main-thread processing for small messages or when workers are unsupported.

```typescript
export interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `encode` | `uuid: string, message: ServiceMessage` | `Promise<{ chunks: Bytes[]; totalSize: number }>` | Encodes a message into binary chunks. Offloads to worker for large messages |
| `decode` | `bytes: Bytes` | `Promise<ServiceMessageDecodeResult<ServiceMessage>>` | Decodes received binary data. Uses zero-copy transfer for large payloads |
| `dispose` | none | `void` | Disposes the underlying protocol and worker resolver resources |

## `createClientProtocolWrapper`

Creates a `ClientProtocolWrapper` from a `ServiceProtocol` instance.

```typescript
export function createClientProtocolWrapper(
  protocol: ServiceProtocol,
): ClientProtocolWrapper;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `protocol` | `ServiceProtocol` | The base protocol encoder/decoder (from `@simplysm/service-common`) |

Worker offloading threshold: 30KB. Messages below this size are processed on the main thread. The worker is a shared singleton across all `ClientProtocolWrapper` instances. Worker operations that exceed 60 seconds are automatically timed out and rejected.
