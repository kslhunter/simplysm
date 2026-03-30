# Fetch

Utility for downloading binary data from a URL with optional progress tracking.

## `DownloadProgress`

Progress information emitted during a fetch download.

```typescript
interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `receivedLength` | `number` | Bytes received so far |
| `contentLength` | `number` | Total content length from the `Content-Length` header |

## `fetchUrlBytes`

Download binary data from a URL. Supports progress callbacks via `ReadableStream` reader. When the `Content-Length` header is available, the result buffer is pre-allocated for efficiency. When unavailable (chunked encoding), chunks are collected and concatenated.

```typescript
async function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | URL to fetch |
| `options.onProgress` | `(progress: DownloadProgress) => void` | Optional progress callback |

**Returns:** `Promise<Uint8Array>` -- The downloaded binary data.

**Throws:** `Error` if the response is not OK or the body cannot be read.
