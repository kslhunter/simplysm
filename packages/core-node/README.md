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

Import as a namespace:

```ts
import { fsx } from "@simplysm/core-node";
```

Wraps the built-in `fs` module with recursive directory creation, retry logic, glob support, and consistent error wrapping via `SdError`. Both synchronous (`Sync` suffix) and asynchronous variants are provided for most operations.

### Existence Check

| Function | Signature | Description |
|----------|-----------|-------------|
| `fsx.existsSync` | `(targetPath: string) => boolean` | Check if a path exists (synchronous) |
| `fsx.exists` | `(targetPath: string) => Promise<boolean>` | Check if a path exists (asynchronous) |

```ts
if (await fsx.exists("/some/file.txt")) { /* ... */ }
if (fsx.existsSync("/some/file.txt")) { /* ... */ }
```

### Create Directory

| Function | Signature | Description |
|----------|-----------|-------------|
| `fsx.mkdirSync` | `(targetPath: string) => void` | Create directory recursively (synchronous) |
| `fsx.mkdir` | `(targetPath: string) => Promise<void>` | Create directory recursively (asynchronous) |

```ts
await fsx.mkdir("/some/deep/dir");
fsx.mkdirSync("/some/deep/dir");
```

### Delete

| Function | Signature | Description |
|----------|-----------|-------------|
| `fsx.rmSync` | `(targetPath: string) => void` | Delete file or directory recursively (synchronous, no retry) |
| `fsx.rm` | `(targetPath: string) => Promise<void>` | Delete file or directory recursively (asynchronous, retries up to 6 times at 500ms intervals on transient errors) |

```ts
await fsx.rm("/some/dir");
fsx.rmSync("/some/file.txt");
```

### Copy

| Function | Signature | Description |
|----------|-----------|-------------|
| `fsx.copySync` | `(sourcePath: string, targetPath: string, filter?: (absolutePath: string) => boolean) => void` | Copy file or directory (synchronous) |
| `fsx.copy` | `(sourcePath: string, targetPath: string, filter?: (absolutePath: string) => boolean) => Promise<void>` | Copy file or directory (asynchronous) |

If `sourcePath` does not exist, the function returns without error. The `filter` callback receives the absolute path of each child item; returning `false` excludes that item and its descendants. The top-level `sourcePath` is never filtered.

```ts
await fsx.copy("/src", "/dest", (p) => !p.includes("node_modules"));
fsx.copySync("/src", "/dest");
```

### Read File

| Function | Signature | Description |
|----------|-----------|-------------|
| `fsx.readSync` | `(targetPath: string) => string` | Read file as UTF-8 string (synchronous) |
| `fsx.read` | `(targetPath: string) => Promise<string>` | Read file as UTF-8 string (asynchronous) |
| `fsx.readBufferSync` | `(targetPath: string) => Buffer` | Read file as `Buffer` (synchronous) |
| `fsx.readBuffer` | `(targetPath: string) => Promise<Buffer>` | Read file as `Buffer` (asynchronous) |
| `fsx.readJsonSync` | `<TData = unknown>(targetPath: string) => TData` | Read and parse a JSON file (synchronous) |
| `fsx.readJson` | `<TData = unknown>(targetPath: string) => Promise<TData>` | Read and parse a JSON file (asynchronous) |

```ts
const text = await fsx.read("/config.txt");
const buf = fsx.readBufferSync("/image.png");
const config = await fsx.readJson<Config>("/config.json");
```

### Write File

| Function | Signature | Description |
|----------|-----------|-------------|
| `fsx.writeSync` | `(targetPath: string, data: string \| Uint8Array) => void` | Write to file, auto-creating parent directories (synchronous) |
| `fsx.write` | `(targetPath: string, data: string \| Uint8Array) => Promise<void>` | Write to file, auto-creating parent directories (asynchronous) |
| `fsx.writeJsonSync` | `(targetPath: string, data: unknown, options?: { replacer?: ..., space?: string \| number }) => void` | Serialize and write JSON to file (synchronous) |
| `fsx.writeJson` | `(targetPath: string, data: unknown, options?: { replacer?: ..., space?: string \| number }) => Promise<void>` | Serialize and write JSON to file (asynchronous) |

The `writeJsonSync`/`writeJson` `options` parameter:
- `replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown` — custom JSON replacer function
- `space?: string | number` — indentation (passed to `JSON.stringify`)

```ts
await fsx.write("/output.txt", "hello");
fsx.writeSync("/output.bin", new Uint8Array([1, 2, 3]));
await fsx.writeJson("/config.json", { key: "value" }, { space: 2 });
fsx.writeJsonSync("/config.json", { key: "value" });
```

### Read Directory

| Function | Signature | Description |
|----------|-----------|-------------|
| `fsx.readdirSync` | `(targetPath: string) => string[]` | List directory entries (synchronous) |
| `fsx.readdir` | `(targetPath: string) => Promise<string[]>` | List directory entries (asynchronous) |

```ts
const entries = await fsx.readdir("/some/dir");
```

### File Information

