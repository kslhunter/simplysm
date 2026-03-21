# Protocol

## `ClientProtocolWrapper`

Client-side protocol wrapper interface. Handles message encoding/decoding with optional Web Worker offloading for large payloads (>30KB).

```typescript
interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
}
```

| Method | Description |
|--------|-------------|
| `encode()` | Encode a message (delegates to Web Worker for large payloads) |
| `decode()` | Decode a message (delegates to Web Worker for large payloads) |

## `createClientProtocolWrapper`

Create a client protocol wrapper instance. Automatically offloads heavy encoding/decoding to a Web Worker when available and payload exceeds 30KB.

```typescript
function createClientProtocolWrapper(protocol: ServiceProtocol): ClientProtocolWrapper;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `protocol` | `ServiceProtocol` | Base protocol instance from `createServiceProtocol()` |
