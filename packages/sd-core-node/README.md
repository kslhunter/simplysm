# @simplysm/sd-core-node

Core Node.js utilities for the Simplysm framework. Provides filesystem helpers, logging, process spawning, path normalization, hashing, file watching, and a typed worker-thread abstraction.

## Installation

```bash
npm install @simplysm/sd-core-node
```

## API Overview

### Utils

| API | Type | Description |
|-----|------|-------------|
| `FsUtils` | Class | File system utility methods (read, write, copy, glob, etc.) |
| `HashUtils` | Class | SHA-256 hashing utility |
| `PathUtils` | Class | Path normalization and manipulation utilities |
| `TNormPath` | Type | Branded string type for normalized paths |
| `SdFsWatcher` | Class | File system watcher with debounced change events |
| `ISdFsWatcherChangeInfo` | Interface | Change event info from file watcher |
| `SdLogger` | Class | Configurable logger with console, file, and custom outputs |
| `SdLoggerStyle` | Enum | ANSI terminal color/style codes for logger output |
| `SdLoggerSeverity` | Enum | Log severity levels |
| `TSdLoggerSeverity` | Type | Union of active severity level names |
| `ISdLoggerConfig` | Interface | Logger configuration options |
| `ISdLoggerHistory` | Interface | Shape of stored log history entries |
| `SdProcess` | Class | Child process spawning utility |

### Worker

| API | Type | Description |
|-----|------|-------------|
| `createSdWorker` | Function | Creates a worker-thread message handler (called inside worker) |
| `SdWorker` | Class | Main-thread wrapper for typed worker-thread communication |
| `ISdWorkerType` | Interface | Type definition for worker methods and events |
| `ISdWorkerRequest` | Interface | Worker request message shape |
| `TSdWorkerResponse` | Type | Worker response message union type |

## API Reference

### `FsUtils`

Static utility class wrapping Node.js `fs` operations with error enrichment and convenience methods. All methods have both sync and async variants.

```typescript
class FsUtils {
  static getParentPaths(currentPath: string): string[];
  static async getMd5Async(filePath: string): Promise<string>;
  static async globAsync(pattern: string, options?: GlobOptions): Promise<string[]>;
  static glob(pattern: string, options?: GlobOptions): string[];
  static async readdirAsync(targetPath: string): Promise<string[]>;
  static readdir(targetPath: string): string[];
  static exists(targetPath: string): boolean;
  static async removeAsync(targetPath: string): Promise<void>;
  static remove(targetPath: string): void;
  static async copyAsync(
    sourcePath: string,
    targetPath: string,
    filter?: (subPath: string) => boolean,
  ): Promise<void>;
  static copy(
    sourcePath: string,
    targetPath: string,
    filter?: (subPath: string) => boolean,
  ): void;
  static async mkdirsAsync(targetPath: string): Promise<void>;
  static mkdirs(targetPath: string): void;
  static async writeJsonAsync(
    targetPath: string,
    data: any,
    options?: { replacer?: (this: any, key: string | undefined, value: any) => any; space?: string | number },
  ): Promise<void>;
  static writeJson(
    targetPath: string,
    data: any,
    options?: { replacer?: (this: any, key: string | undefined, value: any) => any; space?: string | number },
  ): void;
  static async writeFilesAsync(
    files: { path: TNormPath; data: string | Buffer; prevHash?: string; hash?: string }[],
  ): Promise<{ path: TNormPath; hash: string }[]>;
  static async writeFileAsync(targetPath: string, data: any): Promise<void>;
  static writeFile(targetPath: string, data: any): void;
  static readFile(targetPath: string): string;
  static async readFileAsync(targetPath: string): Promise<string>;
  static readFileBuffer(targetPath: string): Buffer;
  static async readFileBufferAsync(targetPath: string): Promise<Buffer>;
  static readJson(targetPath: string): any;
  static async readJsonAsync(targetPath: string): Promise<any>;
  static lstat(targetPath: string): fs.Stats;
  static async lstatAsync(targetPath: string): Promise<fs.Stats>;
  static stat(targetPath: string): fs.Stats;
  static async statAsync(targetPath: string): Promise<fs.Stats>;
  static appendFile(targetPath: string, data: any): void;
  static open(targetPath: string, flags: string | number): number;
  static async openAsync(targetPath: string, flags: string | number): Promise<fs.promises.FileHandle>;
  static createReadStream(sourcePath: string): fs.ReadStream;
  static createWriteStream(targetPath: string): fs.WriteStream;
  static async clearEmptyDirectoryAsync(dirPath: string): Promise<void>;
  static findAllParentChildPaths(childGlob: string, fromPath: string, rootPath?: string): string[];
  static async findAllParentChildPathsAsync(
    childGlob: string,
    fromPath: string,
    rootPath?: string,
  ): Promise<string[]>;
}
```

