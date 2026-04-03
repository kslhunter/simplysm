# Consola

Consola logging utilities for environment-aware reporter configuration. Provides a terminal pretty-printer, a file-based JSON logger with rotation, and a one-call setup function.

```ts
import {
  setupConsola,
  withMaxLevel,
  PrettyReporter,
  createFileReporter,
} from "@simplysm/core-node";
import type { SetupConsolaOptions, FileReporterOptions } from "@simplysm/core-node";
```

## Types

### SetupConsolaOptions

```ts
interface SetupConsolaOptions {
  cli?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cli` | `boolean` | When `true`, always use `PrettyReporter` regardless of environment (for CLI tools) |

### FileReporterOptions

```ts
interface FileReporterOptions {
  maxSize?: number;
  maxDays?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `maxSize` | `number` | Maximum size per log file in bytes. Default: `20 * 1024 * 1024` (20 MB). When exceeded, a new sequenced file is created (e.g., `app.2026-04-03.1.log`). |
| `maxDays` | `number` | Number of days to retain log files. Default: `14`. Files older than this are deleted on the next log write. |

## PrettyReporter

```ts
class PrettyReporter implements ConsolaReporter {
  log(logObj: LogObject, ctx: { options: ConsolaOptions }): void;
}
```

A terminal-oriented consola reporter. Formats log output with:
- Type-specific icons (e.g., checkmark for success, cross for error, gear for debug)
- ANSI color coding based on log type and level (respects `NO_COLOR`/`FORCE_COLOR` env vars)
- Error stack trace formatting with relative paths and cause chain support
- Badge-style formatting (extra newlines) for error/fatal level messages
- Box formatting for `box` type log entries
- Timestamp display when `formatOptions.date` is enabled

Errors at level < 2 are written to stderr; all others to stdout.

## Functions

### setupConsola

```ts
function setupConsola(opts?: SetupConsolaOptions): void
```

Configure the global `consola` instance with appropriate reporters based on the runtime environment. Sets the log level to `debug` in all cases.

| Environment | Behavior |
|-------------|----------|
| Production (`env.DEV` is falsy, `cli` not set) | `FileReporter` only -- all logs (including debug) go to `.logs/` |
| Development + `SD_DEBUG` env var | `PrettyReporter` only -- all logs (including debug) to terminal |
| Development (default) | `FileReporter` (all levels) + `PrettyReporter` (info and below only) |
| `cli: true` | Same as `SD_DEBUG` mode -- always uses `PrettyReporter` |

| Parameter | Type | Description |
|-----------|------|-------------|
| `opts` | `SetupConsolaOptions` | Optional configuration |

### createFileReporter

```ts
function createFileReporter(options?: FileReporterOptions): ConsolaReporter
```

Create a file-based consola reporter that writes JSON-line entries to `.logs/` directory.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `FileReporterOptions` | Optional size and retention settings |

File naming: `app.YYYY-MM-DD.log`, with sequential suffix (`app.YYYY-MM-DD.1.log`) when size limit is reached.

Each log entry is a single JSON line with fields:

| Field | Type | Description |
|-------|------|-------------|
| `time` | `string` | ISO 8601 timestamp |
| `level` | `string` | Uppercase log type (e.g., `"INFO"`, `"ERROR"`) |
| `tag` | `string` | Log tag (omitted if empty) |
| `msg` | `string` | Concatenated message arguments (omitted if none) |
| `err` | `{ message, stack }` | Error details (present when an Error argument is logged) |

Log rotation: when the date changes or file size exceeds `maxSize`, a new file is opened. Files older than `maxDays` are automatically cleaned up.

### withMaxLevel

```ts
function withMaxLevel(reporter: ConsolaReporter, maxLevel: number): ConsolaReporter
```

Wrap a consola reporter to suppress log entries above a specified level. Log entries with `logObj.level > maxLevel` are silently dropped.

| Parameter | Type | Description |
|-----------|------|-------------|
| `reporter` | `ConsolaReporter` | The reporter to wrap |
| `maxLevel` | `number` | Maximum log level to pass through (e.g., `LogLevels.info` for info and below) |

## Usage

```ts
import { setupConsola, createFileReporter, PrettyReporter, withMaxLevel } from "@simplysm/core-node";
import consola, { LogLevels } from "consola";

// One-call setup (recommended)
setupConsola();

// Manual configuration example
consola.level = LogLevels.debug;
consola.options.reporters = [
  createFileReporter({ maxSize: 10 * 1024 * 1024, maxDays: 7 }),
  withMaxLevel(new PrettyReporter(), LogLevels.info),
];

// Then use consola as usual
consola.info("Server started on port 3000");
consola.debug("Connection pool initialized");
consola.error(new Error("Database connection failed"));
```
