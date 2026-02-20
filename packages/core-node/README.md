# @simplysm/core-node

A Node.js-specific utility package for the Simplysm framework. It provides path handling, file system operations, file change detection, and type-safe Worker thread wrappers.

## Installation

```bash
npm install @simplysm/core-node
# or
pnpm add @simplysm/core-node
```

### Requirements

- Node.js 20.11+ (requires `import.meta.filename`/`import.meta.dirname` support)

## Main Modules

### Path Utilities (`utils/path`)

Provides path conversion, normalization, comparison, and filtering functions.

| Function/Type | Description |
|---------------|-------------|
| `NormPath` | A branded type created by `pathNorm()`. Represents a normalized absolute path. |
| `pathPosix(...args)` | Converts to POSIX-style path (replaces backslashes with slashes). |
| `pathNorm(...paths)` | Normalizes paths and returns as `NormPath`. Converts to absolute path and normalizes with platform-specific separators. |
| `pathIsChildPath(childPath, parentPath)` | Checks if `childPath` is a child path of `parentPath`. Returns `false` for identical paths. Paths are normalized internally before comparison. |
| `pathChangeFileDirectory(filePath, fromDir, toDir)` | Changes the directory of a file path. Throws an error if the file is not within `fromDir`. |
| `pathBasenameWithoutExt(filePath)` | Returns the filename (basename) without extension. |
| `pathFilterByTargets(files, targets, cwd)` | Filters files based on target path list. `files` must be absolute paths under `cwd`. `targets` are POSIX-style paths relative to `cwd`. Returns `files` as-is if `targets` is an empty array. |

```typescript
import {
  pathPosix,
  pathNorm,
  pathIsChildPath,
  pathChangeFileDirectory,
  pathBasenameWithoutExt,
  pathFilterByTargets,
} from "@simplysm/core-node";

// Convert to POSIX-style path
pathPosix("C:\\Users\\test"); // "C:/Users/test"
pathPosix("src", "index.ts"); // "src/index.ts"

// Normalize path (convert to absolute path)
const normPath = pathNorm("src", "index.ts"); // Returns NormPath type

// Check child path relationship
pathIsChildPath("/a/b/c", "/a/b"); // true
pathIsChildPath("/a/b", "/a/b/c"); // false
pathIsChildPath("/a/b", "/a/b");   // false (same path)

// Change file directory
pathChangeFileDirectory("/a/b/c.txt", "/a", "/x"); // "/x/b/c.txt"

// Return filename without extension
pathBasenameWithoutExt("file.txt");             // "file"
pathBasenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"

// Filter files by target paths
const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
pathFilterByTargets(files, ["src"], "/proj");
// ["/proj/src/a.ts", "/proj/src/b.ts"]
```

### File System Utilities (`utils/fs`)

Provides functions for reading, writing, deleting, copying, and searching files and directories. Most functions come in both async and sync (`Sync` suffix) versions.

#### Existence Check

| Function | Description |
|----------|-------------|
| `fsExists(targetPath)` | Asynchronously checks if a file or directory exists. |
| `fsExistsSync(targetPath)` | Synchronously checks if a file or directory exists. |

#### Directory Creation

| Function | Description |
|----------|-------------|
| `fsMkdir(targetPath)` | Asynchronously creates a directory (recursive). |
| `fsMkdirSync(targetPath)` | Synchronously creates a directory (recursive). |

#### Deletion

| Function | Description |
|----------|-------------|
| `fsRm(targetPath)` | Asynchronously deletes a file or directory. Retries up to 6 times (500ms intervals) for transient errors like file locks. |
| `fsRmSync(targetPath)` | Synchronously deletes a file or directory. Fails immediately without retries. |

#### Copy

| Function | Description |
|----------|-------------|
| `fsCopy(sourcePath, targetPath, filter?)` | Asynchronously copies a file or directory. Can filter copy targets with a `filter` function. Does nothing if `sourcePath` doesn't exist. |
| `fsCopySync(sourcePath, targetPath, filter?)` | Synchronously copies a file or directory. |

#### File Reading

| Function | Description |
|----------|-------------|
| `fsRead(targetPath)` | Asynchronously reads a file as a UTF-8 string. |
| `fsReadSync(targetPath)` | Synchronously reads a file as a UTF-8 string. |
| `fsReadBuffer(targetPath)` | Asynchronously reads a file as a Buffer. |
| `fsReadBufferSync(targetPath)` | Synchronously reads a file as a Buffer. |
| `fsReadJson<TData>(targetPath)` | Asynchronously reads a JSON file (uses `jsonParse`). |
| `fsReadJsonSync<TData>(targetPath)` | Synchronously reads a JSON file (uses `jsonParse`). |

#### File Writing

| Function | Description |
|----------|-------------|
| `fsWrite(targetPath, data)` | Asynchronously writes a file. Automatically creates parent directories if they don't exist. `data` is `string` or `Uint8Array`. |
| `fsWriteSync(targetPath, data)` | Synchronously writes a file. Automatically creates parent directories. |
| `fsWriteJson(targetPath, data, options?)` | Asynchronously writes a JSON file (uses `jsonStringify`). Can specify `replacer` and `space` in `options`. |
| `fsWriteJsonSync(targetPath, data, options?)` | Synchronously writes a JSON file. |

