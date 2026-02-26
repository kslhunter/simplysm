# @simplysm/core-node

Simplysm package - Core module (node)

## Installation

pnpm add @simplysm/core-node

## Source Index

### Utils

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/utils/fs.ts` | `fsExistsSync`, `fsExists`, `fsMkdirSync`, `fsMkdir`, `fsRmSync`, `fsRm`, `fsCopySync`, `fsCopy`, `fsReadSync`, `fsRead`, `fsReadBufferSync`, `fsReadBuffer`, `fsReadJsonSync`, `fsReadJson`, `fsWriteSync`, `fsWrite`, `fsWriteJsonSync`, `fsWriteJson`, `fsReaddirSync`, `fsReaddir`, `fsStatSync`, `fsStat`, `fsLstatSync`, `fsLstat`, `fsGlobSync`, `fsGlob`, `fsClearEmptyDirectory`, `fsFindAllParentChildPathsSync`, `fsFindAllParentChildPaths` | Comprehensive file system utilities (read, write, copy, delete, glob, stat) | `fs.spec.ts` |
| `src/utils/path.ts` | `NormPath`, `pathPosix`, `pathChangeFileDirectory`, `pathBasenameWithoutExt`, `pathIsChildPath`, `pathNorm`, `pathFilterByTargets` | Path normalization and manipulation utilities for posix-style paths | `path.spec.ts` |

### Features

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/features/fs-watcher.ts` | `FsWatcherEvent`, `FsWatcherChangeInfo`, `FsWatcher` | File system watcher with debounced change detection and event filtering | `fs-watcher.spec.ts` |

### Worker

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/worker/types.ts` | `WorkerModule`, `PromisifyMethods`, `WorkerProxy`, `WorkerRequest`, `WorkerResponse` | Type definitions for worker thread message passing and proxy pattern | - |
| `src/worker/worker.ts` | `Worker` | Worker thread wrapper with method-based RPC and error forwarding | `sd-worker.spec.ts` |
| `src/worker/create-worker.ts` | `createWorker` | Factory to create a type-safe worker proxy from a module path | `sd-worker.spec.ts` |

## License

Apache-2.0
