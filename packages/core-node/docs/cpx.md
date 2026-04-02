# cpx

Namespace of child process execution utilities. Provides async/sync process spawning with automatic encoding detection, a `PromiseLike` wrapper for process control, and byte decoding helpers.

Imported as:
```typescript
import { cpx } from "@simplysm/core-node";
```

## Types

### ExecOptions

```ts
interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdio?: "pipe" | "inherit";
  shell?: boolean;
  reject?: boolean;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `cwd` | `string` | `undefined` | Working directory for the child process |
| `env` | `Record<string, string>` | `undefined` | Extra environment variables (merged with `process.env`) |
| `stdio` | `"pipe" \| "inherit"` | `"pipe"` | `"pipe"` captures stdout/stderr; `"inherit"` passes them through |
| `shell` | `boolean` | `false` | Run the command in a shell |
| `reject` | `boolean` | `true` | If `false`, the promise resolves even on non-zero exit codes |

### ExecSyncOptions

```ts
type ExecSyncOptions = Omit<ExecOptions, "reject">
```

Same as `ExecOptions` without the `reject` field. `execSync` always returns a result regardless of exit code.

### ExecResult

```ts
interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `stdout` | `string` | Captured standard output (empty when `stdio: "inherit"`) |
| `stderr` | `string` | Captured standard error (empty when `stdio: "inherit"`) |
| `exitCode` | `number` | Process exit code |

## ExecProcess

```ts
class ExecProcess implements PromiseLike<ExecResult> {
  get pid(): number | undefined;
  then<TResult1, TResult2>(
    onfulfilled?: ((value: ExecResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
  catch<TResult>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<ExecResult | TResult>;
  kill(signal?: NodeJS.Signals | number): boolean;
}
```

A `PromiseLike<ExecResult>` wrapper around `ChildProcess`. Can be `await`ed for the result or `kill()`ed to terminate the process.

| Property/Method | Description |
|-----------------|-------------|
| `pid` | Process ID of the child process (undefined if not yet spawned) |
| `then()` | Standard `PromiseLike` fulfillment |
| `catch()` | Standard promise rejection handler |
| `kill(signal?)` | Send a signal to terminate the child process |

## Functions

### exec

```ts
function exec(cmd: string, args: string[], options?: ExecOptions): ExecProcess
```

Spawn a child process asynchronously. Returns an `ExecProcess` that can be awaited or killed.

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmd` | `string` | Command to execute |
| `args` | `string[]` | Command arguments |
| `options` | `ExecOptions` | Execution options |

By default, rejects if exit code is non-zero. Set `options.reject: false` to always resolve. Output is decoded using system encoding detection (UTF-8 with fallback).

### execSync

```ts
function execSync(cmd: string, args: string[], options?: ExecSyncOptions): ExecResult
```

Spawn a child process synchronously. Always returns an `ExecResult` regardless of exit code.

| Parameter | Type | Description |
|-----------|------|-------------|
| `cmd` | `string` | Command to execute |
| `args` | `string[]` | Command arguments |
| `options` | `ExecSyncOptions` | Execution options |

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
const result = await cpx.exec("git", ["status"], { cwd: "/project" });
// result.stdout, result.stderr, result.exitCode

// Inherit stdio
await cpx.exec("make", ["build"], { stdio: "inherit" });

// Don't reject on failure
const { exitCode } = await cpx.exec("test-cmd", [], { reject: false });

// Kill a long-running process
const proc = cpx.exec("long-cmd", []);
proc.kill();

// Synchronous execution
const syncResult = cpx.execSync("node", ["--version"]);
```
