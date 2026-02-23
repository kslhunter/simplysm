# @simplysm/sd-core-node

Node.js core utilities for the Simplysm framework. Provides file system helpers, hashing, path normalization, file watching, structured logging, process spawning, and a typed worker thread system.

## Installation

```bash
yarn add @simplysm/sd-core-node
```

## Main Modules

### FsUtils

Static utility class wrapping Node.js `fs` operations with improved error handling (wraps errors with `SdError`). Most methods have both async and sync variants.

```typescript
import { FsUtils } from "@simplysm/sd-core-node";
```

#### File Read/Write

- `readFileAsync(targetPath: string): Promise<string>` — Read file as UTF-8 string. Throws if the file does not exist.
- `readFile(targetPath: string): string` — Sync version
- `readFileBufferAsync(targetPath: string): Promise<Buffer>` — Read file as Buffer
- `readFileBuffer(targetPath: string): Buffer` — Sync version
- `writeFileAsync(targetPath: string, data: any): Promise<void>` — Write file (auto-creates parent dirs)
- `writeFile(targetPath: string, data: any): void` — Sync version (flushes to disk)
- `writeFilesAsync(files: { path: TNormPath; data: string | Buffer; prevHash?: string; hash?: string }[]): Promise<{ path: TNormPath; hash: string }[]>` — Write multiple files with hash-based change detection. Files are grouped by filename and processed in parallel across groups; files within the same group are processed sequentially. Only writes a file if `prevHash !== hash`.
- `appendFile(targetPath: string, data: any): void` — Append data to file (UTF-8)

#### JSON Read/Write

- `readJsonAsync(targetPath: string): Promise<any>` — Read and parse JSON file
- `readJson(targetPath: string): any` — Sync version
- `writeJsonAsync(targetPath: string, data: any, options?): Promise<void>` — Serialize and write JSON
- `writeJson(targetPath: string, data: any, options?): void` — Sync version

**JSON options:**

```typescript
{
  replacer?: (this: any, key: string | undefined, value: any) => any;
  space?: string | number;
}
```

#### Directory Operations

- `readdirAsync(targetPath: string): Promise<string[]>` — List directory contents
- `readdir(targetPath: string): string[]` — Sync version
- `mkdirsAsync(targetPath: string): Promise<void>` — Create directory recursively (no-op if already exists)
- `mkdirs(targetPath: string): void` — Sync version
- `clearEmptyDirectoryAsync(dirPath: string): Promise<void>` — Recursively remove empty directories

#### File Operations

- `exists(targetPath: string): boolean` — Check if path exists
- `removeAsync(targetPath: string): Promise<void>` — Remove file/directory recursively (retries up to 6 times with 500ms delay)
- `remove(targetPath: string): void` — Sync version
- `copyAsync(sourcePath: string, targetPath: string, filter?): Promise<void>` — Copy file/directory recursively with optional filter. No-op if source does not exist.
- `copy(sourcePath: string, targetPath: string, filter?): void` — Sync version
- `getMd5Async(filePath: string): Promise<string>` — Get MD5 hash of a file via streaming

#### Glob

- `globAsync(pattern: string, options?: GlobOptions): Promise<string[]>` — Find files matching glob pattern (returns absolute paths)
- `glob(pattern: string, options?: GlobOptions): string[]` — Sync version

#### Stats & Streams

- `lstatAsync(targetPath: string): Promise<fs.Stats>` — Get file stats (lstat, does not follow symlinks)
- `lstat(targetPath: string): fs.Stats` — Sync version
- `statAsync(targetPath: string): Promise<fs.Stats>` — Get file stats (stat, follows symlinks)
- `stat(targetPath: string): fs.Stats` — Sync version
- `openAsync(targetPath: string, flags: string | number): Promise<fs.promises.FileHandle>` — Open file handle
- `open(targetPath: string, flags: string | number): number` — Sync version (returns file descriptor)
- `createReadStream(sourcePath: string): fs.ReadStream` — Create read stream
- `createWriteStream(targetPath: string): fs.WriteStream` — Create write stream

#### Path Utilities

