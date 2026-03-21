# @simplysm/core-node

Core module (node) -- Node.js utilities for file system, path, watching, and workers.

## Installation

```bash
npm install @simplysm/core-node
```

## Exports

All utilities are re-exported from the package entry point:

```typescript
import { fsx, pathx, FsWatcher, Worker, createWorker } from "@simplysm/core-node";
```

- **`fsx`** -- File system utilities (namespace). See [docs/fs.md](docs/fs.md)
- **`pathx`** -- Path utilities (namespace). See [docs/path.md](docs/path.md)
- **`FsWatcher`** -- Chokidar-based file system watcher. See [docs/features.md](docs/features.md)
- **Worker / createWorker** -- Type-safe worker_threads wrapper. See [docs/worker.md](docs/worker.md)

## Quick Start

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

## Documentation

- [File System Utilities](docs/fs.md)
- [Path Utilities](docs/path.md)
- [Features (FsWatcher)](docs/features.md)
- [Worker](docs/worker.md)
