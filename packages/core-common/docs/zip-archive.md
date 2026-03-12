# ZIP Archive

The `ZipArchive` class for reading, writing, and compressing ZIP files. Uses `@zip.js/zip.js` internally.

Directly exported (not namespaced).

```typescript
import { ZipArchive } from "@simplysm/core-common";
```

## ZipArchive

```typescript
class ZipArchive {
  constructor(data?: Blob | Bytes);

  get(fileName: string): Promise<Bytes | undefined>;
  exists(fileName: string): Promise<boolean>;
  write(fileName: string, bytes: Bytes): void;
  extractAll(progressCallback?: (progress: ZipArchiveProgress) => void): Promise<Map<string, Bytes | undefined>>;
  compress(): Promise<Bytes>;
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

interface ZipArchiveProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}
```

- **Read mode:** Pass existing ZIP data (`Blob` or `Uint8Array`) to the constructor. Use `get()` for individual files or `extractAll()` for everything.
- **Write mode:** Omit the constructor argument. Use `write()` to add files, then `compress()` to generate the ZIP.
- Supports `await using` syntax for automatic cleanup.
- Internally caches decompressed files to prevent duplicate extraction.

---

## Usage Examples

```typescript
import { ZipArchive } from "@simplysm/core-common";

// Read a ZIP file
await using archive = new ZipArchive(zipBytes);
const content = await archive.get("file.txt");
const exists = await archive.exists("data.json");

// Extract all with progress
const files = await archive.extractAll((progress) => {
  const pct = (progress.extractedSize / progress.totalSize * 100).toFixed(1);
  console.log(`${progress.fileName}: ${pct}%`);
});

// Create a new ZIP file
await using newArchive = new ZipArchive();
newArchive.write("hello.txt", new TextEncoder().encode("Hello World"));
newArchive.write("data.json", new TextEncoder().encode('{"key":"value"}'));
const zipOutput = await newArchive.compress();
```