- `getParentPaths(currentPath: string): string[]` — Get all ancestor directory paths from the given path up to the root
- `findAllParentChildPathsAsync(childGlob: string, fromPath: string, rootPath?): Promise<string[]>` — Search upward through parent directories for files matching the glob pattern, optionally stopping at `rootPath`
- `findAllParentChildPaths(childGlob: string, fromPath: string, rootPath?): string[]` — Sync version

```typescript
// Find all tsconfig.json files from the current directory upward
const configs = await FsUtils.findAllParentChildPathsAsync("tsconfig.json", process.cwd());
```

---

### HashUtils

Static utility class for computing hashes.

```typescript
import { HashUtils } from "@simplysm/sd-core-node";
```

#### `HashUtils.get(data: string | Buffer): string`

Computes a SHA-256 hex digest of the input data.

```typescript
const hash = HashUtils.get("hello world");
const bufHash = HashUtils.get(Buffer.from([1, 2, 3]));
```

---

### PathUtils

Static utility class for path manipulation.

```typescript
import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
```

#### `PathUtils.posix(...args: string[]): string`

Joins path segments using `path.join` and converts to POSIX format (forward slashes).

```typescript
PathUtils.posix("foo", "bar\\baz"); // "foo/bar/baz"
```

#### `PathUtils.changeFileDirectory(filePath: string, fromDirectory: string, toDirectory: string): string`

Remaps a file path from one base directory to another. Throws if `filePath` is not under `fromDirectory`.

```typescript
PathUtils.changeFileDirectory("/src/foo/bar.ts", "/src", "/dist"); // "/dist/foo/bar.ts"
```

#### `PathUtils.removeExt(filePath: string): string`

Returns the filename (basename) without its extension.

```typescript
PathUtils.removeExt("/src/foo/bar.ts"); // "bar"
```

#### `PathUtils.isChildPath(childPath: string, parentPath: string): boolean`

Checks if `childPath` is under `parentPath` by comparing normalized paths.

#### `PathUtils.norm(...paths: string[]): TNormPath`

Normalizes and resolves paths, returning a branded `TNormPath` type. Strips a leading `/` from the first argument before resolving (Windows path compatibility).

```typescript
const p: TNormPath = PathUtils.norm("/C:/projects", "my-app");
```

#### TNormPath

Branded string type representing a normalized absolute path. Used throughout the API to distinguish raw strings from normalized paths.

```typescript
type TNormPath = string & { [NORM]: never };
```

---

### SdFsWatcher

File system watcher built on chokidar with debounced change callbacks. Events are coalesced within the debounce window and redundant intermediary events are collapsed (e.g., add + change becomes add; add + unlink cancels out).

```typescript
import { SdFsWatcher, ISdFsWatcherChangeInfo } from "@simplysm/sd-core-node";
```

#### `SdFsWatcher.watchAsync(paths: string[], options?: ChokidarOptions): Promise<SdFsWatcher>`

Creates a watcher and resolves when it is ready (chokidar `ready` event). Always sets `ignoreInitial: true` internally regardless of options.

```typescript
const watcher = await SdFsWatcher.watchAsync(["src/**/*.ts"]);
watcher.onChange({ delay: 300 }, (changes) => {
  for (const change of changes) {
    console.log(change.event, change.path);
  }
});
```

#### `watcher.onChange(opt: { delay?: number }, cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>): this`

Registers a debounced change callback. Coalesces rapid file system events within `delay` milliseconds. Returns `this` for chaining.

#### `watcher.close(): Promise<void>`

Closes the underlying chokidar watcher.

#### ISdFsWatcherChangeInfo

```typescript
interface ISdFsWatcherChangeInfo {
  event: "add" | "addDir" | "change" | "unlink" | "unlinkDir";
  path: TNormPath;
}
```

---

### SdLogger

Structured logger with console coloring, file output, in-memory history tracking, and configurable severity levels. Configuration is hierarchical — group-level configs inherit from and override the global config.

```typescript
import { SdLogger, SdLoggerSeverity, SdLoggerStyle } from "@simplysm/sd-core-node";
```

#### `SdLogger.get(group?: string[]): SdLogger`

