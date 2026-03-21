# Protocol

Client-side protocol wrapper that handles message encoding/decoding with optional Web Worker offloading for large payloads.

## `ClientProtocolWrapper`

```typescript
interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
}
```

## `createClientProtocolWrapper`

Create a client protocol wrapper instance.

```typescript
function createClientProtocolWrapper(protocol: ServiceProtocol): ClientProtocolWrapper;
```

**Parameters:**
- `protocol` -- A `ServiceProtocol` instance (from `@simplysm/service-common`)

**Behavior:**
- Messages smaller than 30KB are processed on the main thread
- Larger messages are offloaded to a Web Worker for encoding/decoding
- Worker is automatically initialized as a lazy singleton
- Worker tasks that do not complete within 60s are rejected (prevents memory leaks)
- Falls back to main-thread processing when `Worker` is not available (e.g., SSR)

**Worker delegation heuristics for encoding:**
- `Uint8Array` body: always use worker
- String body longer than 30KB: use worker
- Array body with >100 elements or containing `Uint8Array`: use worker

**Worker delegation heuristics for decoding:**
- Byte size > 30KB: use worker
- After worker decoding, `transfer.decode()` is applied to restore class instances (e.g., `DateTime`)
