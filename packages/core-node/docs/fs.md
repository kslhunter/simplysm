# Filesystem Utilities (`fs`)

A collection of filesystem helpers that wrap the built-in `fs` module with recursive directory creation, retry logic, glob support, and consistent error wrapping via `SdError`.

## Import

```typescript
import { fsExists, fsExistsSync, /* ... */ } from "@simplysm/core-node";
```

---

## Existence Check

### `fsExistsSync(targetPath)`

Checks if a file or directory exists (synchronous).

```typescript
import { fsExistsSync } from "@simplysm/core-node";

if (fsExistsSync("/some/path")) {
  console.log("exists");
}
```

### `fsExists(targetPath)`

Checks if a file or directory exists (asynchronous).

```typescript
import { fsExists } from "@simplysm/core-node";

if (await fsExists("/some/path")) {
  console.log("exists");
}
```

---

## Create Directory

### `fsMkdirSync(targetPath)`

Creates a directory recursively (synchronous).

```typescript
import { fsMkdirSync } from "@simplysm/core-node";

fsMkdirSync("/output/nested/dir");
```

### `fsMkdir(targetPath)`

Creates a directory recursively (asynchronous).

```typescript
import { fsMkdir } from "@simplysm/core-node";

await fsMkdir("/output/nested/dir");
```

---

## Delete

### `fsRmSync(targetPath)`

Deletes a file or directory recursively (synchronous). Fails immediately without retries — use `fsRm` when transient errors such as file locks are expected.

```typescript
import { fsRmSync } from "@simplysm/core-node";

fsRmSync("/output/dist");
```

### `fsRm(targetPath)`

Deletes a file or directory recursively (asynchronous). Retries up to 6 times at 500 ms intervals for transient errors such as file locks.

```typescript
import { fsRm } from "@simplysm/core-node";

await fsRm("/output/dist");
```

---

## Copy

### `fsCopySync(sourcePath, targetPath, filter?)`

Copies a file or directory (synchronous). If `sourcePath` does not exist, returns without doing anything.

The optional `filter` receives the **absolute path** of each child and returns `true` to include it. The top-level `sourcePath` itself is never filtered. Returning `false` for a directory skips that directory and all its contents.

```typescript
import { fsCopySync } from "@simplysm/core-node";

fsCopySync("/src", "/dest", (p) => !p.includes("node_modules"));
```

### `fsCopy(sourcePath, targetPath, filter?)`

Copies a file or directory (asynchronous). Child paths are processed in parallel.

```typescript
import { fsCopy } from "@simplysm/core-node";

await fsCopy("/src", "/dest", (p) => !p.includes(".git"));
```

---

## Read File

### `fsReadSync(targetPath)`

Reads a file as a UTF-8 string (synchronous).

```typescript
import { fsReadSync } from "@simplysm/core-node";

const content = fsReadSync("/config/settings.json");
```

### `fsRead(targetPath)`

Reads a file as a UTF-8 string (asynchronous).

```typescript
import { fsRead } from "@simplysm/core-node";

const content = await fsRead("/config/settings.json");
```

### `fsReadBufferSync(targetPath)`

Reads a file as a `Buffer` (synchronous).

```typescript
import { fsReadBufferSync } from "@simplysm/core-node";

const buf = fsReadBufferSync("/assets/image.png");
```

### `fsReadBuffer(targetPath)`

Reads a file as a `Buffer` (asynchronous).

```typescript
import { fsReadBuffer } from "@simplysm/core-node";

const buf = await fsReadBuffer("/assets/image.png");
```

### `fsReadJsonSync<TData>(targetPath)`

Reads and parses a JSON file using `jsonParse` from `@simplysm/core-common` (synchronous). Includes a content preview in the error when parsing fails.

```typescript
import { fsReadJsonSync } from "@simplysm/core-node";

const config = fsReadJsonSync<{ port: number }>("/config/app.json");
```

### `fsReadJson<TData>(targetPath)`

Reads and parses a JSON file (asynchronous).

```typescript
import { fsReadJson } from "@simplysm/core-node";

const config = await fsReadJson<{ port: number }>("/config/app.json");
```

---

## Write File

### `fsWriteSync(targetPath, data)`

Writes a string or `Uint8Array` to a file (synchronous). Parent directories are created automatically.