Creates a logger instance with an optional group hierarchy. The group determines which config applies and appears in log output as `[group1.group2]`.

```typescript
const logger = SdLogger.get(["myApp", "myModule"]);
logger.info("Server started");
logger.error("Something failed", err);
```

#### Instance Methods

- `debug(...args: any[]): void`
- `log(...args: any[]): void`
- `info(...args: any[]): void`
- `warn(...args: any[]): void`
- `error(...args: any[]): void`

#### Static Configuration

- `SdLogger.configs: Map<string, DeepPartial<ISdLoggerConfig>>` — Public map of group-keyed configs (key is group segments joined by `_`)
- `SdLogger.setConfig(config: DeepPartial<ISdLoggerConfig>): void` — Set global config
- `SdLogger.setConfig(group: string[], config: DeepPartial<ISdLoggerConfig>): void` — Set config for a specific group
- `SdLogger.restoreConfig(): void` — Clear all config overrides
- `SdLogger.setHistoryLength(len: number): void` — Enable in-memory log history (0 disables it)
- `SdLogger.history: ISdLoggerHistory[]` — Access the in-memory log history

#### Default Configuration

| Field           | Default                            |
| --------------- | ---------------------------------- |
| `dot`           | `false`                            |
| `console.level` | `SdLoggerSeverity.log`             |
| `console.style` | Random color per logger instance   |
| `file.level`    | `SdLoggerSeverity.none` (file off) |
| `file.outDir`   | `<cwd>/_logs`                      |
| `file.maxBytes` | `300000` (300 KB per log file)     |

#### SdLoggerSeverity (enum)

```typescript
enum SdLoggerSeverity {
  debug = "debug",
  log = "log",
  info = "info",
  warn = "warn",
  error = "error",
  none = "", // disables output at that level
}
```

#### SdLoggerStyle (enum)

ANSI escape code values for console coloring:

| Member      | Description                |
| ----------- | -------------------------- |
| `clear`     | Reset all styles           |
| `fgGray`    | Foreground gray            |
| `fgBlack`   | Foreground black           |
| `fgWhite`   | Foreground white           |
| `fgRed`     | Foreground red             |
| `fgGreen`   | Foreground green           |
| `fgYellow`  | Foreground yellow          |
| `fgBlue`    | Foreground blue            |
| `fgMagenta` | Foreground magenta         |
| `fgCyan`    | Foreground cyan            |
| `bgBlack`   | Background black + white   |
| `bgRed`     | Background red + white     |
| `bgGreen`   | Background green + white   |
| `bgYellow`  | Background yellow + white  |
| `bgBlue`    | Background blue + white    |
| `bgMagenta` | Background magenta + white |
| `bgWhite`   | Background white + white   |

#### ISdLoggerConfig

```typescript
interface ISdLoggerConfig {
  dot: boolean;
  console: {
    style: SdLoggerStyle;
    level: SdLoggerSeverity;
    styles: {
      debug: SdLoggerStyle;
      log: SdLoggerStyle;
      info: SdLoggerStyle;
      warn: SdLoggerStyle;
      error: SdLoggerStyle;
    };
  };
  file: {
    level: SdLoggerSeverity;
    outDir: string;
    maxBytes?: number;
  };
  customFn?: (severity: SdLoggerSeverity, logs: any[]) => Promise<void> | void;
}
```

#### ISdLoggerHistory

```typescript
interface ISdLoggerHistory {
  datetime: DateTime;
  group: string[];
  severity: SdLoggerSeverity;
  logs: any[];
}
```

---

### SdProcess

Static utility for spawning child processes.

```typescript
import { SdProcess } from "@simplysm/sd-core-node";
```

#### `SdProcess.spawnAsync(cmd: string, args: string[], options?): Promise<string>`

Spawns a child process and returns the combined stdout+stderr as a string. Rejects with an error message on non-zero exit code.

```typescript
const output = await SdProcess.spawnAsync("node", ["--version"], {
  showMessage: true,
});
```

**Options** (extends `SpawnOptionsWithoutStdio`):