| Method | Description |
|--------|-------------|
| `getParentPaths(currentPath)` | Returns all ancestor directory paths |
| `getMd5Async(filePath)` | Computes MD5 hash of a file |
| `globAsync(pattern, options?)` / `glob(...)` | Finds files matching a glob pattern |
| `readdirAsync(targetPath)` / `readdir(...)` | Lists directory contents |
| `exists(targetPath)` | Checks if a path exists |
| `removeAsync(targetPath)` / `remove(...)` | Recursively removes a file or directory |
| `copyAsync(source, target, filter?)` / `copy(...)` | Recursively copies files/directories with optional filter |
| `mkdirsAsync(targetPath)` / `mkdirs(...)` | Creates directories recursively |
| `writeJsonAsync(path, data, options?)` / `writeJson(...)` | Writes JSON data to a file |
| `writeFilesAsync(files)` | Batch writes files grouped by directory for performance, with hash-based skip |
| `writeFileAsync(path, data)` / `writeFile(...)` | Writes data to a file, creating parent directories |
| `readFile(path)` / `readFileAsync(path)` | Reads a file as UTF-8 string |
| `readFileBuffer(path)` / `readFileBufferAsync(path)` | Reads a file as a Buffer |
| `readJson(path)` / `readJsonAsync(path)` | Reads and parses a JSON file |
| `lstat(path)` / `lstatAsync(path)` | Gets file stats (does not follow symlinks) |
| `stat(path)` / `statAsync(path)` | Gets file stats (follows symlinks) |
| `appendFile(path, data)` | Appends data to a file |
| `open(path, flags)` / `openAsync(path, flags)` | Opens a file descriptor |
| `createReadStream(path)` | Creates a readable file stream |
| `createWriteStream(path)` | Creates a writable file stream |
| `clearEmptyDirectoryAsync(dirPath)` | Recursively removes empty directories |
| `findAllParentChildPaths(glob, from, root?)` | Searches parent directories for files matching a glob |

### `HashUtils`

Static utility class for SHA-256 hashing.

```typescript
class HashUtils {
  static get(data: string | Buffer): string;
}
```

| Method | Description |
|--------|-------------|
| `get(data)` | Returns a hex-encoded SHA-256 hash of the input |

### `PathUtils`

Static utility class for path normalization and manipulation.

```typescript
class PathUtils {
  static posix(...args: string[]): string;
  static changeFileDirectory(filePath: string, fromDirectory: string, toDirectory: string): string;
  static removeExt(filePath: string): string;
  static isChildPath(childPath: string, parentPath: string): boolean;
  static norm(...paths: string[]): TNormPath;
}
```

| Method | Description |
|--------|-------------|
| `posix(...args)` | Joins and converts paths to POSIX format (forward slashes) |
| `changeFileDirectory(filePath, from, to)` | Rebases a file path from one directory to another |
| `removeExt(filePath)` | Returns the filename without extension |
| `isChildPath(childPath, parentPath)` | Checks if a path is a descendant of another |
| `norm(...paths)` | Normalizes and resolves paths into a branded `TNormPath` |

### `TNormPath`

Branded string type for normalized absolute paths.

```typescript
type TNormPath = string & { [NORM]: never };
```

### `SdFsWatcher`

File system watcher using `chokidar` with debounced change batching.