| Function | Signature | Description |
|----------|-----------|-------------|
| `fsx.statSync` | `(targetPath: string) => fs.Stats` | Get `fs.Stats` following symlinks (synchronous) |
| `fsx.stat` | `(targetPath: string) => Promise<fs.Stats>` | Get `fs.Stats` following symlinks (asynchronous) |
| `fsx.lstatSync` | `(targetPath: string) => fs.Stats` | Get `fs.Stats` without following symlinks (synchronous) |
| `fsx.lstat` | `(targetPath: string) => Promise<fs.Stats>` | Get `fs.Stats` without following symlinks (asynchronous) |

```ts
const stats = await fsx.stat("/some/file.txt");
console.log(stats.size);
```

### Glob

| Function | Signature | Description |
|----------|-----------|-------------|
| `fsx.globSync` | `(pattern: string, options?: GlobOptions) => string[]` | Find files by glob pattern, returns absolute paths (synchronous) |
| `fsx.glob` | `(pattern: string, options?: GlobOptions) => Promise<string[]>` | Find files by glob pattern, returns absolute paths (asynchronous) |

```ts
const files = await fsx.glob("src/**/*.ts");
const configs = fsx.globSync("**/tsconfig.json", { dot: true });
```

### Utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| `fsx.clearEmptyDirectory` | `(dirPath: string) => Promise<void>` | Recursively delete all empty directories under `dirPath`; if all children of a parent are removed, the parent is also deleted |
| `fsx.findAllParentChildPathsSync` | `(childGlob: string, fromPath: string, rootPath?: string) => string[]` | Find matching paths by traversing parent directories toward the root (synchronous) |
| `fsx.findAllParentChildPaths` | `(childGlob: string, fromPath: string, rootPath?: string) => Promise<string[]>` | Find matching paths by traversing parent directories toward the root (asynchronous) |

`findAllParentChildPathsSync` / `findAllParentChildPaths` walk from `fromPath` up to `rootPath` (or the filesystem root if omitted), collecting all paths that match `childGlob` in each directory. `fromPath` must be a child of `rootPath`; otherwise the search goes to the filesystem root.

```ts
await fsx.clearEmptyDirectory("/build");

const configs = fsx.findAllParentChildPathsSync("tsconfig.json", "/project/src", "/project");
// → ["/project/src/tsconfig.json", "/project/tsconfig.json"]

const pkgFiles = await fsx.findAllParentChildPaths("package.json", process.cwd());
```

---

## Path Utilities

Import as a namespace:

```ts
import { pathx } from "@simplysm/core-node";
```

Complements the built-in `path` module with normalization, POSIX conversion, and filtering helpers.

### Types

| Type | Description |
|------|-------------|
| `pathx.NormPath` | Branded `string` type for normalized absolute paths. Can only be produced by `pathx.norm()`. |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `pathx.norm` | `(...paths: string[]) => NormPath` | Resolve segments to an absolute `NormPath` using `path.resolve` |
| `pathx.posix` | `(...args: string[]) => string` | Join segments and convert backslashes to forward slashes |
| `pathx.changeFileDirectory` | `(filePath: string, fromDirectory: string, toDirectory: string) => string` | Re-root a file path to a different base directory; throws if `filePath` is not inside `fromDirectory` |
| `pathx.basenameWithoutExt` | `(filePath: string) => string` | Get filename without its last extension |
| `pathx.isChildPath` | `(childPath: string, parentPath: string) => boolean` | Return `true` if `childPath` is strictly inside `parentPath` (same path returns `false`) |
| `pathx.filterByTargets` | `(files: string[], targets: string[], cwd: string) => string[]` | Filter absolute paths to only those matching or under any entry in `targets` (relative to `cwd`); returns `files` unchanged when `targets` is empty |

```ts
import { pathx } from "@simplysm/core-node";

// norm
const abs: pathx.NormPath = pathx.norm("relative", "path");

// posix
pathx.posix("C:\\Users\\test");         // "C:/Users/test"
pathx.posix("src", "index.ts");         // "src/index.ts"

// changeFileDirectory
pathx.changeFileDirectory("/a/b/c.txt", "/a", "/x");  // "/x/b/c.txt"

// basenameWithoutExt
pathx.basenameWithoutExt("file.spec.ts");  // "file.spec"

// isChildPath
pathx.isChildPath("/a/b/c", "/a/b");  // true
pathx.isChildPath("/a/b", "/a/b");    // false

// filterByTargets
const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
pathx.filterByTargets(files, ["src"], "/proj");
// → ["/proj/src/a.ts", "/proj/src/b.ts"]
```

---

## File System Watcher

```ts
import { FsWatcher } from "@simplysm/core-node";
import type { FsWatcherEvent, FsWatcherChangeInfo } from "@simplysm/core-node";
```

A chokidar-based watcher that debounces rapid events and delivers them as a single batched array to a callback. Glob patterns are supported in the `paths` array and are matched using minimatch.

**Note:** `ignoreInitial` is always set to `true` internally. If you pass `options.ignoreInitial: false`, the callback is invoked once with an empty array on the first `onChange` call, but the actual initial file list is not included.

### API

