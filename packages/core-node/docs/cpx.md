# cpx

Namespace of child process execution utilities. Provides async/sync process spawning with automatic encoding detection, a `PromiseLike` wrapper for process control, and byte decoding helpers.

Imported as:
```typescript
import { cpx } from "@simplysm/core-node";
```

## Types

### SpawnResult

```ts
interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `stdout` | `string` | Captured standard output (empty when stdio is not `"pipe"`) |
| `stderr` | `string` | Captured standard error (empty when stdio is not `"pipe"`) |
| `exitCode` | `number` | Process exit code |

## SpawnProcess

```ts
class SpawnProcess implements PromiseLike<SpawnResult> {
  get pid(): number | undefined;
  then<TResult1, TResult2>(
    onfulfilled?: ((value: SpawnResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
  catch<TResult>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<SpawnResult | TResult>;
  kill(signal?: NodeJS.Signals | number): boolean;
}
```

A `PromiseLike<SpawnResult>` wrapper around `ChildProcess`. Can be `await`ed for the result or `kill()`ed to terminate the process.

| Property/Method | Description |
|-----------------|-------------|
| `pid` | Process ID of the child process (undefined if not yet spawned) |
| `then()` | Standard `PromiseLike` fulfillment |
| `catch()` | Standard promise rejection handler |
| `kill(signal?)` | Send a signal to terminate the child process |

## Functions

### spawn

```ts
function spawn(
  cmd: string,
  args: string[],
  options?: SpawnOptions & { reject?: boolean },
): SpawnProcess
```

Spawn a child process asynchronously. Returns a `SpawnProcess` that can be awaited or killed. Options extend Node.js `SpawnOptions` with an additional `reject` field.

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmd` | `string` | Command to execute |
| `args` | `string[]` | Command arguments |
| `options` | `SpawnOptions & { reject?: boolean }` | Node.js spawn options plus `reject` (default `true`) |

By default, rejects if exit code is non-zero. Set `options.reject: false` to always resolve. The `env` option is merged with `process.env`. Output is decoded using system encoding detection (UTF-8 with fallback).

### spawnSync

```ts
function spawnSync(
  cmd: string,
  args: string[],
  options?: SpawnSyncOptions & { reject?: boolean },
): SpawnResult
```

Spawn a child process synchronously. Options extend Node.js `SpawnSyncOptions` with an additional `reject` field.

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmd` | `string` | Command to execute |
| `args` | `string[]` | Command arguments |
| `options` | `SpawnSyncOptions & { reject?: boolean }` | Node.js spawn sync options plus `reject` (default `true`) |

By default, throws if exit code is non-zero. Set `options.reject: false` to always return the result.

### resolveStdioPipe

```ts
function resolveStdioPipe(
  stdio: SpawnOptions["stdio"],
): { stdout: boolean; stderr: boolean }
```

Determine whether stdout and stderr are piped based on the `stdio` option value.

| Parameter | Type | Description |
|-----------|------|-------------|
| `stdio` | `SpawnOptions["stdio"]` | The stdio configuration (string or array) |

Returns `{ stdout: true, stderr: true }` when `stdio` is `"pipe"` or `undefined`. For array form, checks `stdio[1]` and `stdio[2]` individually.

### codePageToEncoding

```ts
function codePageToEncoding(codePage: number): string
```

Convert a Windows code page number to a standard encoding name. Falls back to `"utf-8"` for unknown code pages.

Supported code pages: 65001 (utf-8), 949 (euc-kr), 932 (shift-jis), 936 (gbk), 950 (big5), 1252/1251/1250 (windows-*), 874 (windows-874).

### getSystemEncoding

```ts
function getSystemEncoding(): string
```

Detect the system console encoding. On Windows, runs `chcp` to get the code page. On other platforms, reads `LANG`/`LC_ALL` environment variables. The result is cached after the first call.

### resetEncodingCache

```ts
function resetEncodingCache(): void
```

Clear the cached system encoding so the next `getSystemEncoding()` call re-detects.

### decodeBytes

```ts
function decodeBytes(raw: Uint8Array, systemEncoding?: string): string
```

Decode a `Uint8Array` to a string. First tries UTF-8 (with `fatal: true`); if that fails, falls back to the system encoding.

| Parameter | Type | Description |
|-----------|------|-------------|
| `raw` | `Uint8Array` | Raw bytes to decode |
| `systemEncoding` | `string` | Override encoding (defaults to `getSystemEncoding()`) |

## Usage

```ts
import { cpx } from "@simplysm/core-node";

// Basic execution
const result = await cpx.spawn("git", ["status"], { cwd: "/project" });
// result.stdout, result.stderr, result.exitCode

// Inherit stdio
await cpx.spawn("make", ["build"], { stdio: "inherit" });

// Don't reject on failure
const { exitCode } = await cpx.spawn("test-cmd", [], { reject: false });

// Kill a long-running process
const proc = cpx.spawn("long-cmd", []);
proc.kill();

// Synchronous execution
const syncResult = cpx.spawnSync("node", ["--version"]);
```
