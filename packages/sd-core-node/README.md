# @simplysm/sd-core-node

Core Node.js utilities for the Simplysm framework. Provides filesystem helpers, logging, process spawning, path normalization, hashing, file watching, and a typed worker-thread abstraction.

## Installation

```bash
npm install @simplysm/sd-core-node
# or
yarn add @simplysm/sd-core-node
```

> **Peer dependency**: `@simplysm/sd-core-common` is required and must be installed alongside this package.

## API Reference

### FsUtils

Static utility class wrapping Node.js `fs` operations with automatic error enrichment (all errors are wrapped with the target path) and convenience helpers.

```ts
import { FsUtils } from "@simplysm/sd-core-node";
```

#### Directory & Path

| Method | Signature | Description |
|--------|-----------|-------------|
| `getParentPaths` | `(currentPath: string) => string[]` | Returns all ancestor directory paths from the given path up to the filesystem root. |
| `mkdirsAsync` | `(targetPath: string) => Promise<void>` | Recursively creates directories (like `mkdir -p`). No-op if the path already exists. |
| `mkdirs` | `(targetPath: string) => void` | Synchronous version of `mkdirsAsync`. |
| `exists` | `(targetPath: string) => boolean` | Returns `true` if the path exists. |
| `clearEmptyDirectoryAsync` | `(dirPath: string) => Promise<void>` | Recursively removes empty directories under the given path. |

#### Glob

| Method | Signature | Description |
|--------|-----------|-------------|
| `globAsync` | `(pattern: string, options?: GlobOptions) => Promise<string[]>` | Asynchronous glob. Backslashes are normalized to forward slashes. Returns resolved absolute paths. |
| `glob` | `(pattern: string, options?: GlobOptions) => string[]` | Synchronous version of `globAsync`. |

#### Read

| Method | Signature | Description |
|--------|-----------|-------------|
| `readFile` | `(targetPath: string) => string` | Reads a file as UTF-8 string. |
| `readFileAsync` | `(targetPath: string) => Promise<string>` | Async version. Throws if the file does not exist. |
| `readFileBuffer` | `(targetPath: string) => Buffer` | Reads a file as a raw `Buffer`. |
| `readFileBufferAsync` | `(targetPath: string) => Promise<Buffer>` | Async version of `readFileBuffer`. |
| `readJson` | `(targetPath: string) => any` | Reads and parses a JSON file (uses `JsonConvert.parse`). |
| `readJsonAsync` | `(targetPath: string) => Promise<any>` | Async version of `readJson`. |
| `readdirAsync` | `(targetPath: string) => Promise<string[]>` | Lists directory entries. |
| `readdir` | `(targetPath: string) => string[]` | Synchronous version of `readdirAsync`. |

#### Write

| Method | Signature | Description |
|--------|-----------|-------------|
| `writeFileAsync` | `(targetPath: string, data: any) => Promise<void>` | Writes data to a file. Parent directories are created automatically. |
| `writeFile` | `(targetPath: string, data: any) => void` | Synchronous version of `writeFileAsync`. |
| `writeJsonAsync` | `(targetPath: string, data: any, options?) => Promise<void>` | Serializes data with `JsonConvert.stringify` and writes it to a file. Options: `replacer`, `space`. |
| `writeJson` | `(targetPath: string, data: any, options?) => void` | Synchronous version of `writeJsonAsync`. |
| `writeFilesAsync` | `(files: Array<{ path, data, prevHash?, hash? }>) => Promise<Array<{ path, hash }>>` | Batch file writer. Groups files by directory and writes in parallel across directories (sequential within each directory to avoid metadata lock contention). Skips unchanged files when `prevHash` matches `hash`. |
| `appendFile` | `(targetPath: string, data: any) => void` | Appends data to a file (UTF-8). |

#### Copy & Remove

| Method | Signature | Description |
|--------|-----------|-------------|
| `copyAsync` | `(sourcePath: string, targetPath: string, filter?) => Promise<void>` | Recursively copies a file or directory. An optional `filter` callback can exclude specific sub-paths. |
| `copy` | `(sourcePath: string, targetPath: string, filter?) => void` | Synchronous version of `copyAsync`. |
| `removeAsync` | `(targetPath: string) => Promise<void>` | Recursively removes a file or directory with automatic retry (up to 6 retries, 500 ms delay). |
| `remove` | `(targetPath: string) => void` | Synchronous version of `removeAsync`. |

#### Stat & Stream

| Method | Signature | Description |
|--------|-----------|-------------|
| `lstat` | `(targetPath: string) => fs.Stats` | Returns `lstat` info (does not follow symlinks). |
| `lstatAsync` | `(targetPath: string) => Promise<fs.Stats>` | Async version of `lstat`. |
| `stat` | `(targetPath: string) => fs.Stats` | Returns `stat` info (follows symlinks). |
| `statAsync` | `(targetPath: string) => Promise<fs.Stats>` | Async version of `stat`. |
| `open` | `(targetPath: string, flags: string \| number) => number` | Opens a file descriptor. |
| `openAsync` | `(targetPath: string, flags: string \| number) => Promise<FileHandle>` | Async version of `open`. |
| `createReadStream` | `(sourcePath: string) => fs.ReadStream` | Creates a readable stream. |
| `createWriteStream` | `(targetPath: string) => fs.WriteStream` | Creates a writable stream. |