```typescript
class SdFsWatcher {
  static async watchAsync(
    paths: string[],
    options?: ChokidarOptions,
  ): Promise<SdFsWatcher>;

  onChange(
    opt: { delay?: number },
    cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>,
  ): this;

  async close(): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `watchAsync(paths, options?)` | Creates a watcher and resolves when ready |
| `onChange(opt, cb)` | Registers a debounced change handler with batched change infos |
| `close()` | Stops watching and releases resources |

### `ISdFsWatcherChangeInfo`

Change event information from file watcher.

```typescript
interface ISdFsWatcherChangeInfo {
  event: "add" | "addDir" | "change" | "unlink" | "unlinkDir";
  path: TNormPath;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `event` | `"add" \| "addDir" \| "change" \| "unlink" \| "unlinkDir"` | Type of file system change |
| `path` | `TNormPath` | Normalized absolute path of the changed file |

### `SdLogger`

Configurable logger supporting console output (with ANSI colors), file output (with automatic rotation), custom callbacks, and history tracking.

```typescript
class SdLogger {
  static configs: Map<string, DeepPartial<ISdLoggerConfig>>;
  static history: ISdLoggerHistory[];

  static get(group?: string[]): SdLogger;
  static setConfig(config: DeepPartial<ISdLoggerConfig>): void;
  static setConfig(group: string[], config: DeepPartial<ISdLoggerConfig>): void;
  static restoreConfig(): void;
  static setHistoryLength(len: number): void;

  debug(...args: any[]): void;
  log(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}
```

| Method | Description |
|--------|-------------|
| `get(group?)` | Creates a logger instance with an optional group path |
| `setConfig(config)` | Sets global logger configuration |
| `setConfig(group, config)` | Sets configuration for a specific group |
| `restoreConfig()` | Clears all custom configurations |
| `setHistoryLength(len)` | Enables log history with the given max length |
| `debug(...args)` | Logs at debug severity |
| `log(...args)` | Logs at log severity |
| `info(...args)` | Logs at info severity |
| `warn(...args)` | Logs at warn severity |
| `error(...args)` | Logs at error severity |

### `SdLoggerStyle`

ANSI terminal color/style codes.

```typescript
enum SdLoggerStyle {
  clear = "\x1b[0m",
  fgGray = "\x1b[90m",
  fgBlack = "\x1b[30m",
  fgWhite = "\x1b[37m",
  fgRed = "\x1b[31m",
  fgGreen = "\x1b[32m",
  fgYellow = "\x1b[33m",
  fgBlue = "\x1b[34m",
  fgMagenta = "\x1b[35m",
  fgCyan = "\x1b[36m",
  bgBlack = "\x1b[40m\x1b[97m",
  bgRed = "\x1b[41m\x1b[97m",
  bgGreen = "\x1b[42m\x1b[97m",
  bgYellow = "\x1b[43m\x1b[97m",
  bgBlue = "\x1b[44m\x1b[97m",
  bgMagenta = "\x1b[45m\x1b[97m",
  bgWhite = "\x1b[46m\x1b[97m",
}
```

### `SdLoggerSeverity`

Log severity levels used for filtering.

```typescript
enum SdLoggerSeverity {
  debug = "debug",
  log = "log",
  info = "info",
  warn = "warn",
  error = "error",
  none = "",
}
```

### `TSdLoggerSeverity`

Union type of active (non-`none`) severity level names.

```typescript
type TSdLoggerSeverity = "debug" | "log" | "info" | "warn" | "error";
```

### `ISdLoggerConfig`

Full logger configuration options.

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

| Field | Type | Description |
|-------|------|-------------|
| `dot` | `boolean` | When `true`, prints a dot for messages below console level |
| `console.style` | `SdLoggerStyle` | Base style for the group name |
| `console.level` | `SdLoggerSeverity` | Minimum severity to print to console |
| `console.styles` | `Record<severity, SdLoggerStyle>` | Per-severity console styles |
| `file.level` | `SdLoggerSeverity` | Minimum severity to write to file |
| `file.outDir` | `string` | Output directory for log files |
| `file.maxBytes` | `number` | Max bytes per log file before rotation (default: 300KB) |
| `customFn` | `function` | Custom callback invoked on every log |

### `ISdLoggerHistory`

Shape of stored log history entries.

```typescript
interface ISdLoggerHistory {
  datetime: DateTime;
  group: string[];
  severity: SdLoggerSeverity;
  logs: any[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `datetime` | `DateTime` | When the log was recorded |
| `group` | `string[]` | Logger group path |
| `severity` | `SdLoggerSeverity` | Severity level |
| `logs` | `any[]` | Log arguments |

### `SdProcess`

Static utility for spawning child processes.

```typescript
class SdProcess {
  static async spawnAsync(
    cmd: string,
    args: string[],
    options?: SpawnOptionsWithoutStdio & {
      messageConvert?: (buffer: Buffer) => string;
      showMessage?: boolean | ((message: string) => void);
    },
  ): Promise<string>;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmd` | `string` | Command to execute |
| `args` | `string[]` | Command arguments |
| `options.messageConvert` | `(buffer: Buffer) => string` | Custom buffer-to-string converter |
| `options.showMessage` | `boolean \| ((message: string) => void)` | Whether/how to display stdout/stderr |

**Returns**: `Promise<string>` -- the combined stdout/stderr output as a string.

### `createSdWorker(methods)`

Creates a worker-thread message handler. Call this inside a worker script to register typed method handlers.

```typescript
function createSdWorker<T extends ISdWorkerType>(methods: {
  [P in keyof T["methods"]]: (
    ...args: T["methods"][P]["params"]
  ) => T["methods"][P]["returnType"] | Promise<T["methods"][P]["returnType"]>;
}): {
  send<K extends keyof T["events"] & string>(event: K, body?: T["events"][K]): void;
};
```

**Returns**: An object with a `send` method for emitting typed events to the main thread.

### `SdWorker`

Main-thread wrapper for communicating with a typed worker thread. Extends `EventEmitter`.

```typescript
class SdWorker<T extends ISdWorkerType> extends EventEmitter {
  constructor(filePath: string, opt?: Omit<WorkerOptions, "stdout" | "stderr">);