| API | Description |
|-----|-------------|
| `FsWatcher.watch(paths, options?)` | Static method. Start watching and wait until the watcher is ready. Returns `Promise<FsWatcher>`. |
| `watcher.onChange(opt, cb)` | Register a debounced batch-change handler. `opt.delay` sets the debounce window in ms. Returns `this` for chaining. |
| `watcher.close()` | Stop watching and dispose all resources. Returns `Promise<void>`. |

**`FsWatcher.watch` parameters:**
- `paths: string[]` — file/directory paths or glob patterns to watch
- `options?: ChokidarOptions` — passed to chokidar (except `ignoreInitial`, which is always overridden to `true`)

**`onChange` parameters:**
- `opt: { delay?: number }` — debounce delay in milliseconds
- `cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>` — called with the merged batch of changes

**Event merging rules applied within a debounce window:**
- `add` then `change` → `add`
- `add` then `unlink` → removed (no change emitted)
- `unlink` then `add` or `change` → `add`
- `unlinkDir` then `addDir` → `addDir`
- Otherwise the latest event wins.

### Types

```ts
type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir";

interface FsWatcherChangeInfo {
  event: FsWatcherEvent;
  path: NormPath;  // normalized absolute path
}
```

### Example

```ts
import { FsWatcher } from "@simplysm/core-node";

const watcher = await FsWatcher.watch(["src/**/*.ts", "public"]);

watcher.onChange({ delay: 300 }, async (changes) => {
  for (const { event, path } of changes) {
    console.log(`${event}: ${path}`);
  }
});

// Later:
await watcher.close();
```

---

## Worker Thread Abstraction

```ts
import { createWorker, Worker } from "@simplysm/core-node";
import type {
  WorkerModule,
  WorkerProxy,
  PromisifyMethods,
  WorkerRequest,
  WorkerResponse,
} from "@simplysm/core-node";
```

Type-safe RPC bridge over Node.js `worker_threads`. Define methods in a worker file and call them from the main thread with full TypeScript inference. In development (`.ts` files), workers are executed via `tsx`; in production (`.js` files), workers are executed directly.

### `createWorker`

Used inside a worker file to register RPC methods and optionally declare typed events.

```ts
function createWorker<
  TMethods extends Record<string, (...args: any[]) => unknown>,
  TEvents extends Record<string, unknown> = Record<string, never>,
>(
  methods: TMethods,
): {
  send<TEventName extends keyof TEvents & string>(event: TEventName, data?: TEvents[TEventName]): void;
  __methods: TMethods;
  __events: TEvents;
}
```

- `methods` — object mapping method names to their implementations
- Returns an object with a `send(event, data?)` method for emitting typed events to the main thread
- The `__methods` and `__events` fields carry type information used by `Worker.create`

```ts
// worker.ts
import { createWorker } from "@simplysm/core-node";

interface MyEvents { progress: number; }

const methods = {
  add: (a: number, b: number) => a + b,
  calc: (x: number) => {
    sender.send("progress", 50);
    return x * 2;
  },
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;
```

### `Worker.create`

Used in the main thread to create a typed proxy to a worker file.

```ts
Worker.create<TModule extends WorkerModule>(
  filePath: string,
  opt?: Omit<WorkerOptions, "stdout" | "stderr">,
): WorkerProxy<TModule>
```

- `filePath` — absolute path or `file://` URL to the worker file (`.ts` in development, `.js` in production)
- `opt` — standard `worker_threads` `WorkerOptions` (excluding `stdout`/`stderr`, which are always piped)
- Returns a `WorkerProxy` with all worker methods promisified, plus `on()`, `off()`, and `terminate()`

```ts
// main.ts
import { Worker } from "@simplysm/core-node";

const worker = Worker.create<typeof import("./worker")>("./worker.ts");

worker.on("progress", (value) => console.log("progress:", value));

const result = await worker.add(10, 20);  // 30
await worker.terminate();
```

### Types

| Type | Description |
|------|-------------|
| `WorkerModule` | Shape constraint for the module returned by `createWorker()`. Used as the type parameter of `Worker.create`. |
| `WorkerProxy<TModule>` | Proxy type returned by `Worker.create()`. Provides promisified methods plus `on(event, listener)`, `off(event, listener)`, and `terminate()`. |
| `PromisifyMethods<TMethods>` | Maps each method's return type to `Promise<Awaited<R>>`. |
| `WorkerRequest` | Internal RPC request message shape: `{ id: string, method: string, params: unknown[] }`. |
| `WorkerResponse` | Internal RPC response message — a discriminated union of `"return"`, `"error"`, `"event"`, and `"log"` variants. |

### `WorkerProxy` interface detail

```ts
type WorkerProxy<TModule extends WorkerModule> =
  PromisifyMethods<TModule["default"]["__methods"]> & {
    on<TEventName extends keyof TModule["default"]["__events"] & string>(
      event: TEventName,
      listener: (data: TModule["default"]["__events"][TEventName]) => void,
    ): void;
    off<TEventName extends keyof TModule["default"]["__events"] & string>(
      event: TEventName,
      listener: (data: TModule["default"]["__events"][TEventName]) => void,
    ): void;
    terminate(): Promise<void>;
  };
```
