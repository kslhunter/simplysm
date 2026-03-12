# Filesystem Utilities (`fsx`)

Imported as a namespace:

```typescript
import { fsx } from "@simplysm/core-node";
```

All functions wrap Node.js `fs` operations with automatic `SdError` wrapping for improved stack traces. Most functions come in sync and async pairs.

---

## API Reference

### exists / existsSync

```typescript
function exists(targetPath: string): Promise<boolean>;
function existsSync(targetPath: string): boolean;
```

Checks if a file or directory exists.

---

### mkdir / mkdirSync

```typescript
function mkdir(targetPath: string): Promise<void>;
function mkdirSync(targetPath: string): void;
```

Creates a directory recursively (like `mkdir -p`).

---

### rm / rmSync

```typescript
function rm(targetPath: string): Promise<void>;
function rmSync(targetPath: string): void;
```

Deletes a file or directory recursively with `force: true`.

- **`rm`** (async): Retries up to 6 times with a 500ms interval for transient errors (e.g., file locks).
- **`rmSync`**: Fails immediately without retries.

---

### copy / copySync

```typescript
function copy(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): Promise<void>;

function copySync(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): void;
```

Copies a file or directory. If `sourcePath` does not exist, returns silently.

**Parameters:**
- `sourcePath` -- Source path to copy from.
- `targetPath` -- Destination path.
- `filter` -- Optional filter receiving the absolute path of each child. Return `true` to include, `false` to exclude. The top-level `sourcePath` itself is not filtered; only its children (recursively) are subject to the filter. Returning `false` for a directory skips it and all its contents.

---

### read / readSync

```typescript
function read(targetPath: string): Promise<string>;
function readSync(targetPath: string): string;
```

Reads a file as a UTF-8 string.

---

### readBuffer / readBufferSync

```typescript
function readBuffer(targetPath: string): Promise<Buffer>;
function readBufferSync(targetPath: string): Buffer;
```

Reads a file as a Buffer.

---

### readJson / readJsonSync

```typescript
function readJson<TData = unknown>(targetPath: string): Promise<TData>;
function readJsonSync<TData = unknown>(targetPath: string): TData;
```

Reads and parses a JSON file using `JsonConvert` from `@simplysm/core-common`. On parse failure, the error includes a truncated preview of the file contents (up to 500 characters).

---

### write / writeSync

```typescript
function write(targetPath: string, data: string | Uint8Array): Promise<void>;
function writeSync(targetPath: string, data: string | Uint8Array): void;
```

Writes data to a file. Automatically creates parent directories if they do not exist. Uses `flush: true` for immediate disk write.

---

### writeJson / writeJsonSync

```typescript
function writeJson(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): Promise<void>;

function writeJsonSync(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): void;
```

Writes data to a JSON file using `JsonConvert`.

**Parameters:**
- `data` -- Data to serialize.
- `options.replacer` -- Custom JSON replacer function.
- `options.space` -- Indentation (number of spaces or string).

---

### readdir / readdirSync

```typescript
function readdir(targetPath: string): Promise<string[]>;
function readdirSync(targetPath: string): string[];
```

Reads the contents of a directory (file and directory names only, not full paths).

---

### stat / statSync

```typescript
function stat(targetPath: string): Promise<fs.Stats>;
function statSync(targetPath: string): fs.Stats;
```

Gets file/directory information. Follows symbolic links.

---

### lstat / lstatSync

```typescript
function lstat(targetPath: string): Promise<fs.Stats>;
function lstatSync(targetPath: string): fs.Stats;
```

Gets file/directory information. Does **not** follow symbolic links.

---

### glob / globSync

```typescript
function glob(pattern: string, options?: GlobOptions): Promise<string[]>;
function globSync(pattern: string, options?: GlobOptions): string[];
```

Searches for files using a glob pattern. Backslashes in the pattern are automatically converted to forward slashes. Returns an array of **absolute paths**.

---

### clearEmptyDirectory

```typescript
function clearEmptyDirectory(dirPath: string): Promise<void>;
```

Recursively searches and deletes empty directories under the specified path. If all children of a directory are deleted and it becomes empty, it is also removed.

---

### findAllParentChildPaths / findAllParentChildPathsSync

```typescript
function findAllParentChildPaths(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): Promise<string[]>;

function findAllParentChildPathsSync(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): string[];
```

Traverses parent directories from `fromPath` toward the root, collecting all file paths matching `childGlob` in each directory.

**Parameters:**
- `childGlob` -- Glob pattern to match in each directory.
- `fromPath` -- Starting directory.
- `rootPath` -- Optional boundary; stops searching at this directory. Must be a parent of `fromPath`.

---

## Usage Examples

```typescript
import { fsx } from "@simplysm/core-node";

// Read and write JSON
const config = await fsx.readJson<{ port: number }>("config.json");
await fsx.writeJson("output.json", { port: 3000 }, { space: 2 });

// Copy with filter (skip node_modules)
await fsx.copy("src", "dist", (absPath) => !absPath.includes("node_modules"));

// Find all package.json files from a subdirectory up to the project root
const packageFiles = fsx.findAllParentChildPathsSync(
  "package.json",
  "/project/packages/my-lib/src",
  "/project",
);

// Clean up empty directories after a build
await fsx.clearEmptyDirectory("dist");

// Glob search
const tsFiles = await fsx.glob("src/**/*.ts");
```
