# Utilities

Standalone utility functions for file downloads, HTTP fetching with progress tracking, and programmatic file selection dialogs.

## downloadBlob

```typescript
function downloadBlob(blob: Blob, fileName: string): void
```

Download a Blob as a file. Creates a temporary object URL, triggers a download via an anchor click, and revokes the URL after 1 second.

| Parameter | Type | Description |
|-----------|------|-------------|
| `blob` | `Blob` | Blob object to download |
| `fileName` | `string` | File name for the downloaded file |

---

## fetchUrlBytes

```typescript
function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array>
```

Download binary data from a URL as a `Uint8Array`, with optional progress reporting.

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | URL to download from |
| `options.onProgress` | `(progress: DownloadProgress) => void` | Callback invoked as chunks are received |

When the server provides a `Content-Length` header, memory is pre-allocated for efficiency. For chunked transfers without `Content-Length`, chunks are collected and concatenated at the end.

Throws an `Error` if the response status is not OK or the response body is not readable.

### DownloadProgress

```typescript
interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}
```

---

## openFileDialog

```typescript
function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined>
```

Programmatically open a file selection dialog without requiring a visible `<input type="file">` in the DOM.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.accept` | `string` | -- | Accepted file types (e.g., `".png,.jpg"`, `"image/*"`) |
| `options.multiple` | `boolean` | `false` | Allow selecting multiple files |

**Returns:** A `File[]` if the user selected files, or `undefined` if the dialog was cancelled.

---

## Usage Examples

```typescript
import { downloadBlob, fetchUrlBytes, openFileDialog } from "@simplysm/core-browser";

// Download a text file
const blob = new Blob(["Hello, world!"], { type: "text/plain" });
downloadBlob(blob, "hello.txt");

// Fetch binary data with progress
const data = await fetchUrlBytes("https://example.com/archive.zip", {
  onProgress: ({ receivedLength, contentLength }) => {
    console.log(`${Math.round((receivedLength / contentLength) * 100)}%`);
  },
});

// Open file dialog for images
const files = await openFileDialog({ accept: "image/*", multiple: true });
if (files) {
  for (const file of files) {
    // process each selected file
  }
}
```
