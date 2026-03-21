# Utilities

Standalone utility functions for browser-side operations.

```typescript
import { downloadBlob, fetchUrlBytes, openFileDialog } from "@simplysm/core-browser";
```

## `downloadBlob`

Download a Blob as a file by creating a temporary object URL and clicking a hidden link.

```typescript
function downloadBlob(blob: Blob, fileName: string): void;
```

**Parameters:**
- `blob` -- Blob object to download
- `fileName` -- File name to save as

## `DownloadProgress`

Download progress information used by `fetchUrlBytes`.

```typescript
interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `receivedLength` | `number` | Number of bytes received so far |
| `contentLength` | `number` | Total content length from `Content-Length` header |

## `fetchUrlBytes`

Download binary data from a URL with optional progress callback support.

```typescript
async function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array>;
```

**Parameters:**
- `url` -- URL to download from
- `options.onProgress` -- Progress callback function

When `Content-Length` is known, pre-allocates memory for efficiency. For chunked encoding (unknown length), collects chunks and merges them.

**Throws:** `Error` if the download fails or the response body is not readable.

## `openFileDialog`

Programmatically open a file selection dialog.

```typescript
function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined>;
```

**Parameters:**
- `options.accept` -- File type filter (e.g., `".csv"`, `"image/*"`)
- `options.multiple` -- Allow multiple file selection (default: `false`)

**Returns:** Array of selected files, or `undefined` if the dialog is cancelled.
