# File System Watcher (`FsWatcher`)

A chokidar-based file system watcher that merges rapid successive events and delivers them to a callback in a single batch.

**Note**: `ignoreInitial` is always forced to `true` internally. Passing `ignoreInitial: false` in options causes the callback to be invoked once with an empty array on startup, but no actual initial file listing is provided.

## Import

```typescript
import { FsWatcher } from "@simplysm/core-node";
```

---

## `FsWatcher.watch(paths, options?)`

Starts watching paths/glob patterns and returns a `FsWatcher` instance after the watcher is ready.

```typescript
import { FsWatcher } from "@simplysm/core-node";

const watcher = await FsWatcher.watch(["src/**/*.ts", "assets"]);

watcher.onChange({ delay: 300 }, (changes) => {
  for (const { path, event } of changes) {
    console.log(`${event}: ${path}`);
  }
});

// Stop watching
await watcher.close();
```

---

## `watcher.onChange(opt, cb)`

Registers a handler that receives batched change events after `opt.delay` milliseconds of inactivity.

| Parameter | Type | Description |
|-----------|------|-------------|
| `opt.delay` | `number` | Debounce wait time in milliseconds |
| `cb` | `(changes: FsWatcherChangeInfo[]) => void \| Promise<void>` | Called with merged change list |

Returns `this` to allow chaining.

---

## `watcher.close()`

Disposes all debounce queues and closes the underlying chokidar watcher.

```typescript
await watcher.close();
```

---

## Related Types

### `FsWatcherEvent`

Union of supported file change event names.

```typescript
type FsWatcherEvent = "add" | "addDir" | "change" | "unlink" | "unlinkDir";
```

### `FsWatcherChangeInfo`

Represents a single file change event delivered to `onChange` callbacks.

```typescript
interface FsWatcherChangeInfo {
  event: FsWatcherEvent;
  path: NormPath;
}
```