#### Hash & Search

| Method | Signature | Description |
|--------|-----------|-------------|
| `getMd5Async` | `(filePath: string) => Promise<string>` | Computes the MD5 hash of a file using streaming. |
| `findAllParentChildPaths` | `(childGlob: string, fromPath: string, rootPath?) => string[]` | Walks up from `fromPath` to `rootPath`, collecting all paths matching `childGlob` in each ancestor directory. |
| `findAllParentChildPathsAsync` | `(childGlob: string, fromPath: string, rootPath?) => Promise<string[]>` | Async version of `findAllParentChildPaths`. |

---

### HashUtils

Static utility for computing SHA-256 hashes.

```ts
import { HashUtils } from "@simplysm/sd-core-node";
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `(data: string \| Buffer) => string` | Returns the SHA-256 hex digest of the given data. |

**Example:**

```ts
const hash = HashUtils.get("hello world");
// => "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
```

---

### PathUtils

Static utility for path normalization and manipulation.

```ts
import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `posix` | `(...args: string[]) => string` | Joins path segments and converts backslashes to forward slashes (POSIX-style). |
| `norm` | `(...paths: string[]) => TNormPath` | Resolves and normalizes paths into a branded `TNormPath` type. Strips a leading `/` before resolving. |
| `removeExt` | `(filePath: string) => string` | Returns the filename without its extension. |
| `changeFileDirectory` | `(filePath, fromDirectory, toDirectory) => string` | Re-roots a file path from one directory to another. Throws if `filePath` is not a child of `fromDirectory`. |
| `isChildPath` | `(childPath: string, parentPath: string) => boolean` | Returns `true` if the normalized `childPath` starts with the normalized `parentPath`. |

#### TNormPath

A branded string type (`string & { [NORM]: never }`) representing a normalized, absolute path. Produced by `PathUtils.norm()`. Use this type to distinguish normalized paths from raw strings in your APIs.

---

### SdFsWatcher