  on<K extends keyof T["events"] & string>(
    event: K,
    listener: (args: T["events"][K]) => void,
  ): this;

  async run<K extends keyof T["methods"]>(
    method: K,
    params: T["methods"][K]["params"],
  ): Promise<T["methods"][K]["returnType"]>;

  async killAsync(): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `on(event, listener)` | Listens for typed events from the worker |
| `run(method, params)` | Calls a typed method on the worker and awaits the result |
| `killAsync()` | Terminates the worker thread |

### `ISdWorkerType`

Type definition interface for worker methods and events.

```typescript
interface ISdWorkerType {
  methods: Record<string, {
    params: any[];
    returnType: any;
  }>;
  events: Record<string, any>;
}
```

### `ISdWorkerRequest`

Worker request message shape.

```typescript
interface ISdWorkerRequest<T extends ISdWorkerType, K extends keyof T["methods"]> {
  id: string;
  method: K;
  params: T["methods"][K]["params"];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique request ID (UUID) |
| `method` | `K` | Method name to call |
| `params` | `T["methods"][K]["params"]` | Method parameters |

### `TSdWorkerResponse`

Union type for all possible worker response messages.

```typescript
type TSdWorkerResponse<T extends ISdWorkerType, K extends keyof T["methods"]> =
  | { request: ISdWorkerRequest<T, K>; type: "return"; body?: T["methods"][K]["returnType"] }
  | { request: ISdWorkerRequest<T, K>; type: "error"; body: Error }
  | { type: "event"; event: string; body?: any }
  | { type: "log"; body: string };
```

## Usage Examples

### File system operations

```typescript
import { FsUtils } from "@simplysm/sd-core-node";

// Read and write JSON
const config = await FsUtils.readJsonAsync("./config.json");
config.version = "2.0";
await FsUtils.writeJsonAsync("./config.json", config, { space: 2 });

// Copy with filter
await FsUtils.copyAsync("./src", "./dist", (subPath) => !subPath.endsWith(".spec.ts"));

// Glob for files
const tsFiles = await FsUtils.globAsync("./src/**/*.ts");
```

### Logging

```typescript
import { SdLogger, SdLoggerSeverity } from "@simplysm/sd-core-node";

// Configure global logging
SdLogger.setConfig({
  console: { level: SdLoggerSeverity.debug },
  file: { level: SdLoggerSeverity.warn, outDir: "./_logs" },
});

// Create a grouped logger
const logger = SdLogger.get(["myapp", "database"]);
logger.info("Connected to database");
logger.error("Query failed", new Error("timeout"));
```

### Typed worker threads

```typescript
// worker-type.ts
import type { ISdWorkerType } from "@simplysm/sd-core-node";

interface MyWorkerType extends ISdWorkerType {
  methods: {
    compute: { params: [number, number]; returnType: number };
  };
  events: {
    progress: number; // percentage
  };
}

// worker.ts
import { createSdWorker } from "@simplysm/sd-core-node";

const worker = createSdWorker<MyWorkerType>({
  compute(a, b) {
    worker.send("progress", 50);
    return a + b;
  },
});

// main.ts
import { SdWorker } from "@simplysm/sd-core-node";

const w = new SdWorker<MyWorkerType>("./worker.js");
w.on("progress", (pct) => console.log(`${pct}%`));
const result = await w.run("compute", [3, 4]); // 7
await w.killAsync();
```
