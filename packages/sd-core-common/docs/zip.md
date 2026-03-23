# SdZip

Async zip file reader/writer powered by `@zip.js/zip.js`. Supports reading from `Blob` or `Buffer`, extracting entries, writing new entries, and compressing back to a `Buffer`.

## Constructor

```ts
new SdZip(data?: Blob | Buffer)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Blob \| Buffer \| undefined` | Existing zip data to read. Pass `undefined` or omit to create a new empty zip for writing. `Buffer` input is converted to `Uint8Array` internally. |

## Methods

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `extractAllAsync` | `extractAllAsync(progressCallback?: (progress: IProgress) => void)` | `Promise<Map<string, Buffer \| undefined>>` | Extract all files from the archive. Results are cached internally. The callback receives progress updates per file. |
| `getAsync` | `getAsync(fileName: string)` | `Promise<Buffer \| undefined>` | Extract a single file by name. Returns `undefined` if the file does not exist. Results are cached. |
| `existsAsync` | `existsAsync(fileName: string)` | `Promise<boolean>` | Check if a file exists in the archive. Checks cache first, then scans entries. |
| `write` | `write(fileName: string, buffer: Buffer)` | `void` | Add or overwrite a file in the in-memory cache. Does not modify the original zip data until `compressAsync()` is called. |
| `compressAsync` | `compressAsync()` | `Promise<Buffer>` | Compress all cached files (including extracted and written files) into a new zip `Buffer`. Calls `extractAllAsync()` first to ensure all original entries are included. |
| `closeAsync` | `closeAsync()` | `Promise<void>` | Close the underlying zip reader. Should be called when done reading. |

## IProgress

Progress callback parameter for `extractAllAsync`.

| Field | Type | Description |
|-------|------|-------------|
| `fileName` | `string` | Name of the file currently being extracted. |
| `totalSize` | `number` | Total uncompressed size of all files in bytes. |
| `extractedSize` | `number` | Number of bytes extracted so far. |

## Example

```ts
import { SdZip } from "@simplysm/sd-core-common";

// Read from existing zip
const zip = new SdZip(existingBuffer);
const readme = await zip.getAsync("README.md");
const allFiles = await zip.extractAllAsync((progress) => {
  console.log(`${progress.fileName}: ${progress.extractedSize}/${progress.totalSize}`);
});
await zip.closeAsync();

// Create new zip
const newZip = new SdZip();
newZip.write("hello.txt", Buffer.from("Hello, World!"));
newZip.write("data/config.json", Buffer.from('{"key": "value"}'));
const output = await newZip.compressAsync();

// Modify existing zip
const modZip = new SdZip(existingBuffer);
modZip.write("new-file.txt", Buffer.from("added"));
const modified = await modZip.compressAsync();
await modZip.closeAsync();
```
