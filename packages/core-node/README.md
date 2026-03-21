# @simplysm/core-node

Simplysm package - Core module (node). Node.js utilities for file system operations, path manipulation, file watching, and type-safe worker threads.

## Installation

```bash
npm install @simplysm/core-node
```

## API Overview

### File System Utils (`fsx` namespace)

| API | Type | Description |
|-----|------|-------------|
| `existsSync` | function | Check if a file or directory exists (sync) |
| `exists` | function | Check if a file or directory exists (async) |
| `mkdirSync` | function | Create a directory recursively (sync) |
| `mkdir` | function | Create a directory recursively (async) |
| `rmSync` | function | Delete a file or directory (sync) |
| `rm` | function | Delete a file or directory with retries (async) |
| `copySync` | function | Copy a file or directory with optional filter (sync) |
| `copy` | function | Copy a file or directory with optional filter (async) |
| `readSync` | function | Read a file as UTF-8 string (sync) |
| `read` | function | Read a file as UTF-8 string (async) |
| `readBufferSync` | function | Read a file as Buffer (sync) |
| `readBuffer` | function | Read a file as Buffer (async) |
| `readJsonSync` | function | Read a JSON file using JsonConvert (sync) |
| `readJson` | function | Read a JSON file using JsonConvert (async) |
| `writeSync` | function | Write data to a file, auto-creates parent dirs (sync) |
| `write` | function | Write data to a file, auto-creates parent dirs (async) |
| `writeJsonSync` | function | Write data to a JSON file (sync) |
| `writeJson` | function | Write data to a JSON file (async) |
| `readdirSync` | function | Read directory contents (sync) |
| `readdir` | function | Read directory contents (async) |
| `statSync` | function | Get file info, follows symlinks (sync) |
| `stat` | function | Get file info, follows symlinks (async) |
| `lstatSync` | function | Get file info, no symlink follow (sync) |
| `lstat` | function | Get file info, no symlink follow (async) |
| `globSync` | function | Search files by glob pattern (sync) |
| `glob` | function | Search files by glob pattern (async) |
| `clearEmptyDirectory` | function | Recursively delete empty directories |
| `findAllParentChildPathsSync` | function | Search for glob matches traversing parent dirs (sync) |
| `findAllParentChildPaths` | function | Search for glob matches traversing parent dirs (async) |

-> See [docs/fs.md](./docs/fs.md) for details.

### Path Utils (`pathx` namespace)

| API | Type | Description |
|-----|------|-------------|
| `NormPath` | type | Brand type for normalized path |
| `posix` | function | Convert to POSIX-style path (backslash to forward slash) |
| `changeFileDirectory` | function | Change the directory of a file path |
| `basenameWithoutExt` | function | Get filename without extension |
| `isChildPath` | function | Check if a path is a child of another path |
| `norm` | function | Normalize path to absolute NormPath |
| `filterByTargets` | function | Filter files by target path list |

-> See [docs/path.md](./docs/path.md) for details.

### Features

| API | Type | Description |
|-----|------|-------------|
| `FsWatcherEvent` | type | File change event type (`add`, `addDir`, `change`, `unlink`, `unlinkDir`) |
| `FsWatcherChangeInfo` | interface | File change information (`event`, `path`) |
| `FsWatcher` | class | Chokidar-based file watcher with event merging |

-> See [docs/features.md](./docs/features.md) for details.

### Worker System

| API | Type | Description |
|-----|------|-------------|
| `WorkerModule` | interface | Worker module type structure for type inference |
| `PromisifyMethods` | type | Maps method return values to Promise |
| `WorkerProxy` | type | Proxy type with promisified methods + on/off/terminate |
| `WorkerRequest` | interface | Internal worker request message |
| `WorkerResponse` | type | Internal worker response message |
| `Worker` | object | Type-safe Worker wrapper with `create()` factory |
| `createWorker` | function | Worker factory for use in worker threads |

-> See [docs/worker.md](./docs/worker.md) for details.

## Usage Examples

```typescript
import { fsx, pathx, FsWatcher, Worker, createWorker } from "@simplysm/core-node";

// File system
const content = await fsx.read("/path/to/file.txt");
await fsx.write("/path/to/output.txt", content);

// Path utilities
const normalized = pathx.norm("/some/path");
const posixPath = pathx.posix("C:\\Users\\test");

// File watching
const watcher = await FsWatcher.watch(["src/**/*.ts"]);
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    // handle changes
  }
});

// Workers
const worker = Worker.create<typeof import("./worker")>("./worker.ts");
const result = await worker.add(10, 20);
await worker.terminate();
```
