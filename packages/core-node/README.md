# @simplysm/core-node

Node.js-specific core utilities for the Simplysm framework. Provides enhanced file system operations, path utilities, file watching, and a type-safe worker thread abstraction.

## Installation

```bash
npm install @simplysm/core-node
```

## API Overview

### Utilities / fsx

Namespace `fsx` -- Enhanced file system functions (sync and async pairs).

| API | Type | Description |
|-----|------|-------------|
| `exists` | function | Check if a path exists (async) |
| `existsSync` | function | Check if a path exists (sync) |
| `mkdir` | function | Create directory recursively (async) |
| `mkdirSync` | function | Create directory recursively (sync) |
| `rm` | function | Remove file/directory with retry (async) |
| `rmSync` | function | Remove file/directory (sync) |
| `copy` | function | Copy file/directory with filter (async) |
| `copySync` | function | Copy file/directory with filter (sync) |
| `read` | function | Read file as UTF-8 string (async) |
| `readSync` | function | Read file as UTF-8 string (sync) |
| `readBuffer` | function | Read file as Buffer (async) |
| `readBufferSync` | function | Read file as Buffer (sync) |
| `readJson` | function | Read and parse JSON file (async) |
| `readJsonSync` | function | Read and parse JSON file (sync) |
| `write` | function | Write data to file (async) |
| `writeSync` | function | Write data to file (sync) |
| `writeJson` | function | Write data as JSON file (async) |
| `writeJsonSync` | function | Write data as JSON file (sync) |
| `readdir` | function | List directory contents (async) |
| `readdirSync` | function | List directory contents (sync) |
| `stat` | function | Get file stats, follows symlinks (async) |
| `statSync` | function | Get file stats, follows symlinks (sync) |
| `lstat` | function | Get file stats, no symlink follow (async) |
| `lstatSync` | function | Get file stats, no symlink follow (sync) |
| `glob` | function | Search files by glob pattern (async) |
| `globSync` | function | Search files by glob pattern (sync) |
| `clearEmptyDirectory` | function | Recursively remove empty directories (async) |
| `findAllParentChildPaths` | function | Search parent dirs for glob matches (async) |
| `findAllParentChildPathsSync` | function | Search parent dirs for glob matches (sync) |

> See [docs/fsx.md](./docs/fsx.md) for details.

### Utilities / pathx

Namespace `pathx` -- Path manipulation utilities.

| API | Type | Description |
|-----|------|-------------|
| `NormPath` | type | Branded string type for normalized paths |
| `posix` | function | Convert path to POSIX style (backslash to slash) |
| `changeFileDirectory` | function | Change a file's parent directory |
| `basenameWithoutExt` | function | Get filename without extension |
| `isChildPath` | function | Check if a path is a child of another |
| `norm` | function | Normalize and resolve path to `NormPath` |
| `filterByTargets` | function | Filter file paths by target directory prefixes |

> See [docs/pathx.md](./docs/pathx.md) for details.

### Features

| API | Type | Description |
|-----|------|-------------|
| `FsWatcherEvent` | type | File change event type union |
| `FsWatcherChangeInfo` | interface | File change event info |
| `FsWatcher` | class | Debounced file system watcher (chokidar-based) |

> See [docs/fs-watcher.md](./docs/fs-watcher.md) for details.

### Worker

| API | Type | Description |
|-----|------|-------------|
| `WorkerModule` | interface | Type structure for worker modules |
| `PromisifyMethods` | type | Maps sync methods to async (Promise) |
| `WorkerProxy` | type | Proxy type returned by `Worker.create()` |
| `WorkerRequest` | interface | Internal worker request message |
| `WorkerResponse` | type | Internal worker response message |
| `Worker` | object | Type-safe worker thread factory |
| `createWorker` | function | Create a worker module in the worker thread |

> See [docs/worker.md](./docs/worker.md) for details.

## Usage Examples

### File system operations

```typescript
import { fsx } from "@simplysm/core-node";

// Read/write files
const content = await fsx.read("/path/to/file.txt");
await fsx.write("/path/to/output.txt", "hello");

// JSON
const data = await fsx.readJson<{ name: string }>("/path/to/config.json");
await fsx.writeJson("/path/to/out.json", data, { space: 2 });

// Copy with filter
await fsx.copy("/src", "/dest", (p) => !p.endsWith(".tmp"));

// Glob
const tsFiles = await fsx.glob("/project/src/**/*.ts");
```

### Path utilities

```typescript
import { pathx } from "@simplysm/core-node";

const p = pathx.posix("C:\\Users\\test"); // "C:/Users/test"
const name = pathx.basenameWithoutExt("file.spec.ts"); // "file.spec"
const isChild = pathx.isChildPath("/a/b/c", "/a/b"); // true
const norm = pathx.norm("/some/path"); // NormPath
```

### File watcher

```typescript
import { FsWatcher } from "@simplysm/core-node";

const watcher = await FsWatcher.watch(["src/**/*.ts"]);
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`);
  }
});

await watcher.close();
```

### Worker threads

```typescript
// worker.ts
import { createWorker } from "@simplysm/core-node";

export default createWorker({
  add: (a: number, b: number) => a + b,
});

// main.ts
import { Worker } from "@simplysm/core-node";

const worker = Worker.create<typeof import("./worker")>("./worker.ts");
const result = await worker.add(10, 20); // 30
await worker.terminate();
```
