# Features

## FsWatcher

Chokidar-based file system watcher wrapper. Merges events that occur within a short time and calls the callback once.

```typescript
import { FsWatcher } from "@simplysm/core-node";
```

### Types

#### `FsWatcherEvent`

File change event type.

```typescript
type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir";
```

#### `FsWatcherChangeInfo`

File change information.

```typescript
interface FsWatcherChangeInfo {
  /** Change event type */
  event: FsWatcherEvent;
  /** Changed file/directory path (normalized) */
  path: NormPath;
}
```

### Class: `FsWatcher`

The `ignoreInitial` option of chokidar is internally always set to `true`. If you pass `options.ignoreInitial: false`, the callback will be called with an empty array on the first `onChange` call, but the actual initial file list is not included. This is intentional behavior to prevent conflicts with the event merging logic.

#### `FsWatcher.watch`

Starts watching files (asynchronous). Waits until the ready event is emitted.

```typescript
static async watch(paths: string[], options?: chokidar.ChokidarOptions): Promise<FsWatcher>;
```

**Parameters:**
- `paths` -- Array of file/directory paths or glob patterns to watch
- `options` -- chokidar options

#### `onChange`

Registers a file change event handler. Collects events for the specified delay time and calls the callback once.

```typescript
onChange(
  opt: { delay?: number },
  cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>,
): this;
```

**Parameters:**
- `opt.delay` -- Event merge wait time (ms)
- `cb` -- Change event callback

Event merging strategy:
- `add` + `change` -> `add` (modification immediately after creation is considered as creation)
- `add` + `unlink` -> no change (immediate deletion after creation is considered as no change)
- `unlink` + `add` -> `add` (recreation after deletion is considered as creation)
- Otherwise -> overwrite with latest event

#### `close`

Closes the file watcher.

```typescript
async close(): Promise<void>;
```

### Example

```typescript
const watcher = await FsWatcher.watch(["src/**/*.ts"]);
watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`);
  }
});

// Close
await watcher.close();
```
