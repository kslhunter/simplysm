# @simplysm/core-node

> Simplysm package - Core module (node)

Node.js utility library providing enhanced filesystem operations, path manipulation, file watching, and a type-safe worker thread wrapper. All filesystem functions include automatic error wrapping with `SdError` for better stack traces.

## Installation

```bash
npm install @simplysm/core-node
```

## Documentation

| Category | Description | File |
|---|---|---|
| Filesystem Utilities | File/directory CRUD, glob, JSON read/write | [docs/filesystem.md](docs/filesystem.md) |
| Path Utilities | Path normalization, POSIX conversion, child path checks | [docs/path.md](docs/path.md) |
| File Watcher | Chokidar-based watcher with event debouncing and merging | [docs/fs-watcher.md](docs/fs-watcher.md) |
| Worker | Type-safe worker thread wrapper with RPC and events | [docs/worker.md](docs/worker.md) |

## Quick Example

```typescript
import { fsx, pathx, FsWatcher, Worker } from "@simplysm/core-node";

// Filesystem
const content = await fsx.read("config.json");
await fsx.write("output.txt", "hello");
const files = await fsx.glob("src/**/*.ts");

// Path
const normalized = pathx.norm("/some/path");
const posixPath = pathx.posix("C:\\Users\\test"); // "C:/Users/test"

// File watcher
const watcher = await FsWatcher.watch(["src/**/*.ts"]);
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`);
  }
});

// Worker
const worker = Worker.create<typeof import("./my-worker")>("./my-worker.ts");
const result = await worker.add(1, 2);
await worker.terminate();
```