#### Directory Reading

| Function | Description |
|----------|-------------|
| `fsReaddir(targetPath)` | Asynchronously reads directory contents. Returns an array of entry names. |
| `fsReaddirSync(targetPath)` | Synchronously reads directory contents. Returns an array of entry names. |

#### File Information

| Function | Description |
|----------|-------------|
| `fsStat(targetPath)` | Asynchronously retrieves file/directory information (follows symbolic links). |
| `fsStatSync(targetPath)` | Synchronously retrieves file/directory information (follows symbolic links). |
| `fsLstat(targetPath)` | Asynchronously retrieves file/directory information (symbolic link itself, does not follow). |
| `fsLstatSync(targetPath)` | Synchronously retrieves file/directory information (symbolic link itself, does not follow). |

#### Glob Search

| Function | Description |
|----------|-------------|
| `fsGlob(pattern, options?)` | Asynchronously searches for files with a glob pattern. Returns an array of absolute paths of matched files. |
| `fsGlobSync(pattern, options?)` | Synchronously searches for files with a glob pattern. |

#### Other Utilities

| Function | Description |
|----------|-------------|
| `fsClearEmptyDirectory(dirPath)` | Recursively deletes empty directories under the specified directory. If all children of a directory are deleted, that directory is also deleted. |
| `fsFindAllParentChildPaths(childGlob, fromPath, rootPath?)` | Traverses parent directories from `fromPath` toward the root (or `rootPath`), asynchronously searching with a glob pattern at each level. Collects all matched paths. **Note**: `fromPath` must be a child of `rootPath`; otherwise, the search continues to the filesystem root. |
| `fsFindAllParentChildPathsSync(childGlob, fromPath, rootPath?)` | Synchronous version of `fsFindAllParentChildPaths`. Same parameters and behavior, but runs synchronously. |

```typescript
import {
  fsExists,
  fsRead,
  fsWrite,
  fsReadJson,
  fsWriteJson,
  fsStat,
  fsLstat,
  fsReaddir,
  fsGlob,
  fsMkdir,
  fsRm,
  fsCopy,
  fsClearEmptyDirectory,
  fsFindAllParentChildPaths,
  fsReadBuffer,
} from "@simplysm/core-node";

// Check existence
if (await fsExists("/path/to/file.txt")) {
  // ...
}

// Read/write files
const content = await fsRead("/path/to/file.txt");
await fsWrite("/path/to/output.txt", "content"); // Automatically creates parent directories

// Read binary files
const buffer = await fsReadBuffer("/path/to/file.bin");

// Read/write JSON files (uses JsonConvert)
interface Config { port: number; host: string }
const config = await fsReadJson<Config>("/path/to/config.json");
await fsWriteJson("/path/to/output.json", data, { space: 2 });

// Retrieve file information
const stat = await fsStat("/path/to/file.txt");   // Follows symbolic links
const lstat = await fsLstat("/path/to/link");      // Symbolic link itself

// Read directory
const entries = await fsReaddir("/path/to/dir");

// Search files with glob pattern
const tsFiles = await fsGlob("**/*.ts");

// Create/delete directories
await fsMkdir("/path/to/dir"); // recursive
await fsRm("/path/to/target");

// Recursively delete empty directories
await fsClearEmptyDirectory("/path/to/dir");

// Copy files/directories (exclude node_modules with filter function)
await fsCopy("/src", "/dest", (path) => !path.includes("node_modules"));

// Traverse parent directories and glob search
const configs = await fsFindAllParentChildPaths(
  "package.json",
  "/proj/src/sub",
  "/proj",
);
```

> It's recommended to use async functions except when async cannot be used (e.g., in constructors). Sync functions block the event loop and can cause performance degradation.

### FsWatcher (`features/fs-watcher`)

A chokidar-based file system change detection wrapper with glob pattern support. It merges events that occur within a short time and invokes callbacks.

| API | Description |
|-----|-------------|
| `FsWatcher.watch(paths, options?)` | Starts file watching (static, async). `paths` can be file paths or glob patterns (e.g., `"src/**/*.ts"`). Waits until chokidar's `ready` event and returns an `FsWatcher` instance. `options` accepts `chokidar.ChokidarOptions`. |
| `watcher.onChange(opt, cb)` | Registers a file change event handler. `opt` is `{ delay?: number }` (required object, `delay` is optional). Set event merge wait time (ms) with `opt.delay`. Supports chaining. |
| `watcher.close()` | Stops file watching. |
| `FsWatcherEvent` | Event type: `"add"` \| `"addDir"` \| `"change"` \| `"unlink"` \| `"unlinkDir"` |
| `FsWatcherChangeInfo` | Change information interface. Has `event: FsWatcherEvent` and `path: NormPath` fields. |

**Event Merge Strategy:**

When multiple events occur for the same file within a short time, only the final state is delivered.

