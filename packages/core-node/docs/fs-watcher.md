# FsWatcher

Chokidar-based file system watcher with debounced event merging. Short-lived events on the same file are consolidated into a single callback invocation.

```ts
import { FsWatcher } from "@simplysm/core-node";
import type { FsWatcherEvent, FsWatcherChangeInfo } from "@simplysm/core-node";
```

## Types

### FsWatcherEvent

```ts
type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir"
```

Supported file change event types.

### FsWatcherChangeInfo

```ts
interface FsWatcherChangeInfo {
  event: FsWatcherEvent;
  path: NormPath;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `event` | `FsWatcherEvent` | The type of change event |
| `path` | `NormPath` | Normalized absolute path of the changed file/directory |

## FsWatcher

Debounced file system watcher. Events occurring within the debounce window are merged using the following strategy:
- `add` + `change` --> `add` (modification right after creation is treated as creation)
- `add` + `unlink` --> removed (creation then deletion cancels out)
- `unlink` + `add` --> `add` (deletion then recreation is treated as creation)
- Other combinations --> latest event wins

The constructor is private; use the static `watch` method.

**Note:** `ignoreInitial` is always forced to `true` internally. If you pass `ignoreInitial: false`, the first `onChange` callback fires with an empty array (initial file listing is not included).

### Static Methods

#### FsWatcher.watch

```ts
static async watch(
  paths: string[],
  options?: chokidar.ChokidarOptions,
): Promise<FsWatcher>
```

Start watching files/directories (async). Resolves when chokidar emits the `ready` event.

| Parameter | Type | Description |
|-----------|------|-------------|
| `paths` | `string[]` | File/directory paths or glob patterns to watch |
| `options` | `chokidar.ChokidarOptions` | Chokidar options (except `ignoreInitial`, which is forced `true`) |

### Instance Methods

#### onChange

```ts
onChange(
  opt: { delay?: number },
  cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>,
): this
```

Register a file change event handler. Events are collected for the specified delay, then delivered as a batch.

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt.delay` | `number` | Debounce delay in milliseconds |
| `cb` | `(changeInfos: FsWatcherChangeInfo[]) => void \| Promise<void>` | Callback receiving batched change events |

**Returns:** `this` for chaining.

#### close

```ts
async close(): Promise<void>
```

Stop the watcher and dispose all debounce queues.

## Usage

```ts
const watcher = await FsWatcher.watch(["src/**/*.ts"], { depth: 3 });

watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`);
  }
});

// Later: stop watching
await watcher.close();
```
