# Template Strings and Zip

## Template String Tag Functions

All template tag functions perform the same operation: combine the template literals and normalize indentation. They exist as separate functions to enable IDE syntax highlighting for different languages.

Each function:
1. Joins the template strings with interpolated values
2. Removes leading and trailing blank lines
3. Calculates the minimum indentation across all non-empty lines
4. Removes that minimum indentation from every line

```typescript
function js(strings: TemplateStringsArray, ...values: unknown[]): string;
function ts(strings: TemplateStringsArray, ...values: unknown[]): string;
function html(strings: TemplateStringsArray, ...values: unknown[]): string;
function tsql(strings: TemplateStringsArray, ...values: unknown[]): string;
function mysql(strings: TemplateStringsArray, ...values: unknown[]): string;
function pgsql(strings: TemplateStringsArray, ...values: unknown[]): string;
```

| Function | Purpose |
|----------|---------|
| `js` | JavaScript code highlighting |
| `ts` | TypeScript code highlighting |
| `html` | HTML markup highlighting |
| `tsql` | MSSQL T-SQL highlighting |
| `mysql` | MySQL SQL highlighting |
| `pgsql` | PostgreSQL SQL highlighting |

---

## `ZipArchiveProgress`

Progress callback data for ZIP extraction.

```typescript
interface ZipArchiveProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `fileName` | `string` | Name of the file currently being extracted |
| `totalSize` | `number` | Total uncompressed size of all files in bytes |
| `extractedSize` | `number` | Cumulative bytes extracted so far |

---

## `ZipArchive`

ZIP archive processing class. Supports reading, writing, compressing, and extracting ZIP files. Uses internal caching to avoid duplicate decompression. Built on `@zip.js/zip.js`.

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
```

### Constructor

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Blob \| Bytes \| undefined` | Existing ZIP data to read. Omit to create a new empty archive. |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `get(fileName)` | `Promise<Bytes \| undefined>` | Extract a single file by name. Returns `undefined` if not found. Caches the result. |
| `exists(fileName)` | `Promise<boolean>` | Check if a file exists in the archive. |
| `write(fileName, bytes)` | `void` | Write a file to the cache (for later compression). |
| `extractAll(progressCallback?)` | `Promise<Map<string, Bytes \| undefined>>` | Extract all files. Returns a Map of filename to bytes. Optionally reports progress. |
| `compress()` | `Promise<Bytes>` | Compress all cached files into a new ZIP. Calls `extractAll()` internally first. |
| `close()` | `Promise<void>` | Close the reader and clear the cache. |
| `[Symbol.asyncDispose]()` | `Promise<void>` | Supports `await using` statement. Calls `close()`. |
