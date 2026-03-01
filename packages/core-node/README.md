# @simplysm/core-node

Simplysm package - Core module (node)

Node.js utility library providing filesystem helpers, path utilities, a file-system watcher, and a type-safe worker thread abstraction.

## Installation

```bash
pnpm add @simplysm/core-node
```

---

## Table of Contents

- [Filesystem Utilities](#filesystem-utilities)
- [Path Utilities](#path-utilities)
- [File System Watcher](#file-system-watcher)
- [Worker Thread Abstraction](#worker-thread-abstraction)

---

## Filesystem Utilities

[Full documentation: docs/fs.md](docs/fs.md)

Wraps the built-in `fs` module with recursive directory creation, retry logic, glob support, and consistent error wrapping via `SdError`. Both synchronous (`Sync` suffix) and asynchronous variants are provided for all operations.

| Function | Description |
|----------|-------------|
| `fsExistsSync` / `fsExists` | Check if a path exists |
| `fsMkdirSync` / `fsMkdir` | Create directory recursively |
| `fsRmSync` / `fsRm` | Delete file or directory recursively (async retries on lock) |
| `fsCopySync` / `fsCopy` | Copy file or directory with optional filter |
| `fsReadSync` / `fsRead` | Read file as UTF-8 string |
| `fsReadBufferSync` / `fsReadBuffer` | Read file as `Buffer` |
| `fsReadJsonSync` / `fsReadJson` | Read and parse a JSON file |
| `fsWriteSync` / `fsWrite` | Write string or `Uint8Array` to file (auto-creates parent dirs) |
| `fsWriteJsonSync` / `fsWriteJson` | Serialize and write JSON to file |
| `fsReaddirSync` / `fsReaddir` | List directory entries |
| `fsStatSync` / `fsStat` | Get `fs.Stats` following symlinks |
| `fsLstatSync` / `fsLstat` | Get `fs.Stats` without following symlinks |
| `fsGlobSync` / `fsGlob` | Find files by glob pattern (returns absolute paths) |
| `fsClearEmptyDirectory` | Recursively delete empty directories |
| `fsFindAllParentChildPathsSync` / `fsFindAllParentChildPaths` | Find matching paths by traversing parent directories |

---

## Path Utilities

[Full documentation: docs/path.md](docs/path.md)

Complements the built-in `path` module with normalization, POSIX conversion, and filtering helpers.

| Export | Description |
|--------|-------------|
| `NormPath` (type) | Branded string type for normalized absolute paths |
| `pathNorm` | Resolve segments to an absolute `NormPath` |
| `pathPosix` | Join and convert to forward-slash POSIX path |
| `pathChangeFileDirectory` | Re-root a file path to a different base directory |
| `pathBasenameWithoutExt` | Get filename without extension |
| `pathIsChildPath` | Check if one path is strictly inside another |
| `pathFilterByTargets` | Filter absolute paths by a list of relative targets |

---

## File System Watcher

[Full documentation: docs/watcher.md](docs/watcher.md)

A chokidar-based watcher that debounces rapid events and delivers them as a single batched array to a callback.

| API | Description |
|-----|-------------|
| `FsWatcher.watch(paths, options?)` | Start watching; returns a ready `FsWatcher` instance |
| `watcher.onChange(opt, cb)` | Register a debounced batch-change handler |
| `watcher.close()` | Stop watching and dispose resources |

Related types: `FsWatcherEvent`, `FsWatcherChangeInfo`

---

## Worker Thread Abstraction

[Full documentation: docs/worker.md](docs/worker.md)

Type-safe RPC bridge over Node.js `worker_threads`. Define methods in a worker file and call them from the main thread with full TypeScript inference.

| API | Description |
|-----|-------------|
| `createWorker(methods)` | Register RPC methods inside a worker file |
| `Worker.create(filePath, opt?)` | Create a typed proxy to the worker from the main thread |

Related types: `WorkerModule`, `WorkerProxy`, `PromisifyMethods`, `WorkerRequest`, `WorkerResponse`