| Previous Event | New Event | Result |
|----------------|-----------|--------|
| `add` | `change` | `add` (modification right after creation is treated as creation) |
| `add` | `unlink` | Deleted (immediate deletion after creation is treated as no change) |
| `addDir` | `unlinkDir` | Deleted (same as above, for directories) |
| `unlink` | `add` / `change` | `add` (recreation after deletion) |
| `unlinkDir` | `addDir` | `addDir` (directory recreation) |
| Others | - | Overwritten with the latest event |

```typescript
import { FsWatcher } from "@simplysm/core-node";

// Start file watching with glob patterns
const watcher = await FsWatcher.watch(["src/**/*.ts", "tests/**/*.spec.ts"]);

// Register change event handler (merge events within 300ms)
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`);
    // event: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
  }
});

// Stop watching
await watcher.close();
```

### Worker (`worker/`)

Provides a type-safe Worker wrapper based on Node.js `worker_threads`. Using Proxy, you can call worker methods as if calling them directly, and custom events are also supported.

| API | Description |
|-----|-------------|
| `Worker.create<TModule>(filePath, opt?)` | Creates a type-safe Worker Proxy. `filePath` is a `file://` URL or absolute path. `opt` accepts `Omit<WorkerOptions, "stdout" \| "stderr">` from `worker_threads`. |
| `createWorker<TMethods, TEvents>(methods)` | Worker factory used inside worker threads. Registers method objects and returns a sender object with a `send(event, data?)` method for emitting events to the main thread. |
| `WorkerModule` | Module type interface used for type inference in `Worker.create<typeof import("./worker")>()`. |
| `WorkerProxy<TModule>` | Proxy type returned by `Worker.create()`. Provides promisified methods, `on(event, listener)`, `off(event, listener)`, and `terminate()`. |
| `PromisifyMethods<TMethods>` | Utility type that wraps method return values in `Promise<Awaited<R>>`. Used internally by `WorkerProxy`. |
| `WorkerRequest` | Worker internal request message interface. Has `id`, `method`, and `params` fields. |
| `WorkerResponse` | Worker internal response message type. Union of `"return"`, `"error"`, `"event"`, and `"log"` response shapes. |

**Basic Usage (without events):**

```typescript
// worker.ts - worker file
import { createWorker } from "@simplysm/core-node";

export default createWorker({
  add: (a: number, b: number) => a + b,
  multiply: (a: number, b: number) => a * b,
});

// main.ts - main thread
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";
import path from "path";

const worker = Worker.create<typeof MyWorker>(
  path.resolve(import.meta.dirname, "./worker.ts"),
);

const sum = await worker.add(10, 20);      // 30
const product = await worker.multiply(3, 4); // 12

await worker.terminate();
```

**Worker with Events:**

```typescript
// worker.ts
import { createWorker } from "@simplysm/core-node";

interface MyEvents {
  progress: number;
}

// sender is defined below, but is referenced at function execution time due to closure
const methods = {
  calculate: (a: number, b: number) => {
    sender.send("progress", 50);
    const result = a + b;
    sender.send("progress", 100);
    return result;
  },
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;

// main.ts
import { Worker } from "@simplysm/core-node";
import type * as MyWorker from "./worker";
import path from "path";

const worker = Worker.create<typeof MyWorker>(
  path.resolve(import.meta.dirname, "./worker.ts"),
);

// Register event listener
worker.on("progress", (percent) => {
  console.log(`Progress: ${percent}%`);
});

const result = await worker.calculate(10, 20); // 30

// Remove event listener
const listener = (percent: number) => { /* ... */ };
worker.on("progress", listener);
worker.off("progress", listener);

await worker.terminate();
```

## Caveats

- All functions throw errors wrapped in `SdError` to include path information.
- `fsRm` (async) retries up to 6 times (500ms intervals) for transient errors like file locks, but `fsRmSync` (sync) fails immediately without retries.
- In `fsCopy`/`fsCopySync`, the `filter` function is not applied to the top-level `sourcePath`, and returning `false` for a directory skips that directory and all its children.
- `FsWatcher` supports glob patterns (e.g., `"src/**/*.ts"`) by extracting the base directory and filtering matched files. The glob matching is performed using minimatch pattern matching.
- `FsWatcher` internally enforces `ignoreInitial: true`. If you pass `ignoreInitial: false`, the callback will be called with an empty array on the first `onChange` call, but the actual initial file list will not be included.
- `Worker` automatically runs TypeScript worker files through `tsx` in development environment (`.ts` files). In production environment (`.js`), it creates Workers directly.
- `Worker.create` forwards `stdout`/`stderr` from the worker thread to the main process automatically; these options cannot be overridden.
- This package depends on `@simplysm/core-common` and uses `jsonParse`/`jsonStringify` for JSON processing.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@simplysm/core-common` | Common utilities (`SdError`, `jsonParse`, `jsonStringify`, `EventEmitter`, `DebounceQueue`, etc.) |
| `chokidar` | File system change detection (`FsWatcher`) |
| `consola` | Logging |
| `glob` | Glob pattern file search (`fsGlob`, `fsGlobSync`) |
| `minimatch` | Glob pattern matching for `FsWatcher` |
| `tsx` | Running TypeScript worker files in development environment |

## License

Apache-2.0
