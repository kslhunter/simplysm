# fsx

Namespace of enhanced file system functions. All functions wrap Node.js `fs` with error handling (wrapping in `SdError`) and convenience features like recursive directory creation. Most functions come in sync/async pairs.

Imported as:
```typescript
import { fsx } from "@simplysm/core-node";
```

## Existence

### existsSync

```ts
function existsSync(targetPath: string): boolean
```

Check if a file or directory exists (sync).

### exists

```ts
async function exists(targetPath: string): Promise<boolean>
```

Check if a file or directory exists (async).

## Directory Creation

### mkdirSync

```ts
function mkdirSync(targetPath: string): void
```

Create a directory recursively (sync).

### mkdir

```ts
async function mkdir(targetPath: string): Promise<void>
```

Create a directory recursively (async).

## Removal

### rmSync

```ts
function rmSync(targetPath: string): void
```

Remove a file or directory (sync). No retry -- fails immediately on error.

### rm

```ts
async function rm(targetPath: string): Promise<void>
```

Remove a file or directory (async). Retries up to 6 times with 500ms delay for transient errors (e.g., file locks).

## Copy

### copySync

```ts
function copySync(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): void
```

Copy a file or directory (sync). If `sourcePath` does not exist, returns silently. Directories are copied recursively. An optional filter function controls which children are included.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sourcePath` | `string` | Source path to copy |
| `targetPath` | `string` | Destination path |
| `filter` | `(absolutePath: string) => boolean` | Optional filter applied to all children (not the root). Return `true` to include. If a directory returns `false`, it and all contents are skipped. |

### copy

```ts
async function copy(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): Promise<void>
```

Copy a file or directory (async). Same behavior as `copySync`.

## File Reading

### readSync

```ts
function readSync(targetPath: string): string
```

Read a file as a UTF-8 string (sync).

### read

```ts
async function read(targetPath: string): Promise<string>
```

Read a file as a UTF-8 string (async).

### readBufferSync

```ts
function readBufferSync(targetPath: string): Buffer
```

Read a file as a Buffer (sync).

### readBuffer

```ts
async function readBuffer(targetPath: string): Promise<Buffer>
```

Read a file as a Buffer (async).

### readJsonSync

```ts
function readJsonSync<TData = unknown>(targetPath: string): TData
```

Read and parse a JSON file using `JsonConvert` (sync). On parse failure, the error message includes a preview of the file contents.

### readJson

```ts
async function readJson<TData = unknown>(targetPath: string): Promise<TData>
```

Read and parse a JSON file using `JsonConvert` (async). On parse failure, the error message includes a preview of the file contents.

## File Writing

### writeSync

```ts
function writeSync(targetPath: string, data: string | Uint8Array): void
```

Write data to a file (sync). Parent directories are created automatically. Uses `flush: true`.

### write

```ts
async function write(targetPath: string, data: string | Uint8Array): Promise<void>
```

Write data to a file (async). Parent directories are created automatically. Uses `flush: true`.

### writeJsonSync

```ts
function writeJsonSync(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): void
```

Write data as a JSON file using `JsonConvert` (sync).

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetPath` | `string` | Target file path |
| `data` | `unknown` | Data to serialize |
| `options.replacer` | `function` | Custom JSON replacer |
| `options.space` | `string \| number` | Indentation |

### writeJson

```ts
async function writeJson(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): Promise<void>
```

Write data as a JSON file using `JsonConvert` (async). Same options as `writeJsonSync`.

## Directory Reading

### readdirSync

```ts
function readdirSync(targetPath: string): string[]
```

List the contents of a directory (sync). Returns entry names (not full paths).

### readdir

```ts
async function readdir(targetPath: string): Promise<string[]>
```

List the contents of a directory (async). Returns entry names (not full paths).

## File Stats

### statSync

```ts
function statSync(targetPath: string): fs.Stats
```

Get file/directory stats, following symlinks (sync).

### stat

```ts
async function stat(targetPath: string): Promise<fs.Stats>
```

Get file/directory stats, following symlinks (async).

### lstatSync

```ts
function lstatSync(targetPath: string): fs.Stats
```

Get file/directory stats without following symlinks (sync).

### lstat

```ts
async function lstat(targetPath: string): Promise<fs.Stats>
```

Get file/directory stats without following symlinks (async).

## Glob

### globSync

```ts
function globSync(pattern: string, options?: GlobOptions): string[]
```

Search files by glob pattern (sync). Returns absolute paths.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pattern` | `string` | Glob pattern (e.g., `"**/*.ts"`) |
| `options` | `GlobOptions` | Options passed to the `glob` library |

### glob

```ts
async function glob(pattern: string, options?: GlobOptions): Promise<string[]>
```

Search files by glob pattern (async). Returns absolute paths.

## Utilities

### clearEmptyDirectory

```ts
async function clearEmptyDirectory(dirPath: string): Promise<void>
```

Recursively find and remove empty directories under a given path (async). When all subdirectories are removed and a parent becomes empty, it is also removed.

### findAllParentChildPathsSync

```ts
function findAllParentChildPathsSync(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): string[]
```

Walk from `fromPath` upward toward the filesystem root, running a glob pattern at each level and collecting all matches (sync).

| Parameter | Type | Description |
|-----------|------|-------------|
| `childGlob` | `string` | Glob pattern to search at each directory level |
| `fromPath` | `string` | Starting path |
| `rootPath` | `string` | Optional stop path (must be an ancestor of `fromPath`) |

### findAllParentChildPaths

```ts
async function findAllParentChildPaths(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): Promise<string[]>
```

Same as `findAllParentChildPathsSync` but asynchronous.