| Property         | Type                                     | Description                                                                                |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `messageConvert` | `(buffer: Buffer) => string`             | Custom conversion applied to the accumulated output buffer                                 |
| `showMessage`    | `boolean \| ((message: string) => void)` | `true` pipes output to `process.stdout/stderr`; a function receives each chunk as a string |

---

### Worker System

The worker system provides a type-safe wrapper around Node.js `worker_threads`. Define a shared type describing the worker's methods and events, then use `SdWorker` from the main thread and `createSdWorker` inside the worker file.

#### SdWorker\<T extends ISdWorkerType\>

Typed worker thread wrapper. Extends `EventEmitter`. Worker stdout/stderr are piped to the main process automatically.

```typescript
import { SdWorker } from "@simplysm/sd-core-node";

const worker = new SdWorker<MyWorkerType>("./my-worker.js");
const result = await worker.run("myMethod", [arg1, arg2]);
worker.on("myEvent", (data) => console.log(data));
await worker.killAsync();
```

##### `constructor(filePath: string, opt?: Omit<WorkerOptions, "stdout" | "stderr">)`

Creates a worker thread from a file path. When running in a `.ts` context (development), delegates to a dev-proxy that runs the file via tsx. In a compiled `.js` context, loads the file directly via `fileURLToPath`.

##### `run<K extends keyof T["methods"]>(method: K, params: T["methods"][K]["params"]): Promise<T["methods"][K]["returnType"]>`

Sends a method call to the worker and resolves with the return value. Rejects if the worker throws.

##### `on<K extends keyof T["events"] & string>(event: K, listener: (args: T["events"][K]) => void): this`

Listens for typed events emitted by the worker via `worker.send(...)`.

##### `killAsync(): Promise<void>`

Terminates the worker thread.

#### createSdWorker\<T extends ISdWorkerType\>(methods): { send }

Factory function to create the worker-side handler. Must be called inside a worker thread file. Intercepts `process.stdout.write` to forward console output to the main thread as log messages.

```typescript
import { createSdWorker } from "@simplysm/sd-core-node";

const worker = createSdWorker<MyWorkerType>({
  myMethod: async (arg1, arg2) => {
    return result;
  },
});

// Send typed events back to the main thread
worker.send("myEvent", eventData);
```

**Returns** `{ send<K extends keyof T["events"] & string>(event: K, body?: T["events"][K]): void }`

Throws if called outside a worker thread (`parentPort` is null).

## Types

### ISdWorkerType

Type definition contract for a worker's methods and events. Define this interface and pass it as the type parameter to both `SdWorker<T>` and `createSdWorker<T>`.

```typescript
import { ISdWorkerType } from "@simplysm/sd-core-node";
```

```typescript
interface ISdWorkerType {
  methods: Record<string, { params: any[]; returnType: any }>;
  events: Record<string, any>;
}

// Example usage
interface MyWorkerType extends ISdWorkerType {
  methods: {
    compile: { params: [string, boolean]; returnType: string[] };
  };
  events: {
    progress: { percent: number };
  };
}
```

### ISdWorkerRequest\<T, K\>

Request message sent from the main thread to the worker. Used internally by `SdWorker.run`.

```typescript
interface ISdWorkerRequest<T extends ISdWorkerType, K extends keyof T["methods"]> {
  id: string;
  method: K;
  params: T["methods"][K]["params"];
}
```

### TSdWorkerResponse\<T, K\>

Response message sent from the worker to the main thread. Used internally.

```typescript
type TSdWorkerResponse<T extends ISdWorkerType, K extends keyof T["methods"]> =
  | { request: ISdWorkerRequest<T, K>; type: "return"; body?: T["methods"][K]["returnType"] }
  | { request: ISdWorkerRequest<T, K>; type: "error"; body: Error }
  | { type: "event"; event: string; body?: any }
  | { type: "log"; body: string };
```

### TSdLoggerSeverity

String literal union of severity levels excluding `"none"`. Equivalent to `Exclude<keyof typeof SdLoggerSeverity, "none">`.

```typescript
type TSdLoggerSeverity = "debug" | "log" | "info" | "warn" | "error";
```
