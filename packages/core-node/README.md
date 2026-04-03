# @simplysm/core-node

Node.js-specific core utilities for the Simplysm framework. Provides enhanced file system operations, child process execution, path utilities, file watching, consola logging configuration, and a type-safe worker thread abstraction.

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
| `readBytes` | function | Read file as Uint8Array (async) |
| `readBytesSync` | function | Read file as Uint8Array (sync) |
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

### Utilities / cpx

Namespace `cpx` -- Child process execution utilities.

| API | Type | Description |
|-----|------|-------------|
| `SpawnResult` | interface | Result of a spawned child process |
| `SpawnProcess` | class | `PromiseLike<SpawnResult>` wrapper with `kill()` support |
| `spawn` | function | Spawn a child process (async, returns `SpawnProcess`) |
| `spawnSync` | function | Spawn a child process (sync) |
| `codePageToEncoding` | function | Convert Windows code page number to encoding name |
| `getSystemEncoding` | function | Detect system console encoding (cached) |
| `resetEncodingCache` | function | Clear the cached system encoding |
| `resolveStdioPipe` | function | Determine which stdio channels are piped |
| `decodeBytes` | function | Decode `Uint8Array` output with system encoding fallback |

> See [docs/cpx.md](./docs/cpx.md) for details.

### Utilities / pathx

Namespace `pathx` -- Path manipulation utilities.

| API | Type | Description |
|-----|------|-------------|
| `PosixPath` | type | Branded string type for POSIX-style paths |
| `posix` | function | Convert path to POSIX style (backslash to slash) |
| `posixResolve` | function | Resolve to absolute path and convert to POSIX style |
| `changeFileDirectory` | function | Change a file's parent directory |
| `basenameWithoutExt` | function | Get filename without extension |
| `isChildPath` | function | Check if a path is a child of another |
| `filterByTargets` | function | Filter file paths by target directory prefixes |

> See [docs/pathx.md](./docs/pathx.md) for details.

### Features / FsWatcher

| API | Type | Description |
|-----|------|-------------|
| `FsWatcherEvent` | type | File change event type union |
| `FsWatcherChangeInfo` | interface | File change event info |
| `FsWatcher` | class | Debounced file system watcher (chokidar-based) |

> See [docs/fs-watcher.md](./docs/fs-watcher.md) for details.

### Features / Consola

| API | Type | Description |
|-----|------|-------------|
| `PrettyReporter` | class | Terminal consola reporter with icons, colors, and error stack formatting |
| `FileReporterOptions` | interface | Options for `createFileReporter` (maxSize, maxDays) |
| `createFileReporter` | function | Create a file-based consola reporter (JSON lines, date rotation) |
| `withMaxLevel` | function | Wrap a reporter to filter out log entries above a max level |
| `SetupConsolaOptions` | interface | Options for `setupConsola` |
| `setupConsola` | function | Configure consola reporters based on environment (prod/dev/debug) |

> See [docs/consola.md](./docs/consola.md) for details.

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

// Binary read
const rawBytes = await fsx.readBytes("/path/to/image.png");

// JSON
const data = await fsx.readJson<{ name: string }>("/path/to/config.json");
await fsx.writeJson("/path/to/out.json", data, { space: 2 });

// Copy with filter
await fsx.copy("/src", "/dest", (p) => !p.endsWith(".tmp"));

// Glob
const tsFiles = await fsx.glob("/project/src/**/*.ts");
```

### Child process execution

```typescript
import { cpx } from "@simplysm/core-node";

// Await result
const result = await cpx.spawn("git", ["status"], { cwd: "/project" });
// result: { stdout, stderr, exitCode }

// Kill a running process
const proc = cpx.spawn("long-running-cmd", []);
proc.kill();

// Inherit stdio, don't reject on non-zero exit
await cpx.spawn("make", ["build"], { stdio: "inherit", reject: false });

// Synchronous execution
const syncResult = cpx.spawnSync("node", ["--version"]);
```

### Path utilities

```typescript
import { pathx } from "@simplysm/core-node";

const p = pathx.posix("C:\\Users\\test"); // "C:/Users/test"
const abs = pathx.posixResolve("./relative"); // absolute PosixPath
const name = pathx.basenameWithoutExt("file.spec.ts"); // "file.spec"
const isChild = pathx.isChildPath("/a/b/c", "/a/b"); // true
```

### Consola logging

```typescript
import { setupConsola } from "@simplysm/core-node";

// Auto-configure based on environment (prod → file only, dev → file + terminal)
setupConsola();

// CLI mode — always use terminal output regardless of environment
setupConsola({ cli: true });
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
