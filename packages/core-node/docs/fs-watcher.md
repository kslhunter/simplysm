# File Watcher (`FsWatcher`)

```typescript
import { FsWatcher } from "@simplysm/core-node";
```

A chokidar-based file system watcher that debounces and merges rapid file change events, delivering a single consolidated callback.

---

## API Reference

### FsWatcherEvent

```typescript
type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir";
```

Supported file change event types.

---

### FsWatcherChangeInfo

```typescript
interface FsWatcherChangeInfo {
  event: FsWatcherEvent;
  path: NormPath;
}
```

Describes a single file change with its event type and normalized path.

---

### FsWatcher

#### FsWatcher.watch

```typescript
static async watch(
  paths: string[],
  options?: chokidar.ChokidarOptions,
): Promise<FsWatcher>;
```

Starts watching files and resolves once the watcher is ready.

**Parameters:**
- `paths` -- Array of file paths, directory paths, or glob patterns to watch.
- `options` -- Chokidar options. Note: `ignoreInitial` is internally forced to `true`.

---

#### FsWatcher#onChange

```typescript
onChange(
  opt: { delay?: number },
  cb: (changeInfos: FsWatcherChangeInfo[]) => void | Promise<void>,
): this;
```

Registers a change event handler. Events occurring within the `delay` window are merged and delivered in a single callback.

**Parameters:**
- `opt.delay` -- Debounce delay in milliseconds.
- `cb` -- Callback receiving an array of merged change events.

**Event merging strategy:**

When multiple events occur for the same file within the debounce window:

| Previous Event | New Event | Result |
|---|---|---|
| `add` | `change` | `add` (modification right after creation) |
| `add` | `unlink` | removed (created then deleted = no change) |
| `unlink` | `add`/`change` | `add` (recreated after deletion) |
| `addDir` | `unlinkDir` | removed (no change) |
| `unlinkDir` | `addDir` | `addDir` (recreated) |
| any | any (other) | latest event wins |

---

#### FsWatcher#close

```typescript
async close(): Promise<void>;
```

Closes the file watcher and disposes all debounce queues.

---

## Usage Examples

```typescript
import { FsWatcher } from "@simplysm/core-node";

// Watch TypeScript files with 300ms debounce
const watcher = await FsWatcher.watch(["src/**/*.ts"]);

watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`);
  }
});

// Watch multiple patterns
const multiWatcher = await FsWatcher.watch([
  "src/**/*.ts",
  "config/**/*.json",
]);

multiWatcher.onChange({ delay: 500 }, async (changes) => {
  const tsChanges = changes.filter((c) => c.path.endsWith(".ts"));
  const configChanges = changes.filter((c) => c.path.endsWith(".json"));

  if (tsChanges.length > 0) {
    // Rebuild TypeScript
  }
  if (configChanges.length > 0) {
    // Reload configuration
  }
});

// Clean up
await watcher.close();
await multiWatcher.close();
```

### ignoreInitial behavior

By default, `ignoreInitial` is `true` and the callback is not invoked until an actual change occurs. If set to `false` in options, the callback is called once immediately with an empty array (the actual initial file list is not included -- this is intentional to avoid conflicts with event merging).

```typescript
const watcher = await FsWatcher.watch(["src/**/*.ts"], {
  ignoreInitial: false,
});

watcher.onChange({ delay: 300 }, (changes) => {
  // First call: changes = [] (initial trigger)
  // Subsequent calls: actual file changes
});
```