```typescript
import { fsWriteSync } from "@simplysm/core-node";

fsWriteSync("/output/result.txt", "hello");
```

### `fsWrite(targetPath, data)`

Writes a string or `Uint8Array` to a file (asynchronous). Parent directories are created automatically.

```typescript
import { fsWrite } from "@simplysm/core-node";

await fsWrite("/output/result.txt", "hello");
```

### `fsWriteJsonSync(targetPath, data, options?)`

Serializes `data` with `jsonStringify` and writes it to a file (synchronous).

| Option | Type | Description |
|--------|------|-------------|
| `replacer` | `(key, value) => unknown` | Custom JSON replacer function |
| `space` | `string \| number` | Indentation |

```typescript
import { fsWriteJsonSync } from "@simplysm/core-node";

fsWriteJsonSync("/output/data.json", { key: "value" }, { space: 2 });
```

### `fsWriteJson(targetPath, data, options?)`

Serializes `data` and writes it to a file (asynchronous).

```typescript
import { fsWriteJson } from "@simplysm/core-node";

await fsWriteJson("/output/data.json", { key: "value" }, { space: 2 });
```

---

## Read Directory

### `fsReaddirSync(targetPath)`

Returns the names of entries in a directory (synchronous).

```typescript
import { fsReaddirSync } from "@simplysm/core-node";

const entries = fsReaddirSync("/some/dir");
```

### `fsReaddir(targetPath)`

Returns the names of entries in a directory (asynchronous).

```typescript
import { fsReaddir } from "@simplysm/core-node";

const entries = await fsReaddir("/some/dir");
```

---

## File Information

### `fsStatSync(targetPath)`

Returns `fs.Stats` for a path, following symbolic links (synchronous).

```typescript
import { fsStatSync } from "@simplysm/core-node";

const stats = fsStatSync("/some/file.txt");
console.log(stats.size);
```

### `fsStat(targetPath)`

Returns `fs.Stats` for a path, following symbolic links (asynchronous).

```typescript
import { fsStat } from "@simplysm/core-node";

const stats = await fsStat("/some/file.txt");
```

### `fsLstatSync(targetPath)`

Returns `fs.Stats` for a path without following symbolic links (synchronous).

```typescript
import { fsLstatSync } from "@simplysm/core-node";

const stats = fsLstatSync("/some/link");
```

### `fsLstat(targetPath)`

Returns `fs.Stats` for a path without following symbolic links (asynchronous).

```typescript
import { fsLstat } from "@simplysm/core-node";

const stats = await fsLstat("/some/link");
```

---

## Glob

### `fsGlobSync(pattern, options?)`

Searches for files using a glob pattern (synchronous). Returns absolute paths.

```typescript
import { fsGlobSync } from "@simplysm/core-node";

const files = fsGlobSync("src/**/*.ts");
```

### `fsGlob(pattern, options?)`

Searches for files using a glob pattern (asynchronous). Returns absolute paths.

```typescript
import { fsGlob } from "@simplysm/core-node";

const files = await fsGlob("src/**/*.ts");
```

---

## Utilities

### `fsClearEmptyDirectory(dirPath)`

Recursively deletes empty directories under `dirPath`. If all child directories in a parent become empty after deletion, the parent is also deleted.

```typescript
import { fsClearEmptyDirectory } from "@simplysm/core-node";

await fsClearEmptyDirectory("/output/build");
```

### `fsFindAllParentChildPathsSync(childGlob, fromPath, rootPath?)`

Traverses parent directories from `fromPath` toward the root (or `rootPath`) and collects all paths matching `childGlob` in each directory (synchronous).

```typescript
import { fsFindAllParentChildPathsSync } from "@simplysm/core-node";

const configs = fsFindAllParentChildPathsSync(
  "tsconfig.json",
  "/project/src/feature",
  "/project",
);
```

### `fsFindAllParentChildPaths(childGlob, fromPath, rootPath?)`

Same as `fsFindAllParentChildPathsSync` but asynchronous.

```typescript
import { fsFindAllParentChildPaths } from "@simplysm/core-node";

const configs = await fsFindAllParentChildPaths(
  "tsconfig.json",
  "/project/src/feature",
  "/project",
);
```
