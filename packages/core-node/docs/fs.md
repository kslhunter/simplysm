# File System Utilities

File system utilities exported as the `fsx` namespace.

```typescript
import { fsx } from "@simplysm/core-node";
```

## Existence Check

### `existsSync`

Checks if a file or directory exists (synchronous).

```typescript
function existsSync(targetPath: string): boolean;
```

### `exists`

Checks if a file or directory exists (asynchronous).

```typescript
function exists(targetPath: string): Promise<boolean>;
```

## Create Directory

### `mkdirSync`

Creates a directory (recursive).

```typescript
function mkdirSync(targetPath: string): void;
```

### `mkdir`

Creates a directory (recursive, asynchronous).

```typescript
function mkdir(targetPath: string): Promise<void>;
```

## Delete

### `rmSync`

Deletes a file or directory.

The synchronous version fails immediately without retries. Use `rm` for cases with potential transient errors like file locks.

```typescript
function rmSync(targetPath: string): void;
```

### `rm`

Deletes a file or directory (asynchronous).

The asynchronous version retries up to 6 times (500ms interval) for transient errors like file locks.

```typescript
function rm(targetPath: string): Promise<void>;
```

## Copy

### `copySync`

Copies a file or directory.

If `sourcePath` does not exist, no action is performed and the function returns.

```typescript
function copySync(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): void;
```

**Parameters:**
- `sourcePath` -- Path of the source to copy
- `targetPath` -- Destination path for the copy
- `filter` -- A filter function that determines whether to copy. The **absolute path** of each file/directory is passed. Returns `true` to copy, `false` to exclude. The top-level `sourcePath` is not subject to filtering; the filter function is applied recursively to all children. Returning `false` for a directory skips that directory and all its contents.

### `copy`

Copies a file or directory (asynchronous). Same behavior as `copySync`.

```typescript
function copy(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): Promise<void>;
```

## Read File

### `readSync`

Reads a file as a UTF-8 string.

```typescript
function readSync(targetPath: string): string;
```

### `read`

Reads a file as a UTF-8 string (asynchronous).

```typescript
function read(targetPath: string): Promise<string>;
```

### `readBufferSync`

Reads a file as a Buffer.

```typescript
function readBufferSync(targetPath: string): Buffer;
```

### `readBuffer`

Reads a file as a Buffer (asynchronous).

```typescript
function readBuffer(targetPath: string): Promise<Buffer>;
```

### `readJsonSync`

Reads a JSON file (using JsonConvert).

```typescript
function readJsonSync<TData = unknown>(targetPath: string): TData;
```

### `readJson`

Reads a JSON file (using JsonConvert, asynchronous).

```typescript
function readJson<TData = unknown>(targetPath: string): Promise<TData>;
```

## Write File

### `writeSync`

Writes data to a file (auto-creates parent directories).

```typescript
function writeSync(targetPath: string, data: string | Uint8Array): void;
```

### `write`

Writes data to a file (auto-creates parent directories, asynchronous).

```typescript
function write(targetPath: string, data: string | Uint8Array): Promise<void>;
```

### `writeJsonSync`

Writes data to a JSON file (using JsonConvert).

```typescript
function writeJsonSync(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): void;
```

### `writeJson`

Writes data to a JSON file (using JsonConvert, asynchronous).

```typescript
function writeJson(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): Promise<void>;
```

## Read Directory

### `readdirSync`

Reads the contents of a directory.

```typescript
function readdirSync(targetPath: string): string[];
```

### `readdir`

Reads the contents of a directory (asynchronous).

```typescript
function readdir(targetPath: string): Promise<string[]>;
```

## File Information

### `statSync`

Gets file/directory information (follows symbolic links).

```typescript
function statSync(targetPath: string): fs.Stats;
```

### `stat`

Gets file/directory information (follows symbolic links, asynchronous).

```typescript
function stat(targetPath: string): Promise<fs.Stats>;
```

### `lstatSync`

Gets file/directory information (does not follow symbolic links).

```typescript
function lstatSync(targetPath: string): fs.Stats;
```

### `lstat`

Gets file/directory information (does not follow symbolic links, asynchronous).

```typescript
function lstat(targetPath: string): Promise<fs.Stats>;
```

## Glob

### `globSync`

Searches for files using a glob pattern.

```typescript
function globSync(pattern: string, options?: GlobOptions): string[];
```

Returns an array of absolute paths for matched files.

### `glob`

Searches for files using a glob pattern (asynchronous).

```typescript
function glob(pattern: string, options?: GlobOptions): Promise<string[]>;
```

Returns an array of absolute paths for matched files.

## Utilities

### `clearEmptyDirectory`

Recursively searches and deletes empty directories under a specified directory. If all child directories are deleted and a parent becomes empty, it will also be deleted.

```typescript
function clearEmptyDirectory(dirPath: string): Promise<void>;
```

### `findAllParentChildPathsSync`

Searches for files matching a glob pattern by traversing parent directories from a start path towards the root. Collects all file paths matching the `childGlob` pattern in each directory.

```typescript
function findAllParentChildPathsSync(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): string[];
```

**Parameters:**
- `childGlob` -- Glob pattern to search for in each directory
- `fromPath` -- Path to start searching from
- `rootPath` -- Path to stop searching at (if not specified, searches to filesystem root). `fromPath` must be a child path of `rootPath`. Otherwise, searches to the filesystem root.

### `findAllParentChildPaths`

Asynchronous version of `findAllParentChildPathsSync`.

```typescript
function findAllParentChildPaths(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): Promise<string[]>;
```
