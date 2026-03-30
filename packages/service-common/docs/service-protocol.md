# Service Protocol

## `ServiceProtocol`

Binary protocol encoder/decoder interface. Uses a 28-byte header (UUID 16 + TotalSize 8 + Index 4) with JSON body. Automatically chunks messages larger than 3MB into 300KB chunks. Maximum message size is 100MB.

```typescript
export interface ServiceProtocol {
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;
  dispose(): void;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `encode` | `uuid: string, message: ServiceMessage` | `{ chunks: Bytes[]; totalSize: number }` | Encodes a message, auto-splitting if needed |
| `decode` | `bytes: Bytes` | `ServiceMessageDecodeResult<T>` | Decodes a message, auto-reassembling chunks |
| `dispose` | none | `void` | Releases the internal chunk accumulator GC timer. Must be called when the instance is no longer needed |

## `ServiceMessageDecodeResult`

Decode result union type. Either a complete message or a progress indicator for chunked messages.

```typescript
export type ServiceMessageDecodeResult<TMessage extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: TMessage }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
```

When `type` is `"complete"`:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"complete"` | All chunks received, message reassembled |
| `uuid` | `string` | Message UUID |
| `message` | `TMessage` | Decoded message |

When `type` is `"progress"`:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"progress"` | Partial chunks received |
| `uuid` | `string` | Message UUID |
| `totalSize` | `number` | Total size in bytes |
| `completedSize` | `number` | Completed size in bytes |

## `createServiceProtocol`

Creates a service protocol encoder/decoder instance.

```typescript
export function createServiceProtocol(): ServiceProtocol;
```

**Returns:** `ServiceProtocol` -- A new protocol instance with encode/decode/dispose methods.

The instance maintains an internal `LazyGcMap` accumulator for reassembling chunked messages. The GC timer runs every 10 seconds and expires incomplete messages after 60 seconds.
