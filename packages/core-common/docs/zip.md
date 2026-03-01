# Zip

ZIP archive support provided by `@simplysm/core-common`. Uses `@zip.js/zip.js` internally and caches decompressed files to avoid duplicate work.

---

## `ZipArchive`

```typescript
import { ZipArchive } from "@simplysm/core-common";

// Read ZIP file
await using archive = new ZipArchive(zipBytes);
const content = await archive.get("file.txt");           // Uint8Array | undefined
const exists  = await archive.exists("file.txt");        // boolean
const all     = await archive.extractAll((progress) => {
  console.log(`${progress.fileName}: ${progress.extractedSize}/${progress.totalSize}`);
}); // Map<string, Uint8Array | undefined>

// Create ZIP file
await using newArchive = new ZipArchive();
newArchive.write("file.txt", textBytes);
newArchive.write("data.json", jsonBytes);
const zipBytes = await newArchive.compress();
```

| Member | Description |
|--------|-------------|
| `new ZipArchive(data?)` | `data`: `Blob` or `Uint8Array`. Omit to create an empty archive |
| `.extractAll(progressCallback?)` | Extracts all files; returns `Map<string, Uint8Array \| undefined>` |
| `.get(fileName)` | Extracts a single file by name |
| `.exists(fileName)` | Checks if a file exists in the archive |
| `.write(fileName, bytes)` | Adds/overwrites a file in cache (does not compress yet) |
| `.compress()` | Compresses all cached files into a ZIP `Uint8Array` |
| `.close()` | Closes reader and clears cache |
| `[Symbol.asyncDispose]()` | `await using` support |

Also exported: `ZipArchiveProgress` interface with fields `fileName`, `totalSize`, and `extractedSize`.