File system watcher built on [chokidar](https://github.com/paulmillr/chokidar) with debounced, batched change callbacks and smart event coalescing.

```ts
import { SdFsWatcher, ISdFsWatcherChangeInfo } from "@simplysm/sd-core-node";
```

#### Static Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `watchAsync` | `(paths: string[], options?: ChokidarOptions) => Promise<SdFsWatcher>` | Creates a watcher and resolves once chokidar is ready. |

#### Instance Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `onChange` | `(opt: { delay?: number }, cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void \| Promise<void>) => this` | Registers a debounced change handler. Events are coalesced (e.g., `add` + `change` = `add`; `add` + `unlink` = removed from batch). If `ignoreInitial` is `false` in options, the callback fires immediately with an empty array. |
| `close` | `() => Promise<void>` | Stops watching. |

#### ISdFsWatcherChangeInfo

```ts
interface ISdFsWatcherChangeInfo {
  event: "add" | "addDir" | "change" | "unlink" | "unlinkDir";
  path: TNormPath;
}
```

**Example:**

```ts
const watcher = await SdFsWatcher.watchAsync(["./src"]);
watcher.onChange({ delay: 300 }, (changes) => {
  for (const change of changes) {
    console.log(change.event, change.path);
  }
});
```

---

### SdLogger

Structured logger with console output (color-coded by severity), optional file output with automatic rotation, configurable per group, and an optional custom logging function.

```ts
import { SdLogger, SdLoggerSeverity, SdLoggerStyle } from "@simplysm/sd-core-node";
```

#### Creating a Logger

```ts
const logger = SdLogger.get(["myApp", "myModule"]);

logger.debug("verbose details");
logger.log("general message");
logger.info("informational");
logger.warn("warning");
logger.error("something failed", new Error("details"));
```

#### Severity Methods

| Method | Description |
|--------|-------------|
| `debug(...args)` | Debug-level message. |
| `log(...args)` | General log message. |
| `info(...args)` | Informational message. |
| `warn(...args)` | Warning message. |
| `error(...args)` | Error message. Errors with `.stack` are printed with their stack trace. |

#### Configuration

```ts
// Set config for all loggers
SdLogger.setConfig({
  console: { level: SdLoggerSeverity.debug },
  file: { level: SdLoggerSeverity.warn, outDir: "/var/log/myapp" },
});

// Set config for a specific group
SdLogger.setConfig(["myApp", "myModule"], {
  console: { level: SdLoggerSeverity.info },
});

// Reset all configs
SdLogger.restoreConfig();
```

#### ISdLoggerConfig

```ts
interface ISdLoggerConfig {
  dot: boolean;                    // Print "." for messages below console level

  console: {
    style: SdLoggerStyle;         // Group name color (random by default)
    level: SdLoggerSeverity;      // Minimum severity for console output (default: "log")
    styles: {                     // Per-severity colors
      debug: SdLoggerStyle;
      log: SdLoggerStyle;
      info: SdLoggerStyle;
      warn: SdLoggerStyle;
      error: SdLoggerStyle;
    };
  };

  file: {
    level: SdLoggerSeverity;      // Minimum severity for file output (default: none)
    outDir: string;               // Log directory (default: "<cwd>/_logs")
    maxBytes?: number;            // Max file size before rotation (default: 300KB)
  };

  customFn?: (severity: SdLoggerSeverity, logs: any[]) => void | Promise<void>;
}
```

#### SdLoggerSeverity

```ts
enum SdLoggerSeverity {
  debug = "debug",
  log = "log",
  info = "info",
  warn = "warn",
  error = "error",
  none = "",           // Disables output for the channel
}
```

#### SdLoggerStyle

Enum of ANSI escape codes for terminal colors:

- **Foreground**: `fgGray`, `fgBlack`, `fgWhite`, `fgRed`, `fgGreen`, `fgYellow`, `fgBlue`, `fgMagenta`, `fgCyan`
- **Background** (with white text): `bgBlack`, `bgRed`, `bgGreen`, `bgYellow`, `bgBlue`, `bgMagenta`, `bgWhite`
- **Reset**: `clear`

#### History

```ts
SdLogger.setHistoryLength(100);       // Keep last 100 log entries in memory
const entries = SdLogger.history;     // ISdLoggerHistory[]
```

File output is organized as `<outDir>/yyyyMMdd/<seq>.log` with automatic rotation when a log file exceeds `maxBytes`.

---

### SdProcess

Static utility for spawning child processes with captured output.

```ts
import { SdProcess } from "@simplysm/sd-core-node";
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `spawnAsync` | `(cmd: string, args: string[], options?) => Promise<string>` | Spawns a child process and returns the combined stdout/stderr output as a string. Rejects if the process exits with a non-zero code. |

**Options** (extends `SpawnOptionsWithoutStdio`):

| Option | Type | Description |
|--------|------|-------------|
| `messageConvert` | `(buffer: Buffer) => string` | Custom function to convert the output buffer to a string. |
| `showMessage` | `boolean \| ((message: string) => void)` | `true` to pipe output to the current process in real time, or a function for custom handling. |

**Example:**

```ts
const output = await SdProcess.spawnAsync("git", ["status"], {
  cwd: "/my/project",
  showMessage: true,
});
```

---

### Worker Thread Abstraction

A typed, message-passing abstraction over Node.js `worker_threads`. Define a contract with `ISdWorkerType`, implement it with `createSdWorker`, and call it from the main thread with `SdWorker`.

#### ISdWorkerType

```ts
interface ISdWorkerType {
  methods: Record<string, { params: any[]; returnType: any }>;
  events: Record<string, any>;
}
```

Define your worker contract:

```ts
interface IMyWorkerType extends ISdWorkerType {
  methods: {
    compute: { params: [data: string]; returnType: number };
  };
  events: {
    progress: number;
  };
}
```

#### createSdWorker (worker-side)

```ts
import { createSdWorker } from "@simplysm/sd-core-node";
```

Call from a worker script to register method handlers and get an event sender:

```ts
// my-worker.ts
const worker = createSdWorker<IMyWorkerType>({
  compute(data: string) {
    worker.send("progress", 50);
    return data.length;
  },
});
```

- Automatically listens on `parentPort` for incoming requests.
- Redirects `process.stdout.write` to the main thread via the message channel.
- Returns an object with a `send(event, body?)` method for emitting typed events to the main thread.

#### SdWorker (main-thread side)

```ts
import { SdWorker } from "@simplysm/sd-core-node";
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(filePath: string, opt?: WorkerOptions)` | Creates a worker thread. In development (`.ts` files), automatically uses a dev proxy for tsx support. |
| `run` | `<K>(method: K, params: T["methods"][K]["params"]) => Promise<T["methods"][K]["returnType"]>` | Sends a typed method call to the worker and returns the result. |
| `on` | `<K>(event: K, listener: (args: T["events"][K]) => void) => this` | Listens for typed events from the worker. |
| `killAsync` | `() => Promise<void>` | Terminates the worker thread. |

**Example:**

```ts
const worker = new SdWorker<IMyWorkerType>("./my-worker.ts");

worker.on("progress", (percent) => {
  console.log(`Progress: ${percent}%`);
});

const result = await worker.run("compute", ["hello"]);
// result === 5

await worker.killAsync();
```

#### Message Protocol Types

| Type | Description |
|------|-------------|
| `ISdWorkerRequest<T, K>` | Request message sent from main thread to worker: `{ id, method, params }`. |
| `TSdWorkerResponse<T, K>` | Response union: `"return"` (success), `"error"` (failure), `"event"` (worker-initiated event), or `"log"` (stdout redirect). |

All messages are serialized/deserialized via `TransferableConvert` from `@simplysm/sd-core-common` for efficient transfer of `ArrayBuffer`-backed data.
